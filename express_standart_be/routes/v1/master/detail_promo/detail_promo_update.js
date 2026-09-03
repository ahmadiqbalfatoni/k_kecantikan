import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = req.body;
  const username = req?.auth?.username || "";

  try {
    const cValidation = await validatePayload(
      {
        kode_detail_promo: Joi.string().required().label("Kode Detail Promo"),
        kode_promo: Joi.string().required().label("Kode Promo"),
        jenis_item: Joi.string().valid("produk", "layanan", "paket").required().label("Jenis Item"),
        kode_item: Joi.string().required().label("Kode Item"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status")
      },
      { "any.required": "{#label} wajib diisi", "any.only": "{#label} tidak valid" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    await DB.transaction(async (trx) => {
      const prev = await trx("mst_detail_promo").where("kode_detail_promo", oPayload.kode_detail_promo).forUpdate().first();
      if (!prev) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      // Check duplicate (excluding self)
      const dup = await trx("mst_detail_promo")
        .where("kode_promo", oPayload.kode_promo)
        .where("jenis_item", oPayload.jenis_item)
        .where("kode_item", oPayload.kode_item)
        .whereNot("kode_detail_promo", oPayload.kode_detail_promo)
        .first();
      if (dup) { const e = new Error("Item ini sudah terdaftar pada promo yang sama"); e.statusCode = 422; throw e; }

      const oData = {
        kode_promo: oPayload.kode_promo,
        jenis_item: oPayload.jenis_item,
        kode_item: oPayload.kode_item,
        status: oPayload.status,
        updated_by: username,
        updated_at: formatDateSystem()
      };

      await trx("mst_detail_promo").where("kode_detail_promo", oPayload.kode_detail_promo).update(oData);
      await ChangesLog({ description: `Edit Detail Promo ${oPayload.kode_detail_promo}`, tableName: "mst_detail_promo", referenceCode: oPayload.kode_detail_promo, action: "UPDATE", dataBefore: prev, dataAfter: { ...prev, ...oData }, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Detail promo berhasil diupdate", datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    if (error.statusCode === 422) return res.status(422).json({ status: status.BAD_REQUEST, message: error.message, datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/detail_promo/detail_promo_update.js", func: "update", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
