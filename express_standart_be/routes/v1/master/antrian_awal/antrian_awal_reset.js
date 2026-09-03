/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file antrian_awal_reset.js
 * @description Endpoint untuk mereset semua antrian awal (terpakai/dipanggil -> tersedia)
 *
 * @author Fadil <risqullah.s.fadhilah@gmail.com>
 * @created 2026-08-15
 *
 * @contributors
 * - Fadil <risqullah.s.fadhilah@gmail.com>
 * - Antigravity (2026-08-20)
 *
 * @lastModified Antigravity (2026-08-20)
 * @version 1.1.0
 */

import express from "express";
import { status } from "../../components/tools/general.js";
import DB from "../../../../core/config/knex.js";
import { Logging, ChangesLog } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const oPayload = body;
  const username = req?.auth?.username || "";

  try {
    let jumlahReset = 0;

    await DB.transaction(async (trx) => {
      const recordsTerpakai = await trx("trx_antrian_awal")
        .whereIn("status", ["terpakai", "dipanggil"])
        .select("kode_antrian_awal", "nomor_antrian", "status");

      jumlahReset = recordsTerpakai.length;

      if (jumlahReset > 0) {
        await trx("trx_antrian_awal")
          .whereIn("status", ["terpakai", "dipanggil"])
          .update({
            status: "tersedia",
            diambil_at: null,
            dipanggil_at: null,
            updated_by: username,
            updated_at: formatDateSystem(),
          });

        await ChangesLog(
          {
            description: `Reset ${jumlahReset} Nomor Antrian Awal`,
            tableName: "trx_antrian_awal",
            referenceCode: "RESET",
            action: "UPDATE",
            dataBefore: recordsTerpakai,
            dataAfter: { status: "tersedia", jumlah: jumlahReset },
            user: username,
            tz: oPayload.tz || "UTC",
          },
          trx
        );
      }
    });

    return res.status(200).json({
      status: status.SUKSES,
      message:
        jumlahReset > 0
          ? `${jumlahReset} nomor antrian berhasil direset`
          : "Tidak ada antrian yang perlu direset",
      datetime: formatDateSystem(),
      data: { jumlah_reset: jumlahReset },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/antrian_awal/antrian_awal_reset.js",
      func: "reset",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
});

export default router;
