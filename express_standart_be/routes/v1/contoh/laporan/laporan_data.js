"use client";

import express from "express";
import Joi from "joi";
import { status } from "../../components/tools/general.js";
import { Logging, validatePayload } from "../../components/tools/servertool.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";

const router = express.Router();

// Data Dummy Laporan Tiket Servis
const dummyTickets = [
  {
    id: 1,
    kode: "TKT23110001",
    kode_induk: null,
    tanggal_transaksi: "2026-08-01",
    kode_pelanggan: "PEL001",
    nama_pelanggan: "Budi Gunawan",
    kode_teknisi: "TEK001",
    nama_teknisi: "Soni Alamsyah",
    model_perangkat: "iPhone 13 Pro",
    imei_sn: "IMEI-998877",
    status_fisik: "Mulus",
    keluhan_awal: "Layar pecah & blank",
    diagnosa_teknisi: "LCD pecah, ganti modul LCD",
    kategori_servis: "Ringan",
    status: "selesai",
    jenis_tiket: "Premium",
    status_pembayaran: "Lunas",
    created_at: "2026-08-01 10:00:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 1500000,
    total_biaya_jasa: 250000,
    subtotal: 1750000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 192500,
    grandtotal: 1942500
  },
  {
    id: 2,
    kode: "TKT23110002",
    kode_induk: null,
    tanggal_transaksi: "2026-08-02",
    kode_pelanggan: "PEL002",
    nama_pelanggan: "Ahmad Riyadi",
    kode_teknisi: "TEK002",
    nama_teknisi: "Rian Hidayat",
    model_perangkat: "Samsung S22",
    imei_sn: "SN-S22-4433",
    status_fisik: "Lecet Pemakaian",
    keluhan_awal: "Baterai kembung & cepat habis",
    diagnosa_teknisi: "Battery degradasi, ganti baterai baru",
    kategori_servis: "Ringan",
    status: "proses",
    jenis_tiket: "Reguler",
    status_pembayaran: "DP",
    created_at: "2026-08-02 11:30:00",
    created_by_fullname: "Staff Kasir",
    total_biaya_suku_cadang: 450000,
    total_biaya_jasa: 100000,
    subtotal: 550000,
    diskon_persen: 5,
    diskon_nominal: 27500,
    pajak_persen: 11,
    pajak_nominal: 57475,
    grandtotal: 579975
  },
  {
    id: 3,
    kode: "TKT23110003",
    kode_induk: null,
    tanggal_transaksi: "2026-08-03",
    kode_pelanggan: "PEL003",
    nama_pelanggan: "Citra Lestari",
    kode_teknisi: "TEK001",
    nama_teknisi: "Soni Alamsyah",
    model_perangkat: "MacBook Air M1",
    imei_sn: "SN-MAC-M1-2211",
    status_fisik: "Mulus",
    keluhan_awal: "Keyboard mati beberapa tombol",
    diagnosa_teknisi: "Kerusakan jalur flex keyboard, ganti assembly",
    kategori_servis: "Berat",
    status: "selesai",
    jenis_tiket: "Premium",
    status_pembayaran: "Lunas",
    created_at: "2026-08-03 09:15:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 2100000,
    total_biaya_jasa: 450000,
    subtotal: 2550000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 280500,
    grandtotal: 2830500
  },
  {
    id: 4,
    kode: "TKT23110004",
    kode_induk: "TKT23110001",
    tanggal_transaksi: "2026-08-04",
    kode_pelanggan: "PEL001",
    nama_pelanggan: "Budi Gunawan",
    kode_teknisi: "TEK003",
    nama_teknisi: "Andi Wijaya",
    model_perangkat: "iPhone 13 Pro",
    imei_sn: "IMEI-998877",
    status_fisik: "Mulus",
    keluhan_awal: "OIS kamera belakang bergetar setelah ganti LCD",
    diagnosa_teknisi: "Garansi perbaikan - penyesuaian konektor kamera",
    kategori_servis: "Garansi",
    status: "selesai",
    jenis_tiket: "Garansi",
    status_pembayaran: "Lunas",
    created_at: "2026-08-04 14:00:00",
    created_by_fullname: "Administrator",
    total_biaya_suku_cadang: 0,
    total_biaya_jasa: 0,
    subtotal: 0,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 0,
    pajak_nominal: 0,
    grandtotal: 0
  },
  {
    id: 5,
    kode: "TKT23110005",
    kode_induk: null,
    tanggal_transaksi: "2026-08-05",
    kode_pelanggan: "PEL004",
    nama_pelanggan: "Dewi Safitri",
    kode_teknisi: "TEK002",
    nama_teknisi: "Rian Hidayat",
    model_perangkat: "Asus ROG Phone 5",
    imei_sn: "SN-ROG5-9090",
    status_fisik: "Baret Halus",
    keluhan_awal: "Mati total pasca overcharge",
    diagnosa_teknisi: "Kerusakan jalur IC Power utama",
    kategori_servis: "Berat",
    status: "batal",
    jenis_tiket: "Reguler",
    status_pembayaran: "Belum Bayar",
    created_at: "2026-08-05 16:30:00",
    created_by_fullname: "Staff Kasir",
    total_biaya_suku_cadang: 800000,
    total_biaya_jasa: 300000,
    subtotal: 1100000,
    diskon_persen: 0,
    diskon_nominal: 0,
    pajak_persen: 11,
    pajak_nominal: 121000,
    grandtotal: 1221000
  }
];

