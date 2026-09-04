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
      { nama: Joi.string().max(100).required().label("Nama Kategori"), deskripsi: Joi.string().max(255).allow("", null).label("Deskripsi"), status: Joi.string().valid("aktif", "nonaktif").required().label("Status") },
      { "any.required": "{#label} wajib diisi", "string.empty": "{#label} tidak boleh kosong" },
      oPayload, { uniqueField: ["nama"], table: "mst_kategori_produk", allowUnknown: true }
    );
    if (cValidation) return res.status(422).json({ status: status.BAD_REQUEST, message: cValidation, datetime: formatDateSystem() });
    let kode = "";
    await DB.transaction(async (trx) => {
      const rows = await trx("mst_kategori_produk")
        .where("kode_kategori_produk", "like", "KATPRD-%")
        .select("kode_kategori_produk");

      let maxNum = 0;
      for (const row of rows) {
        if (row.kode_kategori_produk) {
          const match = String(row.kode_kategori_produk).match(/^KATPRD-(\d+)$/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      }

      let candidateNum = maxNum + 1;
      while (true) {
        const candidateKode = `KATPRD-${String(candidateNum).padStart(3, "0")}`;
        const exists = await trx("mst_kategori_produk").where("kode_kategori_produk", candidateKode).first();
        if (!exists) {
          kode = candidateKode;
          break;
        }
        candidateNum++;
      }

      const oData = { kode_kategori_produk: kode, nama: oPayload.nama, deskripsi: oPayload.deskripsi || null, status: oPayload.status, tz: oPayload.tz || "UTC", created_by: username, created_at: formatDateSystem(), updated_by: username, updated_at: formatDateSystem() };
      await trx("mst_kategori_produk").insert(oData);
      await ChangesLog({ description: `Tambah Kategori Produk ${kode}`, tableName: "mst_kategori_produk", referenceCode: kode, action: "CREATE", dataBefore: null, dataAfter: oData, user: username, tz: oPayload.tz || "UTC" }, trx);
    });
    return res.status(200).json({ status: status.SUKSES, message: "Kategori produk berhasil ditambahkan", datetime: formatDateSystem(), data: { kode_kategori_produk: kode } });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: error.message || "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/kategori_produk/kategori_produk_create.js", func: "create", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});
export default router;
