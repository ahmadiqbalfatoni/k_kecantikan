'use client';

import { useEffect, useRef, useState } from 'react';
import postData from '@/lib/axios/postData';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { InputSwitch } from 'primereact/inputswitch';
import { Divider } from 'primereact/divider';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { showError, showSuccess } from '@/lib/tools/generalTools';

const Page = () => {
    const toast = useRef<Toast>(null);

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [rows, setRows] = useState<number>(10);
    const [keyword, setKeyword] = useState<string>('');
    const [selectedRows, setSelectedRows] = useState<any[]>([]);

    const [promoOptions, setPromoOptions] = useState<any[]>([]);
    const [produkOptions, setProdukOptions] = useState<any[]>([]);
    const [layananOptions, setLayananOptions] = useState<any[]>([]);
    const [paketOptions, setPaketOptions] = useState<any[]>([]);

    const [filterKodePromo, setFilterKodePromo] = useState<string>('');

    const [dialogVisible, setDialogVisible] = useState<boolean>(false);
    const [isEdit, setIsEdit] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [formData, setFormData] = useState<any>({
        kode_detail_promo: '',
        kode_promo: '',
        jenis_item: 'produk',
        kode_item: [],
        status: 'aktif',
    });
    const [saving, setSaving] = useState<boolean>(false);

    const jenisItemOptions = [
        { label: 'Produk', value: 'produk' },
        { label: 'Layanan', value: 'layanan' },
        { label: 'Paket (Layanan/Produk)', value: 'paket' },
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await postData('/master/detail-promo-data', {
                page, perPage: rows, keyword,
                kode_promo: filterKodePromo || undefined,
            });
            setData(res.data.data || []);
            setTotalRecords(res.data.total_data || 0);
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal memuat data detail promo');
        } finally {
            setLoading(false);
        }
    };

    const loadPromo = async () => {
        try {
            const res = await postData('/master/promo-data', { status: 'aktif' });
            const list = (res.data.data || []).map((p: any) => ({
                label: `${p.nama} (${p.kode_promo})`,
                value: p.kode_promo,
                nama: p.nama
            }));
            setPromoOptions(list);
        } catch (_) {}
    };

    const loadProduk = async () => {
        try {
            const res = await postData('/master/produk-data', { status: 'aktif' });
            const list = (res.data.data || []).map((p: any) => ({
                label: `${p.nama} (${p.kode_produk})`,
                value: p.kode_produk
            }));
            setProdukOptions(list);
        } catch (_) {}
    };

    const loadLayanan = async () => {
        try {
            const res = await postData('/master/layanan-data', { status: 'aktif' });
            const list = (res.data.data || []).map((l: any) => ({
                label: `${l.nama} (${l.kode_layanan})`,
                value: l.kode_layanan
            }));
            setLayananOptions(list);
        } catch (_) {}
    };

    const loadPaket = async () => {
        try {
            const [resL, resP] = await Promise.all([
                postData('/master/paket-layanan-data', { status: 'aktif' }),
                postData('/master/paket-produk-data', { status: 'aktif' }),
            ]);
            const listL = (resL.data.data || []).map((p: any) => ({ label: `[Layanan] ${p.nama} (${p.kode_paket_layanan})`, value: p.kode_paket_layanan }));
            const listP = (resP.data.data || []).map((p: any) => ({ label: `[Produk] ${p.nama} (${p.kode_paket_produk})`, value: p.kode_paket_produk }));
            setPaketOptions([...listL, ...listP]);
        } catch (_) {}
    };

    useEffect(() => {
        loadPromo();
        loadProduk();
        loadLayanan();
        loadPaket();
    }, []);

    useEffect(() => {
        loadData();
    }, [page, rows, keyword, filterKodePromo]);

    const getItemOptions = () => {
        if (formData.jenis_item === 'produk') return produkOptions;
        if (formData.jenis_item === 'layanan') return layananOptions;
        if (formData.jenis_item === 'paket') return paketOptions;
        return [];
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        setSubmitted(false);
        setFormData({
            kode_detail_promo: '',
            kode_promo: promoOptions.length > 0 ? promoOptions[0].value : '',
            jenis_item: 'produk',
            kode_item: [],
            status: 'aktif',
        });
        setDialogVisible(true);
    };

    const handleOpenEdit = (rowData: any) => {
        setIsEdit(true);
        setSubmitted(false);
        setFormData({
            kode_detail_promo: rowData.kode_detail_promo,
            kode_promo: rowData.kode_promo,
            jenis_item: rowData.jenis_item,
            kode_item: rowData.kode_item,
            status: rowData.status || 'aktif',
        });
        setDialogVisible(true);
    };

    const handleSave = async () => {
        setSubmitted(true);
        const isItemEmpty = isEdit
            ? !formData.kode_item
            : (!formData.kode_item || (Array.isArray(formData.kode_item) && formData.kode_item.length === 0));

        if (!formData.kode_promo || !formData.jenis_item || isItemEmpty) {
            showError(toast, 'Harap lengkapi seluruh bidang wajib!');
            return;
        }
        setSaving(true);
        try {
            const endpoint = isEdit ? '/master/detail-promo-update' : '/master/detail-promo-create';
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
            message: `Apakah Anda yakin ingin menghapus ${codes.length} detail promo ini?`,
            header: 'Konfirmasi Hapus',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Ya, Hapus',
            rejectLabel: 'Batal',
            acceptClassName: 'p-button-danger',
            accept: async () => {
                try {
                    const res = await postData('/master/detail-promo-delete', { kode_detail_promo: codes });
                    showSuccess(toast, res.data.message || 'Berhasil dihapus');
                    setSelectedRows([]);
                    loadData();
                } catch (error: any) {
                    showError(toast, error?.response?.data?.message || 'Gagal menghapus data');
                }
            }
        });
    };

    const jenisItemSeverity: any = { produk: 'success', layanan: 'info', paket: 'warning' };
    const jenisItemLabel: any = { produk: 'Produk', layanan: 'Layanan', paket: 'Paket' };

    return (
        <div className="p-4">
            <Toast ref={toast} />
            <ConfirmDialog />

            <div className="card border-round-xl p-4 shadow-1 surface-card mb-4">
                {/* Page Header */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-900 flex align-items-center gap-2 mb-1">
                        <i className="pi pi-list text-purple-600 text-2xl" />
                        Kelola Detail Item Promo
                    </h3>
                    <p className="text-500 text-sm m-0">
                        Tentukan produk, layanan, atau paket yang termasuk dalam suatu promo/diskon.
                    </p>
                </div>

                <div className="flex flex-row flex-wrap align-items-center gap-2 mb-4">
                    <Button size="small" label="Baru" icon="pi pi-plus" outlined severity="success" className="border-round-md font-medium px-3" onClick={handleOpenCreate} />
                    <Divider layout="vertical" className="m-0 h-2rem" />
                    <Button size="small" label="Cetak" icon="pi pi-print" outlined className="border-round-md font-medium px-3 border-purple-600 text-purple-600" onClick={() => window.print()} />
                    <Divider layout="vertical" className="m-0 h-2rem" />
                    <Button
                        size="small"
                        label={`Hapus${selectedRows.length > 0 ? ` (${selectedRows.length})` : ''}`}
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        disabled={selectedRows.length === 0}
                        className="border-round-md font-medium px-3"
                        onClick={() => { if (selectedRows.length < 1) return; handleDelete(selectedRows.map((r) => r.kode_detail_promo)); }}
                    />
                    <Divider layout="vertical" className="m-0 h-2rem" />
                    <Button size="small" label="Refresh" icon="pi pi-refresh" outlined severity="success" className="border-round-md font-medium px-3" loading={loading} onClick={loadData} />
                </div>

                {/* Filter Promo */}
                <div className="flex align-items-center gap-2 mb-3">
                    <label className="text-sm font-semibold text-700 white-space-nowrap">Filter Promo:</label>
                    <Dropdown
                        value={filterKodePromo || null}
                        options={promoOptions}
                        onChange={(e) => { setFilterKodePromo(e.value || ''); setPage(1); }}
                        placeholder="Semua Promo"
                        showClear
                        filter
                        className="text-sm border-round-md"
                        style={{ minWidth: '280px' }}
                    />
                </div>

                <DataTable
                    value={data}
                    loading={loading}
                    paginator
                    rows={rows}
                    totalRecords={totalRecords}
                    lazy
                    first={(page - 1) * rows}
                    onPage={(e) => { setPage((e.page || 0) + 1); setRows(e.rows); }}
                    selection={selectedRows}
                    onSelectionChange={(e) => setSelectedRows(e.value as any[])}
                    dataKey="kode_detail_promo"
                    className="p-datatable-sm"
                    emptyMessage="Data detail promo tidak ditemukan."
                    responsiveLayout="scroll"
                    rowsPerPageOptions={[10, 25, 50]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    header={
                        <div className="flex flex-column gap-3">
                            <div className="flex flex-wrap align-items-center justify-content-between gap-2">
                                <span className="text-xl font-bold">Data Detail Item Promo</span>
                                <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                                    <IconField iconPosition="left" className="w-full md:w-20rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Cari Data..." className="w-full text-sm" />
                                    </IconField>
                                    <Button type="button" icon="pi pi-filter-slash" outlined severity="danger" tooltip="Reset Filter" tooltipOptions={{ position: 'bottom' }} onClick={() => { setKeyword(''); setFilterKodePromo(''); }} />
                                </div>
                            </div>
                            <div className="flex flex-wrap align-items-center gap-3 px-1 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary">
                                <span className="flex align-items-center gap-1">
                                    <i className="pi pi-info-circle" />
                                    <span className="font-semibold">KETERANGAN STATUS:</span>
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span style={{ display:'inline-block', width:'12px', height:'12px', borderRadius:'3px', backgroundColor:'#22c55e', boxShadow:'0 1px 3px #22c55e55' }} />
                                    Aktif
                                </span>
                                <span className="flex align-items-center gap-1">
                                    <span style={{ display:'inline-block', width:'12px', height:'12px', borderRadius:'3px', backgroundColor:'#ef4444', boxShadow:'0 1px 3px #ef444455' }} />
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
                        body={(r) => (
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '3px',
                                    backgroundColor: r.status === 'aktif' ? '#22c55e' : '#ef4444',
                                    boxShadow: r.status === 'aktif' ? '0 1px 3px #22c55e55' : '0 1px 3px #ef444455'
                                }}
                                title={r.status === 'aktif' ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                            />
                        )}
                    ></Column>
                    <Column field="kode_detail_promo" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }}></Column>
                    <Column
                        header="Nama Promo"
                        body={(r) => (
                            <div className="flex flex-column gap-1">
                                <span className="font-semibold text-sm">{r.nama_promo || r.kode_promo}</span>
                                <span className="text-400 text-xs">{r.kode_promo}</span>
                            </div>
                        )}
                        headerStyle={{ fontWeight: 'bold' }}
                    ></Column>
                    <Column
                        header="Diskon"
                        body={(r) => (
                            <span className="font-bold text-purple-600 text-sm">
                                {r.jenis_diskon === 'persen'
                                    ? `${r.nilai_diskon}%`
                                    : `Rp ${Number(r.nilai_diskon).toLocaleString('id-ID')}`}
                            </span>
                        )}
                        headerStyle={{ fontWeight: 'bold' }}
                    ></Column>
                    <Column
                        header="Jenis Item"
                        body={(r) => <Tag value={jenisItemLabel[r.jenis_item] || r.jenis_item} severity={jenisItemSeverity[r.jenis_item] || 'info'} />}
                        headerStyle={{ fontWeight: 'bold' }}
                    ></Column>
                    <Column
                        header="Nama Item"
                        body={(r) => (
                            <div className="flex flex-column gap-1">
                                <span className="font-medium text-sm">{r.nama_item || r.kode_item}</span>
                                <span className="text-400 text-xs">{r.kode_item}</span>
                            </div>
                        )}
                        headerStyle={{ fontWeight: 'bold' }}
                    ></Column>
                    <Column
                        header="Aksi"
                        align="center"
                        headerStyle={{ width: '8rem', textAlign: 'center' }}
                        body={(r) => (
                            <div className="flex align-items-center justify-content-center gap-2">
                                <Button icon="pi pi-pencil" outlined severity="success" className="p-button-sm border-round-md" onClick={() => handleOpenEdit(r)} tooltip="Edit" />
                                <Button icon="pi pi-trash" outlined severity="danger" className="p-button-sm border-round-md" onClick={() => handleDelete([r.kode_detail_promo])} tooltip="Hapus" />
                            </div>
                        )}
                    ></Column>
                </DataTable>
            </div>

            {/* Modal Create/Edit */}
            <Dialog header={isEdit ? 'Edit Detail Promo' : 'Tambah Detail Promo'} visible={dialogVisible} style={{ width: '540px' }} modal onHide={() => setDialogVisible(false)}>
                <div className="flex flex-column gap-3 pt-2">
                    {isEdit && (
                        <div>
                            <label className="block text-sm font-semibold mb-1">Kode Detail Promo</label>
                            <InputText value={formData.kode_detail_promo} disabled className="w-full text-sm border-round-md" />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-1">Promo *</label>
                        <Dropdown
                            value={formData.kode_promo}
                            options={promoOptions}
                            onChange={(e) => setFormData({ ...formData, kode_promo: e.value })}
                            placeholder="Pilih Promo..."
                            filter
                            className={`w-full text-sm border-round-md ${submitted && !formData.kode_promo ? 'p-invalid' : ''}`}
                        />
                        {submitted && !formData.kode_promo && (
                            <small className="p-error text-red-500 text-xs block mt-1">Promo wajib dipilih.</small>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Jenis Item *</label>
                        <Dropdown
                            value={formData.jenis_item}
                            options={jenisItemOptions}
                            onChange={(e) => setFormData({ ...formData, jenis_item: e.value, kode_item: isEdit ? '' : [] })}
                            className="w-full text-sm border-round-md"
                        />
                        <small className="text-400 text-xs block mt-1">
                            {formData.jenis_item === 'produk' && 'Pilih produk yang mendapatkan diskon dari promo ini.'}
                            {formData.jenis_item === 'layanan' && 'Pilih layanan yang mendapatkan diskon dari promo ini.'}
                            {formData.jenis_item === 'paket' && 'Pilih paket layanan atau paket produk yang mendapatkan diskon dari promo ini.'}
                        </small>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">
                            {formData.jenis_item === 'produk' && 'Produk *'}
                            {formData.jenis_item === 'layanan' && 'Layanan *'}
                            {formData.jenis_item === 'paket' && 'Paket *'}
                        </label>
                        {isEdit ? (
                            <Dropdown
                                value={formData.kode_item}
                                options={getItemOptions()}
                                onChange={(e) => setFormData({ ...formData, kode_item: e.value })}
                                placeholder={`Pilih ${jenisItemLabel[formData.jenis_item] || 'Item'}...`}
                                filter
                                className={`w-full text-sm border-round-md ${submitted && !formData.kode_item ? 'p-invalid' : ''}`}
                            />
                        ) : (
                            <div>
                                <MultiSelect
                                    value={formData.kode_item}
                                    options={getItemOptions()}
                                    onChange={(e) => setFormData({ ...formData, kode_item: e.value })}
                                    placeholder={`Pilih ${jenisItemLabel[formData.jenis_item] || 'Item'} (bisa pilih banyak)...`}
                                    filter
                                    display="chip"
                                    showSelectAll
                                    selectAllLabel="Pilih Semua"
                                    className={`w-full text-sm border-round-md ${submitted && Array.isArray(formData.kode_item) && formData.kode_item.length === 0 ? 'p-invalid' : ''}`}
                                    maxSelectedLabels={3}
                                    selectedItemsLabel="{0} item dipilih"
                                />
                                {Array.isArray(formData.kode_item) && formData.kode_item.length > 0 && (
                                    <small className="text-purple-600 font-semibold block mt-1">
                                        <i className="pi pi-check-circle mr-1" />
                                        {formData.kode_item.length} item dipilih untuk ditambahkan sekaligus.
                                    </small>
                                )}
                            </div>
                        )}
                        {submitted && (isEdit ? !formData.kode_item : (Array.isArray(formData.kode_item) && formData.kode_item.length === 0)) && (
                            <small className="p-error text-red-500 text-xs block mt-1">Item wajib dipilih (minimal 1 item).</small>
                        )}
                    </div>

                    <div className="surface-50 p-3 border-round-md border-1 surface-border">
                        <div className="flex align-items-center justify-content-between mb-2">
                            <span className="font-bold text-sm text-900">Status Item Promo</span>
                            <InputSwitch
                                checked={formData.status === 'aktif'}
                                onChange={(e) => setFormData({ ...formData, status: e.value ? 'aktif' : 'nonaktif' })}
                            />
                        </div>
                        <span className="text-xs text-600 block mb-2">
                            <strong>Status: {formData.status === 'aktif' ? 'Aktif' : 'Non-aktif'}</strong>. {formData.status === 'aktif' ? 'Item promo aktif dan dapat digunakan dalam diskon.' : 'Item promo dinonaktifkan.'}
                        </span>
                        <div className="text-xs text-600 border-top-1 surface-border pt-2 mt-2">
                            <i className="pi pi-info-circle mr-1 text-blue-500" />
                            Setiap kombinasi <strong>Promo + Jenis Item + Item</strong> hanya dapat didaftarkan <strong>satu kali</strong>.
                        </div>
                    </div>
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Batal" icon="pi pi-times" text onClick={() => setDialogVisible(false)} />
                    <Button label="Simpan" icon="pi pi-check" loading={saving} onClick={handleSave} className="bg-primary border-none" />
                </div>
            </Dialog>
        </div>
    );
};

export default Page;
