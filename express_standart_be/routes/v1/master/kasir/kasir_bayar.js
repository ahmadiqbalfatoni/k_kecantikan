/**
 * @project Sistem Klinik Kecantikan
 * @file kasir_bayar.js
 * @description Endpoint proses bayar - ubah status draft menjadi lunas
 */
import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { body } = req;
  const username = req?.auth?.username || "";

  const { kode_transaksi, metode_bayar, nominal_bayar } = body;

  if (!kode_transaksi) {
    return res.status(400).json({ status: status.BAD_REQUEST, message: "kode_transaksi wajib diisi", datetime: formatDateSystem() });
  }

  const validMetode = ["tunai", "debit", "kredit", "qris", "transfer"];
  if (!validMetode.includes(metode_bayar)) {
    return res.status(400).json({ status: status.BAD_REQUEST, message: "Metode bayar tidak valid", datetime: formatDateSystem() });
  }

  try {
    const existing = await DB("trx_transaksi").where("kode_transaksi", kode_transaksi).first();
    if (!existing) {
      return res.status(404).json({ status: status.BAD_REQUEST, message: "Transaksi tidak ditemukan", datetime: formatDateSystem() });
    }
    if (existing.status === "lunas") {
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Transaksi sudah lunas", datetime: formatDateSystem() });
    }
    if (existing.status === "batal") {
      return res.status(400).json({ status: status.BAD_REQUEST, message: "Transaksi sudah dibatalkan", datetime: formatDateSystem() });
    }

    const totalBayar = parseFloat(existing.total_bayar || 0);
    const nominalBayar = parseFloat(nominal_bayar || totalBayar);

    if (metode_bayar === "tunai" && nominalBayar < totalBayar) {
      return res.status(400).json({ status: status.BAD_REQUEST, message: `Nominal bayar kurang. Diperlukan: Rp ${totalBayar.toLocaleString("id-ID")}`, datetime: formatDateSystem() });
    }

    const kembalian = metode_bayar === "tunai" ? Math.max(0, nominalBayar - totalBayar) : 0;

    await DB("trx_transaksi").where("kode_transaksi", kode_transaksi).update({
      metode_bayar,
      status: "lunas",
      updated_by: username,
      updated_at: DB.fn.now(),
    });

    if (existing.kode_kunjungan) {
      await DB("trx_kunjungan").where("kode_kunjungan", existing.kode_kunjungan).update({
        status: "selesai",
        updated_by: username,
        updated_at: DB.fn.now(),
      });
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Pembayaran berhasil",
      datetime: formatDateSystem(),
      data: {
        kode_transaksi,
        metode_bayar,
        total_bayar: totalBayar,
        nominal_bayar: nominalBayar,
        kembalian,
      },
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };
    Logging(error, { file: "/master/kasir/kasir_bayar.js", user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
