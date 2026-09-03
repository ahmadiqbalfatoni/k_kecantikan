'use client';

import React from 'react';
import { Chart } from 'primereact/chart';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Image } from 'primereact/image';
import { ProgressBar } from 'primereact/progressbar';

export const formatRupiah = (num: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num || 0);
};

export const formatDateIndo = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch (_) {
    return dateStr;
  }
};

/* =========================================================================
   1. VIEW OWNER / MANAGER
   ========================================================================= */
export const OwnerManagerView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({
  data,
  onRefresh,
  loading,
}) => {
  const owner = data?.owner || {};
  const kpi = owner.kpi || {};
  const inventory = owner.inventory || {};
  const sdm = owner.sdm || {};

  // Doughnut Chart: Metode Bayar
  const metodeLabels = (owner.metode_bayar || []).map((m: any) => String(m.metode_bayar || 'TUNAI').toUpperCase());
  const metodeNominals = (owner.metode_bayar || []).map((m: any) => parseFloat(m.nominal || 0));

  const metodeChartData = {
    labels: metodeLabels.length > 0 ? metodeLabels : ['TUNAI', 'QRIS', 'DEBIT', 'TRANSFER'],
    datasets: [
      {
        data: metodeNominals.length > 0 ? metodeNominals : [2500000, 1500000, 800000, 655000],
        backgroundColor: ['#22c55e', '#0284c7', '#8b5cf6', '#f59e0b'],
        hoverBackgroundColor: ['#16a34a', '#0369a1', '#7c3aed', '#d97706'],
      },
    ],
  };

  const metodeChartOptions = {
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 12, font: { size: 11 } },
      },
    },
    cutout: '65%',
  };

  // Bar Chart: Top Treatment
  const topTreatments = owner.top_treatment || [];
  const treatmentChartData = {
    labels: topTreatments.map((t: any) => t.nama_layanan?.substring(0, 15) || 'Treatment'),
    datasets: [
      {
        label: 'Jumlah Sesi',
        backgroundColor: '#0284c7',
        borderRadius: 6,
        data: topTreatments.map((t: any) => t.total_sesi || 0),
      },
    ],
  };

  const treatmentChartOptions = {
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
    },
  };

  return (
    <div className="flex flex-column gap-4">
      {/* 5 KPI CARDS SESUAI DIAGRAM GAMBAR 2 */}
      <div className="grid">
        {/* KPI 1: KPI KLINIK */}
        <div className="col-12 sm:col-6 lg:col">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">KPI KLINIK</span>
                <span className="p-2 border-round-xl bg-blue-50 text-blue-600 flex align-items-center justify-content-center" style={{ borderRadius: '10px' }}>
                  <i className="pi pi-users text-sm" />
                </span>
              </div>
              <div className="text-2xl font-black text-gray-800">{kpi.total_pasien || 0}</div>
              <span className="text-xs text-gray-500">Pasien Terdaftar</span>
            </div>
            <div className="mt-2 pt-2 border-top-1 surface-border text-xs text-blue-600 font-semibold flex align-items-center gap-1">
              <i className="pi pi-calendar-plus" />
              <span>{kpi.kunjungan_hari_ini || 0} Kunjungan Hari Ini</span>
            </div>
          </div>
        </div>

        {/* KPI 2: PENDAPATAN */}
        <div className="col-12 sm:col-6 lg:col">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">PENDAPATAN</span>
                <span className="p-2 border-round-xl bg-emerald-50 text-emerald-600 flex align-items-center justify-content-center" style={{ borderRadius: '10px' }}>
                  <i className="pi pi-wallet text-sm" />
                </span>
              </div>
              <div className="text-xl font-black text-emerald-700">{formatRupiah(kpi.omzet_total || 0)}</div>
              <span className="text-xs text-gray-500">Total Akumulasi Omzet</span>
            </div>
            <div className="mt-2 pt-2 border-top-1 surface-border text-xs text-emerald-600 font-semibold flex align-items-center gap-1">
              <i className="pi pi-arrow-up-right" />
              <span>Hari ini: {formatRupiah(kpi.omzet_hari_ini || 0)}</span>
            </div>
          </div>
        </div>

        {/* KPI 3: TREATMENT */}
        <div className="col-12 sm:col-6 lg:col">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">TREATMENT</span>
                <span className="p-2 border-round-xl bg-purple-50 text-purple-600 flex align-items-center justify-content-center" style={{ borderRadius: '10px' }}>
                  <i className="pi pi-sparkles text-sm" />
                </span>
              </div>
              <div className="text-2xl font-black text-gray-800">{topTreatments.length}</div>
              <span className="text-xs text-gray-500">Varian Layanan Aktif</span>
            </div>
            <div className="mt-2 pt-2 border-top-1 surface-border text-xs text-purple-600 font-semibold flex align-items-center gap-1">
              <i className="pi pi-check-circle" />
              <span>Sesi Layanan Tersedia</span>
            </div>
          </div>
        </div>

        {/* KPI 4: INVENTORY */}
        <div className="col-12 sm:col-6 lg:col">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">INVENTORY</span>
                <span className="p-2 border-round-xl bg-amber-50 text-amber-600 flex align-items-center justify-content-center" style={{ borderRadius: '10px' }}>
                  <i className="pi pi-box text-sm" />
                </span>
              </div>
              <div className="text-2xl font-black text-gray-800">{inventory.total_sku || 0} SKU</div>
              <span className="text-xs text-gray-500">Nilai: {formatRupiah(inventory.total_aset || 0)}</span>
            </div>
            <div className="mt-2 pt-2 border-top-1 surface-border text-xs text-amber-700 font-semibold flex align-items-center gap-1">
              <i className="pi pi-exclamation-triangle" />
              <span>{inventory.stok_menipis || 0} Stok Menipis</span>
            </div>
          </div>
        </div>

        {/* KPI 5: PERFORMA SDM */}
        <div className="col-12 sm:col-6 lg:col">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1 h-full flex flex-column justify-content-between">
            <div>
              <div className="flex justify-content-between align-items-center mb-2">
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">PERFORMA SDM</span>
                <span className="p-2 border-round-xl bg-indigo-50 text-indigo-600 flex align-items-center justify-content-center" style={{ borderRadius: '10px' }}>
                  <i className="pi pi-id-card text-sm" />
                </span>
              </div>
              <div className="text-2xl font-black text-gray-800">
                {(sdm.dokter?.length || 0) + (sdm.beautician?.length || 0)} Staf
              </div>
              <span className="text-xs text-gray-500">Dokter &amp; Beautician</span>
            </div>
            <div className="mt-2 pt-2 border-top-1 surface-border text-xs text-indigo-600 font-semibold flex align-items-center gap-1">
              <i className="pi pi-chart-line" />
              <span>Siap Melayani Pasien</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS & TABLES ROW */}
      <div className="grid">
        {/* GRAFIK METODE BAYAR */}
        <div className="col-12 lg:col-5">
          <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 h-full">
            <div className="flex justify-content-between align-items-center mb-3">
              <span className="font-bold text-base text-gray-800">Komposisi Metode Pembayaran</span>
              <Tag value="REAL-TIME" severity="info" className="text-[10px]" />
            </div>
            <div className="flex justify-content-center" style={{ height: '220px' }}>
              <Chart type="doughnut" data={metodeChartData} options={metodeChartOptions} className="w-full" />
            </div>
          </div>
        </div>

        {/* GRAFIK TREATMENT TERPOPULER */}
        <div className="col-12 lg:col-7">
          <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 h-full">
            <div className="flex justify-content-between align-items-center mb-3">
              <span className="font-bold text-base text-gray-800">Treatment Paling Banyak Diminati</span>
              <Tag value="TOP 5" severity="success" className="text-[10px]" />
            </div>
            <div style={{ height: '220px' }}>
              <Chart type="bar" data={treatmentChartData} options={treatmentChartOptions} className="h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* PERFORMA SDM LIST */}
      <div className="grid">
        <div className="col-12 md:col-6">
          <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
            <span className="font-bold text-sm text-gray-800 block mb-3">Aktivitas Dokter Spesialis</span>
            <DataTable value={sdm.dokter || []} size="small" emptyMessage="Belum ada data aktivitas dokter.">
              <Column field="nama" header="Nama Dokter" className="font-semibold text-xs" />
              <Column
                field="total_konsul"
                header="Konsultasi &amp; RM"
                body={(r) => <span className="font-bold text-emerald-700">{r.total_konsul || 0} Pasien</span>}
                style={{ textAlign: 'center' }}
              />
            </DataTable>
          </div>
        </div>

        <div className="col-12 md:col-6">
          <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
            <span className="font-bold text-sm text-gray-800 block mb-3">Aktivitas Beautician &amp; Terapis</span>
            <DataTable value={sdm.beautician || []} size="small" emptyMessage="Belum ada data aktivitas beautician.">
              <Column field="nama" header="Nama Petugas" className="font-semibold text-xs" />
              <Column
                field="jabatan"
                header="Jabatan"
                body={(r) => <Tag value={String(r.jabatan || '').toUpperCase()} severity="info" className="text-[10px]" />}
              />
              <Column
                field="total_tindakan"
                header="Sesi Ditangani"
                body={(r) => <span className="font-bold text-purple-700">{r.total_tindakan || 0} Tindakan</span>}
                style={{ textAlign: 'center' }}
              />
            </DataTable>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   2. VIEW DOKTER
   ========================================================================= */
