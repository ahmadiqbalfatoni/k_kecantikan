'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { Calendar } from 'primereact/calendar';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import postData from '@/lib/axios/postData';
import { showError } from '@/lib/tools/generalTools';
import { exportToXLSX } from '@/lib/tools/printTools/exportToXLSX';

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

/* REUSABLE KETERANGAN STATUS BAR (LEGEND) SESUAI DESIGN SYSTEM MASTER DATA */
const StatusLegendBar = ({ items }: { items: { label: string; color: string }[] }) => (
  <div className="flex flex-wrap align-items-center gap-3 px-2 py-2 mb-3 border-round-md surface-100 text-xs font-medium text-color-secondary">
    <span className="flex align-items-center gap-1">
      <i className="pi pi-info-circle text-gray-500" />
      <span className="font-semibold text-gray-700">KETERANGAN STATUS:</span>
    </span>
    {items.map((it, idx) => (
      <span key={idx} className="flex align-items-center gap-1.5 text-gray-700">
        <span
          style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            backgroundColor: it.color,
            boxShadow: `0 1px 3px ${it.color}55`,
          }}
        />
        {it.label}
      </span>
    ))}
  </div>
);

/* REUSABLE SQUARE STATUS INDICATOR COLUMN BODY */
const StatusSquare = ({ color, active, tooltip }: { color?: string; active?: boolean; tooltip?: string }) => {
  const bg = color || (active ? '#22c55e' : '#ef4444');
  return (
    <span
      style={{
        display: 'inline-block',
        width: '14px',
        height: '14px',
        borderRadius: '3px',
        backgroundColor: bg,
        boxShadow: `0 1px 3px ${bg}55`,
      }}
      title={tooltip || (active ? 'Aktif' : 'Tidak Aktif')}
    />
  );
};

