'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import postData from '@/lib/axios/postData';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { Divider } from 'primereact/divider';
import { InputSwitch } from 'primereact/inputswitch';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { showError, showSuccess } from '@/lib/tools/generalTools';

interface JadwalItem {
    id: number;
    kode_jadwal: string;
    no_sip: string;
    kode_ruangan: string;
    nama_ruangan: string;
    nama_karyawan: string;
    jabatan: string;
    hari: string;
    jam_mulai: string;
    jam_selesai: string;
    kuota: number;
    status: string;
}

const HARI_ORDER: Record<string, number> = {
    senin: 1,
    selasa: 2,
    rabu: 3,
    kamis: 4,
    jumat: 5,
    sabtu: 6,
    minggu: 7,
};

const HARI_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    senin: { label: 'Senin', bg: '#dcfce7', color: '#15803d' },
    selasa: { label: 'Selasa', bg: '#dbeafe', color: '#1d4ed8' },
    rabu: { label: 'Rabu', bg: '#f3e8ff', color: '#7e22ce' },
    kamis: { label: 'Kamis', bg: '#ffedd5', color: '#c2410c' },
    jumat: { label: 'Jumat', bg: '#d1fae5', color: '#047857' },
    sabtu: { label: 'Sabtu', bg: '#fee2e2', color: '#b91c1c' },
    minggu: { label: 'Minggu', bg: '#ffe4e6', color: '#be123c' },
};

const HARI_OPTIONS = [
    { label: 'Senin', value: 'senin' },
    { label: 'Selasa', value: 'selasa' },
    { label: 'Rabu', value: 'rabu' },
    { label: 'Kamis', value: 'kamis' },
    { label: 'Jumat', value: 'jumat' },
    { label: 'Sabtu', value: 'sabtu' },
    { label: 'Minggu', value: 'minggu' },
];