export const DokterView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({ data }) => {
  const dokter = data?.dokter || {};
  const antrean = dokter.antrean || [];
  const rekamMedis = dokter.rekam_medis || [];

  return (
    <div className="flex flex-column gap-4">
      {/* 4 KPI CARDS SESUAI DIAGRAM GAMBAR 2 */}
      <div className="grid">
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">PASIEN HARI INI</span>
            <div className="text-2xl font-black text-teal-900">{dokter.total_antrean_hari_ini || 0} Pasien</div>
            <span className="text-xs text-gray-500">Antrean konsultasi &amp; tindakan</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">REKAM MEDIS</span>
            <div className="text-2xl font-black text-emerald-900">{dokter.total_konsul_selesai || 0} Riwayat</div>
            <span className="text-xs text-gray-500">Pemeriksaan klinis tercatat</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">TREATMENT PLAN</span>
            <div className="text-2xl font-black text-blue-900">100%</div>
            <span className="text-xs text-gray-500">Rencana terapi terstruktur</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">FOLLOW UP</span>
            <div className="text-2xl font-black text-amber-900">Aktif</div>
            <span className="text-xs text-gray-500">Monitoring kondisi pasca tindakan</span>
          </div>
        </div>
      </div>

      {/* ANTREAN PASIEN DOKTER */}
      <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
        <div className="flex justify-content-between align-items-center mb-3">
          <div>
            <span className="text-base font-bold text-gray-800 block">Antrean Konsultasi &amp; Tindakan Dokter</span>
            <span className="text-xs text-gray-500">Daftar pasien yang siap diperiksa di ruang konsultasi</span>
          </div>
        </div>

        <DataTable value={antrean} size="small" responsiveLayout="scroll" emptyMessage="Tidak ada antrean dokter saat ini.">
          <Column field="no_rm" header="No. RM" body={(r) => <span className="font-bold text-blue-700">{r.no_rm}</span>} />
          <Column field="nama_pasien" header="Nama Pasien" className="font-semibold text-gray-800" />
          <Column field="nama_layanan" header="Layanan Dituju" body={(r) => r.nama_layanan || 'Konsultasi Medis'} />
          <Column field="nama_ruangan" header="Ruangan" />
          <Column
            field="status"
            header="Status"
            body={(r) => (
              <Tag
                value={String(r.status || 'MENUNGGU').toUpperCase()}
                severity={r.status === 'selesai' ? 'success' : r.status === 'berlangsung' ? 'info' : 'warning'}
                className="text-[10px]"
              />
            )}
          />
        </DataTable>
      </div>

      {/* REKAM MEDIS & TREATMENT PLAN LOG */}
      <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
        <span className="text-base font-bold text-gray-800 block mb-3">Riwayat Rekam Medis &amp; Diagnosis Terbaru</span>
        <DataTable value={rekamMedis} size="small" responsiveLayout="scroll" emptyMessage="Belum ada catatan rekam medis.">
          <Column field="kode_rekam_medis" header="Kode RM" className="font-bold text-purple-700" />
          <Column field="nama_pasien" header="Pasien" className="font-semibold" />
          <Column field="keluhan" header="Keluhan Utama" body={(r) => r.keluhan || '-'} />
          <Column field="diagnosis" header="Diagnosa Medis" body={(r) => <span className="font-semibold text-rose-700">{r.diagnosis || '-'}</span>} />
          <Column field="plan" header="Treatment Plan / Tindakan" body={(r) => r.plan || '-'} />
          <Column field="nama_dokter" header="Dokter Pemeriksa" />
        </DataTable>
      </div>
    </div>
  );
};