const printHtmlTable = (title: string, columns: string[], rowsHtml: string, summaryHtml?: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 10px; }
          .header h2 { margin: 0; color: #0284c7; font-size: 18px; }
          .header h3 { margin: 4px 0 0 0; font-size: 14px; color: #334155; }
          .header p { margin: 4px 0 0 0; color: #64748b; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 7px; font-size: 11px; }
          th { background-color: #f1f5f9; text-transform: uppercase; font-size: 10px; }
          .footer { margin-top: 25px; text-align: right; font-size: 10px; color: #94a3b8; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>KLINIK KECANTIKAN</h2>
          <h3>${title.toUpperCase()}</h3>
          <p>Waktu Cetak: ${new Date().toLocaleString('id-ID')}</p>
        </div>
        ${summaryHtml || ''}
        <table>
          <thead>
            <tr>${columns.map((c) => `<th>${c}</th>`).join('')}</tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="footer">Dicetak oleh Sistem Klinik Kecantikan</div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
};

/* =========================================================================
   1. LAPORAN PENJUALAN VIEW
   ========================================================================= */
export const LaporanPenjualanView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [tglDari, setTglDari] = useState<Date | null>(null);
  const [tglSampai, setTglSampai] = useState<Date | null>(null);
  const [summary, setSummary] = useState<any>({});
  const [expandedRows, setExpandedRows] = useState<any>(null);
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const payload: any = {
        keyword,
        tanggal_dari: tglDari ? tglDari.toISOString().slice(0, 10) : null,
        tanggal_sampai: tglSampai ? tglSampai.toISOString().slice(0, 10) : null,
        perPage: 100,
      };
      const res = await postData('/master/laporan/penjualan', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat data penjualan');
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tglDari, tglSampai]);

  const handlePrint = () => {
    const cols = ['#', 'Kode Trx', 'Tgl', 'Pasien', 'No. RM', 'Metode', 'Total Bayar', 'Status'];
    const rows = data
      .map(
        (r, i) => `
      <tr>
        <td style="text-align: center">${i + 1}</td>
        <td><strong>${r.kode_transaksi}</strong></td>
        <td>${formatDateIndo(r.tanggal_transaksi)}</td>
        <td>${r.nama_pasien || 'Umum'}</td>
        <td style="text-align: center">${r.no_rm || '-'}</td>
        <td style="text-align: center; text-transform: uppercase">${r.metode_bayar}</td>
        <td style="text-align: right; font-weight: bold">${formatRupiah(r.total_bayar)}</td>
        <td style="text-align: center; text-transform: uppercase">${r.status}</td>
      </tr>
    `
      )
      .join('');
    const sumHtml = `
      <div style="display: flex; justify-content: space-around; background: #f8fafc; padding: 10px; border-radius: 6px;">
        <div><strong>Total Transaksi:</strong> ${summary.total_transaksi || 0} Data</div>
        <div><strong>Total Omzet:</strong> ${formatRupiah(summary.total_omzet || 0)}</div>
      </div>
    `;
    printHtmlTable('Laporan Penjualan', cols, rows, sumHtml);
  };

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Transaksi': r.kode_transaksi,
      Tanggal: formatDateIndo(r.tanggal_transaksi),
      Pasien: r.nama_pasien || 'Umum',
      'No. RM': r.no_rm || '-',
      'Metode Bayar': String(r.metode_bayar || '').toUpperCase(),
      'Total Bruto (Rp)': r.total_harga,
      'Total Diskon (Rp)': r.total_diskon,
      'Total Bayar (Rp)': r.total_bayar,
      Status: String(r.status || '').toUpperCase(),
    }));
    await exportToXLSX({ data: exportData, fileName: `Laporan_Penjualan_${new Date().toISOString().slice(0, 10)}` });
  };

  const rowExpansionTemplate = (tr: any) => (
    <div className="p-3 bg-gray-50 border-round-lg border-1 surface-border">
      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
        Rincian Item Transaksi ({tr.items?.length || 0} Item)
      </span>
      <div className="grid">
        {(tr.items || []).map((it: any, idx: number) => (
          <div key={idx} className="col-12 md:col-6 lg:col-4">
            <div className="bg-white p-2.5 border-round-md border-1 surface-border">
              <div className="font-semibold text-xs text-gray-800">{it.item_nama}</div>
              <div className="flex justify-content-between align-items-center mt-1 text-xs text-gray-500">
                <span>{it.qty}x @ {formatRupiah(it.harga_satuan)}</span>
                <span className="font-bold text-emerald-600">{formatRupiah(it.subtotal)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      {/* SUMMARY KPI */}
      <div className="grid mb-4">
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="p-3 bg-blue-50 border-round-xl border-1 border-blue-100">
            <span className="text-xs font-semibold text-blue-700 uppercase">Total Transaksi</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">{summary.total_transaksi || 0} Trx</div>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="p-3 bg-emerald-50 border-round-xl border-1 border-emerald-100">
            <span className="text-xs font-semibold text-emerald-700 uppercase">Total Omzet Bersih</span>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{formatRupiah(summary.total_omzet || 0)}</div>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="p-3 bg-indigo-50 border-round-xl border-1 border-indigo-100">
            <span className="text-xs font-semibold text-indigo-700 uppercase">Total Nilai Bruto</span>
            <div className="text-2xl font-bold text-indigo-900 mt-1">{formatRupiah(summary.total_bruto || 0)}</div>
          </div>
        </div>
        <div className="col-12 sm:col-6 lg:col-3">
          <div className="p-3 bg-rose-50 border-round-xl border-1 border-rose-100">
            <span className="text-xs font-semibold text-rose-700 uppercase">Total Diskon Diberikan</span>
            <div className="text-2xl font-bold text-rose-900 mt-1">{formatRupiah(summary.total_diskon || 0)}</div>
          </div>
        </div>
      </div>

      {/* HEADER & ACTIONS */}
      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-2 mb-3">
        <span className="text-xl font-bold text-gray-800">Laporan Penjualan &amp; Transaksi Kasir</span>
        <div className="flex flex-wrap gap-2 align-items-center ml-auto">
          <Calendar
            value={tglDari}
            onChange={(e) => setTglDari(e.value as Date)}
            placeholder="Dari Tanggal"
            dateFormat="yy-mm-dd"
            showIcon
            className="p-inputtext-sm"
          />
          <Calendar
            value={tglSampai}
            onChange={(e) => setTglSampai(e.value as Date)}
            placeholder="Sampai Tanggal"
            dateFormat="yy-mm-dd"
            showIcon
            className="p-inputtext-sm"
          />
          <IconField iconPosition="left" className="w-full md:w-16rem">
            <InputIcon className="pi pi-search" />
            <InputText
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Cari Data..."
              className="w-full p-inputtext-sm"
            />
          </IconField>
          <Button
            type="button"
            icon="pi pi-filter-slash"
            outlined
            severity="danger"
            tooltip="Reset Filter"
            onClick={() => {
              setTglDari(null);
              setTglSampai(null);
              setKeyword('');
            }}
          />
          <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
          <Button icon="pi pi-print" label="Cetak" outlined severity="info" size="small" onClick={handlePrint} />
          <Button icon="pi pi-file-excel" label="Excel" outlined severity="success" size="small" onClick={handleExport} />
        </div>
      </div>

      {/* KETERANGAN STATUS BAR */}
      <StatusLegendBar
        items={[
          { label: 'Lunas / Selesai', color: '#22c55e' },
          { label: 'Draft / Menunggu', color: '#eab308' },
          { label: 'Batal / Cancelled', color: '#ef4444' },
        ]}
      />

      {/* DATA TABLE */}
      <DataTable
        value={data}
        loading={loading}
        paginator
        rows={10}
        rowsPerPageOptions={[10, 25, 50]}
        emptyMessage="Data penjualan tidak ditemukan."
        size="small"
        className="p-datatable-sm"
        expandedRows={expandedRows}
        onRowToggle={(e) => setExpandedRows(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="id"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => {
            const isSuccess = r.status === 'lunas' || r.status === 'selesai';
            const isDraft = r.status === 'draft' || r.status === 'pending';
            const color = isSuccess ? '#22c55e' : isDraft ? '#eab308' : '#ef4444';
            return <StatusSquare color={color} tooltip={`Status: ${r.status}`} />;
          }}
        />
        <Column field="kode_transaksi" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column
          field="tanggal_transaksi"
          header="Tanggal"
          sortable
          body={(r) => formatDateIndo(r.tanggal_transaksi)}
        />
        <Column
          field="nama_pasien"
          header="Nama Pasien"
          sortable
          headerStyle={{ fontWeight: 'bold' }}
          body={(r) => (
            <div>
              <div className="font-semibold text-gray-800">{r.nama_pasien || 'Umum / Tanpa Pasien'}</div>
              <div className="text-xs text-gray-500">{r.no_rm || '-'}</div>
            </div>
          )}
        />
        <Column
          field="metode_bayar"
          header="Metode"
          body={(r) => (
            <Tag
              value={String(r.metode_bayar || 'TUNAI').toUpperCase()}
              severity="info"
              className="text-xs font-semibold px-2 py-0.5"
            />
          )}
        />
        <Column
          field="total_harga"
          header="Bruto"
          body={(r) => formatRupiah(r.total_harga)}
          style={{ textAlign: 'right' }}
        />
        <Column
          field="total_diskon"
          header="Diskon"
          body={(r) => (r.total_diskon > 0 ? `-${formatRupiah(r.total_diskon)}` : 'Rp 0')}
          style={{ textAlign: 'right', color: '#dc2626' }}
        />
        <Column
          field="total_bayar"
          header="Total Bayar"
          sortable
          body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.total_bayar)}</span>}
          style={{ textAlign: 'right' }}
        />
        <Column
          field="status"
          header="Status"
          body={(r) => {
            const isSuccess = r.status === 'lunas' || r.status === 'selesai';
            const isDraft = r.status === 'draft' || r.status === 'pending';
            return (
              <Tag
                value={String(r.status || '').toUpperCase()}
                severity={isSuccess ? 'success' : isDraft ? 'warning' : 'danger'}
                className="text-xs font-semibold"
              />
            );
          }}
        />
      </DataTable>
    </div>
  );
};

/* =========================================================================
   2. LAPORAN TREATMENT VIEW
   ========================================================================= */
export const LaporanTreatmentView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/treatment', { keyword, perPage: 100 });
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data treatment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Antrian': r.kode_antrian_layanan,
      Pasien: r.nama_pasien || '-',
      'No. RM': r.no_rm || '-',
      Treatment: r.nama_treatment || '-',
      Ruangan: r.nama_ruangan || '-',
      'Petugas / Dokter': r.nama_petugas || '-',
      Status: String(r.status || '').toUpperCase(),
    }));
    await exportToXLSX({ data: exportData, fileName: `Laporan_Treatment_${new Date().toISOString().slice(0, 10)}` });
  };

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-2 mb-3">
        <span className="text-xl font-bold text-gray-800">Laporan Treatment &amp; Sesi Tindakan Pasien</span>
        <div className="flex gap-2 align-items-center ml-auto">
          <IconField iconPosition="left" className="w-full md:w-16rem">
            <InputIcon className="pi pi-search" />
            <InputText
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Cari Data..."
              className="w-full p-inputtext-sm"
            />
          </IconField>
          <Button
            type="button"
            icon="pi pi-filter-slash"
            outlined
            severity="danger"
            tooltip="Reset Filter"
            onClick={() => setKeyword('')}
          />
          <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
          <Button icon="pi pi-file-excel" label="Excel" outlined severity="success" size="small" onClick={handleExport} />
        </div>
      </div>

      <StatusLegendBar
        items={[
          { label: 'Selesai', color: '#22c55e' },
          { label: 'Berlangsung / Pengerjaan', color: '#0284c7' },
          { label: 'Menunggu / Pending', color: '#eab308' },
        ]}
      />

      <DataTable value={data} loading={loading} paginator rows={10} size="small" className="p-datatable-sm">
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => {
            const isSuccess = r.status === 'selesai';
            const isProcess = r.status === 'berlangsung' || r.status === 'pengerjaan';
            const color = isSuccess ? '#22c55e' : isProcess ? '#0284c7' : '#eab308';
            return <StatusSquare color={color} tooltip={`Status: ${r.status}`} />;
          }}
        />
        <Column field="kode_antrian_layanan" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column
          field="nama_pasien"
          header="Nama Pasien"
          sortable
          headerStyle={{ fontWeight: 'bold' }}
          body={(r) => (
            <div>
              <div className="font-semibold text-gray-800">{r.nama_pasien || '-'}</div>
              <div className="text-xs text-gray-500">{r.no_rm}</div>
            </div>
          )}
        />
        <Column field="nama_treatment" header="Layanan / Tindakan" className="font-medium text-emerald-800" />
        <Column field="nama_ruangan" header="Ruangan" />
        <Column
          field="nama_petugas"
          header="Petugas Penanggung Jawab"
          body={(r) => (
            <div>
              <div className="font-medium text-gray-800">{r.nama_petugas || '-'}</div>
              <div className="text-xs text-purple-700 uppercase font-semibold">{r.jabatan_petugas || ''}</div>
            </div>
          )}
        />
        <Column
          field="status"
          header="Status"
          body={(r) => (
            <Tag
              value={String(r.status || '').toUpperCase()}
              severity={r.status === 'selesai' ? 'success' : 'warning'}
              className="text-xs"
            />
          )}
        />
      </DataTable>
    </div>
  );
};

