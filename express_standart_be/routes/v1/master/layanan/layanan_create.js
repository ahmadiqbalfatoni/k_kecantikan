/**
 * @project Sistem Klinik Kecantikan
 * @file layanan_create.js
 */
import express from "express";
import { status } from "../../components/tools/general.js";
import Joi from "joi";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "";

  try {
    const cValidation = await validatePayload(
      {
        nama: Joi.string().max(100).required().label("Nama Layanan"),
        kode_kategori_layanan: Joi.string().required().label("Kategori Layanan"),
        kode_ruangan: Joi.string().optional().allow("", null).label("Ruangan"),
        wajib_konsultasi: Joi.string().valid("tidak", "opsional", "wajib").optional().default("tidak").label("Wajib Konsultasi"),
        kode_ruangan_konsultasi: Joi.string().optional().allow("", null).label("Ruangan Konsultasi"),
        tipe: Joi.string().valid("MEDICAL TREATMENT", "BEAUTY TREATMENT", "SERVICE TREATMENT").required().label("Tipe Layanan"),
        harga: Joi.number().min(0).required().label("Harga"),
        durasi_menit: Joi.number().integer().min(1).required().label("Durasi (Menit)"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status"),
      },
      { "any.required": "{#label} wajib diisi", "string.empty": "{#label} tidak boleh kosong" },
      oPayload,
      { uniqueField: ["nama"], table: "mst_layanan", allowUnknown: true }
    );
    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    let kodeLayanan = "";
    await DB.transaction(async (trx) => {
      const rows = await trx("mst_layanan")
        .where("kode_layanan", "like", "LAY-%")
        .select("kode_layanan");

      let maxNum = 0;
      for (const row of rows) {
        if (row.kode_layanan) {
          const match = String(row.kode_layanan).match(/^LAY-(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }

      let candidateNum = maxNum + 1;
      while (true) {
        const candidateKode = `LAY-${String(candidateNum).padStart(3, "0")}`;
        const exists = await trx("mst_layanan").where("kode_layanan", candidateKode).first();
        if (!exists) {
          kodeLayanan = candidateKode;
          break;
        }
        candidateNum++;
      }

      const wajibKonsul = oPayload.wajib_konsultasi || "tidak";
      const oData = {
        kode_layanan: kodeLayanan,
        kode_kategori_layanan: oPayload.kode_kategori_layanan,
        kode_ruangan: oPayload.kode_ruangan || null,
        wajib_konsultasi: wajibKonsul,
        kode_ruangan_konsultasi: wajibKonsul !== "tidak" ? (oPayload.kode_ruangan_konsultasi || null) : null,
        nama: oPayload.nama,
        tipe: oPayload.tipe || "BEAUTY TREATMENT",
        harga: oPayload.harga,
        durasi_menit: oPayload.durasi_menit,
        status: oPayload.status,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem(),
      };
      await trx("mst_layanan").insert(oData);
      await ChangesLog({ description: `Tambah Layanan ${kodeLayanan}`, tableName: "mst_layanan", referenceCode: kodeLayanan, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Layanan berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_layanan: kodeLayanan } });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/layanan/layanan_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
