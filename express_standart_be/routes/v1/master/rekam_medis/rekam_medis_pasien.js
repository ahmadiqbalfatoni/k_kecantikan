/**
 * @copyright (c) 2026 PT Marstech Global
 * @project Sistem Klinik Kecantikan
 * @file rekam_medis_pasien.js
 * @description Endpoint riwayat rekam medis per pasien (trx_kunjungan -> trx_rekam_medis -> trx_rekam_medis_ruangan -> trx_rekam_medis_foto)
 */

import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";

const router = express.Router();

/**
 * Helper validasi karyawan aktif & warning jika penanggung jawab rekam medis bukan dokter
 */
export const validateKaryawanPenanggungJawab = async (kode_karyawan, expectedRole = 'dokter') => {
  if (!kode_karyawan) return { valid: false, message: "Kode karyawan wajib diisi" };

  const karyawan = await DB("mst_karyawan")
    .where("kode_karyawan", kode_karyawan)
    .first();

  if (!karyawan) {
    return { valid: false, message: `Kode karyawan '${kode_karyawan}' tidak ditemukan di mst_karyawan` };
  }

  if (karyawan.status !== "aktif") {
    return { valid: false, message: `Karyawan '${karyawan.nama}' (${kode_karyawan}) berstatus ${karyawan.status}` };
  }

  let warning = null;
  if (expectedRole === 'dokter' && karyawan.jabatan !== 'dokter') {
    warning = `Penanggung jawab '${karyawan.nama}' berjabatan ${karyawan.jabatan}, bukan dokter`;
  }

  return { valid: true, karyawan, warning };
};