/* =========================================================================
   3. LAPORAN PRODUK VIEW
   ========================================================================= */
export const LaporanProdukView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/produk', { keyword });
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Produk': r.kode_produk,
      'Nama Produk': r.nama_produk,
      Kategori: r.nama_kategori || '-',
      'Stok Sisa': r.stok_tersedia,
      'Harga Beli': r.harga_beli,
      'Harga Jual': r.harga_jual,
      'Total Terjual (Qty)': r.total_terjual,
      'Total Pendapatan (Rp)': r.total_pendapatan,
    }));
    await exportToXLSX({ data: exportData, fileName: `Laporan_Produk_${new Date().toISOString().slice(0, 10)}` });
  };

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      <div className="grid mb-4">
        <div className="col-12 sm:col-4">
          <div className="p-3 bg-emerald-50 border-round-xl border-1 border-emerald-100">
            <span className="text-xs font-semibold text-emerald-700 uppercase">Total Qty Terjual</span>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{summary.total_terjual || 0} Item</div>
          </div>
        </div>
        <div className="col-12 sm:col-4">
          <div className="p-3 bg-blue-50 border-round-xl border-1 border-blue-100">
            <span className="text-xs font-semibold text-blue-700 uppercase">Total Omzet Penjualan Produk</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">{formatRupiah(summary.total_omzet || 0)}</div>
          </div>
        </div>
        <div className="col-12 sm:col-4">
          <div className="p-3 bg-indigo-50 border-round-xl border-1 border-indigo-100">
            <span className="text-xs font-semibold text-indigo-700 uppercase">Total Item Produk</span>
            <div className="text-2xl font-bold text-indigo-900 mt-1">{summary.total_produk || 0} Produk</div>
          </div>
        </div>
      </div>

      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-2 mb-3">
        <span className="text-xl font-bold text-gray-800">Laporan Penjualan &amp; Performa Produk</span>
        <div className="flex gap-2 align-items-center ml-auto">
          <IconField iconPosition="left" className="w-full md:w-16rem">
            <InputIcon className="pi pi-search" />
            <InputText
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Cari Data..."
              className="w-full p-inputtext-sm"
            />
          </IconField>
          <Button
            type="button"
            icon="pi pi-filter-slash"
            outlined
            severity="danger"
            tooltip="Reset Filter"
            onClick={() => setKeyword('')}
          />
          <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
          <Button icon="pi pi-file-excel" label="Excel" outlined severity="success" size="small" onClick={handleExport} />
        </div>
      </div>

      <StatusLegendBar
        items={[
          { label: 'Aktif / Stok Aman', color: '#22c55e' },
          { label: 'Stok Menipis', color: '#eab308' },
          { label: 'Stok Habis / Tidak Aktif', color: '#ef4444' },
        ]}
      />

      <DataTable value={data} loading={loading} paginator rows={10} size="small" className="p-datatable-sm">
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => {
            const isHabis = r.stok_tersedia <= 0 || r.status === 'nonaktif';
            const isMenipis = r.stok_tersedia <= r.stok_minimum;
            const color = isHabis ? '#ef4444' : isMenipis ? '#eab308' : '#22c55e';
            return <StatusSquare color={color} tooltip={isHabis ? 'Stok Habis' : isMenipis ? 'Stok Menipis' : 'Aktif / Aman'} />;
          }}
        />
        <Column field="kode_produk" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column field="nama_produk" header="Nama Produk" sortable headerStyle={{ fontWeight: 'bold' }} className="font-semibold text-gray-800" />
        <Column field="nama_kategori" header="Kategori" body={(r) => r.nama_kategori || '-'} />
        <Column
          field="stok_tersedia"
          header="Sisa Stok"
          body={(r) => (
            <span className={r.stok_tersedia <= r.stok_minimum ? 'text-red-600 font-bold' : 'text-gray-800'}>
              {r.stok_tersedia} {r.satuan || ''}
            </span>
          )}
          style={{ textAlign: 'center' }}
        />
        <Column field="harga_jual" header="Harga Satuan" body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.harga_jual)}</span>} style={{ textAlign: 'right' }} />
        <Column
          field="total_terjual"
          header="Qty Terjual"
          sortable
          body={(r) => <span className="font-bold text-blue-700">{r.total_terjual}</span>}
          style={{ textAlign: 'center' }}
        />
        <Column
          field="total_pendapatan"
          header="Total Omzet"
          sortable
          body={(r) => <span className="font-bold text-emerald-700">{formatRupiah(r.total_pendapatan)}</span>}
          style={{ textAlign: 'right' }}
        />
      </DataTable>
    </div>
  );
};