/* =========================================================================
   3. VIEW BEAUTICIAN
   ========================================================================= */
export const BeauticianView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({ data }) => {
  const beautician = data?.beautician || {};
  const antrean = beautician.antrean || [];
  const fotos = beautician.foto_before_after || [];

  return (
    <div className="flex flex-column gap-4">
      {/* 4 KPI CARDS SESUAI DIAGRAM GAMBAR 2 */}
      <div className="grid">
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block mb-1">TREATMENT HARI INI</span>
            <div className="text-2xl font-black text-purple-900">{beautician.total_tindakan || 0} Tindakan</div>
            <span className="text-xs text-gray-500">Sesi perawatan estetika &amp; facial</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">ANTRIAN RUANGAN</span>
            <div className="text-2xl font-black text-blue-900">{antrean.length} Pasien</div>
            <span className="text-xs text-gray-500">Perawatan di ruang treatment</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">SOP TREATMENT</span>
            <div className="text-2xl font-black text-emerald-900">Standar ISO</div>
            <span className="text-xs text-gray-500">Sterilisasi &amp; higienitas terjamin</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">BEFORE AFTER</span>
            <div className="text-2xl font-black text-rose-900">{fotos.length} Dokumentasi</div>
            <span className="text-xs text-gray-500">Galeri perubahan klinis pasien</span>
          </div>
        </div>
      </div>

      {/* ANTREAN RUANGAN TREATMENT */}
      <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
        <span className="text-base font-bold text-gray-800 block mb-3">Daftar Antrean Tindakan Beautician / Terapis</span>
        <DataTable value={antrean} size="small" responsiveLayout="scroll" emptyMessage="Belum ada jadwal tindakan saat ini.">
          <Column field="kode_antrian_layanan" header="Kode Sesi" className="font-bold text-blue-700" />
          <Column field="nama_pasien" header="Nama Pasien" className="font-semibold text-gray-800" />
          <Column field="nama_layanan" header="Tindakan / Facial" className="font-semibold text-purple-700" />
          <Column field="nama_ruangan" header="Ruangan Perawatan" />
          <Column
            field="status"
            header="Status"
            body={(r) => (
              <Tag
                value={String(r.status || 'MENUNGGU').toUpperCase()}
                severity={r.status === 'selesai' ? 'success' : 'info'}
              />
            )}
          />
        </DataTable>
      </div>

      {/* SOP CHECKLIST & BEFORE AFTER GALLERY */}
      <div className="grid">
        <div className="col-12 md:col-6">
          <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 h-full">
            <span className="font-bold text-sm text-gray-800 block mb-2">Checklist SOP Prosedur Treatment</span>
            <ul className="list-none p-0 m-0 flex flex-column gap-2 text-xs">
              <li className="p-2 border-round bg-gray-50 flex align-items-center gap-2">
                <i className="pi pi-check-circle text-emerald-600 font-bold" />
                <span>1. Sanitasi tangan &amp; sterilisasi seluruh alat treatment sebelum digunakan</span>
              </li>
              <li className="p-2 border-round bg-gray-50 flex align-items-center gap-2">
                <i className="pi pi-check-circle text-emerald-600 font-bold" />
                <span>2. Double cleansing &amp; skin prep sesuai jenis kulit pasien</span>
              </li>
              <li className="p-2 border-round bg-gray-50 flex align-items-center gap-2">
                <i className="pi pi-check-circle text-emerald-600 font-bold" />
                <span>3. Tindakan treatment utama sesuai arahan dokter &amp; rekam medis</span>
              </li>
              <li className="p-2 border-round bg-gray-50 flex align-items-center gap-2">
                <i className="pi pi-check-circle text-emerald-600 font-bold" />
                <span>4. Aplikasi calming mask / soothing serum &amp; sunscreen</span>
              </li>
              <li className="p-2 border-round bg-gray-50 flex align-items-center gap-2">
                <i className="pi pi-check-circle text-emerald-600 font-bold" />
                <span>5. Dokumentasi foto after &amp; edukasi aftercare ke pasien</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="col-12 md:col-6">
          <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 h-full">
            <span className="font-bold text-sm text-gray-800 block mb-2">Galeri Foto Klinis Before / After</span>
            {fotos.length === 0 ? (
              <div className="text-xs text-gray-400 italic text-center py-4">Belum ada foto before/after yang diunggah.</div>
            ) : (
              <div className="grid">
                {fotos.slice(0, 4).map((f: any, idx: number) => (
                  <div key={idx} className="col-6">
                    <div className="border-round-lg overflow-hidden border-1 surface-border relative">
                      <Image
                        src={f.url_foto ? `http://localhost:8000${f.url_foto}` : '/layout/images/placeholder.png'}
                        alt={f.nama_pasien || 'Foto'}
                        width="100%"
                        height="80"
                        preview
                        imageClassName="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 left-0 right-0 bg-gray-900/80 text-white text-[9px] font-bold text-center py-0.5">
                        {String(f.tipe || 'FOTO').toUpperCase()} - {f.nama_pasien}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. VIEW KASIR
   ========================================================================= */
export const KasirView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({ data }) => {
  const kasir = data?.kasir || {};
  const summary = kasir.summary || {};
  const transaksi = kasir.transaksi || [];

  return (
    <div className="flex flex-column gap-4">
      {/* 4 KPI CARDS SESUAI DIAGRAM GAMBAR 2 */}
      <div className="grid">
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">TRANSAKSI</span>
            <div className="text-2xl font-black text-emerald-900">{summary.total_transaksi || 0} Trx</div>
            <span className="text-xs text-gray-500">Transaksi kasir tercatat</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">PAYMENT</span>
            <div className="text-2xl font-black text-blue-900">{formatRupiah(summary.total_bayar || 0)}</div>
            <span className="text-xs text-gray-500">Penerimaan kas bersih</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block mb-1">INVOICE</span>
            <div className="text-2xl font-black text-indigo-900">{summary.total_transaksi || 0} Siap Cetak</div>
            <span className="text-xs text-gray-500">Struk tagihan resmi klinik</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">REFUND / DISKON</span>
            <div className="text-2xl font-black text-rose-900">{formatRupiah(summary.total_diskon || 0)}</div>
            <span className="text-xs text-gray-500">Potongan promo &amp; voucher</span>
          </div>
        </div>
      </div>

      {/* TRANSAKSI TERBARU SIAP CETAK INVOICE */}
      <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
        <span className="text-base font-bold text-gray-800 block mb-3">Log Transaksi Kasir Hari Ini &amp; Pembayaran</span>
        <DataTable value={transaksi} size="small" responsiveLayout="scroll" emptyMessage="Belum ada transaksi kasir hari ini.">
          <Column field="kode_transaksi" header="Kode Trx" className="font-bold text-blue-700" />
          <Column
            field="nama_pasien"
            header="Pasien"
            body={(r) => (
              <div>
                <span className="font-semibold text-gray-800 block">{r.nama_pasien || 'Umum'}</span>
                <span className="text-[10px] text-gray-400">{r.no_rm || 'Non-RM'}</span>
              </div>
            )}
          />
          <Column
            field="metode_bayar"
            header="Metode Bayar"
            body={(r) => (
              <Tag value={String(r.metode_bayar || 'TUNAI').toUpperCase()} severity="info" className="text-[10px]" />
            )}
          />
          <Column
            field="total_bayar"
            header="Total Bayar"
            body={(r) => <span className="font-bold text-emerald-700">{formatRupiah(r.total_bayar)}</span>}
            style={{ textAlign: 'right' }}
          />
          <Column
            field="status"
            header="Status"
            body={(r) => (
              <Tag
                value={String(r.status || 'LUNAS').toUpperCase()}
                severity={r.status === 'lunas' || r.status === 'selesai' ? 'success' : 'warning'}
                className="text-[10px]"
              />
            )}
          />
        </DataTable>
      </div>
    </div>
  );
};

/* =========================================================================
   5. VIEW WAREHOUSE
   ========================================================================= */
export const WarehouseView: React.FC<{ data: any; onRefresh: () => void; loading: boolean }> = ({ data }) => {
  const warehouse = data?.warehouse || {};
  const summary = warehouse.summary || {};
  const stock = warehouse.stock || [];
  const pos = warehouse.purchase_orders || [];

  return (
    <div className="flex flex-column gap-4">
      {/* 4 KPI CARDS SESUAI DIAGRAM GAMBAR 2 */}
      <div className="grid">
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider block mb-1">STOCK TOTAL</span>
            <div className="text-2xl font-black text-orange-900">{summary.total_sku || 0} SKU</div>
            <span className="text-xs text-gray-500">Katalog persediaan produk</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-1">LOW STOCK</span>
            <div className="text-2xl font-black text-amber-900">{summary.stok_menipis || 0} Item</div>
            <span className="text-xs text-gray-500">Perlu re-order ke supplier</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">EXPIRED ALERT</span>
            <div className="text-2xl font-black text-rose-900">{summary.stok_habis || 0} Habis</div>
            <span className="text-xs text-gray-500">Monitoring tanggal kadaluwarsa</span>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider block mb-1">RECEIVING (PO)</span>
            <div className="text-2xl font-black text-blue-900">{pos.length} Pesanan</div>
            <span className="text-xs text-gray-500">Penerimaan barang masuk</span>
          </div>
        </div>
      </div>

      {/* MONITORING STOK GUDANG */}
      <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
        <span className="text-base font-bold text-gray-800 block mb-3">Monitoring Stok Produk &amp; Bahan Medis</span>
        <DataTable value={stock} size="small" responsiveLayout="scroll" emptyMessage="Belum ada data stok produk.">
          <Column field="kode_produk" header="Kode" className="font-bold text-blue-700" />
          <Column field="nama" header="Nama Produk" className="font-semibold text-gray-800" />
          <Column field="kategori" header="Kategori" body={(r) => r.kategori || '-'} />
          <Column
            field="stok_tersedia"
            header="Sisa Stok"
            body={(r) => (
              <span className={r.stok_tersedia <= r.stok_minimum ? 'text-red-600 font-bold' : 'text-gray-800 font-semibold'}>
                {r.stok_tersedia} {r.satuan}
              </span>
            )}
            style={{ textAlign: 'center' }}
          />
          <Column
            field="stok_minimum"
            header="Min. Stok"
            body={(r) => `${r.stok_minimum} ${r.satuan}`}
            style={{ textAlign: 'center' }}
          />
          <Column
            header="Status Stok"
            body={(r) => (
              <Tag
                value={r.stok_tersedia <= 0 ? 'HABIS' : r.stok_tersedia <= r.stok_minimum ? 'MENIPIS' : 'AMAN'}
                severity={r.stok_tersedia <= 0 ? 'danger' : r.stok_tersedia <= r.stok_minimum ? 'warning' : 'success'}
              />
            )}
          />
        </DataTable>
      </div>

      {/* LOG RECEIVING / PURCHASE ORDER */}
      <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
        <span className="text-base font-bold text-gray-800 block mb-3">Log Penerimaan Barang / Purchase Order (Receiving)</span>
        <DataTable value={pos} size="small" responsiveLayout="scroll" emptyMessage="Belum ada Purchase Order terdaftar.">
          <Column field="kode_po" header="Kode PO" className="font-bold text-blue-700" />
          <Column field="nama_supplier" header="Supplier" className="font-semibold" />
          <Column field="tanggal_po" header="Tanggal PO" body={(r) => formatDateIndo(r.tanggal_po)} />
          <Column
            field="total_po"
            header="Nominal PO"
            body={(r) => <span className="font-bold text-emerald-700">{formatRupiah(r.total_po)}</span>}
            style={{ textAlign: 'right' }}
          />
          <Column
            field="status"
            header="Status"
            body={(r) => (
              <Tag
                value={String(r.status || 'DRAFT').toUpperCase()}
                severity={r.status === 'selesai' ? 'success' : 'info'}
              />
            )}
          />
        </DataTable>
      </div>
    </div>
  );
};
