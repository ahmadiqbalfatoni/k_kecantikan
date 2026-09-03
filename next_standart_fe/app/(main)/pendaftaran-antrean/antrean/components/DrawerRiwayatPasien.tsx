'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from 'primereact/sidebar';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import postData from '@/lib/axios/postData';
import { showError } from '@/lib/tools/generalTools';

interface DrawerRiwayatPasienProps {
    visible: boolean;
    onHide: () => void;
    noRm: string;
    namaPasien?: string;
    excludeKodeKunjungan?: string;
    toast?: React.RefObject<Toast>;
}

const getFullImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    const clean = url.startsWith('/') ? url : `/${url}`;
    return `http://127.0.0.1:8000${clean}`;
};

export const DrawerRiwayatPasien: React.FC<DrawerRiwayatPasienProps> = ({
    visible,
    onHide,
    noRm,
    namaPasien = 'Pasien',
    excludeKodeKunjungan,
    toast,
}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [riwayatList, setRiwayatList] = useState<any[]>([]);
    const [page, setPage] = useState<number>(1);
    const [totalRecords, setTotalRecords] = useState<number>(0);

    // Modal Zoom Preview Foto
    const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
    const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string>('');
    const [previewPhotoTitle, setPreviewPhotoTitle] = useState<string>('');

    const PER_PAGE = 5;

    useEffect(() => {
        if (visible && noRm) {
            setPage(1);
            setRiwayatList([]);
            fetchRiwayat(1, false);
        }
    }, [visible, noRm, excludeKodeKunjungan]);

    const fetchRiwayat = async (targetPage: number, isAppend: boolean = false) => {
        if (isAppend) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const res = await postData('/master/pasien-rekam-medis', {
                no_rm: noRm,
                exclude_kode_kunjungan: '',
                only_selesai: false,
                page: targetPage,
                perPage: PER_PAGE,
            });

            const data = res.data?.data || [];
            const total = res.data?.total_data || 0;

            if (isAppend) {
                setRiwayatList((prev) => [...prev, ...data]);
            } else {
                setRiwayatList(data);
            }

            setTotalRecords(total);
            setPage(targetPage);
        } catch (error: any) {
            if (toast) {
                showError(toast, error?.response?.data?.message || 'Gagal memuat riwayat rekam medis pasien');
            }
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        const nextPage = page + 1;
        fetchRiwayat(nextPage, true);
    };

    const formatDateIndo = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch (_) {
            return dateStr;
        }
    };

    const openPhotoZoom = (url: string, title: string) => {
        setPreviewPhotoUrl(getFullImageUrl(url));
        setPreviewPhotoTitle(title);
        setPreviewModalVisible(true);
    };

    // Header Drawer
    const customHeader = (
        <div className="flex align-items-center gap-3 w-full pr-3 py-2 border-bottom-1 surface-border">
            <div className="w-3rem h-3rem bg-teal-700 text-white border-round-xl flex align-items-center justify-content-center text-xl shadow-2 flex-shrink-0">
                <i className="pi pi-history text-xl font-bold" />
            </div>
            <div className="flex-1 overflow-hidden">
                <div className="text-xs font-black text-teal-800 uppercase tracking-widest flex align-items-center gap-1">
                    <span>REKAM MEDIS & RIWAYAT PEMERIKSAAN PASIEN</span>
                </div>
                <div className="text-2xl font-black text-900 text-truncate" title={namaPasien}>
                    {namaPasien}
                </div>
                <div className="flex align-items-center gap-2 mt-1 flex-wrap">
                    <span className="bg-teal-700 text-white text-xs font-mono font-bold px-2.5 py-1 border-round-md shadow-1">
                        No. RM: {noRm || '-'}
                    </span>
                    <span className="bg-teal-50 text-teal-900 text-xs font-bold px-2.5 py-1 border-round-md border-1 border-teal-200">
                        Total {totalRecords} Riwayat Kunjungan
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Sidebar
                visible={visible}
                position="right"
                onHide={onHide}
                header={customHeader}
                className="w-full md:w-9 lg:w-8 xl:w-7"
                style={{ width: '75vw', maxWidth: '1200px' }}
            >
                <div className="p-2 pb-6">
                    {loading ? (
                        <div className="flex flex-column align-items-center justify-content-center p-6 text-center">
                            <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="4" />
                            <div className="text-base font-bold text-600 mt-3">Memuat riwayat rekam medis pasien...</div>
                        </div>
                    ) : riwayatList.length === 0 ? (
                        <div className="flex flex-column align-items-center justify-content-center p-6 text-center surface-card border-round-2xl border-1 surface-border my-4 shadow-2">
                            <div className="w-5rem h-5rem bg-teal-50 border-circle flex align-items-center justify-content-center mb-3 text-teal-600 shadow-1">
                                <i className="pi pi-folder-open text-4xl" />
                            </div>
                            <h3 className="text-xl font-black text-800 m-0">Belum Ada Riwayat Kunjungan</h3>
                            <p className="text-sm text-500 mt-2 line-height-3 max-w-24rem m-0">
                                Pasien ini belum memiliki catatan rekam medis atau riwayat tindakan tersimpan di sistem.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-column gap-4">
                            {riwayatList.map((kunjungan, kIdx) => {
                                const headerRM = kunjungan.header_rekam_medis || {};
                                const layananList = kunjungan.layanan || [];
                                const isSelesai = kunjungan.status_kunjungan === 'selesai';

                                // Temukan foto before dari header RM atau dari foto sesi layanan
                                let beforeFotoUrl = headerRM.foto_before || '';
                                if (!beforeFotoUrl && layananList.length > 0) {
                                    for (const lay of layananList) {
                                        const foundBefore = (lay.rekam_medis?.fotos || []).find(
                                            (f: any) => f.tipe === 'before' || f.tipe === 'foto_before'
                                        );
                                        if (foundBefore?.url_foto) {
                                            beforeFotoUrl = foundBefore.url_foto;
                                            break;
                                        }
                                    }
                                }

                                return (
                                    <div
                                        key={kunjungan.kode_kunjungan || kIdx}
                                        className="card shadow-3 border-round-xl p-0 mb-3 surface-card overflow-hidden border-2 border-teal-500"
                                    >
                                        {/* ── ACTIVE PATIENT HEADER HERO (PERSIS SAMA DENGAN FORM PEMERIKSAAN) ── */}
                                        <div className="p-4 bg-teal-700 text-white">
                                            <div className="flex flex-column md:flex-row align-items-start md:align-items-center gap-3 mb-3">
                                                <div
                                                    className="bg-white text-teal-900 border-round-xl px-4 py-2 text-center shadow-2 flex-shrink-0"
                                                    style={{ minWidth: '85px' }}
                                                >
                                                    <span className="text-xs font-bold block text-teal-600 uppercase tracking-wider white-space-nowrap">
                                                        KUNJUNGAN
                                                    </span>
                                                    <span className="text-4xl font-black">
                                                        #{riwayatList.length - kIdx}
                                                    </span>
                                                </div>

                                                <div className="flex-1">
                                                    <div className="flex align-items-center gap-2 mb-1 flex-wrap">
                                                        <Tag
                                                            value={isSelesai ? 'STATUS: SELESAI' : 'STATUS: SEDANG BERLANGSUNG'}
                                                            severity={isSelesai ? 'success' : 'warning'}
                                                            className="text-xs font-bold px-2.5 py-1"
                                                        />
                                                        <span className="text-xs text-teal-200">
                                                            <i className="pi pi-clock mr-1" />
                                                            Jam Datang: {kunjungan.jam_datang || '-'}
                                                        </span>
                                                        <span className="text-xs text-teal-200">•</span>
                                                        <span className="text-xs text-teal-200 font-mono">
                                                            Kode: {kunjungan.kode_kunjungan}
                                                        </span>
                                                    </div>

                                                    <h2 className="text-xl font-black text-white m-0 mt-1 flex align-items-center gap-2">
                                                        <i className="pi pi-calendar text-teal-300" />
                                                        {formatDateIndo(kunjungan.tanggal_kunjungan)}
                                                    </h2>

                                                    <div className="flex align-items-center gap-2 mt-2 flex-wrap">
                                                        {headerRM.dokter_nama && (
                                                            <span className="inline-flex align-items-center gap-1 bg-teal-900 text-teal-100 text-xs font-semibold px-2.5 py-1 border-round-md border-1 border-teal-400">
                                                                <i className="pi pi-user text-xs" />
                                                                Petugas / Dokter: {headerRM.dokter_nama}
                                                            </span>
                                                        )}
                                                        <span className="inline-flex align-items-center gap-1 bg-teal-800 text-teal-100 text-xs font-semibold px-2.5 py-1 border-round-md">
                                                            <i className="pi pi-sparkles text-xs" />
                                                            {layananList.length} Sesi Layanan
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ── MAIN CONTENT VIEW (PERSIS SAMA DENGAN FORM PEMERIKSAAN) ── */}
                                        <div className="p-4 flex flex-column gap-4 surface-ground">
                                            {/* SECTION: PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP) */}
                                            {headerRM.dokter_nama && (
                                                <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
                                                    <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
                                                        <label className="text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center gap-2 m-0">
                                                            <i className="pi pi-user text-teal-600 text-sm" />
                                                            PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP)
                                                        </label>
                                                        {headerRM.no_sip && (
                                                            <span className="text-[11px] text-500 font-semibold font-mono">
                                                                Tersimpan berdasar No. SIP: {headerRM.no_sip}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex align-items-center justify-content-between bg-teal-50/80 p-3 border-round-lg border-1 border-teal-200">
                                                        <div className="flex align-items-center gap-3">
                                                            <div className="w-2.5rem h-2.5rem border-circle bg-teal-600 text-white flex align-items-center justify-content-center text-lg font-bold shadow-1">
                                                                👨‍⚕️
                                                            </div>
                                                            <div>
                                                                <span className="font-bold text-teal-950 text-sm block">
                                                                    {headerRM.dokter_nama}
                                                                </span>
                                                                <span className="text-xs text-600">
                                                                    {headerRM.dokter_jabatan || 'Dokter Penanggung Jawab'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {headerRM.no_sip && (
                                                            <Tag
                                                                value={`No. SIP: ${headerRM.no_sip}`}
                                                                severity="info"
                                                                className="text-xs font-bold px-2.5 py-1"
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* SECTION: FOTO BEFORE (SEBELUM TREATMENT / KONSULTASI) */}
                                            {beforeFotoUrl && (
                                                <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
                                                    <div className="p-3 surface-50 border-round-xl border-1 surface-border">
                                                        <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-3 flex align-items-center gap-2">
                                                            <i className="pi pi-camera text-teal-600 text-sm" />
                                                            FOTO BEFORE (SEBELUM TREATMENT / KONSULTASI)
                                                        </label>
                                                        <div className="flex align-items-center gap-3">
                                                            <div
                                                                className="relative border-round-xl overflow-hidden border-2 surface-border cursor-pointer shadow-2 hover:shadow-4 transition-all"
                                                                style={{ width: '130px', height: '130px' }}
                                                                onClick={() =>
                                                                    openPhotoZoom(
                                                                        beforeFotoUrl,
                                                                        `Foto Before — ${formatDateIndo(kunjungan.tanggal_kunjungan)}`
                                                                    )
                                                                }
                                                            >
                                                                <img
                                                                    src={getFullImageUrl(beforeFotoUrl)}
                                                                    alt="Foto Before"
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        if (!target.src.includes('/api/assets')) {
                                                                            target.src = `/api/assets${beforeFotoUrl}`;
                                                                        }
                                                                    }}
                                                                />
                                                                <div className="absolute inset-0 bg-black-alpha-40 opacity-0 hover:opacity-100 flex align-items-center justify-content-center transition-all">
                                                                    <i className="pi pi-search-plus text-white text-2xl font-bold" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* SECTION: 1. ANAMNESIS & RIWAYAT PASIEN (REKAM MEDIS) */}
                                            <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 flex flex-column gap-3">
                                                <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border">
                                                    1. ANAMNESIS &amp; RIWAYAT PASIEN (REKAM MEDIS)
                                                </label>
                                                <div className="grid formgrid p-fluid text-sm">
                                                    <div className="col-12 md:col-6 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Keluhan Utama Pasien
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border text-sm font-semibold text-900 min-h-3rem">
                                                            {headerRM.keluhan || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-6 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Durasi Keluhan
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border text-sm font-semibold text-900 min-h-3rem">
                                                            {headerRM.durasi_keluhan || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-6 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Riwayat Alergi Pasien
                                                        </label>
                                                        <div
                                                            className={`p-2.5 border-round-md border-1 text-sm font-semibold min-h-3rem ${
                                                                headerRM.riwayat_alergi &&
                                                                headerRM.riwayat_alergi !== '-' &&
                                                                headerRM.riwayat_alergi !== 'Tidak Ada'
                                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                                    : 'bg-surface-50 text-900 border-surface-border'
                                                            }`}
                                                        >
                                                            {headerRM.riwayat_alergi &&
                                                            headerRM.riwayat_alergi !== '-' &&
                                                            headerRM.riwayat_alergi !== 'Tidak Ada' ? (
                                                                <span>⚠️ {headerRM.riwayat_alergi}</span>
                                                            ) : (
                                                                headerRM.riwayat_alergi || 'Tidak Ada'
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-6 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Riwayat Treatment Sebelumnya
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border text-sm font-semibold text-900 min-h-3rem">
                                                            {headerRM.riwayat_treatment || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SECTION: 2. HASIL PEMERIKSAAN KULIT */}
                                            <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 flex flex-column gap-3">
                                                <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border">
                                                    2. HASIL PEMERIKSAAN KULIT
                                                </label>
                                                <div className="grid formgrid p-fluid text-sm">
                                                    <div className="col-12 md:col-4 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Pemeriksaan Acne
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border flex align-items-center justify-content-between min-h-3rem">
                                                            <span className="text-sm font-bold text-900">
                                                                {headerRM.pemeriksaan_acne || 'Tidak Ada'}
                                                            </span>
                                                            <Tag
                                                                value={headerRM.pemeriksaan_acne || 'Tidak Ada'}
                                                                severity={
                                                                    headerRM.pemeriksaan_acne &&
                                                                    headerRM.pemeriksaan_acne !== 'Tidak Ada'
                                                                        ? 'warning'
                                                                        : 'info'
                                                                }
                                                                className="text-xs font-bold px-2 py-0"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-4 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Pemeriksaan Inflammation
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border flex align-items-center justify-content-between min-h-3rem">
                                                            <span className="text-sm font-bold text-900">
                                                                {headerRM.pemeriksaan_inflammation || 'Tidak Ada'}
                                                            </span>
                                                            <Tag
                                                                value={headerRM.pemeriksaan_inflammation || 'Tidak Ada'}
                                                                severity={
                                                                    headerRM.pemeriksaan_inflammation &&
                                                                    headerRM.pemeriksaan_inflammation !== 'Tidak Ada'
                                                                        ? 'danger'
                                                                        : 'info'
                                                                }
                                                                className="text-xs font-bold px-2 py-0"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-4 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Jenis / Tipe Kulit
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border flex align-items-center justify-content-between min-h-3rem">
                                                            <span className="text-sm font-bold text-900">
                                                                {headerRM.pemeriksaan_skin_type || 'Normal'}
                                                            </span>
                                                            <Tag
                                                                value={headerRM.pemeriksaan_skin_type || 'Normal'}
                                                                severity="success"
                                                                className="text-xs font-bold px-2 py-0"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-6 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Pemeriksaan Pigmentasi
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border flex align-items-center justify-content-between min-h-3rem">
                                                            <span className="text-sm font-bold text-900">
                                                                {headerRM.pemeriksaan_pigmentation || 'Tidak Ada'}
                                                            </span>
                                                            <Tag
                                                                value={headerRM.pemeriksaan_pigmentation || 'Tidak Ada'}
                                                                severity={
                                                                    headerRM.pemeriksaan_pigmentation &&
                                                                    headerRM.pemeriksaan_pigmentation !== 'Tidak Ada'
                                                                        ? 'warning'
                                                                        : 'info'
                                                                }
                                                                className="text-xs font-bold px-2 py-0"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-6 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Sensitivitas Kulit
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border flex align-items-center justify-content-between min-h-3rem">
                                                            <span className="text-sm font-bold text-900">
                                                                {headerRM.pemeriksaan_sensitivity || 'Rendah'}
                                                            </span>
                                                            <Tag
                                                                value={headerRM.pemeriksaan_sensitivity || 'Rendah'}
                                                                severity={
                                                                    headerRM.pemeriksaan_sensitivity === 'Tinggi'
                                                                        ? 'danger'
                                                                        : headerRM.pemeriksaan_sensitivity === 'Sedang'
                                                                        ? 'warning'
                                                                        : 'info'
                                                                }
                                                                className="text-xs font-bold px-2 py-0"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SECTION: 3. DIAGNOSIS DOKTER & SOAP MEDIS */}
                                            <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 flex flex-column gap-3">
                                                <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border">
                                                    3. DIAGNOSIS DOKTER &amp; SOAP MEDIS
                                                </label>
                                                <div className="grid formgrid p-fluid text-sm">
                                                    <div className="col-12 md:col-6 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            Diagnosis Dokter
                                                        </label>
                                                        <div className="p-2.5 bg-teal-50 border-round-md border-1 border-teal-300 text-sm font-bold text-teal-950 min-h-3rem flex align-items-center">
                                                            {headerRM.diagnosis || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-6 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            SOAP (Plan / Perencanaan)
                                                        </label>
                                                        <div className="p-2.5 bg-teal-50 border-round-md border-1 border-teal-200 text-sm font-bold text-teal-900 min-h-3rem flex align-items-center">
                                                            {headerRM.plan || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-4 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            SOAP (Subjective)
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border text-sm text-800 font-medium min-h-4rem white-space-pre-line">
                                                            {headerRM.subjective || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-4 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            SOAP (Objective)
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border text-sm text-800 font-medium min-h-4rem white-space-pre-line">
                                                            {headerRM.objective || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="col-12 md:col-4 mb-3">
                                                        <label className="block text-xs font-semibold mb-1 text-700">
                                                            SOAP (Assessment)
                                                        </label>
                                                        <div className="p-2.5 bg-surface-50 border-round-md border-1 surface-border text-sm text-800 font-medium min-h-4rem white-space-pre-line">
                                                            {headerRM.assessment || '-'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SECTION: JENIS TREATMENT & SESI TINDAKAN RUANGAN */}
                                            <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 flex flex-column gap-3">
                                                <div className="flex align-items-center justify-content-between mb-2 pb-2 border-bottom-1 surface-border">
                                                    <label className="text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center gap-2 m-0">
                                                        <i className="pi pi-sparkles text-teal-600 text-sm" />
                                                        JENIS TREATMENT &amp; SESI TINDAKAN RUANGAN
                                                    </label>
                                                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 border-round-md border-1 border-teal-200">
                                                        {layananList.length} Sesi Layanan
                                                    </span>
                                                </div>

                                                {layananList.length === 0 ? (
                                                    <div className="p-4 bg-surface-50 border-round-lg border-1 surface-border text-sm text-500 italic text-center">
                                                        Tidak ada rincian sesi ruangan yang tercatat.
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-column gap-4">
                                                        {layananList.map((layanan: any, lIdx: number) => {
                                                            const isKonsul =
                                                                (layanan.nama_ruangan &&
                                                                    layanan.nama_ruangan.toLowerCase().includes('konsul')) ||
                                                                layanan.jenis_layanan === 'konsultasi';
                                                            const fotos = layanan.rekam_medis?.fotos || [];

                                                            // Filter formatted data form agar hanya menampilkan data valid
                                                            const validFormData = (
                                                                layanan.rekam_medis?.formatted_data_form || []
                                                            ).filter(
                                                                (f: any) =>
                                                                    f.key &&
                                                                    f.key !== 'undefined' &&
                                                                    f.key !== 'null' &&
                                                                    f.value &&
                                                                    f.value !== '-' &&
                                                                    f.value !== ''
                                                            );

                                                            return (
                                                                <div
                                                                    key={layanan.kode_antrian_layanan || lIdx}
                                                                    className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 flex flex-column gap-3 bg-white"
                                                                >
                                                                    {/* HEADER SESI RUANGAN */}
                                                                    <div className="pb-3 border-bottom-1 surface-border flex align-items-center justify-content-between flex-wrap gap-2">
                                                                        <div>
                                                                            <div className="flex align-items-center gap-2 mb-1">
                                                                                <Tag
                                                                                    value={isKonsul ? '🩺 Konsultasi' : '💆 Tindakan'}
                                                                                    severity={isKonsul ? 'info' : 'success'}
                                                                                    className="text-xs font-bold px-2 py-0"
                                                                                />
                                                                                <span className="text-xs font-semibold text-600">
                                                                                    {layanan.nama_ruangan || 'Ruangan Tindakan'}
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-base font-bold text-teal-950">
                                                                                {layanan.nama_layanan || 'Pelayanan Medis'}
                                                                            </div>
                                                                        </div>
                                                                        {layanan.petugas && (
                                                                            <div className="text-right">
                                                                                <span className="text-xs text-500 block">Petugas Pelaksana:</span>
                                                                                <span className="text-sm font-bold text-900">
                                                                                    👩‍⚕️ {layanan.petugas.nama}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* CATATAN PETUGAS / OBSERVASI */}
                                                                    {layanan.catatan_petugas && (
                                                                        <div className="p-3 border-round-xl border-1 surface-border bg-teal-50/50">
                                                                            <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 flex align-items-center gap-1">
                                                                                <i className="pi pi-pencil text-teal-600 text-xs" />
                                                                                Catatan Petugas / Observasi:
                                                                            </label>
                                                                            <div className="text-sm text-800 font-medium white-space-pre-line bg-white p-3 border-round-md border-1 border-teal-100">
                                                                                {layanan.catatan_petugas}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* CATATAN TINDAKAN TEKNIS */}
                                                                    {layanan.catatan_tindakan && (
                                                                        <div className="p-3 bg-surface-50 border-round-md border-1 surface-border">
                                                                            <span className="text-xs font-semibold text-600 block mb-1">
                                                                                Catatan Tindakan Teknis:
                                                                            </span>
                                                                            <span className="text-sm text-800 font-medium">
                                                                                {layanan.catatan_tindakan}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* CATATAN HASIL TREATMENT */}
                                                                    {layanan.catatan_hasil_treatment && (
                                                                        <div className="p-3 bg-purple-50 border-round-md border-1 border-purple-200">
                                                                            <span className="text-xs font-semibold text-purple-800 block mb-1">
                                                                                Catatan Hasil Treatment:
                                                                            </span>
                                                                            <span className="text-sm text-purple-950 font-bold">
                                                                                {layanan.catatan_hasil_treatment}
                                                                            </span>
                                                                        </div>
                                                                    )}

                                                                    {/* DATA KLINIS RUANGAN */}
                                                                    {validFormData.length > 0 && (
                                                                        <div className="p-3 bg-surface-50 border-round-xl border-1 surface-border">
                                                                            <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2">
                                                                                Data Klinis Ruangan:
                                                                            </label>
                                                                            <div className="grid formgrid p-fluid text-sm">
                                                                                {validFormData.map((f: any, fIdx: number) => (
                                                                                    <div key={fIdx} className="col-12 sm:col-6 mb-2">
                                                                                        <span className="text-500 font-medium block mb-1 text-xs">{f.label}</span>
                                                                                        <div className="p-2.5 bg-white border-round-md border-1 surface-border font-bold text-800 text-sm">
                                                                                            {String(f.value)}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* DOKUMENTASI FOTO BEFORE & AFTER */}
                                                                    {fotos && fotos.length > 0 && (
                                                                        <div className="pt-2 border-top-1 surface-border">
                                                                            <span className="text-xs font-extrabold text-teal-800 block mb-3 flex align-items-center gap-1 uppercase tracking-wider">
                                                                                <i className="pi pi-images text-teal-600 text-xs" />
                                                                                Dokumentasi Foto Sesi Ini:
                                                                            </span>
                                                                            <div className="flex gap-3 flex-wrap">
                                                                                {fotos.map((foto: any, fIdx: number) => {
                                                                                    const isBefore =
                                                                                        foto.tipe === 'before' ||
                                                                                        foto.tipe === 'foto_before';
                                                                                    const isAfter =
                                                                                        foto.tipe === 'after' ||
                                                                                        foto.tipe === 'foto_after';
                                                                                    const badgeLabel = isBefore
                                                                                        ? 'Foto Before'
                                                                                        : isAfter
                                                                                        ? 'Foto After'
                                                                                        : foto.tipe;
                                                                                    const fullUrl = getFullImageUrl(foto.url_foto);

                                                                                    return (
                                                                                        <div
                                                                                            key={foto.id || fIdx}
                                                                                            className="flex flex-column align-items-center gap-1 cursor-pointer"
                                                                                            onClick={() =>
                                                                                                openPhotoZoom(
                                                                                                    foto.url_foto,
                                                                                                    `${badgeLabel} — ${layanan.nama_layanan || 'Treatment'}`
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <div
                                                                                                className="relative border-round-xl overflow-hidden border-2 surface-border shadow-1 hover:shadow-3 transition-all"
                                                                                                style={{ width: '110px', height: '110px' }}
                                                                                            >
                                                                                                <img
                                                                                                    src={fullUrl}
                                                                                                    alt={badgeLabel}
                                                                                                    className="w-full h-full object-cover"
                                                                                                    onError={(e) => {
                                                                                                        const target = e.target as HTMLImageElement;
                                                                                                        if (!target.src.includes('/api/assets')) {
                                                                                                            target.src = `/api/assets${foto.url_foto}`;
                                                                                                        }
                                                                                                    }}
                                                                                                />
                                                                                                <div className="absolute inset-0 bg-black-alpha-40 opacity-0 hover:opacity-100 flex align-items-center justify-content-center transition-all">
                                                                                                    <i className="pi pi-search-plus text-white text-xl font-bold" />
                                                                                                </div>
                                                                                            </div>
                                                                                            <Tag
                                                                                                value={badgeLabel}
                                                                                                severity={isBefore ? 'info' : 'success'}
                                                                                                className="text-xs font-bold px-2 py-0"
                                                                                            />
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* TOMBOL MUAT LEBIH BANYAK */}
                            {riwayatList.length < totalRecords && (
                                <div className="text-center pt-2">
                                    <Button
                                        label={
                                            loadingMore
                                                ? 'Memuat...'
                                                : `Muat Lebih Banyak (${riwayatList.length} dari ${totalRecords})`
                                        }
                                        icon={loadingMore ? 'pi pi-spin pi-spinner' : 'pi pi-angle-down'}
                                        outlined
                                        size="small"
                                        disabled={loadingMore}
                                        onClick={handleLoadMore}
                                        className="font-bold border-round-lg text-sm px-4 py-2"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Sidebar>

            {/* MODAL ZOOM PREVIEW FOTO */}
            <Dialog
                header={previewPhotoTitle || 'Dokumentasi Foto Treatment'}
                visible={previewModalVisible}
                onHide={() => setPreviewModalVisible(false)}
                className="w-full max-w-30rem mx-3"
                contentClassName="p-0 text-center bg-black-alpha-90 flex align-items-center justify-content-center"
                dismissableMask
            >
                {previewPhotoUrl ? (
                    <div className="p-3 w-full flex flex-column align-items-center justify-content-center">
                        <img
                            src={previewPhotoUrl}
                            alt="Foto Treatment Preview"
                            className="w-full border-round-xl shadow-4"
                            style={{ maxHeight: '75vh', objectFit: 'contain' }}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (previewPhotoUrl && !target.src.includes('/api/assets')) {
                                    target.src = `/api/assets${previewPhotoUrl.replace('http://127.0.0.1:8000', '')}`;
                                }
                            }}
                        />
                    </div>
                ) : null}
            </Dialog>
        </>
    );
};