/* =========================================================================
   4. LAPORAN PAKET VIEW (SESUAI GAMBAR CONTOH MASTER DATA SECARA PERSIS)
   ========================================================================= */
export const LaporanPaketView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<any>(null);
  const [selectedPaket, setSelectedPaket] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState<boolean>(false);
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/paket', { keyword });
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data paket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleRowExpansion = (paket: any) => {
    let _expandedRows: any = { ...expandedRows };
    if (_expandedRows[paket.kode_paket_layanan]) {
      delete _expandedRows[paket.kode_paket_layanan];
    } else {
      _expandedRows[paket.kode_paket_layanan] = true;
    }
    setExpandedRows(_expandedRows);
  };

  const handleExport = async () => {
    const exportData = data.map((r, i) => ({
      No: i + 1,
      'Kode Paket': r.kode_paket_layanan,
      'Nama Paket': r.nama || r.nama_paket,
      'Tipe Paket': r.tipe || 'BEAUTY TREATMENT',
      Ruangan: r.nama_ruangan || '-',
      'Jumlah Layanan': r.details?.length || 0,
      'Harga Paket (Rp)': r.harga_paket,
      'Masa Berlaku': r.is_selamanya ? 'Selamanya' : `${r.masa_berlaku_hari} Hari`,
      Status: r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif',
    }));
    await exportToXLSX({ data: exportData, fileName: `Laporan_Paket_${new Date().toISOString().slice(0, 10)}` });
  };

  const rowExpansionTemplate = (pkt: any) => (
    <div className="p-3 bg-gray-50 border-round-lg border-1 surface-border my-1">
      <div className="flex align-items-center justify-content-between mb-2 pb-1 border-bottom-1 surface-border">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex align-items-center gap-2">
          <i className="pi pi-list text-emerald-600 text-sm" />
          RINCIAN LAYANAN DALAM PAKET ({pkt.details?.length || 0} LAYANAN)
        </span>
      </div>
      {(!pkt.details || pkt.details.length === 0) ? (
        <div className="text-xs text-gray-400 italic py-1">Tidak ada rincian layanan dalam paket ini.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse bg-white border-round-lg overflow-hidden border-1 surface-border">
            <thead>
              <tr className="bg-gray-100 text-gray-600 font-bold uppercase text-[10px]">
                <th className="p-2">#</th>
                <th className="p-2">Kode Layanan</th>
                <th className="p-2">Nama Layanan</th>
                <th className="p-2 text-center">Jumlah Sesi</th>
                <th className="p-2 text-center">Status Layanan</th>
              </tr>
            </thead>
            <tbody>
              {pkt.details.map((dItem: any, dIdx: number) => (
                <tr key={dIdx} className="border-bottom-1 surface-border hover:bg-gray-50">
                  <td className="p-2 text-gray-500 font-medium">{dIdx + 1}</td>
                  <td className="p-2 font-mono text-gray-600 font-semibold">{dItem.kode_layanan || '-'}</td>
                  <td className="p-2 font-bold text-gray-800">{dItem.nama_layanan}</td>
                  <td className="p-2 text-center font-bold text-purple-700">{dItem.jumlah_sesi} Sesi</td>
                  <td className="p-2 text-center">
                    <Tag
                      value={dItem.status_layanan === 'nonaktif' ? 'NONAKTIF' : 'AKTIF'}
                      severity={dItem.status_layanan === 'nonaktif' ? 'danger' : 'success'}
                      className="text-[10px]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      {/* HEADER SESUAI GAMBAR 2: "Data Paket Layanan" */}
      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-2 mb-3">
        <span className="text-xl font-bold text-gray-800">Data Paket Layanan</span>
        <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
          <IconField iconPosition="left" className="w-full md:w-20rem">
            <InputIcon className="pi pi-search" />
            <InputText
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Cari Data..."
              className="w-full text-sm"
            />
          </IconField>
          <Button
            type="button"
            icon="pi pi-filter-slash"
            outlined
            severity="danger"
            tooltip="Reset Filter"
            tooltipOptions={{ position: 'bottom' }}
            onClick={() => {
              setKeyword('');
              fetchData();
            }}
          />
          <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
          <Button icon="pi pi-file-excel" label="Excel" outlined severity="success" size="small" onClick={handleExport} />
        </div>
      </div>

      {/* KETERANGAN STATUS BAR SESUAI GAMBAR 2 */}
      <StatusLegendBar
        items={[
          { label: 'Aktif', color: '#22c55e' },
          { label: 'Tidak Aktif', color: '#ef4444' },
        ]}
      />

      {/* DATATABLE PERSIS SESUAI GAMBAR 2 DENGAN STATUS SQUARE */}
      <DataTable
        value={data}
        loading={loading}
        paginator
        rows={10}
        rowsPerPageOptions={[10, 25, 50]}
        size="small"
        className="p-datatable-sm"
        emptyMessage="Data paket layanan tidak ditemukan."
        responsiveLayout="scroll"
        expandedRows={expandedRows}
        onRowToggle={(e) => setExpandedRows(e.data)}
        rowExpansionTemplate={rowExpansionTemplate}
        dataKey="kode_paket_layanan"
      >
        <Column expander style={{ width: '3rem' }} />
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => (
            <StatusSquare
              color={r.status === 'aktif' ? '#22c55e' : '#ef4444'}
              tooltip={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif (Layanan Non-aktif / Expired)'}
            />
          )}
        />
        <Column field="kode_paket_layanan" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column field="nama" header="Nama Paket" sortable headerStyle={{ fontWeight: 'bold' }} className="font-semibold text-gray-800" />
        <Column
          field="tipe"
          header="Tipe Paket"
          sortable
          headerStyle={{ fontWeight: 'bold' }}
          body={(r) => {
            const val = r.tipe || 'BEAUTY TREATMENT';
            let severity: 'danger' | 'info' | 'success' | 'warning' = 'info';
            if (val === 'MEDICAL TREATMENT') severity = 'danger';
            else if (val === 'SERVICE TREATMENT') severity = 'success';
            return <Tag value={val} severity={severity} className="text-xs px-2 py-1" />;
          }}
        />
        <Column
          field="nama_ruangan"
          header="Ruangan"
          body={(r) => (r.nama_ruangan ? `${r.kode_ruangan ? r.kode_ruangan + ' - ' : ''}${r.nama_ruangan}` : (r.kode_ruangan || '-'))}
        />
        <Column
          header="Detail Layanan"
          body={(r) => (
            <Button
              label={`Lihat Detail (${r.details?.length || 0})`}
              icon="pi pi-eye"
              text
              size="small"
              className="p-button-sm text-primary font-semibold p-1"
              onClick={() => toggleRowExpansion(r)}
            />
          )}
        />
        <Column
          field="harga_paket"
          header="Harga Paket"
          body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.harga_paket)}</span>}
        />
        <Column
          field="masa_berlaku_hari"
          header="Masa Berlaku"
          body={(r) =>
            Boolean(r.is_selamanya) ? (
              <Tag value="Selamanya" severity="success" icon="pi pi-infinity" className="text-xs" />
            ) : (
              `${r.masa_berlaku_hari || 0} Hari`
            )
          }
        />
        <Column
          header="Periode Aktif Paket"
          body={(r) => {
            if (r.has_inactive_layanan) {
              return (
                <div className="flex flex-column gap-1 text-xs">
                  <Tag severity="danger" value="Nonaktif (Layanan Non-aktif)" className="text-[10px] py-1 px-2 font-bold" style={{ width: 'fit-content' }} />
                  <span className="text-red-500 text-[11px] font-medium" title={(r.inactive_layanan_names || []).join(', ')}>
                    Ada layanan nonaktif
                  </span>
                </div>
              );
            }

            if (Boolean(r.is_selamanya)) {
              return (
                <div className="flex flex-column gap-1 text-xs">
                  <Tag severity="success" value="Aktif Selamanya" icon="pi pi-infinity" className="text-[11px] py-1 px-2 font-bold" style={{ width: 'fit-content' }} />
                </div>
              );
            }

            const start = r.tanggal_mulai ? formatDateIndo(r.tanggal_mulai) : '';
            const end = r.tanggal_selesai ? formatDateIndo(r.tanggal_selesai) : '';
            const sisa = r.sisa_hari !== undefined ? parseInt(r.sisa_hari, 10) : 0;
            const isInactive = r.status === 'nonaktif' || sisa <= 0;

            if (isInactive) {
              return (
                <div className="flex flex-column gap-1 text-xs">
                  <Tag severity="danger" value="0 Hari (Nonaktif)" className="text-[10px] py-0 px-2 font-bold" style={{ width: 'fit-content' }} />
                  {start && end && (
                    <span className="text-gray-400 text-[11px]">
                      {start} s/d {end}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <div className="flex flex-column gap-1 text-xs">
                <span className="font-bold text-green-600 flex align-items-center gap-1">
                  <i className="pi pi-clock text-green-600 text-xs" />
                  Sisa {sisa} Hari
                </span>
                {start && end && (
                  <span className="text-gray-500 text-[11px]">
                    {start} s/d {end}
                  </span>
                )}
              </div>
            );
          }}
        />
      </DataTable>

      {/* DETAIL POPUP DIALOG */}
      <Dialog
        header={`Rincian Paket: ${selectedPaket?.nama || selectedPaket?.nama_paket || ''}`}
        visible={showDetailDialog}
        style={{ width: '500px' }}
        onHide={() => setShowDetailDialog(false)}
      >
        <div className="flex flex-column gap-3">
          <div className="surface-ground p-3 border-round-lg">
            <div className="text-sm font-bold text-gray-800">{selectedPaket?.nama || selectedPaket?.nama_paket}</div>
            <div className="text-xs text-gray-500 mt-1">Ruangan: {selectedPaket?.nama_ruangan || '-'}</div>
            <div className="text-sm font-bold text-green-600 mt-1">Harga: {formatRupiah(selectedPaket?.harga_paket)}</div>
          </div>
          <div>
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">Daftar Layanan</span>
            <ul className="list-none p-0 m-0 flex flex-column gap-2">
              {(selectedPaket?.details || []).map((it: any, idx: number) => (
                <li key={idx} className="p-2 border-round border-1 surface-border flex justify-content-between align-items-center">
                  <span className="font-medium text-xs text-gray-800">{it.nama_layanan}</span>
                  <span className="font-bold text-purple-700 text-xs">{it.jumlah_sesi} Sesi</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

/* =========================================================================
   6. LAPORAN PASIEN VIEW
   ========================================================================= */
export const LaporanPasienView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/pasien', { keyword, perPage: 100 });
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data pasien');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-2 mb-3">
        <span className="text-xl font-bold text-gray-800">Laporan Direktori &amp; Rekap Pasien</span>
        <div className="flex gap-2 align-items-center ml-auto">
          <IconField iconPosition="left" className="w-full md:w-16rem">
            <InputIcon className="pi pi-search" />
            <InputText
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Cari Data..."
              className="w-full p-inputtext-sm"
            />
          </IconField>
          <Button
            type="button"
            icon="pi pi-filter-slash"
            outlined
            severity="danger"
            tooltip="Reset Filter"
            onClick={() => setKeyword('')}
          />
          <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
        </div>
      </div>

      <StatusLegendBar
        items={[
          { label: 'Aktif', color: '#22c55e' },
          { label: 'Tidak Aktif', color: '#ef4444' },
        ]}
      />

      <DataTable value={data} loading={loading} paginator rows={10} size="small" className="p-datatable-sm">
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => (
            <StatusSquare
              color={r.status === 'aktif' || !r.status ? '#22c55e' : '#ef4444'}
              tooltip={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif'}
            />
          )}
        />
        <Column field="no_rm" header="No. RM" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column field="nama" header="Nama Pasien" sortable headerStyle={{ fontWeight: 'bold' }} className="font-semibold text-gray-800" />
        <Column field="jenis_kelamin" header="Gender" body={(r) => (r.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan')} />
        <Column field="no_hp" header="No. HP" />
        <Column field="kota_kabupaten" header="Kota/Kab" body={(r) => r.kota_kabupaten || '-'} />
        <Column
          field="total_kunjungan"
          header="Frekuensi Kunjungan"
          sortable
          body={(r) => <span className="font-bold text-blue-700">{r.total_kunjungan}x</span>}
          style={{ textAlign: 'center' }}
        />
        <Column
          field="total_transaksi"
          header="Akumulasi Belanja"
          sortable
          body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.total_transaksi)}</span>}
          style={{ textAlign: 'right' }}
        />
      </DataTable>
    </div>
  );
};

/* =========================================================================
   7. LAPORAN KUNJUNGAN VIEW
   ========================================================================= */
export const LaporanKunjunganView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/kunjungan', { keyword, perPage: 100 });
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data kunjungan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-2 mb-3">
        <span className="text-xl font-bold text-gray-800">Laporan Log Kunjungan Pasien</span>
        <div className="flex gap-2 align-items-center ml-auto">
          <IconField iconPosition="left" className="w-full md:w-16rem">
            <InputIcon className="pi pi-search" />
            <InputText
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Cari Data..."
              className="w-full p-inputtext-sm"
            />
          </IconField>
          <Button
            type="button"
            icon="pi pi-filter-slash"
            outlined
            severity="danger"
            tooltip="Reset Filter"
            onClick={() => setKeyword('')}
          />
          <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
        </div>
      </div>

      <StatusLegendBar
        items={[
          { label: 'Selesai', color: '#22c55e' },
          { label: 'Berlangsung', color: '#0284c7' },
          { label: 'Menunggu', color: '#eab308' },
        ]}
      />

      <DataTable value={data} loading={loading} paginator rows={10} size="small" className="p-datatable-sm">
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => {
            const isSuccess = r.status_kunjungan === 'selesai';
            const isProcess = r.status_kunjungan === 'berlangsung';
            const color = isSuccess ? '#22c55e' : isProcess ? '#0284c7' : '#eab308';
            return <StatusSquare color={color} tooltip={`Status: ${r.status_kunjungan}`} />;
          }}
        />
        <Column field="kode_kunjungan" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column field="nama_pasien" header="Nama Pasien" sortable headerStyle={{ fontWeight: 'bold' }} className="font-semibold text-gray-800" />
        <Column field="no_rm" header="No. RM" />
        <Column
          field="tanggal_kunjungan"
          header="Waktu Datang"
          body={(r) => `${formatDateIndo(r.tanggal_kunjungan)} (${r.jam_datang || '-'} WIB)`}
        />
        <Column
          field="total_antrian_layanan"
          header="Sesi Ruangan"
          body={(r) => `${r.total_antrian_layanan || 0} Sesi`}
          style={{ textAlign: 'center' }}
        />
        <Column
          field="status_kunjungan"
          header="Status"
          body={(r) => (
            <Tag
              value={String(r.status_kunjungan || '').toUpperCase()}
              severity={r.status_kunjungan === 'selesai' ? 'success' : 'warning'}
            />
          )}
        />
      </DataTable>
    </div>
  );
};

/* =========================================================================
   9. LAPORAN DOKTER VIEW
   ========================================================================= */
export const LaporanDokterView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/dokter', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data dokter');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      <div className="flex justify-content-between align-items-center mb-3">
        <span className="text-xl font-bold text-gray-800">Laporan Aktivitas &amp; Performa Dokter</span>
        <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
      </div>

      <StatusLegendBar
        items={[
          { label: 'Aktif', color: '#22c55e' },
          { label: 'Tidak Aktif', color: '#ef4444' },
        ]}
      />

      <DataTable value={data} loading={loading} size="small" className="p-datatable-sm">
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => <StatusSquare active={r.status === 'aktif'} tooltip={`Status: ${r.status || 'Aktif'}`} />}
        />
        <Column field="kode_karyawan" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column field="nama_dokter" header="Nama Dokter" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-gray-800" />
        <Column field="no_sip" header="No. SIP" body={(r) => r.no_sip || '-'} />
        <Column field="no_hp" header="Kontak" />
        <Column
          field="total_konsultasi_rm"
          header="Konsultasi &amp; Rekam Medis"
          body={(r) => <span className="font-bold text-emerald-700">{r.total_konsultasi_rm} Pasien</span>}
          style={{ textAlign: 'center' }}
        />
        <Column
          field="total_tindakan_layanan"
          header="Tindakan Medis"
          body={(r) => <span className="font-bold text-purple-700">{r.total_tindakan_layanan} Sesi</span>}
          style={{ textAlign: 'center' }}
        />
      </DataTable>
    </div>
  );
};

