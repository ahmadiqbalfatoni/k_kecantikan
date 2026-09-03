import express from "express";
import DB from "../../../../core/config/knex.js";
import { formatDateSystem } from "../../components/tools/date_tools.js";
import { Logging } from "../../components/tools/servertool.js";
import { status } from "../../components/tools/general.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const oPayload = req.body;
  const username = req?.auth?.username || "";
  const keyword = oPayload.keyword || "";
  const filterKodePromo = oPayload.kode_promo || null;
  const filterJenisItem = oPayload.jenis_item || null;
  const filterStatus = oPayload.status || null;
  const page = parseInt(oPayload.page) || 1;
  const perPage = parseInt(oPayload.perPage) || 10;
  const hasPagination = oPayload.page !== undefined || oPayload.perPage !== undefined;

  try {
    const hasStatusCol = await DB.schema.hasColumn("mst_detail_promo", "status");
    if (!hasStatusCol) {
      await DB.schema.table("mst_detail_promo", (table) => {
        table.enum("status", ["aktif", "nonaktif"]).notNullable().defaultTo("aktif").after("kode_item");
      });
    }

    const baseQuery = DB("mst_detail_promo as dp")
      .leftJoin("mst_promo as p", "dp.kode_promo", "p.kode_promo")
      .modify((qb) => {
        if (keyword) {
          const lower = keyword.toLowerCase();
          qb.where(function () {
            this.whereRaw("LOWER(dp.kode_detail_promo) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(dp.kode_promo) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(p.nama) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(dp.kode_item) LIKE ?", [`%${lower}%`])
              .orWhereRaw("LOWER(dp.jenis_item) LIKE ?", [`%${lower}%`]);
          });
        }
        if (filterKodePromo) qb.where("dp.kode_promo", filterKodePromo);
        if (filterJenisItem) qb.where("dp.jenis_item", filterJenisItem);
        if (filterStatus) qb.where("dp.status", filterStatus);
      });

    const selectFields = [
      "dp.id",
      "dp.kode_detail_promo",
      "dp.kode_promo",
      "p.nama as nama_promo",
      "p.jenis_diskon",
      "p.nilai_diskon",
      "dp.jenis_item",
      "dp.kode_item",
      "dp.status",
      "dp.created_by",
      "dp.created_at",
      "dp.updated_by",
      "dp.updated_at"
    ];

    let totalRecords = 0, vaData = [];
    if (hasPagination) {
      const offset = (page - 1) * perPage;
      const countResult = await baseQuery.clone().count("dp.id as total").first();
      totalRecords = parseInt(countResult.total || 0);
      vaData = await baseQuery.clone().select(selectFields).orderBy("dp.created_at", "desc").limit(perPage).offset(offset);
    } else {
      vaData = await baseQuery.clone().select(selectFields).orderBy("dp.created_at", "desc");
      totalRecords = vaData.length;
    }

    // Enrich nama_item based on jenis_item
    for (const row of vaData) {
      let namaItem = row.kode_item;
      if (row.jenis_item === "produk") {
        const item = await DB("mst_produk").where("kode_produk", row.kode_item).select("nama").first();
        namaItem = item?.nama || row.kode_item;
      } else if (row.jenis_item === "layanan") {
        const item = await DB("mst_layanan").where("kode_layanan", row.kode_item).select("nama").first();
        namaItem = item?.nama || row.kode_item;
      } else if (row.jenis_item === "paket") {
        const itemL = await DB("mst_paket_layanan").where("kode_paket_layanan", row.kode_item).select("nama").first();
        const itemP = itemL ? null : await DB("mst_paket_produk").where("kode_paket_produk", row.kode_item).select("nama").first();
        namaItem = itemL?.nama || itemP?.nama || row.kode_item;
      }
      row.nama_item = namaItem;
    }

    return res.status(200).json({
      status: status.SUKSES,
      message: "Data ditemukan",
      datetime: formatDateSystem(),
      data: vaData,
      total_data: totalRecords
    });
  } catch (error) {
    const oResult = { status: status.BAD_REQUEST, message: "Sistem sedang maintenance", datetime: formatDateSystem() };
    Logging(error, { file: "/master/detail_promo/detail_promo_data.js", func: "data", request: oPayload, response: oResult, user: username });
    return res.status(500).json(oResult);
  }
});

export default router;
