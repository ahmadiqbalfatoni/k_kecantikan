'use client';

import React, { useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Tag } from 'primereact/tag';
import { Tooltip } from 'primereact/tooltip';
import { ColumnGroup } from 'primereact/columngroup';
import { Row } from 'primereact/row';

import { formatDateSystem } from '@/lib/tools/dateTools';
import { formatCurrency, showSuccess } from '@/lib/tools/generalTools';
import { TableData, TableProps } from '../interfaces';
import { apiEndpointGet } from '../endpoints';
import UserDialog from '@/app/components/dialogComponents/userDialog';

// Konfigurasi palet warna status operasional servis terbaru
const STATUS_COLOR_MAP: Record<string, string> = {
    menunggu: 'bg-gray-500',
    pengecekan: 'bg-blue-500',
    pengerjaan: 'bg-yellow-500',
    menunggu_suku_cadang: 'bg-orange-500',
    selesai: 'bg-teal-500',
    diambil: 'bg-green-500',
    batal: 'bg-red-500'
};

const Table = ({
    dataRekap,
    state,
    setState,
    getData,
    getFilterData,
    getPrintData,
    onLazyLoad,
    toast
}: TableProps) => {
    const op = useRef<OverlayPanel>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const dataTotals = state.dataTotals;

    // Helper label teks status
    const getStatusLabel = (status: string) => {
        return status.toUpperCase().replace(/_/g, ' ');
    };

    // Helper warna severity untuk PrimeReact Tag status servis
    const getStatusSeverity = (status: string) => {
        switch (status) {
            case 'menunggu': return 'secondary';
            case 'pengecekan': return 'info';
            case 'pengerjaan': return 'warning';
            case 'menunggu_suku_cadang': return 'danger';
            case 'selesai': return 'info'; // Mendekati teal pada prime tag
            case 'diambil': return 'success';
            case 'batal': return 'danger';
            default: return 'secondary';
        }
    };

    // Helper warna & label status pembayaran
    const getPembayaranSeverity = (status: string) => {
        switch (status) {
            case 'belum_bayar': return 'danger';
            case 'sebagian': return 'warning';
            case 'lunas': return 'success';
            default: return 'secondary';
        }
    };

    const getPembayaranLabel = (status: string) => {
        return status.toUpperCase().replace(/_/g, ' ');
    };

    // 1. TEMPLATE INDIKATOR DOT STATUS (Terpisah di Kolom Pertama)
    const statusIndicatorTemplate = (rowData: TableData) => {
        const currentStatus = rowData.status || 'menunggu';
        const friendlyLabel = getStatusLabel(currentStatus);
        const colorClass = STATUS_COLOR_MAP[currentStatus] || 'bg-gray-500';
        const cUniqueId = `status-dot-${rowData.id}`;

        return (
            <div className="flex justify-content-center align-items-center w-full">
                <Tooltip target={`#${cUniqueId}`} content={friendlyLabel} position="top" style={{ whiteSpace: 'nowrap' }} />
                <span
                    id={cUniqueId}
                    className={`block border-round-sm ${colorClass}`}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                ></span>
            </div>
        );
    };

    // 2. TEMPLATE KODE TIKET + TOMBOL COPY (Kolom Kedua)
    const ticketCodeBodyTemplate = (rowData: TableData) => {
        const handleCopy = (e: React.MouseEvent, code: string) => {
            e.stopPropagation();
            navigator.clipboard.writeText(code);
            showSuccess(toast, `Kode tiket ${code} disalin ke clipboard`);
        };

        return (
            <div className="flex align-items-center gap-2">
                <span className="font-semibold text-800">{rowData.kode}</span>
                <Button
                    icon="pi pi-copy"
                    className="p-button-rounded p-button-text p-button-secondary p-0"
                    style={{ width: '28px', height: '28px', color: '#3b82f6' }}
                    tooltip="Salin Kode"
                    tooltipOptions={{ position: 'top' }}
                    onClick={(e) => handleCopy(e, rowData.kode)}
                />
            </div>
        );
    };

    // Header Template (Kontrol Filter Atas)
    const headerTemplate = (
        <div className="flex flex-wrap align-items-center justify-content-between gap-3">
            {/* SISI KIRI: Rentang Tanggal Masuk Servis */}
            <div className="flex align-items-center flex-wrap gap-2">
                <div className="flex align-items-center gap-2">
                    <Calendar
                        value={state.tanggalAwal ? new Date(state.tanggalAwal) : null}
                        onChange={(e) => {
                            const val = e.value ? formatDateSystem(e.value, 'yyyy-MM-dd') : '';
                            setState((p) => ({ ...p, tanggalAwal: val || '', page: 1, first: 0 }));
                        }}
                        dateFormat="yy-mm-dd"
                        showIcon
                        placeholder="Mulai"
                        className="w-11rem text-sm"
                    />
                    <span className="text-xs text-500 font-bold">s.d</span>
                    <Calendar
                        value={state.tanggalAkhir ? new Date(state.tanggalAkhir) : null}
                        onChange={(e) => {
                            const val = e.value ? formatDateSystem(e.value, 'yyyy-MM-dd') : '';
                            setState((p) => ({ ...p, tanggalAkhir: val || '', page: 1, first: 0 }));
                        }}
                        dateFormat="yy-mm-dd"
                        showIcon
                        placeholder="Selesai"
                        className="w-11rem text-sm"
                    />
                </div>
            </div>

            {/* SISI KANAN: Pencarian, Filter Dropdown, & Reset */}
            <div className="flex align-items-center gap-2 ml-auto w-full md:w-auto">
                <Button
                    type="button"
                    icon="pi pi-filter"
                    label="Filter"
                    outlined
                    loading={state.filterLoad}
                    severity={
                        (state.selectedStatus && state.selectedStatus.length > 0) ||
                            (state.selectedJenisTiket && state.selectedJenisTiket.length > 0) ||
                            (state.selectedPembayaran && state.selectedPembayaran.length > 0) ||
                            state.selectedTeknisi
                            ? 'warning'
                            : 'secondary'
                    }
                    onClick={(e) => {
                        op.current?.toggle(e);
                    }}
                />

                <span className="p-input-icon-left w-full md:w-20rem">
                    <IconField iconPosition="left">
                        <InputIcon className="pi pi-search" />
                        <InputText
                            value={state.searchVal}
                            className="w-full text-sm"
                            placeholder="Cari Tiket, Pelanggan, IMEI..."
                            onChange={(e) => {
                                const value = e.target.value;
                                setState((p) => ({ ...p, searchVal: value }));

                                if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
                                searchTimeoutRef.current = setTimeout(() => {
                                    setState((p) => ({ ...p, keyword: value, page: 1, first: 0 }));
                                }, 500);
                            }}
                        />
                    </IconField>
                </span>

                <Button
                    type="button"
                    icon="pi pi-filter-slash"
                    outlined
                    severity="danger"
                    tooltip="Reset Semua Filter"
                    tooltipOptions={{ position: 'bottom' }}
                    onClick={() => {
                        setState((p) => ({
                            ...p,
                            searchVal: '',
                            keyword: '',
                            tanggalAwal: new Date(),
                            tanggalAkhir: new Date(),
                            selectedStatus: null,
                            selectedJenisTiket: null,
                            selectedPembayaran: null,
                            selectedTeknisi: '',
                            ketTeknisi: '',
                            page: 1,
                            first: 0
                        }));
                    }}
                />
            </div>

            {/* Panel Overlay Filter Tambahan */}
            <OverlayPanel ref={op} style={{ width: '580px' }}>
                <div className="flex flex-column gap-3">
                    <span className="font-bold text-lg border-bottom-1 border-300 pb-2">Filter Tambahan Laporan</span>

                    <div className="grid formgrid p-fluid">
                        {/* Filter Status Servis */}
                        <div className="field col-12 md:col-6 mb-3">
                            <label className="font-semibold text-xs text-700 block mb-2">Status Pekerjaan</label>
                            <MultiSelect
                                value={state.selectedStatus}
                                options={[
                                    { label: 'Menunggu', value: 'menunggu' },
                                    { label: 'Pengecekan', value: 'pengecekan' },
                                    { label: 'Pengerjaan', value: 'pengerjaan' },
                                    { label: 'Menunggu Suku Cadang', value: 'menunggu_suku_cadang' },
                                    { label: 'Selesai', value: 'selesai' },
                                    { label: 'Diambil', value: 'diambil' },
                                    { label: 'Batal', value: 'batal' },
                                ]}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Semua Status Pekerjaan"
                                display="chip"
                                className="w-full text-sm"
                                onChange={(e) => {
                                    setState((p) => ({ ...p, selectedStatus: e.value, page: 1, first: 0 }));
                                }}
                            />
                        </div>

                        {/* Filter Jenis Tiket */}
                        <div className="field col-12 md:col-6 mb-3">
                            <label className="font-semibold text-xs text-700 block mb-2">Jenis Tiket</label>
                            <MultiSelect
                                value={state.selectedJenisTiket}
                                options={[
                                    { label: 'Reguler', value: 'reguler' },
                                    { label: 'Garansi', value: 'garansi' },
                                ]}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Semua Jenis Tiket"
                                display="chip"
                                className="w-full text-sm"
                                onChange={(e) => {
                                    setState((p) => ({ ...p, selectedJenisTiket: e.value, page: 1, first: 0 }));
                                }}
                            />
                        </div>

                        {/* Filter Status Pembayaran */}
                        <div className="field col-12 md:col-6 mb-3">
                            <label className="font-semibold text-xs text-700 block mb-2">Status Pembayaran</label>
                            <MultiSelect
                                value={state.selectedPembayaran}
                                options={[
                                    { label: 'Belum Bayar', value: 'belum_bayar' },
                                    { label: 'Sebagian', value: 'sebagian' },
                                    { label: 'Lunas', value: 'lunas' },
                                ]}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Semua Status Bayar"
                                display="chip"
                                className="w-full text-sm"
                                onChange={(e) => {
                                    setState((p) => ({ ...p, selectedPembayaran: e.value, page: 1, first: 0 }));
                                }}
                            />
                        </div>

                        {/* Filter Teknisi Lapangan */}
                        <div className="field col-12 md:col-6 mb-3">
                            <label className="font-semibold text-xs text-700 block mb-2">Teknisi Penanggung Jawab</label>
                            <div className="p-inputgroup">
                                <InputText readOnly value={state.ketTeknisi || ''} placeholder="Pilih Teknisi" className="text-sm" />
                                <Button
                                    icon="pi pi-search"
                                    className="p-button-secondary"
                                    onClick={() => setState(p => ({ ...p, showTeknisi: true }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </OverlayPanel>
        </div>
    );

    // Template Aksi Detail Row
    const actionBodyTemplate = (rowData: TableData) => {
        return (
            <div className="flex justify-content-center gap-2">
                <Button
                    icon="pi pi-eye"
                    outlined
                    className="p-button-sm"
                    onClick={() => {
                        setState((p) => ({ ...p, selectedData: rowData, showDetail: true }));
                    }}
                    tooltip="Detail Pekerjaan Servis"
                    tooltipOptions={{ position: 'bottom' }}
                />
            </div>
        );
    };

    // Footer Tabel Akumulasi Total Seluruh Halaman (Colspan disesuaikan dengan penambahan kolom indicator)
    const footerGroup = (
        <ColumnGroup>
            <Row>
                <Column footer="Grand Total (Semua Halaman):" colSpan={6} footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                <Column footer={formatCurrency(dataTotals.total_biaya_suku_cadang)} footerStyle={{ fontWeight: 'bold', textAlign: 'right' }} />
                <Column footer={formatCurrency(dataTotals.total_biaya_jasa)} footerStyle={{ fontWeight: 'bold', textAlign: 'right' }} />
                <Column footer={formatCurrency(dataTotals.subtotal)} footerStyle={{ fontWeight: 'bold', textAlign: 'right' }} />
                <Column footer={formatCurrency(dataTotals.diskon_nominal)} footerStyle={{ fontWeight: 'bold', textAlign: 'right' }} />
                <Column footer={formatCurrency(dataTotals.pajak_nominal)} footerStyle={{ fontWeight: 'bold', textAlign: 'right' }} />
                <Column footer={formatCurrency(dataTotals.grandtotal)} footerStyle={{ fontWeight: 'bold', textAlign: 'right' }} />
                <Column footer="" colSpan={3} />
            </Row>
        </ColumnGroup>
    );

    return (
        <>
            {/* Judul Laporan */}
            <div className="flex justify-content-between items-start mb-5">
                <div className="flex flex-column">
                    <h3 className="text-2xl font-semibold flex align-items-center gap-2">
                        <i className="pi pi-cog text-blue-600 text-3xl"></i>Laporan Operasional Service
                    </h3>
                    <p className="text-gray-500">
                        Analisis data servis masuk, status penanganan teknisi, monitoring quality control (QC), dan performansi keuangan suku cadang serta jasa servis.
                    </p>
                </div>
            </div>

            {/* Widget Ringkasan Finansial Modern */}
            <div className="grid mb-2">
                <div className="col-12 sm:col-6 lg:col-3">
                    <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
                        <div className="flex flex-column gap-1">
                            <span className="text-sm font-bold text-500 uppercase tracking-wider">Total Suku Cadang</span>
                            <span className="text-xl font-black text-blue-700">{formatCurrency(dataTotals.total_biaya_suku_cadang)}</span>
                        </div>
                        <div className="p-3 bg-blue-50 border-round-lg">
                            <i className="pi pi-box text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div className="col-12 sm:col-6 lg:col-3">
                    <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
                        <div className="flex flex-column gap-1">
                            <span className="text-sm font-bold text-500 uppercase tracking-wider">Total Biaya Jasa</span>
                            <span className="text-xl font-black text-purple-700">{formatCurrency(dataTotals.total_biaya_jasa)}</span>
                        </div>
                        <div className="p-3 bg-purple-50 border-round-lg">
                            <i className="pi pi-briefcase text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div className="col-12 sm:col-6 lg:col-3">
                    <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
                        <div className="flex flex-column gap-1">
                            <span className="text-sm font-bold text-500 uppercase tracking-wider">Total Potongan Diskon</span>
                            <span className="text-xl font-black text-red-600">{formatCurrency(dataTotals.diskon_nominal)}</span>
                        </div>
                        <div className="p-3 bg-red-50 border-round-lg">
                            <i className="pi pi-percentage text-red-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div className="col-12 sm:col-6 lg:col-3">
                    <div className="surface-card border-round-xl border-1 surface-border p-3 flex align-items-center justify-content-between h-full hover:shadow-2 transition-duration-150">
                        <div className="flex flex-column gap-1">
                            <span className="text-sm font-bold text-500 uppercase tracking-wider">Grand Total Bersih</span>
                            <span className="text-xl font-black text-green-600">{formatCurrency(dataTotals.grandtotal)}</span>
                        </div>
                        <div className="p-3 bg-green-50 border-round-lg">
                            <i className="pi pi-check-circle text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tombol Aksi Utama */}
            <div className="card">
                <div className="flex flex-row flex-wrap items-center gap-2 mb-4">
                    <Button
                        size="small"
                        label="Cetak Laporan"
                        icon="pi pi-print"
                        outlined
                        onClick={() => getPrintData(apiEndpointGet)}
                        loading={dataRekap.load}
                    />

                    <Divider layout="vertical" />

                    <Button
                        size="small"
                        label="Refresh"
                        icon="pi pi-refresh"
                        outlined
                        onClick={() => getData(apiEndpointGet)}
                        loading={state.load}
                    />
                </div>

                {/* Legend Box Status Pekerjaan Servis dengan Kode Warna Terbaru */}
                <div className="flex flex-wrap align-items-center gap-4 mb-3 p-3 surface-50 border-round-xl border-1 surface-border">
                    <span className="flex align-items-center text-xs font-bold text-500 uppercase tracking-wider mr-2">
                        <i className="pi pi-info-circle mr-2"></i> Keterangan Status Servis:
                    </span>
                    <div className="flex align-items-center gap-2">
                        <span className="block bg-gray-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Menunggu</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span className="block bg-blue-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Pengecekan</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span className="block bg-yellow-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Pengerjaan</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span className="block bg-orange-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Menunggu Suku Cadang</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span className="block bg-teal-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Selesai</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span className="block bg-green-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Sudah Diambil</span>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <span className="block bg-red-500 border-round-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span className="text-xs font-semibold text-700">Batal</span>
                    </div>
                </div>

                <DataTable
                    value={state.data}
                    scrollable
                    lazy={true}
                    paginator={true}
                    first={state.first}
                    rows={state.rows}
                    totalRecords={state.totalData}
                    onPage={onLazyLoad}
                    onSort={onLazyLoad}
                    sortField={state.sortField}
                    sortOrder={state.sortOrder === 'asc' ? 1 : -1}
                    header={headerTemplate}
                    loading={state.load}
                    dataKey="kode"
                    emptyMessage="Data Laporan Operasional Service Tidak Ditemukan"
                    rowsPerPageOptions={[10, 25, 50, 100]}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="Menampilkan {first} - {last} dari {totalRecords} data"
                    footerColumnGroup={footerGroup}
                >
                    {/* 1. Kolom Indikator Dot Status (Terpisah) */}
                    <Column header="" align="center" body={statusIndicatorTemplate} headerStyle={{ width: '3.5rem' }} />

                    {/* 2. Kolom Kode Tiket (Dengan Fitur Copy) */}
                    <Column field="kode" header="Kode Tiket" body={ticketCodeBodyTemplate} style={{ minWidth: '12rem' }} sortable></Column>

                    {/* Kolom Informasi Pekerjaan */}
                    <Column field="created_at" header="Tanggal Masuk" body={(rowData) => !rowData.created_at ? '-' : formatDateSystem(rowData.created_at, 'yyyy-MM-dd HH:mm')} align="center" style={{ minWidth: '11rem' }} sortable></Column>
                    <Column field="nama_pelanggan" header="Pelanggan" body={(rowData) => rowData.nama_pelanggan || '-'} style={{ minWidth: '12rem' }} sortable></Column>
                    <Column field="nama_teknisi" header="Teknisi" body={(rowData) => rowData.nama_teknisi || '-'} style={{ minWidth: '11rem' }} sortable></Column>
                    <Column field="model_perangkat" header="Perangkat" style={{ minWidth: '12rem' }} sortable></Column>

                    {/* Kolom Finansial */}
                    <Column field="total_biaya_suku_cadang" header="Suku Cadang" body={(rowData) => formatCurrency(rowData.total_biaya_suku_cadang)} align="right" style={{ minWidth: '10rem' }}></Column>
                    <Column field="total_biaya_jasa" header="Jasa Servis" body={(rowData) => formatCurrency(rowData.total_biaya_jasa)} align="right" style={{ minWidth: '10rem' }}></Column>
                    <Column field="subtotal" header="Subtotal" body={(rowData) => formatCurrency(rowData.subtotal)} align="right" style={{ minWidth: '10rem' }}></Column>
                    <Column field="diskon_nominal" header="Diskon" body={(rowData) => formatCurrency(rowData.diskon_nominal)} align="right" style={{ minWidth: '8rem' }}></Column>
                    <Column field="pajak_nominal" header="Pajak" body={(rowData) => formatCurrency(rowData.pajak_nominal)} align="right" style={{ minWidth: '8rem' }}></Column>
                    <Column field="grandtotal" header="Grand Total" body={(rowData) => formatCurrency(rowData.grandtotal)} align="right" style={{ minWidth: '11rem' }} sortable></Column>

                    <Column field="status_pembayaran" header="Pembayaran" align="center" style={{ minWidth: '10rem' }} sortable body={(rowData) => (
                        <Tag severity={getPembayaranSeverity(rowData.status_pembayaran)} value={getPembayaranLabel(rowData.status_pembayaran)} />
                    )}></Column>

                    {/* <Column header="Aksi" align="center" frozen alignFrozen="right" style={{ minWidth: '6rem' }} body={actionBodyTemplate}></Column> */}
                </DataTable>
            </div>

            {/* Dialog Overlay Pemilihan Teknisi Tunggal */}
            <UserDialog
                visible={state.showTeknisi || false}
                multiple={false}
                onSelect={(v) => setState((p) => ({
                    ...p,
                    ketTeknisi: v[0].fullname,
                    selectedTeknisi: v[0].username, // property identitas teknisi yang sesuai (v[0].kode / v[0].username)
                    showTeknisi: false
                }))}
                onHide={() => setState((p) => ({ ...p, showTeknisi: false }))}
            />
        </>
    );
};

export default Table;