/* =========================================================================
   10. LAPORAN BEAUTICIAN VIEW
   ========================================================================= */
export const LaporanBeauticianView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/beautician', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data beautician');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      <div className="flex justify-content-between align-items-center mb-3">
        <span className="text-xl font-bold text-gray-800">Laporan Aktivitas Terapis &amp; Beautician</span>
        <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
      </div>

      <StatusLegendBar
        items={[
          { label: 'Aktif', color: '#22c55e' },
          { label: 'Tidak Aktif', color: '#ef4444' },
        ]}
      />

      <DataTable value={data} loading={loading} size="small" className="p-datatable-sm">
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => <StatusSquare active={r.status === 'aktif'} tooltip={`Status: ${r.status || 'Aktif'}`} />}
        />
        <Column field="kode_karyawan" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column field="nama_beautician" header="Nama Petugas" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-gray-800" />
        <Column
          field="jabatan"
          header="Jabatan"
          body={(r) => <Tag value={String(r.jabatan || '').toUpperCase()} severity="info" className="text-xs" />}
        />
        <Column field="no_hp" header="Kontak" />
        <Column
          field="total_treatment_ditangani"
          header="Treatment Ditangani"
          body={(r) => <span className="font-bold text-emerald-700">{r.total_treatment_ditangani} Tindakan</span>}
          style={{ textAlign: 'center' }}
        />
        <Column
          field="total_sesi_ruangan"
          header="Log Ruangan Treatment"
          body={(r) => <span className="font-bold text-purple-700">{r.total_sesi_ruangan} Sesi</span>}
          style={{ textAlign: 'center' }}
        />
      </DataTable>
    </div>
  );
};

