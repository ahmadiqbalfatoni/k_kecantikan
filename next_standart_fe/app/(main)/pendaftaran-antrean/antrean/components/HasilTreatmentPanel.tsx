'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { AntrianLayananData } from './interfaces';

interface ProdukItem {
    kode_produk: string;
    nama: string;
    harga_jual: number;
    satuan?: string;
}

interface SelectedProduk {
    kode_produk: string;
    nama: string;
    harga_jual: number;
    satuan?: string;
    qty: number;
}

interface HasilTreatmentPanelProps {
    activePatient: AntrianLayananData | null;
    toast: React.RefObject<Toast>;
    getGridData: () => void;
    kodeRuangan: string;
    namaRuangan: string;
    savedFormData?: Record<string, any>;
    savedCatatanPetugas?: string;
    savedPetugasNama?: string;
    selectedPetugas?: string;
    onHasilSavedChange?: (saved: boolean) => void;
}

const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

export const HasilTreatmentPanel: React.FC<HasilTreatmentPanelProps> = ({
    activePatient,
    toast,
    getGridData,
    kodeRuangan,
    namaRuangan,
    savedFormData,
    savedCatatanPetugas,
    savedPetugasNama,
    selectedPetugas,
    onHasilSavedChange,
}) => {
    // Foto After state
    const [fotoAfterUrl, setFotoAfterUrl] = useState<string>('');
    const [uploadingFoto, setUploadingFoto] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Produk Dropdown & Selection state
    const [produkOptions, setProdukOptions] = useState<ProdukItem[]>([]);
    const [loadingProduk, setLoadingProduk] = useState<boolean>(false);
    const [searchProduk, setSearchProduk] = useState<string>('');
    const [selectedProdukList, setSelectedProdukList] = useState<SelectedProduk[]>([]);

    // State Biaya Custom
    const [showCustomFeeModal, setShowCustomFeeModal] = useState<boolean>(false);
    const [customFeeNama, setCustomFeeNama] = useState<string>('');
    const [customFeeHarga, setCustomFeeHarga] = useState<number | null>(null);

    // Catatan treatment
    const [catatan, setCatatan] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Setelah submit, kunci semua input agar tidak bisa diubah lagi
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

    // Modal Konfirmasi Persetujuan
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

    const handleAddCustomFee = () => {
        if (isSubmitted) return;
        if (!customFeeNama.trim()) {
            showError(toast, 'Nama biaya / produk custom wajib diisi!');
            return;
        }
        if (!customFeeHarga || customFeeHarga <= 0) {
            showError(toast, 'Nominal harga wajib lebih dari 0!');
            return;
        }

        const customItem: SelectedProduk = {
            kode_produk: `CST-${Date.now().toString().slice(-10)}`,
            nama: customFeeNama.trim(),
            harga_jual: customFeeHarga,
            satuan: 'item',
            qty: 1,
        };

        setSelectedProdukList((prev) => [...prev, customItem]);
        setShowCustomFeeModal(false);
        setCustomFeeNama('');
        setCustomFeeHarga(null);
        showSuccess(toast, 'Biaya tambahan custom berhasil ditambahkan!');
    };

    useEffect(() => {
        fetchProdukOptions();
    }, []);

    const loadExistingRekomendasiProduk = async (kodeKunjungan: string) => {
        if (!kodeKunjungan) return;
        try {
            const res = await postData('/master/kunjungan-produk-rekomendasi', { kode_kunjungan: kodeKunjungan });
            const list = res.data?.data || [];
            if (list.length > 0) {
                const mapped: SelectedProduk[] = list.map((item: any) => ({
                    kode_produk: item.kode_produk,
                    nama: item.nama,
                    harga_jual: parseFloat(item.harga_jual || 0),
                    satuan: item.satuan || 'pcs',
                    qty: parseInt(item.qty || 1, 10),
                }));
                setSelectedProdukList(mapped);
            }
        } catch (_) {
            // silent fail
        }
    };

    // Reset state & auto-load rekomendasi produk dari dokter saat pasien berganti
    useEffect(() => {
        setIsSubmitted(false);
        onHasilSavedChange?.(false);
        setFotoAfterUrl('');
        setCatatan('');
        setSelectedProdukList([]);

        if (activePatient?.kode_kunjungan) {
            loadExistingRekomendasiProduk(activePatient.kode_kunjungan);
        }
    }, [activePatient?.kode_antrian_layanan]);

    const fetchProdukOptions = async (keyword = '') => {
        setLoadingProduk(true);
        try {
            const res = await postData('/master/produk-dropdown', { search: keyword });
            const list: ProdukItem[] = (res.data?.data || [])
                .filter((p: any) => !String(p.kode_produk || '').startsWith('CUSTOM-') && !String(p.kode_produk || '').startsWith('CST-'))
                .map((p: any) => ({
                    kode_produk: p.kode_produk,
                    nama: p.nama,
                    harga_jual: parseFloat(p.harga_jual || 0),
                    satuan: p.satuan || 'pcs',
                }));
            setProdukOptions(list);
        } catch (_) {
            showError(toast, 'Gagal memuat daftar produk');
        } finally {
            setLoadingProduk(false);
        }
    };

    // Upload Foto After
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isSubmitted) return;
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showError(toast, 'File harus berupa gambar (JPG, PNG, WEBP, dll)');
            return;
        }

        setUploadingFoto(true);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });

            const res = await postData('/master/ruangan-form-upload-foto', {
                image_base64: base64,
                file_name: file.name,
                prefix: 'after',
            });

            if (res?.data?.status === 200 || res?.status === 200) {
                const filePath = res.data?.data?.file_path || res.data?.file_path || '';
                setFotoAfterUrl(filePath);
                showSuccess(toast, 'Foto After berhasil diunggah!');
            } else {
                showError(toast, res?.data?.message || 'Gagal mengunggah foto');
            }
        } catch (_) {
            showError(toast, 'Gagal memproses gambar');
        } finally {
            setUploadingFoto(false);
        }
    };

    // Tambahkan produk ke daftar terpilih
    const handleAddProduk = (prod: ProdukItem) => {
        if (isSubmitted) return;
        setSelectedProdukList((prev) => {
            const existingIndex = prev.findIndex((p) => p.kode_produk === prod.kode_produk);
            if (existingIndex > -1) {
                const updated = [...prev];
                updated[existingIndex].qty += 1;
                return updated;
            }
            return [...prev, { ...prod, qty: 1 }];
        });
    };

    // Update Qty produk
    const handleUpdateQty = (kode_produk: string, delta: number) => {
        if (isSubmitted) return;
        setSelectedProdukList((prev) =>
            prev
                .map((p) => {
                    if (p.kode_produk === kode_produk) {
                        const newQty = p.qty + delta;
                        return newQty > 0 ? { ...p, qty: newQty } : null;
                    }
                    return p;
                })
                .filter((p): p is SelectedProduk => p !== null)
        );
    };

    // Remove produk
    const handleRemoveProduk = (kode_produk: string) => {
        if (isSubmitted) return;
        setSelectedProdukList((prev) => prev.filter((p) => p.kode_produk !== kode_produk));
    };

    // Calculate Total
    const grandTotal = selectedProdukList.reduce((acc, curr) => acc + curr.qty * curr.harga_jual, 0);

    // Click Simpan & Setujui
    const handleSaveClick = () => {
        if (!activePatient) {
            showError(toast, 'Tidak ada pasien aktif yang dipilih');
            return;
        }
        setShowConfirmModal(true);
    };

    const handleConfirmSubmit = async () => {
        if (!activePatient) return;
        setShowConfirmModal(false);
        setSubmitting(true);

        try {
            const payload = {
                kode_kunjungan: activePatient.kode_kunjungan,
                no_rm: activePatient.no_rm,
                kode_rekam_medis: activePatient.kode_antrian_layanan,
                kode_antrian_layanan: activePatient.kode_antrian_layanan,
                kode_ruangan: kodeRuangan,
                nama_ruangan: namaRuangan,
                foto_after: fotoAfterUrl,
                catatan: catatan,
                catatan_petugas: savedCatatanPetugas,
                hasil_form: savedFormData,
                kode_karyawan: selectedPetugas || activePatient.kode_karyawan,
                produk_items: selectedProdukList.map((p) => ({
                    kode_produk: p.kode_produk,
                    nama: p.nama,
                    qty: p.qty,
                    harga_jual: p.harga_jual,
                    satuan: p.satuan || 'pcs',
                })),
            };

            const res = await postData('/master/hasil-treatment-save', payload);

            if (res?.data?.status === 200 || res?.status === 200) {
                showSuccess(
                    toast,
                    res.data?.message || 'Hasil treatment & rekomendasi produk berhasil disimpan ke kasir!'
                );

                // Kunci form setelah berhasil simpan tanpa mengosongkan nilainya
                setIsSubmitted(true);
                onHasilSavedChange?.(true);

                // Refresh data grid
                getGridData();
            } else {
                showError(toast, res?.data?.message || 'Gagal menyimpan hasil treatment');
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Terjadi kesalahan saat menyimpan');
        } finally {
            setSubmitting(false);
        }
    };

    // Filter produk options berdasarkan search text
    const filteredProdukOptions = produkOptions.filter(
        (p) =>
            !searchProduk ||
            p.nama.toLowerCase().includes(searchProduk.toLowerCase()) ||
            p.kode_produk.toLowerCase().includes(searchProduk.toLowerCase())
    );

    return (
        <div className="card shadow-2 border-round-xl p-4 surface-card border-top-3 border-teal-500 mb-4">
            {/* Header persis disamakan dengan Form Penanganan */}
            <div className="flex align-items-center justify-content-between mb-3 border-bottom-1 surface-border pb-3">
                <div>
                    <h3 className="text-xl font-black text-teal-900 m-0 flex align-items-center gap-2">
                        <i className="pi pi-file-edit text-teal-600 text-2xl" />
                        Hasil Treatment &amp; Rekomendasi Produk Pasien
                    </h3>
                    <p className="text-xs text-500 m-0 mt-1">
                        Isi foto setelah tindakan (After), catatan hasil treatment, dan pilih produk tambahan untuk diteruskan langsung ke kasir.
                    </p>
                </div>
                {activePatient && (
                    <span className="text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1.5 border-round-md">
                        Pasien: #{activePatient.nomor_antrian} — {activePatient.nama_pasien} ({activePatient.no_rm})
                    </span>
                )}
            </div>

            <div className="grid">
                {/* ── SEKSI KIRI: UPLOAD FOTO AFTER & CATATAN ── */}
                <div className="col-12 lg:col-5 flex flex-column gap-3">
                    {/* Foto After Box */}
                    <div className="p-3 surface-50 border-round-xl border-1 surface-border">
                        <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 flex align-items-center gap-2">
                            <i className="pi pi-camera text-teal-600 text-sm" />
                            FOTO AFTER TREATMENT
                        </label>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />

                        {fotoAfterUrl ? (
                            <div className="relative border-round-xl overflow-hidden border-2 border-teal-500 shadow-1 text-center surface-card p-2">
                                <img
                                    src={fotoAfterUrl}
                                    alt="Foto After"
                                    style={{ maxHeight: '180px', width: '100%', objectFit: 'cover', borderRadius: '8px' }}
                                />
                                {!isSubmitted && (
                                    <div className="flex gap-2 mt-2 justify-content-center">
                                        <Button
                                            label="Ganti Foto"
                                            icon="pi pi-refresh"
                                            size="small"
                                            outlined
                                            severity="info"
                                            onClick={() => fileInputRef.current?.click()}
                                            loading={uploadingFoto}
                                            className="text-xs font-bold"
                                        />
                                        <Button
                                            label="Hapus"
                                            icon="pi pi-trash"
                                            size="small"
                                            outlined
                                            severity="danger"
                                            onClick={() => setFotoAfterUrl('')}
                                            className="text-xs font-bold"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                onClick={() => !isSubmitted && fileInputRef.current?.click()}
                                className={`border-2 border-dashed border-300 surface-card border-round-xl p-4 text-center transition-all ${
                                    isSubmitted ? 'opacity-60' : 'cursor-pointer hover:surface-100'
                                }`}
                            >
                                {uploadingFoto ? (
                                    <div className="py-2">
                                        <ProgressSpinner style={{ width: '28px', height: '28px' }} />
                                        <p className="text-xs text-500 m-0 mt-1">Mengunggah foto...</p>
                                    </div>
                                ) : (
                                    <div>
                                        <i className="pi pi-cloud-upload text-3xl text-teal-600 mb-2" />
                                        <p className="font-bold text-xs m-0 text-700">Klik untuk unggah Foto After</p>
                                        <p className="text-[10px] text-400 m-0 mt-1">Format JPG, PNG, WEBP (Maks 5MB)</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Catatan Dokter Box */}
                    <div className="p-3 surface-50 border-round-xl border-1 surface-border flex-1 flex flex-column">
                        <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 flex align-items-center gap-2">
                            <i className="pi pi-pencil text-teal-600 text-sm" />
                            CATATAN HASIL TREATMENT (OPSIONAL)
                        </label>
                        <InputTextarea
                            value={catatan}
                            onChange={(e) => setCatatan(e.target.value)}
                            placeholder="Catatan hasil penanganan, kondisi kulit pasien setelah treatment, atau instruksi tindak lanjut..."
                            disabled={isSubmitted}
                            className="w-full text-sm border-round-md shadow-1 bg-white border-300 focus:border-teal-500 flex-1 p-3"
                            style={{ resize: 'none', minHeight: '100px' }}
                        />
                    </div>
                </div>

                {/* ── SEKSI KANAN: PRODUK TAMBAHAN KASIR ── */}
                <div className="col-12 lg:col-7">
                    <div className="p-3 surface-50 border-round-xl border-1 surface-border flex flex-column gap-3 h-full">
                        <div>
                            <div className="flex align-items-center justify-content-between mb-2">
                                <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center gap-2 m-0">
                                    <i className="pi pi-shopping-bag text-teal-600 text-sm" />
                                    PILIH PRODUK TAMBAHAN UNTUK KASIR
                                </label>
                                <Button
                                    type="button"
                                    label="+ Biaya Custom"
                                    icon="pi pi-plus"
                                    size="small"
                                    severity="success"
                                    outlined
                                    className="text-xs font-bold py-1 px-2.5 border-round-lg"
                                    disabled={isSubmitted}
                                    onClick={() => setShowCustomFeeModal(true)}
                                />
                            </div>

                            {/* Search Box */}
                            <div className="flex gap-2 mb-3">
                                <IconField iconPosition="left" className="w-full">
                                    <InputIcon className="pi pi-search text-xs text-400" />
                                    <InputText
                                        value={searchProduk}
                                        onChange={(e) => setSearchProduk(e.target.value)}
                                        placeholder="Cari nama atau kode produk..."
                                        disabled={isSubmitted}
                                        className="p-inputtext-sm w-full border-round-lg text-xs"
                                    />
                                </IconField>
                                <Button
                                    icon="pi pi-refresh"
                                    outlined
                                    size="small"
                                    severity="secondary"
                                    onClick={() => fetchProdukOptions(searchProduk)}
                                    loading={loadingProduk}
                                    disabled={isSubmitted}
                                    title="Refresh Produk"
                                />
                            </div>

                            {/* List Opsi Produk */}
                            <div
                                className="surface-card border-1 surface-border border-round-lg p-2 overflow-y-auto shadow-1"
                                style={{ maxHeight: '140px' }}
                            >
                                {loadingProduk ? (
                                    <div className="text-center py-3">
                                        <ProgressSpinner style={{ width: '24px', height: '24px' }} />
                                    </div>
                                ) : filteredProdukOptions.length === 0 ? (
                                    <div className="text-center py-3 text-xs text-500">
                                        Tidak ada produk ditemukan
                                    </div>
                                ) : (
                                    <div className="flex flex-column gap-1">
                                        {filteredProdukOptions.map((prod) => (
                                            <div
                                                key={prod.kode_produk}
                                                className={`flex align-items-center justify-content-between p-2 border-round-md surface-hover ${
                                                    isSubmitted ? 'opacity-60' : 'cursor-pointer'
                                                }`}
                                                onClick={() => !isSubmitted && handleAddProduk(prod)}
                                            >
                                                <div>
                                                    <span className="font-bold text-xs text-900 block">{prod.nama}</span>
                                                    <span className="text-[10px] text-500">
                                                        {prod.kode_produk} • {formatRupiah(prod.harga_jual)} / {prod.satuan}
                                                    </span>
                                                </div>
                                                <Button
                                                    icon="pi pi-plus"
                                                    size="small"
                                                    rounded
                                                    text
                                                    severity="info"
                                                    disabled={isSubmitted}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddProduk(prod);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* List Produk Terpilih */}
                        <div className="border-top-1 surface-border pt-3 flex-1 flex flex-column">
                            <div className="flex align-items-center justify-content-between mb-2">
                                <span className="text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center gap-1">
                                    <i className="pi pi-sparkles text-amber-500 text-xs" />
                                    PRODUK REKOMENDASI DOKTER &amp; TERPILIH ({selectedProdukList.length})
                                </span>
                                {selectedProdukList.length > 0 && !isSubmitted && (
                                    <button
                                        onClick={() => setSelectedProdukList([])}
                                        className="text-[11px] text-red-600 hover:text-red-800 font-bold border-none bg-transparent cursor-pointer p-0"
                                    >
                                        Kosongkan
                                    </button>
                                )}
                            </div>

                            {selectedProdukList.length === 0 ? (
                                <div className="text-center py-4 text-xs text-400 border-1 border-dashed surface-border border-round-xl surface-card flex-1 flex align-items-center justify-content-center">
                                    <div>
                                        <i className="pi pi-shopping-bag text-2xl text-300 mb-1 block" />
                                        Belum ada produk terpilih. Klik opsi produk di atas untuk menambahkan.
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-column gap-2 overflow-y-auto pr-1" style={{ maxHeight: '160px' }}>
                                    {selectedProdukList.map((item) => {
                                        const subtotal = item.qty * item.harga_jual;
                                        return (
                                            <div
                                                key={item.kode_produk}
                                                className="flex align-items-center justify-content-between p-2.5 surface-card border-round-lg border-1 surface-border shadow-1"
                                            >
                                                <div className="flex-1 pr-2">
                                                    <span className="font-bold text-xs text-900 block overflow-hidden text-ellipsis white-space-nowrap">
                                                        {item.nama}
                                                    </span>
                                                    <span className="text-[11px] text-teal-700 font-semibold">
                                                        {formatRupiah(item.harga_jual)} x {item.qty} = <strong>{formatRupiah(subtotal)}</strong>
                                                    </span>
                                                </div>

                                                <div className="flex align-items-center gap-1">
                                                    {!isSubmitted ? (
                                                        <>
                                                            <Button
                                                                icon="pi pi-minus"
                                                                size="small"
                                                                rounded
                                                                outlined
                                                                severity="secondary"
                                                                style={{ width: '24px', height: '24px' }}
                                                                disabled={isSubmitted}
                                                                onClick={() => handleUpdateQty(item.kode_produk, -1)}
                                                            />
                                                            <span className="font-bold text-xs px-2 text-800">{item.qty}</span>
                                                            <Button
                                                                icon="pi pi-plus"
                                                                size="small"
                                                                rounded
                                                                outlined
                                                                severity="info"
                                                                style={{ width: '24px', height: '24px' }}
                                                                disabled={isSubmitted}
                                                                onClick={() => handleUpdateQty(item.kode_produk, 1)}
                                                            />
                                                            <Button
                                                                icon="pi pi-trash"
                                                                size="small"
                                                                rounded
                                                                text
                                                                severity="danger"
                                                                className="ml-1"
                                                                disabled={isSubmitted}
                                                                onClick={() => handleRemoveProduk(item.kode_produk)}
                                                            />
                                                        </>
                                                    ) : (
                                                        <span className="font-bold text-xs text-700">x{item.qty}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* TOTAL & SUBMIT BUTTON FOOTER */}
                        <div className="border-top-1 surface-border pt-3 mt-auto">
                            <div className="flex align-items-center justify-content-between mb-3 bg-teal-50 p-2.5 border-round-lg border-1 border-teal-200">
                                <span className="font-bold text-sm text-teal-900">Total Harga Produk:</span>
                                <span className="font-black text-xl text-teal-700">{formatRupiah(grandTotal)}</span>
                            </div>

                            {isSubmitted ? (
                                <div className="flex align-items-center justify-content-center gap-2 p-3 border-round-xl">
                                    <Tag value="✅ Hasil Treatment & Produk Telah Disimpan ke Kasir" severity="success" className="px-3 py-2 text-xs font-bold w-full text-center" />
                                </div>
                            ) : (
                                <Button
                                    label="Simpan & Setujui Hasil Treatment"
                                    icon="pi pi-check-circle"
                                    className="w-full font-bold text-xs bg-teal-600 border-none border-round-lg py-3 text-white shadow-2"
                                    severity="success"
                                    onClick={handleSaveClick}
                                    loading={submitting}
                                    disabled={!activePatient}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL KONFIRMASI SIMPAN & PERSETUJUAN TINDAKAN */}
            <Dialog
                visible={showConfirmModal}
                onHide={() => setShowConfirmModal(false)}
                header={
                    <div className="flex align-items-center gap-3">
                        <div
                            className="flex align-items-center justify-content-center border-round-xl"
                            style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(135deg, #0d9488, #059669)',
                                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                            }}
                        >
                            <i className="pi pi-shield text-white text-xl" />
                        </div>
                        <div>
                            <span className="text-lg font-black text-900 block" style={{ lineHeight: 1.2 }}>
                                Persetujuan &amp; Konfirmasi Hasil Tindakan
                            </span>
                            <span className="text-xs text-500 font-medium">
                                Verifikasi rincian hasil treatment pasien sebelum disimpan ke Kasir
                            </span>
                        </div>
                    </div>
                }
                style={{ width: '560px' }}
                modal
                className="p-fluid"
                footer={
                    <div className="flex align-items-center justify-content-end gap-2 pt-2 border-top-1 surface-border">
                        <Button
                            label="Batal"
                            icon="pi pi-times"
                            outlined
                            severity="secondary"
                            className="font-bold text-xs border-round-lg px-3 py-2"
                            onClick={() => setShowConfirmModal(false)}
                        />
                        <Button
                            label="✓ Setujui &amp; Simpan ke Kasir"
                            icon="pi pi-check-circle"
                            severity="success"
                            className="font-extrabold text-xs border-round-lg px-4 py-2 shadow-2 bg-teal-600 border-none hover:bg-teal-700"
                            onClick={handleConfirmSubmit}
                            loading={submitting}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3 py-2 text-left">
                    {/* PASIEN BANNER CARD */}
                    <div
                        className="p-3 border-round-2xl relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #f0fdfa, #ccfbf1)',
                            border: '1.5px solid #99f6e4',
                        }}
                    >
                        <div className="flex align-items-center justify-content-between">
                            <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-wider block text-teal-700 mb-0.5">
                                    PASIEN AKTIF TINDAKAN
                                </span>
                                <span className="font-black text-base text-teal-950 block">
                                    {activePatient?.nama_pasien || 'Pasien'}
                                </span>
                                <span className="text-xs text-teal-800 font-medium">
                                    No. RM: <strong>{activePatient?.no_rm}</strong> | Ruangan: <strong>{namaRuangan}</strong>
                                </span>
                            </div>
                            <Tag value={`No. #${activePatient?.nomor_antrian}`} severity="success" className="text-sm font-extrabold px-3 py-1.5 border-round-xl shadow-1" />
                        </div>
                    </div>

                    {/* RINCIAN HASIL & PRODUK CARD */}
                    <div className="surface-card p-3 border-round-2xl border-1 surface-border shadow-1 flex flex-column gap-3">
                        <span className="text-xs font-extrabold text-700 uppercase tracking-wider block border-bottom-1 surface-border pb-2">
                            📋 Rincian Hasil &amp; Produk Yang Disimpan
                        </span>

                        <div className="flex align-items-center justify-content-between text-xs p-2.5 surface-50 border-round-xl">
                            <span className="font-bold text-700 flex align-items-center gap-2">
                                <i className="pi pi-camera text-teal-600" />
                                Foto After Treatment
                            </span>
                            {fotoAfterUrl ? (
                                <Tag value="✓ Foto Terunggah" severity="success" className="text-xs font-bold" />
                            ) : (
                                <Tag value="Tanpa Foto After" severity="secondary" className="text-xs font-bold" />
                            )}
                        </div>

                        {selectedProdukList.length > 0 && (
                            <div className="flex flex-column gap-2">
                                <div className="flex align-items-center justify-content-between text-xs">
                                    <span className="font-bold text-700 flex align-items-center gap-2">
                                        <i className="pi pi-shopping-bag text-amber-600" />
                                        Produk Tambahan ({selectedProdukList.length} Item)
                                    </span>
                                    <span className="font-extrabold text-teal-700">{formatRupiah(grandTotal)}</span>
                                </div>
                                <div className="flex flex-column gap-1 max-h-8rem overflow-y-auto pr-1">
                                    {selectedProdukList.map((p, idx) => (
                                        <div key={idx} className="flex align-items-center justify-content-between text-xs p-2 surface-100 border-round-lg">
                                            <span className="font-semibold text-800">{p.nama} <span className="text-teal-600">({p.qty}x)</span></span>
                                            <span className="font-bold text-700">{formatRupiah(p.harga_jual * p.qty)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {catatan && (
                            <div className="p-2.5 surface-50 border-round-xl text-xs">
                                <span className="font-bold text-700 block mb-1">Catatan Observasi:</span>
                                <span className="text-600 italic block border-left-3 border-teal-500 pl-2 py-0.5">&quot;{catatan}&quot;</span>
                            </div>
                        )}
                    </div>

                    {/* PERNYATAAN INFORMED CONSENT / PERSETUJUAN */}
                    <div
                        className="p-3 border-round-2xl flex align-items-start gap-3"
                        style={{
                            background: '#f0fdfa',
                            border: '1.5px solid #99f6e4',
                        }}
                    >
                        <i className="pi pi-check-circle text-teal-600 text-2xl mt-0.5 flex-shrink-0" />
                        <div>
                            <span className="font-extrabold text-xs text-teal-950 block mb-1">
                                Pernyataan Persetujuan Pasien (Verbal Consent)
                            </span>
                            <p className="text-xs text-teal-800 m-0 leading-relaxed font-medium">
                                Pasien/Wali telah menyetujui hasil tindakan serta daftar rincian produk yang akan diteruskan sebagai draf transaksi di Kasir.
                            </p>
                        </div>
                    </div>
                </div>
            </Dialog>

            {/* DIALOG TAMBAH BIAYA CUSTOM */}
            <Dialog
                visible={showCustomFeeModal}
                onHide={() => setShowCustomFeeModal(false)}
                header={
                    <div className="flex align-items-center gap-2">
                        <i className="pi pi-plus-circle text-teal-600 text-xl" />
                        <span className="font-bold text-base text-900">Tambah Biaya / Produk Custom</span>
                    </div>
                }
                style={{ width: '420px' }}
                modal
            >
                <div className="flex flex-column gap-3 pt-2">
                    <div>
                        <label className="block text-xs font-bold text-700 mb-1">Nama Biaya / Produk Custom *</label>
                        <InputText
                            value={customFeeNama}
                            onChange={(e) => setCustomFeeNama(e.target.value)}
                            placeholder="Contoh: Biaya Jarum Injeksi / Alat Tambahan"
                            className="w-full p-inputtext-sm text-sm border-round-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-700 mb-1">Nominal Harga (Rp) *</label>
                        <InputNumber
                            value={customFeeHarga}
                            onValueChange={(e) => setCustomFeeHarga(e.value ?? null)}
                            mode="currency"
                            currency="IDR"
                            locale="id-ID"
                            placeholder="Masukkan nominal harga..."
                            className="w-full text-sm"
                            inputClassName="p-inputtext-sm w-full text-sm border-round-lg font-bold text-teal-700"
                        />
                    </div>
                </div>

                <div className="flex justify-content-end gap-2 mt-4 pt-3 border-top-1 surface-border">
                    <Button
                        label="Batal"
                        icon="pi pi-times"
                        text
                        severity="secondary"
                        onClick={() => setShowCustomFeeModal(false)}
                    />
                    <Button
                        label="Tambahkan ke Daftar"
                        icon="pi pi-check"
                        severity="success"
                        className="bg-teal-600 border-none font-bold text-sm"
                        onClick={handleAddCustomFee}
                    />
                </div>
            </Dialog>
        </div>
    );
};
