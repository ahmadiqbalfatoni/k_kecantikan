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
        kode_promo: Joi.string().required().label("Kode Promo"),
        jenis_item: Joi.string().valid("produk", "layanan", "paket").required().label("Jenis Item"),
        kode_item: Joi.any().required().label("Kode Item"),
        status: Joi.string().valid("aktif", "nonaktif").optional().default("aktif").label("Status")
      },
      { "any.required": "{#label} wajib diisi", "any.only": "{#label} tidak valid" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    if (typeof oPayload.kode_item !== "string" && (!Array.isArray(oPayload.kode_item) || oPayload.kode_item.length === 0)) {
      return res.status(422).json({ status: status.BAD_REQUEST, message: "Kode Item wajib diisi", datetime: formatDateSystem() });
    }

    // Validate kode_promo exists
    const promo = await DB("mst_promo").where("kode_promo", oPayload.kode_promo).first();
    if (!promo) return res.status(422).json({ status: status.BAD_REQUEST, message: "Promo tidak ditemukan", datetime: formatDateSystem() });

    const itemCodes = Array.isArray(oPayload.kode_item) ? oPayload.kode_item : [oPayload.kode_item];

    // Check existing records for this promo & jenis_item
    const existingRecords = await DB("mst_detail_promo")
      .where("kode_promo", oPayload.kode_promo)
      .where("jenis_item", oPayload.jenis_item)
      .whereIn("kode_item", itemCodes);

    const existingSet = new Set(existingRecords.map((r) => r.kode_item));
    const itemsToAdd = itemCodes.filter((item) => !existingSet.has(item));

    if (itemsToAdd.length === 0) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: itemCodes.length > 1
          ? "Seluruh item yang dipilih sudah terdaftar pada promo ini"
          : "Item ini sudah terdaftar pada promo yang sama",
        datetime: formatDateSystem()
      });
    }

    let createdCount = 0;
    const insertedCodes = [];

    await DB.transaction(async (trx) => {
      const rows = await trx("mst_detail_promo")
        .where("kode_detail_promo", "like", "DPRM-%")
        .select("kode_detail_promo");

      let maxNum = 0;
      for (const row of rows) {
        if (row.kode_detail_promo) {
          const match = String(row.kode_detail_promo).match(/^DPRM-(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }

      let n = maxNum + 1;

      for (const itemCode of itemsToAdd) {
        let kode = "";
        while (true) {
          const candidateKode = `DPRM-${String(n).padStart(4, "0")}`;
          const exists = await trx("mst_detail_promo").where("kode_detail_promo", candidateKode).first();
          if (!exists) {
            kode = candidateKode;
            n++;
            break;
          }
          n++;
        }

        const oData = {
          kode_detail_promo: kode,
          kode_promo: oPayload.kode_promo,
          jenis_item: oPayload.jenis_item,
          kode_item: itemCode,
          status: oPayload.status || "aktif",
          tz: oPayload.tz || "UTC",
          created_by: username,
          created_at: formatDateSystem(),
          updated_by: username,
          updated_at: formatDateSystem()
        };

        await trx("mst_detail_promo").insert(oData);
        await ChangesLog({ description: `Tambah Detail Promo ${kode}`, tableName: "mst_detail_promo", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
        insertedCodes.push(kode);
        createdCount++;
      }
    });

    let msg = createdCount > 1 
      ? `${createdCount} detail promo berhasil ditambahkan` 
      : "Detail promo berhasil ditambahkan";
    if (existingSet.size > 0) {
      msg += ` (${existingSet.size} item dilewati karena sudah terdaftar)`;
    }

    return res.status(200).json({ status: status.SUKSES, message: msg, datetime: formatDateSystem(), data: { inserted_codes: insertedCodes } });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/detail_promo/detail_promo_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
