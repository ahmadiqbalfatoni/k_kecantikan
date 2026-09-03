/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik
 * @file pendaftaran_pasien_delete.js
 * @description Endpoint untuk menghapus data master pasien
 *
 * @author Antigravity
 * @created 2026-08-21
 */

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
        no_rm: Joi.array().items(Joi.string()).min(1).required().label("No. RM Pasien"),
      },
      {
        "array.base": "{#label} harus berupa array",
        "array.min": "Minimal pilih satu pasien untuk dihapus",
        "any.required": "{#label} wajib dikirim",
      },
      oPayload,
      { allowUnknown: true }
    );

    if (cValidation) {
      return res.status(422).json({
        status: status.BAD_REQUEST,
        message: cValidation,
        datetime: formatDateSystem(),
      });
    }

    await DB.transaction(async (trx) => {
      const records = await trx("mst_pasien")
        .whereIn("no_rm", oPayload.no_rm)
        .forUpdate();

      if (!records || records.length < 1) {
        const error = new Error("Data pasien tidak ditemukan");
        error.statusCode = 404;
        throw error;
      }

      await trx("mst_pasien")
        .whereIn("no_rm", oPayload.no_rm)
        .del();

      for (const record of records) {
        await ChangesLog(
          {
            description: `Hapus Data Pasien ${record.nama} (${record.no_rm})`,
            tableName: "mst_pasien",
            referenceCode: record.no_rm,
            action: "DELETE",
            dataBefore: record,
            dataAfter: null,
            user: username,
            tz: oPayload.tz || "UTC",
          },
          trx
        );
      }
    });

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data pasien berhasil dihapus",
      datetime: formatDateSystem(),
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        status: status.NOT_FOUND,
        message: "Data pasien tidak ditemukan atau sudah terhapus",
        datetime: formatDateSystem(),
      });
    }

    Logging(error, {
      file: "/master/pendaftaran_pasien/pendaftaran_pasien_delete.js",
      func: "delete",
      request: oPayload,
      response: {},
      user: username,
    });

    return res.status(500).json({
      status: status.BAD_REQUEST,
      message: error.message || "Gagal menghapus data pasien",
      datetime: formatDateSystem(),
    });
  }
});

export default router;