/* =========================================================================
   12. LAPORAN INVENTORY VIEW
   ========================================================================= */
export const LaporanInventoryView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/inventory', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      <div className="grid mb-4">
        <div className="col-12 sm:col-4">
          <div className="p-3 bg-blue-50 border-round-xl border-1 border-blue-100">
            <span className="text-xs font-semibold text-blue-700 uppercase">Nilai Aset (Harga Beli)</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">{formatRupiah(summary.total_aset_beli || 0)}</div>
          </div>
        </div>
        <div className="col-12 sm:col-4">
          <div className="p-3 bg-emerald-50 border-round-xl border-1 border-emerald-100">
            <span className="text-xs font-semibold text-emerald-700 uppercase">Estimasi Nilai Jual</span>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{formatRupiah(summary.total_aset_jual || 0)}</div>
          </div>
        </div>
        <div className="col-12 sm:col-4">
          <div className="p-3 bg-amber-50 border-round-xl border-1 border-amber-100">
            <span className="text-xs font-semibold text-amber-700 uppercase">Peringatan Stok Menipis</span>
            <div className="text-2xl font-bold text-amber-900 mt-1">{summary.produk_menipis || 0} Produk</div>
          </div>
        </div>
      </div>

      <div className="flex justify-content-between align-items-center mb-3">
        <span className="text-xl font-bold text-gray-800">Status Persediaan Stok Produk (Inventory)</span>
        <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
      </div>

      <StatusLegendBar
        items={[
          { label: 'Stok Aman', color: '#22c55e' },
          { label: 'Stok Menipis', color: '#eab308' },
          { label: 'Stok Habis', color: '#ef4444' },
        ]}
      />

      <DataTable value={data} loading={loading} paginator rows={10} size="small" className="p-datatable-sm">
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => {
            const isHabis = r.stok_tersedia <= 0;
            const isMenipis = r.stok_tersedia <= r.stok_minimum;
            const color = isHabis ? '#ef4444' : isMenipis ? '#eab308' : '#22c55e';
            return <StatusSquare color={color} tooltip={isHabis ? 'Stok Habis' : isMenipis ? 'Stok Menipis' : 'Stok Aman'} />;
          }}
        />
        <Column field="kode_produk" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column field="nama_produk" header="Nama Produk" sortable headerStyle={{ fontWeight: 'bold' }} className="font-semibold text-gray-800" />
        <Column field="nama_kategori" header="Kategori" body={(r) => r.nama_kategori || '-'} />
        <Column
          field="stok_tersedia"
          header="Sisa Stok"
          body={(r) => (
            <span className={r.stok_tersedia <= r.stok_minimum ? 'text-red-600 font-bold' : 'text-gray-800'}>
              {r.stok_tersedia} {r.satuan}
            </span>
          )}
          style={{ textAlign: 'center' }}
        />
        <Column field="harga_beli" header="Harga Beli" body={(r) => formatRupiah(r.harga_beli)} style={{ textAlign: 'right' }} />
        <Column field="harga_jual" header="Harga Jual" body={(r) => <span className="font-semibold text-green-600">{formatRupiah(r.harga_jual)}</span>} style={{ textAlign: 'right' }} />
        <Column
          field="total_nilai_aset_beli"
          header="Nilai Aset"
          body={(r) => <span className="font-bold text-blue-700">{formatRupiah(r.total_nilai_aset_beli)}</span>}
          style={{ textAlign: 'right' }}
        />
        <Column
          header="Status Stok"
          body={(r) => (
            <Tag
              value={r.stok_tersedia <= 0 ? 'HABIS' : r.stok_tersedia <= r.stok_minimum ? 'MENIPIS' : 'AMAN'}
              severity={r.stok_tersedia <= 0 ? 'danger' : r.stok_tersedia <= r.stok_minimum ? 'warning' : 'success'}
            />
          )}
          style={{ textAlign: 'center' }}
        />
      </DataTable>
    </div>
  );
};

