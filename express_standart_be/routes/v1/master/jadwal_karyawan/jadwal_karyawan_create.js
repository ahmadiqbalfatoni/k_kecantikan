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
        no_sip: Joi.string().required().label("No SIP / Karyawan"),
        kode_ruangan: Joi.string().optional().allow("", null).label("Ruangan"),
        hari: Joi.string().valid("senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu").required().label("Hari"),
        jam_mulai: Joi.string().required().label("Jam Mulai"),
        jam_selesai: Joi.string().required().label("Jam Selesai"),
        kuota: Joi.number().integer().min(0).required().label("Kuota"),
        status: Joi.string().valid("aktif", "nonaktif").required().label("Status")
      },
      { "any.required": "{#label} wajib diisi", "any.only": "{#label} tidak valid" },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });

    let kode = "";
    await DB.transaction(async (trx) => {
      const rows = await trx("mst_jadwal_karyawan")
        .where("kode_jadwal", "like", "JDW-%")
        .select("kode_jadwal");

      let maxNum = 0;
      for (const row of rows) {
        if (row.kode_jadwal) {
          const match = String(row.kode_jadwal).match(/^JDW-(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }

      let candidateNum = maxNum + 1;
      while (true) {
        const candidateKode = `JDW-${String(candidateNum).padStart(3, "0")}`;
        const exists = await trx("mst_jadwal_karyawan").where("kode_jadwal", candidateKode).first();
        if (!exists) {
          kode = candidateKode;
          break;
        }
        candidateNum++;
      }

      const oData = {
        kode_jadwal: kode,
        no_sip: oPayload.no_sip,
        kode_ruangan: oPayload.kode_ruangan || null,
        hari: oPayload.hari,
        jam_mulai: oPayload.jam_mulai,
        jam_selesai: oPayload.jam_selesai,
        kuota: oPayload.kuota,
        status: oPayload.status,
        tz: oPayload.tz || "UTC",
        created_by: username,
        created_at: formatDateSystem(),
        updated_by: username,
        updated_at: formatDateSystem()
      };

      await trx("mst_jadwal_karyawan").insert(oData);
      await ChangesLog({ description: `Tambah Jadwal Karyawan ${kode}`, tableName: "mst_jadwal_karyawan", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });

    return res.status(200).json({ status: status.SUKSES, message: "Jadwal karyawan berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_jadwal: kode } });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/jadwal_karyawan/jadwal_karyawan_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
