/**
 * @copyright (c) 2026 PT Marstech Global (info@marstech.co.id)
 * @project Sistem Klinik Kecantikan
 * @file ruangan_dropdown.js
 * @description Endpoint dropdown daftar ruangan untuk form master layanan & paket layanan
 *
 * @author Antigravity
 * @created 2026-08-22
 */

import express from "express";
import DB from "../../../core/config/knex.js";
import { formatDateSystem } from "../components/tools/date_tools.js";
import { Logging } from "../components/tools/servertool.js";
import { status } from "../components/tools/general.js";

const router = express.Router();

const handleRuanganDropdown = async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";

  try {
    const vaData = await DB("mst_ruangan")
      .where("status", "aktif")
      .select("kode_ruangan", "nama_ruangan", "is_konsultasi")
      .orderBy("nama_ruangan", "asc");

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ruangan ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, {
      file: "/master/ruangan_dropdown.js",
      func: "dropdown",
      request: body,
      response: oResult,
      user: username,
    });
    return res.status(500).json(oResult);
  }
};

router.get("/", handleRuanganDropdown);
router.post("/", handleRuanganDropdown);

export default router;