/* =========================================================================
   17. LAPORAN VOUCHER VIEW
   ========================================================================= */
export const LaporanVoucherView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/voucher', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data voucher');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      <div className="flex justify-content-between align-items-center mb-3">
        <span className="text-xl font-bold text-gray-800">Laporan Voucher &amp; Promo Diskon</span>
        <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
      </div>

      <StatusLegendBar
        items={[
          { label: 'Aktif', color: '#22c55e' },
          { label: 'Tidak Aktif / Nonaktif', color: '#ef4444' },
        ]}
      />

      <DataTable value={data} loading={loading} size="small" className="p-datatable-sm">
        <Column
          header=""
          headerStyle={{ width: '3rem' }}
          align="center"
          body={(r) => <StatusSquare active={r.status === 'aktif'} tooltip={`Status: ${r.status || 'Aktif'}`} />}
        />
        <Column field="kode_promo" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
        <Column field="nama_promo" header="Nama Promo" sortable headerStyle={{ fontWeight: 'bold' }} className="font-semibold text-gray-800" />
        <Column
          field="nilai_diskon"
          header="Besaran Diskon"
          body={(r) => (
            <span className="font-bold text-rose-700">
              {r.jenis_diskon === 'persen' ? `${parseFloat(r.nilai_diskon)}%` : formatRupiah(r.nilai_diskon)}
            </span>
          )}
        />
        <Column
          header="Periode Berlaku"
          body={(r) => `${formatDateIndo(r.tanggal_mulai)} s.d ${formatDateIndo(r.tanggal_selesai)}`}
        />
        <Column
          field="total_item_terkait"
          header="Item Promo"
          body={(r) => `${r.total_item_terkait} Item`}
          style={{ textAlign: 'center' }}
        />
        <Column
          field="status"
          header="Status"
          body={(r) => (
            <Tag
              value={String(r.status || '').toUpperCase()}
              severity={r.status === 'aktif' ? 'success' : 'secondary'}
            />
          )}
        />
      </DataTable>
    </div>
  );
};