const handleGetRekamMedis = async (req, res) => {
  const oPayload = { ...req.query, ...req.body, ...req.params };
  const username = req?.auth?.username || "";

  const no_rm = (oPayload.no_rm || "").trim();
  const page = parseInt(oPayload.page, 10) || 1;
  const perPage = parseInt(oPayload.perPage, 10) || 10;
  const offset = (page - 1) * perPage;

  const tanggal_dari = oPayload.tanggal_dari || null;
  const tanggal_sampai = oPayload.tanggal_sampai || null;

  const keyword = (oPayload.keyword || "").trim();
  const exclude_kode_kunjungan = (oPayload.exclude_kode_kunjungan || "").trim();
  const only_selesai = oPayload.only_selesai === true || oPayload.only_selesai === 'true' || oPayload.only_selesai === 1 || oPayload.only_selesai === '1';

  try {
    // 1. Fetch form field labels map (kode_ruangan -> field_key -> label_field)
    const masterFormFields = await DB("mst_ruangan_form").select("kode_ruangan", "field_key", "label_field");
    const labelMap = {};
    masterFormFields.forEach((f) => {
      if (!labelMap[f.kode_ruangan]) labelMap[f.kode_ruangan] = {};
      if (f.field_key) {
        labelMap[f.kode_ruangan][f.field_key] = f.label_field;
      }
    });

    // 2. Count total kunjungan pasien (driving table trx_kunjungan)
    const countQuery = DB("trx_kunjungan as k")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .leftJoin("trx_rekam_medis as rm", "k.kode_kunjungan", "rm.kode_kunjungan")
      .leftJoin("trx_rekam_medis_ruangan as rmr", "k.kode_kunjungan", "rmr.kode_kunjungan")
      .modify((qb) => {
        if (no_rm) qb.where("k.no_rm", no_rm);
        if (exclude_kode_kunjungan) qb.whereNot("k.kode_kunjungan", exclude_kode_kunjungan);
        if (only_selesai) {
          qb.where("k.status", "selesai");
        } else {
          qb.where("k.status", "!=", "batal");
        }
        if (tanggal_dari) {
          qb.where("k.tanggal_kunjungan", ">=", tanggal_dari);
        }
        if (tanggal_sampai) {
          qb.where("k.tanggal_kunjungan", "<=", tanggal_sampai);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_kunjungan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nik) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.diagnosis) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.keluhan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.riwayat_alergi) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.nama_ruangan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_tindakan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_petugas) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_hasil_treatment) LIKE ?", [`%${lower}%`]);
          });
        }
      })
      .countDistinct("k.id as total")
      .first();

    const countRes = await countQuery;
    const totalRecords = parseInt(countRes?.total || 0, 10);

    // 3. Ambil list kunjungan
    const vaKunjungan = await DB("trx_kunjungan as k")
      .leftJoin("mst_pasien as p", "k.no_rm", "p.no_rm")
      .leftJoin("trx_rekam_medis as rm", "k.kode_kunjungan", "rm.kode_kunjungan")
      .leftJoin("trx_rekam_medis_ruangan as rmr", "k.kode_kunjungan", "rmr.kode_kunjungan")
      .groupBy("k.id", "p.id")
      .modify((qb) => {
        if (no_rm) qb.where("k.no_rm", no_rm);
        if (exclude_kode_kunjungan) qb.whereNot("k.kode_kunjungan", exclude_kode_kunjungan);
        if (only_selesai) {
          qb.where("k.status", "selesai");
        } else {
          qb.where("k.status", "!=", "batal");
        }
        if (tanggal_dari) {
          qb.where("k.tanggal_kunjungan", ">=", tanggal_dari);
        }
        if (tanggal_sampai) {
          qb.where("k.tanggal_kunjungan", "<=", tanggal_sampai);
        }
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(k.kode_kunjungan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(k.no_rm) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nik) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.no_hp) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.diagnosis) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.keluhan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rm.riwayat_alergi) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.nama_ruangan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_tindakan) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_petugas) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(rmr.catatan_hasil_treatment) LIKE ?", [`%${lower}%`]);
          });
        }
      })
      .select(
        "k.id as kunjungan_id",
        "k.kode_kunjungan",
        "k.no_rm",
        "k.tanggal_kunjungan",
        "k.jam_datang",
        "k.status as status_kunjungan",
        "k.created_at",
        "p.nama as nama_pasien",
        "p.nik",
        "p.jenis_kelamin",
        "p.tanggal_lahir",
        "p.no_hp",
        "p.alergi"
      )
      .orderBy("k.tanggal_kunjungan", "desc")
      .orderBy("k.jam_datang", "desc")
      .orderBy("k.id", "desc")
      .limit(perPage)
      .offset(offset);

    const kodeKunjunganList = vaKunjungan.map((k) => k.kode_kunjungan).filter(Boolean);

    let mapLayanan = {};
    let headerRmMap = {};

    if (kodeKunjunganList.length > 0) {
      // 4. Ambil header trx_rekam_medis per kunjungan
      const vaHeaderRM = await DB("trx_rekam_medis as rm")
        .leftJoin("mst_karyawan as d", function () {
          this.on("rm.kode_karyawan", "=", "d.no_sip")
            .orOn("rm.kode_karyawan", "=", "d.kode_user")
            .orOn("rm.kode_karyawan", "=", "d.kode_karyawan");
        })
        .whereIn("rm.kode_kunjungan", kodeKunjunganList)
        .select(
          "rm.id as header_rm_id",
          "rm.kode_kunjungan",
          "rm.kode_rekam_medis",
          "rm.no_rm",
          "rm.no_sip",
          "rm.keluhan",
          "rm.durasi_keluhan",
          "rm.riwayat_alergi",
          "rm.riwayat_treatment",
          "rm.pemeriksaan_acne",
          "rm.pemeriksaan_inflammation",
          "rm.pemeriksaan_skin_type",
          "rm.pemeriksaan_pigmentation",
          "rm.pemeriksaan_sensitivity",
          "rm.diagnosis",
          "rm.subjective",
          "rm.objective",
          "rm.assessment",
          "rm.plan",
          "rm.kode_karyawan",
          "d.nama as dokter_nama",
          "d.jabatan as dokter_jabatan"
        );

      const rmHeaderIds = [];
      vaHeaderRM.forEach((h) => {
        headerRmMap[h.kode_kunjungan] = h;
        rmHeaderIds.push(h.header_rm_id);
      });

      // 5. Ambil data sesi antrian layanan per kunjungan
      const vaAntrianLayanan = await DB("trx_antrian_layanan as al")
        .leftJoin("mst_karyawan as p", function () {
          this.on("al.kode_karyawan", "=", "p.kode_karyawan")
            .orOn("al.kode_karyawan", "=", "p.no_sip")
            .orOn("al.kode_karyawan", "=", "p.kode_user");
        })
        .leftJoin("trx_detail_antrian_layanan as dal", "al.kode_antrian_layanan", "dal.kode_antrian_layanan")
        .whereIn("al.kode_kunjungan", kodeKunjunganList)
        .select(
          "al.kode_antrian_layanan",
          "al.kode_kunjungan",
          "al.kode_ruangan",
          "al.nama_ruangan",
          "al.catatan_petugas as al_catatan_petugas",
          "al.status as al_status",
          "al.dipanggil_at",
          "al.selesai_at",
          "al.kode_karyawan as al_kode_karyawan",
          "p.nama as petugas_nama",
          "p.jabatan as petugas_jabatan",
          "dal.nama_layanan as dal_nama_layanan",
          "dal.jenis_layanan as dal_jenis_layanan",
          "dal.harga"
        );

      vaAntrianLayanan.forEach((al) => {
        const kKunjungan = al.kode_kunjungan;
        if (!mapLayanan[kKunjungan]) mapLayanan[kKunjungan] = {};
        const key = al.kode_antrian_layanan;
        const headerRM = headerRmMap[kKunjungan] || {};

        mapLayanan[kKunjungan][key] = {
          kode_antrian_layanan: al.kode_antrian_layanan,
          kode_rekam_medis_ruangan: null,
          nama_layanan: al.dal_nama_layanan || al.nama_ruangan || "Pelayanan Klinik",
          jenis_layanan: al.dal_jenis_layanan || "layanan",
          harga: parseFloat(al.harga || 0),
          kode_ruangan: al.kode_ruangan,
          nama_ruangan: al.nama_ruangan || "Ruangan Treatment",
          status: al.al_status || "selesai",
          dipanggil_at: al.dipanggil_at || null,
          selesai_at: al.selesai_at || null,
          catatan_tindakan: null,
          catatan_petugas: al.al_catatan_petugas || null,
          catatan_hasil_treatment: null,
          petugas: al.al_kode_karyawan
            ? {
                kode_karyawan: al.al_kode_karyawan,
                nama: al.petugas_nama || al.al_kode_karyawan,
                jabatan: al.petugas_jabatan || "petugas",
              }
            : null,
          rekam_medis: {
            kode_rekam_medis: headerRM.kode_rekam_medis || `RM-${headerRM.header_rm_id || key}`,
            no_sip: headerRM.no_sip || null,
            keluhan: headerRM.keluhan || "-",
            durasi_keluhan: headerRM.durasi_keluhan || null,
            riwayat_alergi: headerRM.riwayat_alergi || null,
            riwayat_treatment: headerRM.riwayat_treatment || null,
            pemeriksaan_acne: headerRM.pemeriksaan_acne || null,
            pemeriksaan_inflammation: headerRM.pemeriksaan_inflammation || null,
            pemeriksaan_skin_type: headerRM.pemeriksaan_skin_type || null,
            pemeriksaan_pigmentation: headerRM.pemeriksaan_pigmentation || null,
            pemeriksaan_sensitivity: headerRM.pemeriksaan_sensitivity || null,
            diagnosis: headerRM.diagnosis || "-",
            subjective: headerRM.subjective || null,
            objective: headerRM.objective || null,
            assessment: headerRM.assessment || null,
            plan: headerRM.plan || null,
            data_form: {},
            formatted_data_form: [],
            fotos: [],
            dokter_penanggung_jawab: headerRM.kode_karyawan
              ? {
                  kode_karyawan: headerRM.kode_karyawan,
                  nama: headerRM.dokter_nama || headerRM.kode_karyawan,
                  jabatan: headerRM.dokter_jabatan || "dokter",
                }
              : null,
          },
        };
      });

      // 6. Ambil data terstruktur per ruangan dari trx_rekam_medis_ruangan
      const vaRuanganRows = await DB("trx_rekam_medis_ruangan as rmr")
        .leftJoin("mst_karyawan as p", function () {
          this.on("rmr.kode_karyawan", "=", "p.no_sip")
            .orOn("rmr.kode_karyawan", "=", "p.kode_user")
            .orOn("rmr.kode_karyawan", "=", "p.kode_karyawan");
        })
        .leftJoin("trx_antrian_layanan as al", "rmr.kode_antrian_layanan", "al.kode_antrian_layanan")
        .leftJoin("trx_detail_antrian_layanan as dal", "al.kode_antrian_layanan", "dal.kode_antrian_layanan")
        .whereIn("rmr.kode_kunjungan", kodeKunjunganList)
        .select(
          "rmr.id as rmr_id",
          "rmr.id_rekam_medis",
          "rmr.kode_rekam_medis_ruangan",
          "rmr.kode_kunjungan",
          "rmr.kode_antrian_layanan",
          "rmr.kode_ruangan",
          "rmr.nama_ruangan",
          "rmr.data_form",
          "rmr.catatan_tindakan",
          "rmr.catatan_petugas",
          "rmr.catatan_hasil_treatment",
          "rmr.status as status_ruangan",
          "rmr.created_at",
          "rmr.kode_karyawan as rmr_kode_karyawan",
          "p.nama as petugas_nama",
          "p.jabatan as petugas_jabatan",
          "dal.nama_layanan",
          "dal.jenis_layanan",
          "dal.harga",
          "al.dipanggil_at",
          "al.selesai_at"
        );

      const rmrIds = vaRuanganRows.map((r) => r.rmr_id);

      // Fetch foto before/after via id_rekam_medis_ruangan (atau id_rekam_medis fallback)
      let mapFotosRmr = {};
      if (rmrIds.length > 0 || rmHeaderIds.length > 0) {
        const fotoRows = await DB("trx_rekam_medis_foto")
          .modify((qb) => {
            if (rmrIds.length > 0 && rmHeaderIds.length > 0) {
              qb.whereIn("id_rekam_medis_ruangan", rmrIds).orWhereIn("id_rekam_medis", rmHeaderIds);
            } else if (rmrIds.length > 0) {
              qb.whereIn("id_rekam_medis_ruangan", rmrIds);
            } else {
              qb.whereIn("id_rekam_medis", rmHeaderIds);
            }
          })
          .select("*");

        fotoRows.forEach((f) => {
          const targetKey = f.id_rekam_medis_ruangan ? `RMR_${f.id_rekam_medis_ruangan}` : `RM_${f.id_rekam_medis}`;
          if (!mapFotosRmr[targetKey]) mapFotosRmr[targetKey] = [];

          const existingIdx = mapFotosRmr[targetKey].findIndex((x) => x.tipe === f.tipe);
          if (existingIdx !== -1) {
            mapFotosRmr[targetKey][existingIdx] = { id: f.id, tipe: f.tipe, url_foto: f.url_foto };
          } else {
            mapFotosRmr[targetKey].push({ id: f.id, tipe: f.tipe, url_foto: f.url_foto });
          }
        });
      }

      // Merge data dari trx_rekam_medis_ruangan
      vaRuanganRows.forEach((item) => {
        const kKunjungan = item.kode_kunjungan;
        if (!mapLayanan[kKunjungan]) mapLayanan[kKunjungan] = {};

        const headerRM = headerRmMap[kKunjungan] || {};
        const keyRuangan = item.kode_antrian_layanan || item.kode_rekam_medis_ruangan || `RMR-${item.rmr_id}`;

        let parsedDataForm = {};
        if (item.data_form) {
          try {
            parsedDataForm = typeof item.data_form === "string" ? JSON.parse(item.data_form) : item.data_form;
          } catch (_) {
            parsedDataForm = {};
          }
        }

        const roomLabels = labelMap[item.kode_ruangan] || {};
        const formattedForm = Object.entries(parsedDataForm || {}).map(([k, v]) => {
          const label = roomLabels[k] || k.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          return { key: k, label: label, value: v };
        });

        const fotosRoom = mapFotosRmr[`RMR_${item.rmr_id}`] || mapFotosRmr[`RM_${item.id_rekam_medis}`] || [];

        mapLayanan[kKunjungan][keyRuangan] = {
          kode_antrian_layanan: item.kode_antrian_layanan || keyRuangan,
          kode_rekam_medis_ruangan: item.kode_rekam_medis_ruangan,
          nama_layanan: item.nama_layanan || mapLayanan[kKunjungan]?.[keyRuangan]?.nama_layanan || "Sesi Pelayanan Ruangan",
          jenis_layanan: item.jenis_layanan || mapLayanan[kKunjungan]?.[keyRuangan]?.jenis_layanan || "layanan",
          harga: parseFloat(item.harga || mapLayanan[kKunjungan]?.[keyRuangan]?.harga || 0),
          kode_ruangan: item.kode_ruangan || mapLayanan[kKunjungan]?.[keyRuangan]?.kode_ruangan,
          nama_ruangan: item.nama_ruangan || mapLayanan[kKunjungan]?.[keyRuangan]?.nama_ruangan || "Ruangan Treatment",
          status: item.status_ruangan || "selesai",
          dipanggil_at: item.dipanggil_at || mapLayanan[kKunjungan]?.[keyRuangan]?.dipanggil_at || null,
          selesai_at: item.selesai_at || mapLayanan[kKunjungan]?.[keyRuangan]?.selesai_at || null,
          catatan_tindakan: item.catatan_tindakan || null,
          catatan_petugas: item.catatan_petugas || null,
          catatan_hasil_treatment: item.catatan_hasil_treatment || null,
          petugas: item.rmr_kode_karyawan
            ? {
                kode_karyawan: item.rmr_kode_karyawan,
                nama: item.petugas_nama || item.rmr_kode_karyawan,
                jabatan: item.petugas_jabatan || "petugas",
              }
            : mapLayanan[kKunjungan]?.[keyRuangan]?.petugas || null,
          rekam_medis: {
            kode_rekam_medis: headerRM.kode_rekam_medis || `RM-${headerRM.header_rm_id || item.rmr_id}`,
            no_sip: headerRM.no_sip || null,
            keluhan: headerRM.keluhan || "-",
            durasi_keluhan: headerRM.durasi_keluhan || null,
            riwayat_alergi: headerRM.riwayat_alergi || null,
            riwayat_treatment: headerRM.riwayat_treatment || null,
            pemeriksaan_acne: headerRM.pemeriksaan_acne || null,
            pemeriksaan_inflammation: headerRM.pemeriksaan_inflammation || null,
            pemeriksaan_skin_type: headerRM.pemeriksaan_skin_type || null,
            pemeriksaan_pigmentation: headerRM.pemeriksaan_pigmentation || null,
            pemeriksaan_sensitivity: headerRM.pemeriksaan_sensitivity || null,
            diagnosis: headerRM.diagnosis || "-",
            subjective: headerRM.subjective || null,
            objective: headerRM.objective || null,
            assessment: headerRM.assessment || null,
            plan: headerRM.plan || null,
            data_form: parsedDataForm,
            formatted_data_form: formattedForm,
            fotos: fotosRoom,
            dokter_penanggung_jawab: headerRM.kode_karyawan
              ? {
                  kode_karyawan: headerRM.kode_karyawan,
                  nama: headerRM.dokter_nama || headerRM.kode_karyawan,
                  jabatan: headerRM.dokter_jabatan || "dokter",
                }
              : null,
          },
        };
      });
    }

    // 6. Assemble Kunjungan Records
    const kunjunganMap = {};
    vaKunjungan.forEach((k) => {
      const headerRM = headerRmMap[k.kode_kunjungan] || {};
      kunjunganMap[k.kode_kunjungan] = {
        kode_kunjungan: k.kode_kunjungan,
        no_rm: k.no_rm,
        nama_pasien: k.nama_pasien || "-",
        nik: k.nik || "-",
        jenis_kelamin: k.jenis_kelamin || "-",
        tanggal_lahir: k.tanggal_lahir || null,
        no_hp: k.no_hp || "-",
        alergi: k.alergi || null,
        tanggal_kunjungan: k.tanggal_kunjungan,
        jam_datang: k.jam_datang ? String(k.jam_datang).slice(0, 5) : "-",
        status_kunjungan: k.status_kunjungan || "selesai",
        header_rekam_medis: headerRM,
        layanan: mapLayanan[k.kode_kunjungan] ? Object.values(mapLayanan[k.kode_kunjungan]) : [],
      };
    });

    const resultData = Object.values(kunjunganMap).sort((a, b) =>
      a.tanggal_kunjungan < b.tanggal_kunjungan ? 1 : -1
    );

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data riwayat rekam medis berhasil dimuat",
      datetime: formatDateSystem(),
      total_data: totalRecords,
      data: resultData,
    });
  } catch (error) {
    const oResult = {
      status: status.BAD_REQUEST,
      message: "Sistem sedang maintenance harap tunggu sebentar",
      datetime: formatDateSystem(),
    };

    Logging(error, {
      file: "/master/rekam_medis/rekam_medis_pasien.js",
      func: "get_rekam_medis",
      request: oPayload,
      response: oResult,
      user: username,
    });

    return res.status(500).json(oResult);
  }
};

router.get("/:no_rm", handleGetRekamMedis);
router.post("/:no_rm", handleGetRekamMedis);
router.post("/", handleGetRekamMedis);

export default router;
