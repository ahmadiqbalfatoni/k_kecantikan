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
        kode_detail_promo: Joi.alternatives().try(
          Joi.string(),
          Joi.array().items(Joi.string())
        ).required().label("Kode Detail Promo")
      },
      { "any.required": "{#label} wajib diisi" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    const kodes = Array.isArray(oPayload.kode_detail_promo) ? oPayload.kode_detail_promo : [oPayload.kode_detail_promo];

    await DB.transaction(async (trx) => {
      const records = await trx("mst_detail_promo").whereIn("kode_detail_promo", kodes).forUpdate();
      if (!records || records.length === 0) { const e = new Error("Data tidak ditemukan"); e.statusCode = 404; throw e; }

      await trx("mst_detail_promo").whereIn("kode_detail_promo", kodes).del();
      for (const record of records) {
        await ChangesLog({ description: `Hapus Detail Promo ${record.kode_detail_promo}`, tableName: "mst_detail_promo", referenceCode: record.kode_detail_promo, action: "DELETE", dataBefore: record, dataAfter: null, user: username, tz: oPayload.tz || "UTC" }, trx);
      }
    });

    return res.status(200).json({ status: status.SUKSES, message: `${kodes.length} detail promo berhasil dihapus`, datetime: formatDateSystem() });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ status: status.NOT_FOUND, message: "Data tidak ditemukan", datetime: formatDateSystem() });
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/detail_promo/detail_promo_delete.js", func: "delete", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