/* =========================================================================
   19. LAPORAN KEUANGAN VIEW
   ========================================================================= */
export const LaporanKeuanganView: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const toast = useRef<Toast>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/laporan/keuangan', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setData(res.data.data || []);
        setSummary(res.data.summary || {});
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
      <Toast ref={toast} />

      {/* KPI KEUANGAN */}
      <div className="grid mb-4">
        <div className="col-12 sm:col-4">
          <div className="p-3 bg-blue-50 border-round-xl border-1 border-blue-100">
            <span className="text-xs font-semibold text-blue-700 uppercase">Total Penerimaan Bersih</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">{formatRupiah(summary.total_netto || 0)}</div>
          </div>
        </div>
        <div className="col-12 sm:col-4">
          <div className="p-3 bg-indigo-50 border-round-xl border-1 border-indigo-100">
            <span className="text-xs font-semibold text-indigo-700 uppercase">Total Omzet Bruto</span>
            <div className="text-2xl font-bold text-indigo-900 mt-1">{formatRupiah(summary.total_bruto || 0)}</div>
          </div>
        </div>
        <div className="col-12 sm:col-4">
          <div className="p-3 bg-rose-50 border-round-xl border-1 border-rose-100">
            <span className="text-xs font-semibold text-rose-700 uppercase">Potongan Diskon Diberikan</span>
            <div className="text-2xl font-bold text-rose-900 mt-1">{formatRupiah(summary.total_diskon || 0)}</div>
          </div>
        </div>
      </div>

      {/* BREAKDOWN METODE BAYAR */}
      <div className="surface-ground p-3 border-round-xl mb-4">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-2">
          Komposisi Penerimaan Kas &amp; Bank Berdasarkan Metode Bayar
        </span>
        <div className="grid">
          {(summary.breakdown_metode || []).map((m: any, idx: number) => (
            <div key={idx} className="col-6 sm:col-3">
              <div className="bg-white p-2.5 border-round-lg border-1 surface-border shadow-2xs">
                <span className="text-xs font-bold text-gray-500 uppercase">{m.metode_bayar}</span>
                <div className="text-base font-bold text-emerald-700 mt-0.5">{formatRupiah(m.total_nominal)}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{m.jumlah_transaksi} Transaksi</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-content-between align-items-center mb-3">
        <span className="text-xl font-bold text-gray-800">Rekapitulasi Keuangan Harian</span>
        <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchData} loading={loading} />
      </div>

      <DataTable value={data} loading={loading} paginator rows={10} size="small" className="p-datatable-sm">
        <Column header="#" body={(_, opt) => opt.rowIndex + 1} style={{ width: '50px', textAlign: 'center' }} />
        <Column field="tanggal" header="Tanggal" body={(r) => formatDateIndo(r.tanggal)} className="font-semibold" />
        <Column field="jumlah_transaksi" header="Transaksi" body={(r) => `${r.jumlah_transaksi} Trx`} style={{ textAlign: 'center' }} />
        <Column field="total_bruto" header="Bruto" body={(r) => formatRupiah(r.total_bruto)} style={{ textAlign: 'right' }} />
        <Column
          field="total_diskon"
          header="Diskon"
          body={(r) => (r.total_diskon > 0 ? `-${formatRupiah(r.total_diskon)}` : 'Rp 0')}
          style={{ textAlign: 'right', color: '#dc2626' }}
        />
        <Column
          field="total_netto"
          header="Penerimaan Bersih"
          body={(r) => <span className="font-bold text-emerald-700">{formatRupiah(r.total_netto)}</span>}
          style={{ textAlign: 'right' }}
        />
      </DataTable>
    </div>
  );
};