router.post("/", async (req, res) => {
    const { body: oPayload } = req;
    const username = req?.auth?.username || "system";

    try {
        // 1. Validasi parameter masukan wajib menggunakan Joi (Halaman & Per Halaman diatur opsional)
        const cValidation = await validatePayload(
            {
                tanggal_awal: Joi.string().required().label("Tanggal Awal"),
                tanggal_akhir: Joi.string().required().label("Tanggal Akhir"),
                page: Joi.number().min(1).optional().label("Halaman"),
                perPage: Joi.number().min(1).optional().label("Data Per Halaman"),
            },
            {
                "any.required": "{#label} wajib diisi.",
                "number.min": "{#label} tidak boleh kurang dari {#limit}"
            },
            oPayload,
            { allowUnknown: true }
        );

        if (cValidation) {
            const oResult = {
                status: status.BAD_REQUEST || 400,
                message: cValidation,
                datetime: formatDateSystem(),
            };

            return res.status(422).json(oResult);
        }

        const {
            tanggal_awal,
            tanggal_akhir,
            status: filteredStatus,
            jenis_tiket,
            status_pembayaran,
            teknisi,
            page,
            perPage,
            keyword,
            sortField = "created_at",
            sortOrder = "desc"
        } = oPayload;

        const hasPagination = page !== undefined && perPage !== undefined;

        // 2. Simulasi query filter dasar dari array dummy
        let filteredData = dummyTickets.filter((item) => {
            // Filter rentang tanggal
            const matchTanggal = item.tanggal_transaksi >= tanggal_awal && item.tanggal_transaksi <= tanggal_akhir;
            if (!matchTanggal) return false;

            // Filter status pekerjaan
            if (Array.isArray(filteredStatus) && filteredStatus.length > 0) {
                if (!filteredStatus.includes(item.status)) return false;
            }

            // Filter jenis tiket
            if (Array.isArray(jenis_tiket) && jenis_tiket.length > 0) {
                if (!jenis_tiket.includes(item.jenis_tiket)) return false;
            }

            // Filter status pembayaran
            if (Array.isArray(status_pembayaran) && status_pembayaran.length > 0) {
                if (!status_pembayaran.includes(item.status_pembayaran)) return false;
            }

            // Filter teknisi
            if (teknisi && item.kode_teknisi !== teknisi) {
                return false;
            }

            // Filter pencarian kata kunci (keyword)
            if (keyword) {
                const lowerKeyword = keyword.toLowerCase();
                const matchKeyword = 
                    (item.kode && item.kode.toLowerCase().includes(lowerKeyword)) ||
                    (item.model_perangkat && item.model_perangkat.toLowerCase().includes(lowerKeyword)) ||
                    (item.imei_sn && item.imei_sn.toLowerCase().includes(lowerKeyword)) ||
                    (item.nama_pelanggan && item.nama_pelanggan.toLowerCase().includes(lowerKeyword)) ||
                    (item.nama_teknisi && item.nama_teknisi.toLowerCase().includes(lowerKeyword));
                if (!matchKeyword) return false;
            }

            return true;
        });

        // 3. Simulasi Agregasi Total Finansial secara keseluruhan sebelum di-paginasi
        let total_biaya_suku_cadang = 0;
        let total_biaya_jasa = 0;
        let subtotal = 0;
        let diskon_nominal = 0;
        let pajak_nominal = 0;
        let grandtotal = 0;

        filteredData.forEach((item) => {
            total_biaya_suku_cadang += item.total_biaya_suku_cadang;
            total_biaya_jasa += item.total_biaya_jasa;
            subtotal += item.subtotal;
            diskon_nominal += item.diskon_nominal;
            pajak_nominal += item.pajak_nominal;
            grandtotal += item.grandtotal;
        });

        const oTotalsFormatted = {
            total_biaya_suku_cadang,
            total_biaya_jasa,
            subtotal,
            diskon_nominal,
            pajak_nominal,
            grandtotal
        };

        const nTotalRecords = filteredData.length;

        // 4. Pengurutan Data (Sorting)
        filteredData.sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Penanganan mapping kolom sorting custom
            if (sortField === "nama_pelanggan") {
                valA = a.nama_pelanggan;
                valB = b.nama_pelanggan;
            } else if (sortField === "nama_teknisi") {
                valA = a.nama_teknisi;
                valB = b.nama_teknisi;
            }

            if (valA === undefined || valA === null) valA = "";
            if (valB === undefined || valB === null) valB = "";

            if (typeof valA === "string" && typeof valB === "string") {
                return sortOrder.toLowerCase() === "asc"
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            } else {
                return sortOrder.toLowerCase() === "asc" ? valA - valB : valB - valA;
            }
        });

        // 5. Pembatasan Halaman (Pagination) - diabaikan jika parameter tidak didefinisikan
        let vaData = [];
        let offsetVal = 0;

        if (hasPagination) {
            const pageInt = parseInt(page) || 1;
            const perPageInt = parseInt(perPage) || 10;
            offsetVal = (pageInt - 1) * perPageInt;
            vaData = filteredData.slice(offsetVal, offsetVal + perPageInt);
        } else {
            vaData = filteredData;
        }

        // 6. Format standardisasi output data
        const vaResult = vaData.map((item, idx) => ({
            no: offsetVal + idx + 1,
            id: item.id,
            kode: item.kode || "-",
            kode_induk: item.kode_induk,
            nama_pelanggan: item.nama_pelanggan || "Umum/Walk-In",
            nama_teknisi: item.nama_teknisi || "Belum Ditugaskan",
            model_perangkat: item.model_perangkat || "-",
            imei_sn: item.imei_sn || "-",
            status_fisik: item.status_fisik,
            keluhan_awal: item.keluhan_awal || "-",
            diagnosa_teknisi: item.diagnosa_teknisi || "-",
            kategori_servis: item.kategori_servis || "-",
            status: item.status,
            jenis_tiket: item.jenis_tiket,
            status_pembayaran: item.status_pembayaran,
            created_at: item.created_at,
            created_by_fullname: item.created_by_fullname || "-",

            total_biaya_suku_cadang: parseFloat(item.total_biaya_suku_cadang) || 0,
            total_biaya_jasa: parseFloat(item.total_biaya_jasa) || 0,
            subtotal: parseFloat(item.subtotal) || 0,
            diskon_persen: parseFloat(item.diskon_persen) || 0,
            diskon_nominal: parseFloat(item.diskon_nominal) || 0,
            pajak_persen: parseFloat(item.pajak_persen) || 0,
            pajak_nominal: parseFloat(item.pajak_nominal) || 0,
            grandtotal: parseFloat(item.grandtotal) || 0
        }));

        return res.status(200).json({
            status: status.SUKSES || 200,
            message: "Berhasil memuat laporan operasional service",
            datetime: formatDateSystem(),
            data: vaResult,
            total_data: nTotalRecords,
            totals: oTotalsFormatted
        });

    } catch (error) {
        const oResult = {
            status: status.BAD_REQUEST || 400,
            message: "Sistem sedang maintenance harap tunggu sebentar",
            datetime: formatDateSystem(),
        };

        Logging(error, {
            file: "/contoh/laporan/laporan_data.js",
            func: "data",
            request: oPayload,
            response: oResult,
            user: username,
        });

        return res.status(500).json(oResult);
    }
});

export default router;