const Page = () => {
    const toast = useRef<Toast>(null);

    const [data, setData] = useState<JadwalItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [filterRuangan, setFilterRuangan] = useState<string>('');
    const [filterHari, setFilterHari] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    const [karyawanOptions, setKaryawanOptions] = useState<any[]>([]);
    const [ruanganOptions, setRuanganOptions] = useState<any[]>([]);

    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);

    const [formData, setFormData] = useState<any>({
        kode_jadwal: '',
        no_sip: '',
        kode_ruangan: '',
        hari: 'senin',
        jam_mulai: '08:00',
        jam_selesai: '16:00',
        kuota: 10,
        status: 'aktif',
    });
    const [saving, setSaving] = useState<boolean>(false);

    const loadRuangan = async () => {
        try {
            const res = await postData('/master/ruangan-dropdown', {});
            const list = (res.data.data || []).map((r: any) => ({
                label: `${r.nama_ruangan} (${r.kode_ruangan})`,
                value: r.kode_ruangan,
            }));
            setRuanganOptions(list);
        } catch (error) {
            console.error('Gagal memuat list ruangan:', error);
        }
    };

    const loadKaryawan = async () => {
        try {
            const res = await postData('/master/karyawan-data', { page: 1, perPage: 200 });
            const list = (res.data.data || []).map((k: any) => ({
                label: `${k.nama} (${(k.jabatan || 'KARYAWAN').toUpperCase()}) - ${k.no_sip || '-'}`,
                value: k.no_sip,
            }));
            setKaryawanOptions(list);
        } catch (error) {
            console.error('Gagal memuat list karyawan:', error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/jadwal-karyawan-data', {
                page,
                perPage: rows,
                keyword,
                kode_ruangan: filterRuangan || undefined,
                hari: filterHari || undefined,
            });

            // Urutkan data berdasarkan Nama Ruangan lalu Hari (Senin -> Minggu)
            const rawData: JadwalItem[] = res.data.data || [];
            const sortedData = [...rawData].sort((a, b) => {
                const rA = a.nama_ruangan || a.kode_ruangan || '';
                const rB = b.nama_ruangan || b.kode_ruangan || '';
                if (rA !== rB) return rA.localeCompare(rB);

                const hA = HARI_ORDER[(a.hari || '').toLowerCase()] || 99;
                const hB = HARI_ORDER[(b.hari || '').toLowerCase()] || 99;
                return hA - hB;
            });

            setData(sortedData);
            setTotalRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data jadwal karyawan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKaryawan();
        loadRuangan();
    }, []);

    useEffect(() => {
        loadData();
    }, [page, rows, keyword, filterRuangan, filterHari]);

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSubmitted(false);
        setFormData({
            kode_jadwal: '',
            no_sip: karyawanOptions.length > 0 ? karyawanOptions[0].value : '',
            kode_ruangan: ruanganOptions.length > 0 ? ruanganOptions[0].value : '',
            hari: 'senin',
            jam_mulai: '08:00',
            jam_selesai: '16:00',
            kuota: 10,
            status: 'aktif',
        });
        setDialogVisible(true);
    };

    const handleOpenEdit = (rowData: JadwalItem) => {
        setIsEdit(true);
        setSubmitted(false);
        setFormData({
            ...rowData,
            kuota: parseInt(String(rowData.kuota), 10) || 0,
        });
        setDialogVisible(true);
    };

    const handleSave = async () => {
        setSubmitted(true);
        if (!formData.no_sip || !formData.hari || !formData.jam_mulai?.trim() || !formData.jam_selesai?.trim()) {
            showError(toast, 'Harap lengkapi seluruh bidang wajib!');
            return;
        }
        setSaving(true);
        try {
            const endpoint = isEdit ? '/master/jadwal-karyawan-update' : '/master/jadwal-karyawan-create';
            const res = await postData(endpoint, formData);
            showSuccess(toast, res.data.message || 'Berhasil disimpan');
            setDialogVisible(false);
            loadData();
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal menyimpan data');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (codes: string[]) => {
        confirmDialog({
            message: `Apakah Anda yakin ingin menghapus ${codes.length} jadwal karyawan ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/jadwal-karyawan-delete', { kode_jadwal: codes });
                    showSuccess(toast, res.data.message || 'Berhasil dihapus');
                    setSelectedRows([]);
                    loadData();
                } catch (error: any) {
                    showError(toast, error?.response?.data?.message || 'Gagal menghapus data');
                }
            },
        });
    };

    return (
        <div className="p-4">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* Page Header */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-calendar text-purple-600 text-2xl" />
                        Kelola Jadwal Karyawan &amp; Dokter
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Atur jadwal kerja, hari operasional, dan kuota pasien untuk setiap karyawan per ruangan dan per hari.
                    </p>
                </div>

                {/* Toolbar Bar - Persis seperti fitur Master Data lainnya */}
                <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
                    <Button
                        size="small"
                        label="Baru"
                        icon="pi pi-plus"
                        outlined
                        severity="success"
                        className="border-round-md font-medium px-3"
                        onClick={handleOpenCreate}
                    />
                    <Divider layout="vertical" className="m-0 h-2rem" />
                    <Button
                        size="small"
                        label="Cetak"
                        icon="pi pi-print"
                        outlined
                        className="border-round-md font-medium px-3 border-purple-600 text-purple-600"
                        onClick={() => window.print()}
                    />
                    <Divider layout="vertical" className="m-0 h-2rem" />
                    <Button
                        size="small"
                        label={`Hapus${selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}`}
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        disabled={selectedRows.length === 0}
                        className="border-round-md font-medium px-3"
                        onClick={() => {
                            if (selectedRows.length < 1) return;
                            handleDelete(selectedRows.map((r) => r.kode_jadwal));
                        }}
                    />
                    <Divider layout="vertical" className="m-0 h-2rem" />
                    <Button
                        size="small"
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        severity="success"
                        className="border-round-md font-medium px-3"
                        loading={loading}
                        onClick={loadData}
                    />
                </div>

                {/* DataTable Pengelompokan Per Ruangan & Per Hari */}
                <DataTable
                    value={data}
                    loading={loading}
                    paginator
                    rows={rows}
                    totalRecords={totalRecords}
                    lazy
                    first={(page - 1) * rows}
                    onPage={(e) => {
                        setPage((e.page || 0) + 1);
                        setRows(e.rows);
                    }}
                    selection={selectedRows}
                    onSelectionChange={(e) => setSelectedRows(e.value as any[])}
                    dataKey="kode_jadwal"
                    rowGroupMode="subheader"
                    groupRowsBy="nama_ruangan"
                    sortField="nama_ruangan"
                    sortOrder={1}
                    className="p-datatable-sm"
                    emptyMessage="Data jadwal tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    rowGroupHeaderTemplate={(rData: any) => (
                        <div className="flex align-items-center justify-content-between bg-purple-50 px-3 py-2 border-round-md border-left-3 border-purple-500 font-bold text-xs">
                            <span className="flex align-items-center gap-2 text-purple-900">
                                <i className="pi pi-building text-purple-600 text-sm" />
                                <span>RUANGAN: {rData.nama_ruangan || rData.kode_ruangan || 'Umum / Tanpa Ruangan'}</span>
                            </span>
                            <Tag value="Kelompok Ruangan" severity="warning" className="text-[10px] font-bold px-2 py-0.5" />
                        </div>
                    )}
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Jadwal Karyawan &amp; Dokter</span>
                                <div className="flex flex-wrap align-items-center gap-2 ml-auto w-full md:w-auto">
                                    {/* Filter Ruangan */}
                                    <Dropdown
                                        value={filterRuangan}
                                        options={[{ label: 'Semua Ruangan', value: '' }, ...ruanganOptions]}
                                        onChange={(e) => setFilterRuangan(e.value)}
                                        placeholder="Filter Ruangan"
                                        className="w-full md:w-14rem p-inputtext-sm text-sm border-round-md"
                                    />

                                    {/* Filter Hari */}
                                    <Dropdown
                                        value={filterHari}
                                        options={[{ label: 'Semua Hari', value: '' }, ...HARI_OPTIONS]}
                                        onChange={(e) => setFilterHari(e.value)}
                                        placeholder="Filter Hari"
                                        className="w-full md:w-12rem p-inputtext-sm text-sm border-round-md"
                                    />

                                    {/* Search Input */}
                                    <IconField iconPosition="left" className="w-full md:w-16rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText
                                            value={keyword}
                                            onChange={(e) => setKeyword(e.target.value)}
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
                                            setFilterRuangan('');
                                            setFilterHari('');
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap align-items-center gap-3 px-1 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                                <span className="flex align-items-center gap-1">
                                    <i className="pi pi-info-circle" />
                                    <span className="font-semibold">KETERANGAN STATUS:</span>
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '3px',
                                            backgroundColor: '#22c55e',
                                            boxShadow: '0 1px 3px #22c55e55',
                                        }}
                                    />
                                    Aktif
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '3px',
                                            backgroundColor: '#ef4444',
                                            boxShadow: '0 1px 3px #ef444455',
                                        }}
                                    />
                                    Tidak Aktif
                                </span>
                            </div>
                        </div>
                    }
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                    <Column
                        header=""
                        headerStyle={{ width: '3rem' }}
                        align="center"
                        body={(r: JadwalItem) => (
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '3px',
                                    backgroundColor: r.status === 'aktif' ? '#22c55e' : '#ef4444',
                                    boxShadow: r.status === 'aktif' ? '0 1px 3px #22c55e55' : '0 1px 3px #ef444455',
                                }}
                                title={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                            />
                        )}
                    ></Column>
                    <Column field="kode_jadwal" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column
                        field="hari"
                        header="Hari"
                        sortable
                        headerStyle={{ fontWeight: 'bold' }}
                        body={(r: JadwalItem) => {
                            const hKey = (r.hari || '').toLowerCase();
                            const conf = HARI_CONFIG[hKey] || { label: r.hari, bg: '#f1f5f9', color: '#334155' };
                            return (
                                <span
                                    className="font-extrabold uppercase px-2 py-1 border-round-md text-[11px]"
                                    style={{ backgroundColor: conf.bg, color: conf.color }}
                                >
                                    {conf.label}
                                </span>
                            );
                        }}
                    ></Column>
                    <Column
                        field="nama_karyawan"
                        header="Dokter / Karyawan"
                        sortable
                        headerStyle={{ fontWeight: 'bold' }}
                        body={(r: JadwalItem) => (
                            <div>
                                <div className="font-bold text-slate-900">{r.nama_karyawan || '-'}</div>
                                <div className="text-[10px] text-slate-500">{r.no_sip ? `SIP: ${r.no_sip}` : '-'}</div>
                            </div>
                        )}
                    ></Column>
                    <Column field="jabatan" header="Jabatan" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column
                        header="Jam Operasional"
                        sortable
                        sortField="jam_mulai"
                        headerStyle={{ fontWeight: 'bold' }}
                        body={(r: JadwalItem) => (
                            <span className="font-bold text-purple-800">
                                {r.jam_mulai} - {r.jam_selesai}
                            </span>
                        )}
                    ></Column>
                    <Column
                        field="kuota"
                        header="Kuota Pasien"
                        sortable
                        headerStyle={{ fontWeight: 'bold' }}
                        body={(r: JadwalItem) => <span className="font-semibold">{r.kuota} Pasien</span>}
                    ></Column>
                    <Column
                        field="status"
                        header="Status"
                        sortable
                        headerStyle={{ fontWeight: 'bold' }}
                        body={(r: JadwalItem) => (
                            <Tag
                                value={r.status === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                                severity={r.status === 'aktif' ? 'success' : 'danger'}
                                className="text-xs px-2 py-1"
                            />
                        )}
                    ></Column>
                    <Column
                        header="Aksi"
                        align="center"
                        headerStyle={{ width: '8rem', textAlign: 'center' }}
                        body={(r: JadwalItem) => (
                            <div className="flex align-items-center justify-content-center gap-2">
                                <Button
                                    icon="pi pi-pencil"
                                    outlined
                                    severity="info"
                                    className="p-button-sm border-round-md"
                                    onClick={() => handleOpenEdit(r)}
                                    tooltip="Edit"
                                />
                                <Button
                                    icon="pi pi-trash"
                                    outlined
                                    severity="danger"
                                    className="p-button-sm border-round-md"
                                    onClick={() => handleDelete([r.kode_jadwal])}
                                    tooltip="Hapus"
                                />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            {/* Dialog Create / Edit Jadwal - Konsisten dengan Dialog Master Data Lainnya */}
            <Dialog
                header={isEdit ? 'Edit Jadwal Karyawan' : 'Tambah Jadwal Karyawan'}
                visible={dialogVisible}
                style={{ width: '500px' }}
                modal
                onHide={() => setDialogVisible(false)}
            >
                <div className="p-fluid flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Kode Jadwal</label>
                            <InputText value={formData.kode_jadwal} disabled className="w-full text-sm border-round-md" />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-1">
                            Pilih Ruangan <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            value={formData.kode_ruangan}
                            options={ruanganOptions}
                            onChange={(e) => setFormData({ ...formData, kode_ruangan: e.value })}
                            placeholder="Pilih Ruangan..."
                            className="w-full text-sm border-round-md"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">
                            Dokter / Karyawan <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            value={formData.no_sip}
                            options={karyawanOptions}
                            onChange={(e) => setFormData({ ...formData, no_sip: e.value })}
                            placeholder="Pilih Dokter / Karyawan..."
                            filter
                            filterBy="label"
                            className="w-full text-sm border-round-md"
                        />
                        {submitted && !formData.no_sip && (
                            <small className="text-red-500 font-semibold">Dokter/Karyawan wajib dipilih</small>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">
                            Hari Operasional <span className="text-red-500">*</span>
                        </label>
                        <Dropdown
                            value={formData.hari}
                            options={HARI_OPTIONS}
                            onChange={(e) => setFormData({ ...formData, hari: e.value })}
                            placeholder="Pilih Hari..."
                            className="w-full text-sm border-round-md"
                        />
                    </div>

                    <div className="grid formgrid">
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">
                                Jam Mulai <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                value={formData.jam_mulai}
                                onChange={(e) => setFormData({ ...formData, jam_mulai: e.target.value })}
                                placeholder="08:00"
                                className="w-full text-sm border-round-md"
                            />
                        </div>
                        <div className="col-6">
                            <label className="block text-sm font-semibold mb-1">
                                Jam Selesai <span className="text-red-500">*</span>
                            </label>
                            <InputText
                                value={formData.jam_selesai}
                                onChange={(e) => setFormData({ ...formData, jam_selesai: e.target.value })}
                                placeholder="16:00"
                                className="w-full text-sm border-round-md"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Kuota Maksimal Pasien</label>
                        <InputNumber
                            value={formData.kuota}
                            onValueChange={(e) => setFormData({ ...formData, kuota: e.value || 0 })}
                            min={0}
                            showButtons
                            className="w-full text-sm border-round-md"
                        />
                    </div>

                    <Divider className="my-1" />

                    <div className="flex align-items-center justify-content-between surface-100 p-3 border-round-lg">
                        <div>
                            <span className="font-bold text-sm text-900 block">Status Jadwal</span>
                            <span className="text-xs text-500">
                                {formData.status === 'aktif'
                                    ? 'Jadwal aktif dan dapat digunakan dalam pendaftaran.'
                                    : 'Jadwal dinonaktifkan.'}
                            </span>
                        </div>
                        <InputSwitch
                            checked={formData.status === 'aktif'}
                            onChange={(e) => setFormData({ ...formData, status: e.value ? 'aktif' : 'nonaktif' })}
                        />
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4 pt-3 border-top-1 surface-border">
                    <Button label="Batal" outlined severity="secondary" onClick={() => setDialogVisible(false)} size="small" />
                    <Button
                        label="Simpan"
                        icon="pi pi-check"
                        severity="success"
                        loading={saving}
                        onClick={handleSave}
                        size="small"
                        className="font-semibold"
                    />
                </div>
            </Dialog>
        </div>
    );
};

export default Page;
