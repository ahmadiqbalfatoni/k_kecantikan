'use client';

import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { Dialog } from 'primereact/dialog';
import { AntrianLayananData, RuanganFormField } from './interfaces';
import { FormRuanganFotoUploader } from './FormRuanganFotoUploader';
import { RekomendasiTreatmentPanel, RekomendasiItem } from './RekomendasiTreatmentPanel';
import { DialogHasilTerbitAntrian } from './DialogHasilTerbitAntrian';
import { HasilTreatmentPanel } from './HasilTreatmentPanel';
import { DrawerRiwayatPasien } from './DrawerRiwayatPasien';

interface ActiveTreatmentPanelProps {
    activePatient: AntrianLayananData | null;
    nextWaitingPatient: AntrianLayananData | null;
    kodeRuangan: string;
    namaRuangan: string;
    isKonsultasi?: boolean;
    toast: React.RefObject<Toast>;
    getGridData: () => void;
    handleAksi: (item: AntrianLayananData, customAksi?: string, skipFormValidation?: boolean) => void;
    playChime: () => void;
    speakNomorLayanan: (noAntrian: string, namaPasien?: string, namaRuangan?: string) => void;
    onManageFormClick?: () => void;
    petugasJagaList?: any[];
}

export const ActiveTreatmentPanel: React.FC<ActiveTreatmentPanelProps> = ({
    activePatient,
    nextWaitingPatient,
    kodeRuangan,
    namaRuangan,
    isKonsultasi = false,
    toast,
    getGridData,
    handleAksi,
    playChime,
    speakNomorLayanan,
}) => {
    const [fields, setFields] = useState<RuanganFormField[]>([]);
    const [loadingFields, setLoadingFields] = useState<boolean>(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [catatanPetugas, setCatatanPetugas] = useState<string>('');
    const [rekomendasiItems, setRekomendasiItems] = useState<RekomendasiItem[]>([]);
    const [saving, setSaving] = useState<boolean>(false);
    const [drawerRiwayatVisible, setDrawerRiwayatVisible] = useState<boolean>(false);

    // Rekam Medis (trx_rekam_medis) Header Data State
    const [headerRMData, setHeaderRMData] = useState({
        foto_before: '',
        keluhan: '',
        durasi_keluhan: '',
        riwayat_alergi: '',
        riwayat_treatment: '',
        pemeriksaan_acne: 'Tidak Ada',
        pemeriksaan_inflammation: 'Tidak Ada',
        pemeriksaan_skin_type: 'Normal',
        pemeriksaan_pigmentation: 'Tidak Ada',
        pemeriksaan_sensitivity: 'Rendah',
        diagnosis: '',
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
    });
    const [lanjutKeTindakan, setLanjutKeTindakan] = useState<boolean>(true);
    const [uploadingBefore, setUploadingBefore] = useState<boolean>(false);

    // Dropdown Petugas / Dokter (SIP) State
    const [karyawanOptions, setKaryawanOptions] = useState<any[]>([]);
    const [selectedPetugas, setSelectedPetugas] = useState<string>('');

    // Step state: 'form' (Form Penanganan) vs 'hasil' (Hasil Treatment & Produk Kasir)
    const [activeStep, setActiveStep] = useState<'form' | 'hasil'>('form');
    // Setelah simpan, kunci semua input form agar tidak bisa diubah lagi
    const [isFormSaved, setIsFormSaved] = useState<boolean>(false);
    const [isHasilSaved, setIsHasilSaved] = useState<boolean>(false);

    // Modal Sukses Terbit Antrean & Transaksi
    const [showHasilModal, setShowHasilModal] = useState<boolean>(false);
    const [hasilAntrianList, setHasilAntrianList] = useState<any[]>([]);
    const [hasilTransaksiDraft, setHasilTransaksiDraft] = useState<any | null>(null);
    const [hasilKodeKunjungan, setHasilKodeKunjungan] = useState<string>('');
    const [hasilPasienNama, setHasilPasienNama] = useState<string>('');
    const [hasilNoRm, setHasilNoRm] = useState<string>('');

    useEffect(() => {
        loadKaryawan();
    }, []);

    useEffect(() => {
        if (kodeRuangan) {
            loadFormFields();
        }
    }, [kodeRuangan]);

    const [currentAntrianId, setCurrentAntrianId] = useState<string>('');

    useEffect(() => {
        if (activePatient?.kode_antrian_layanan) {
            if (activePatient.kode_antrian_layanan !== currentAntrianId) {
                setCurrentAntrianId(activePatient.kode_antrian_layanan);
                let initialForm = {};
                let hasForm = false;
                if (activePatient.hasil_form) {
                    try {
                        initialForm = typeof activePatient.hasil_form === 'string' ? JSON.parse(activePatient.hasil_form) : activePatient.hasil_form;
                        hasForm = Object.keys(initialForm).length > 0;
                    } catch (_) {}
                }
                setFormData(initialForm);
                setCatatanPetugas(activePatient.catatan_petugas || '');
                setSelectedPetugas(activePatient.kode_karyawan || '');

                const ap = activePatient as any;
                setHeaderRMData({
                    foto_before: ap.foto_before || ap.data_konsultasi_foto_before || '',
                    keluhan: ap.keluhan || ap.data_konsultasi_keluhan || '',
                    durasi_keluhan: ap.durasi_keluhan || ap.data_konsultasi_durasi_keluhan || '',
                    riwayat_alergi: ap.riwayat_alergi || ap.data_konsultasi_riwayat_alergi || '',
                    riwayat_treatment: ap.riwayat_treatment || ap.data_konsultasi_riwayat_treatment || '',
                    pemeriksaan_acne: ap.pemeriksaan_acne || ap.data_konsultasi_pemeriksaan_acne || 'Tidak Ada',
                    pemeriksaan_inflammation: ap.pemeriksaan_inflammation || ap.data_konsultasi_pemeriksaan_inflammation || 'Tidak Ada',
                    pemeriksaan_skin_type: ap.pemeriksaan_skin_type || ap.data_konsultasi_pemeriksaan_skin_type || 'Normal',
                    pemeriksaan_pigmentation: ap.pemeriksaan_pigmentation || ap.data_konsultasi_pemeriksaan_pigmentation || 'Tidak Ada',
                    pemeriksaan_sensitivity: ap.pemeriksaan_sensitivity || ap.data_konsultasi_pemeriksaan_sensitivity || 'Rendah',
                    diagnosis: ap.diagnosis || ap.data_konsultasi_diagnosis || '',
                    subjective: ap.subjective || ap.data_konsultasi_subjective || '',
                    objective: ap.objective || ap.data_konsultasi_objective || '',
                    assessment: ap.assessment || ap.data_konsultasi_assessment || '',
                    plan: ap.plan || ap.data_konsultasi_plan || '',
                });

                setActiveStep(hasForm ? 'hasil' : 'form');
                setIsFormSaved(hasForm);
                setIsHasilSaved(false);

                if (isKonsultasi) {
                    loadPendaftaranItems(activePatient.kode_kunjungan);
                } else {
                    setRekomendasiItems([]);
                }
            } else if (activePatient.kode_karyawan && !selectedPetugas) {
                setSelectedPetugas(activePatient.kode_karyawan);
            }
        } else {
            setCurrentAntrianId('');
            setFormData({});
            setCatatanPetugas('');
            setRekomendasiItems([]);
            setSelectedPetugas('');
            setActiveStep('form');
            setIsFormSaved(false);
            setIsHasilSaved(false);
        }
    }, [activePatient?.kode_antrian_layanan, isKonsultasi]);

    const loadPendaftaranItems = async (kodeKunjungan?: string) => {
        if (!kodeKunjungan) return;
        try {
            const res = await postData('/master/antrian-layanan-pendaftaran-items', {
                kode_kunjungan: kodeKunjungan,
            });
            if (['00', '0000'].includes(res.data.status) && res.data.data?.length > 0) {
                setRekomendasiItems(res.data.data);
            } else {
                setRekomendasiItems([]);
            }
        } catch (e) {
            setRekomendasiItems([]);
        }
    };

    const handleBeforePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showError(toast, 'File harus berupa gambar (JPG, PNG, WEBP, dll)');
            return;
        }
        setUploadingBefore(true);
        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = (err) => reject(err);
                reader.readAsDataURL(file);
            });
            const res = await postData('/master/ruangan-form-upload-foto', {
                image_base64: base64,
                file_name: file.name,
                prefix: 'before',
            });
            if (res?.data?.status === 200 || res?.status === 200) {
                const filePath = res.data?.data?.file_path || res.data?.file_path || '';
                setHeaderRMData((prev) => ({ ...prev, foto_before: filePath }));
                showSuccess(toast, 'Foto Before berhasil diunggah!');
            } else {
                showError(toast, res?.data?.message || 'Gagal mengunggah foto');
            }
        } catch (_) {
            showError(toast, 'Gagal mengunggah foto');
        } finally {
            setUploadingBefore(false);
        }
    };

    const loadKaryawan = async () => {
        try {
            const res = await postData('/master/karyawan-data', { page: 1, perPage: 100 });
            const list = res.data?.data || [];
            const opts = list.map((k: any) => ({
                label: `${k.nama}${k.jabatan ? ` (${k.jabatan.toUpperCase()})` : ''}`,
                value: k.no_sip,
                nama: k.nama,
                jabatan: k.jabatan,
                no_sip: k.no_sip,
            }));
            setKaryawanOptions(opts);
        } catch (_) {
            // silent fail
        }
    };

    const loadFormFields = async () => {
        if (!kodeRuangan) return;
        setLoadingFields(true);
        try {
            const res = await postData('/master/ruangan-form-data', { kode_ruangan: kodeRuangan });
            setFields(res.data.data || []);
        } catch (_) {
            // silent fail
        } finally {
            setLoadingFields(false);
        }
    };

    const handleFieldChange = (key: string, value: any) => {
        if (isFormSaved) return;
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const executeSaveForm = async (targetStatus?: string) => {
        if (!activePatient) return;
        setSaving(true);
        try {
            const payload: any = {
                kode_antrian_layanan: activePatient.kode_antrian_layanan,
                kode_karyawan: selectedPetugas,
                no_sip: selectedPetugas,
                hasil_form: formData,
                header_data: headerRMData,
                lanjut_ke_tindakan: lanjutKeTindakan ? 1 : 0,
                catatan_petugas: catatanPetugas,
                rekomendasi_items: rekomendasiItems,
            };
            if (targetStatus) {
                payload.status_tindakan = targetStatus;
            }

            const res = await postData('/master/antrian-layanan-simpan-rekomendasi', payload);
            showSuccess(toast, res.data.message || 'Form penanganan berhasil disimpan.');

            const antrianBaru = res.data?.data?.antrian_layanan_baru || [];
            const trxDraft = res.data?.data?.transaksi_draft || null;
            const kodeKunjungan = res.data?.data?.kode_kunjungan || '';

            // Simpan info pasien SEBELUM getGridData() mengosongkan activePatient
            if (antrianBaru.length > 0 || trxDraft) {
                setHasilPasienNama(activePatient?.nama_pasien || '');
                setHasilNoRm(activePatient?.no_rm || '');
                setHasilAntrianList(antrianBaru);
                setHasilTransaksiDraft(trxDraft);
                setHasilKodeKunjungan(kodeKunjungan);
            }

            // Update local officer info so header badge displays doctor name immediately
            if (selectedPetugas) {
                const foundKaryawan = karyawanOptions.find((k) => k.value === selectedPetugas);
                if (foundKaryawan) {
                    activePatient.nama_petugas = foundKaryawan.nama;
                    activePatient.kode_karyawan = selectedPetugas;
                }
            }

            // Kunci form setelah berhasil simpan tanpa mengosongkan nilainya (form tidak bisa diotak-atik)
            setIsFormSaved(true);

            // Refresh data
            getGridData();

            if (antrianBaru.length > 0 || trxDraft) {
                setShowHasilModal(true);
            }
        } catch (error: any) {
            showError(toast, error?.response?.data?.message || 'Gagal menyimpan catatan & rekomendasi penanganan');
        } finally {
            setSaving(false);
        }
    };

    // State Konfirmasi Simpan
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [targetStatusToSave, setTargetStatusToSave] = useState<string | undefined>(undefined);

    const handleSaveForm = (targetStatus?: string) => {
        if (!activePatient) return;

        // Validation: Petugas / Dokter Examiner wajib dipilih
        if (!selectedPetugas) {
            showError(toast, 'Petugas / Dokter Penanggung Jawab wajib dipilih!');
            return;
        }

        // Check mandatory fields
        for (const f of fields) {
            if (f.is_required) {
                const val = formData[f.label_field];
                if (f.tipe_field === 'upload_foto') {
                    const hasBefore = val && typeof val === 'object' && val.before;
                    if (!hasBefore) {
                        showError(toast, `Field '${f.label_field}' wajib mengunggah foto!`);
                        return;
                    }
                } else if (!val) {
                    showError(toast, `Field '${f.label_field}' wajib diisi!`);
                    return;
                }
            }
        }

        setTargetStatusToSave(targetStatus);
        setShowConfirmModal(true);
    };

    const handleConfirmAccept = () => {
        setShowConfirmModal(false);
        executeSaveForm(targetStatusToSave);
    };

    // ─── IF NO PATIENT IS CURRENTLY IN TREATMENT ─────────────────────────────
    if (!activePatient) {
        return (
            <>
                <div className="card shadow-2 border-round-xl p-4 surface-card border-top-3 border-teal-500 mb-4">
                    <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3">
                        <div className="flex align-items-center gap-3">
                            <div className="w-3rem h-3rem border-circle bg-teal-100 text-teal-700 flex align-items-center justify-content-center text-xl font-bold flex-shrink-0">
                                👨‍⚕️
                            </div>
                            <div>
                                <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-1 border-round-md inline-block mb-1">
                                    Sesi Penanganan Ruangan: {namaRuangan}
                                </span>
                                <h3 className="text-xl font-bold text-900 m-0">Belum Ada Pasien Yang Sedang Ditangani</h3>
                                <p className="text-xs text-500 m-0 mt-1">
                                    {nextWaitingPatient
                                        ? `Pasien berikutnya: No. #${nextWaitingPatient.nomor_antrian} — ${nextWaitingPatient.nama_pasien} (${nextWaitingPatient.nama_layanan})`
                                        : 'Tidak ada antrean pasien yang sedang menunggu di ruangan ini.'}
                                </p>
                            </div>
                        </div>

                        <div className="flex align-items-center gap-2 flex-wrap">
                            {nextWaitingPatient && (
                                <Button
                                    label={`📢 Panggil Pasien Next (#${nextWaitingPatient.nomor_antrian})`}
                                    icon="pi pi-megaphone"
                                    size="small"
                                    className="font-bold bg-teal-600 border-none text-white"
                                    onClick={() => handleAksi(nextWaitingPatient, 'dipanggil')}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <DialogHasilTerbitAntrian
                    visible={showHasilModal}
                    onHide={() => setShowHasilModal(false)}
                    pasienNama={hasilPasienNama}
                    noRm={hasilNoRm}
                    kodeKunjungan={hasilKodeKunjungan}
                    antrianList={hasilAntrianList}
                    transaksiDraft={hasilTransaksiDraft}
                />
            </>
        );
    }

    const dataKonsul = activePatient as any;
    const hasDataKonsul = !!(
        dataKonsul?.kode_antrian_asal ||
        (dataKonsul?.data_konsultasi_keluhan && dataKonsul?.data_konsultasi_keluhan !== '-') ||
        (dataKonsul?.data_konsultasi_diagnosis && dataKonsul?.data_konsultasi_diagnosis !== '-') ||
        dataKonsul?.data_konsultasi_hasil_form
    );

    let extraFormFields: Array<{ label: string; value: any }> = [];
    if (dataKonsul?.data_konsultasi_hasil_form) {
        try {
            const rawObj = typeof dataKonsul.data_konsultasi_hasil_form === 'string'
                ? JSON.parse(dataKonsul.data_konsultasi_hasil_form)
                : dataKonsul.data_konsultasi_hasil_form;
            if (rawObj && typeof rawObj === 'object') {
                Object.entries(rawObj).forEach(([k, v]) => {
                    if (v && typeof v !== 'object' && !['area_yang_ditangani', 'kondisi_kulit', 'produk_bahan_digunakan', 'jumlah_satuan', 'catatan_tindakan', 'catatan_petugas', 'kondisi_setelah_tindakan', 'catatan_hasil_treatment', 'persetujuan_tindakan'].includes(k)) {
                        const label = k.replace(/_/g, ' ').toUpperCase();
                        extraFormFields.push({ label, value: String(v) });
                    }
                });
            }
        } catch (_) {}
    }

    return (
        <div className="card shadow-3 border-round-xl p-0 mb-4 surface-card overflow-hidden border-2 border-teal-500">
            {/* ACTIVE PATIENT HEADER HERO */}
            <div className="p-4 bg-teal-700 text-white">
                <div className="flex flex-column md:flex-row align-items-start md:align-items-center gap-3 mb-3">
                    <div className="bg-white text-teal-900 border-round-xl px-4 py-2 text-center shadow-2" style={{ minWidth: '80px' }}>
                        <span className="text-xs font-bold block text-teal-600 white-space-nowrap">NO. ANTREAN</span>
                        <span className="text-4xl font-black">{activePatient.nomor_antrian}</span>
                    </div>

                    <div className="flex-1">
                        <div className="flex align-items-center gap-2 mb-1">
                            <Tag value="PASIEN SEDANG DITANGANI" severity="success" className="text-xs font-bold px-2" />
                            <span className="text-xs text-teal-200">Jam Datang: {activePatient.jam_datang || '-'}</span>
                        </div>
                        <h2 className="text-xl font-black text-white m-0 mt-1">
                            {activePatient.nama_pasien || 'Pasien'}
                            <span className="text-sm font-normal text-teal-200 ml-2">(RM: {activePatient.no_rm})</span>
                        </h2>
                        <div className="flex align-items-center gap-2 mt-2 flex-wrap">
                            <span className="inline-flex align-items-center gap-1 bg-teal-800 text-teal-100 text-xs font-semibold px-2 py-1 border-round-md">
                                <i className="pi pi-briefcase text-xs" />
                                {activePatient.nama_layanan}
                            </span>
                            <span className="inline-flex align-items-center gap-1 bg-teal-800 text-teal-100 text-xs font-semibold px-2 py-1 border-round-md">
                                <i className="pi pi-building text-xs" />
                                {namaRuangan}
                            </span>
                            {(activePatient.nama_petugas || karyawanOptions.find((k) => k.value === selectedPetugas)?.nama) && (
                                <span className="inline-flex align-items-center gap-1 bg-teal-900 text-teal-100 text-xs font-semibold px-2 py-1 border-round-md border-1 border-teal-400">
                                    <i className="pi pi-user text-xs" />
                                    Petugas: {karyawanOptions.find((k) => k.value === selectedPetugas)?.nama || activePatient.nama_petugas}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex align-items-center justify-content-end gap-2 flex-wrap pt-2 border-top-1 border-teal-600">
                    <Button
                        label="Riwayat Pasien"
                        icon="pi pi-history"
                        size="small"
                        className="text-xs font-semibold bg-white-alpha-20 text-white border-1 border-white-alpha-40 border-round-lg hover:bg-white-alpha-30"
                        onClick={() => setDrawerRiwayatVisible(true)}
                    />
                    <Button
                        label="Panggil Ulang"
                        icon="pi pi-volume-up"
                        size="small"
                        className="text-xs font-semibold bg-white-alpha-20 text-white border-1 border-white-alpha-40 border-round-lg hover:bg-white-alpha-30"
                        onClick={() => {
                            playChime();
                            speakNomorLayanan(activePatient.nomor_antrian, activePatient.nama_pasien, namaRuangan);
                        }}
                    />
                    <Button
                        label="Batalkan"
                        icon="pi pi-times"
                        size="small"
                        className="text-xs font-semibold bg-red-500 text-white border-none border-round-lg hover:bg-red-600"
                        onClick={() => handleAksi(activePatient, 'batal')}
                    />
                    <Button
                        label={isKonsultasi ? "Selesaikan Konsultasi" : "Selesaikan Tindakan"}
                        icon="pi pi-check"
                        size="small"
                        disabled={
                            isKonsultasi
                                ? (!isFormSaved && !activePatient?.hasil_form)
                                : ((!isFormSaved && !activePatient?.hasil_form) || !isHasilSaved)
                        }
                        className={`text-xs font-bold border-none border-round-lg ${
                            (isKonsultasi
                                ? (!isFormSaved && !activePatient?.hasil_form)
                                : ((!isFormSaved && !activePatient?.hasil_form) || !isHasilSaved))
                                ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                                : 'bg-green-500 text-white hover:bg-green-600 shadow-2'
                        }`}
                        tooltip={
                            !isKonsultasi && !isHasilSaved
                                ? 'Tombol Selesaikan Tindakan baru bisa diklik setelah data Form Hasil Treatment (Step 2) disimpan'
                                : ''
                        }
                        onClick={() => {
                            if (!isKonsultasi && !isHasilSaved) {
                                showError(toast, 'Selesaikan Tindakan baru bisa diklik setelah data Form Hasil Treatment (Step 2) disimpan!');
                                return;
                            }
                            handleAksi(activePatient, 'selesai', true);
                        }}
                    />
                </div>
            </div>

            {/* MAIN CONTENT VIEW BASED ON ROOM TYPE (NO 2-STEP TAB HEADER FOR CONSULTATION) */}
            {isKonsultasi ? (
                /* RUANG KONSULTASI DOKTER VIEW */
                <div className="p-4 flex flex-column gap-4 surface-ground">
                    {/* SECTION PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP) */}
                    <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
                        <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
                            <label className="text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center gap-2 m-0">
                                <i className="pi pi-user text-teal-600 text-sm" />
                                PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP)
                            </label>
                            <span className="text-[10px] text-500 font-semibold">Tersimpan berdasar No. SIP</span>
                        </div>
                        <div className="p-fluid">
                            <Dropdown
                                value={selectedPetugas}
                                options={karyawanOptions}
                                onChange={(e) => setSelectedPetugas(e.value)}
                                placeholder="-- Pilih Nama Petugas / Dokter --"
                                filter
                                filterBy="label,value,nama"
                                showClear
                                disabled={isFormSaved}
                                className="w-full text-sm border-round-md shadow-1 bg-white"
                                valueTemplate={(option) => {
                                    if (option) {
                                        return (
                                            <div className="flex align-items-center gap-2">
                                                <span className="font-bold text-teal-900">{option.nama || option.label}</span>
                                                {option.value && (
                                                    <span className="text-xs text-500 font-normal">(No. SIP: {option.value})</span>
                                                )}
                                            </div>
                                        );
                                    }
                                    return <span>-- Pilih Nama Petugas / Dokter --</span>;
                                }}
                                itemTemplate={(option) => (
                                    <div className="flex align-items-center justify-content-between py-1">
                                        <div>
                                            <span className="font-bold text-teal-900 block text-sm">{option.nama || option.label}</span>
                                            <span className="text-xs text-500 block">No. SIP: {option.value}</span>
                                        </div>
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                    {/* SECTION FOTO BEFORE (SEBELUM TREATMENT) & REKAM MEDIS */}
                    <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1 flex flex-column gap-4">
                        {/* FOTO BEFORE UPLOADER BOX */}
                        <div className="p-3 surface-50 border-round-xl border-1 surface-border">
                            <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 flex align-items-center gap-2">
                                <i className="pi pi-camera text-teal-600 text-sm" />
                                FOTO BEFORE (SEBELUM TREATMENT / KONSULTASI)
                            </label>
                            <div className="flex flex-column sm:flex-row align-items-center gap-3">
                                {headerRMData.foto_before ? (
                                    <div className="relative border-round-lg overflow-hidden border-1 surface-border" style={{ width: '120px', height: '120px' }}>
                                        <img
                                            src={headerRMData.foto_before}
                                            alt="Foto Before"
                                            className="w-full h-full object-cover"
                                        />
                                        {!isFormSaved && (
                                            <Button
                                                icon="pi pi-trash"
                                                severity="danger"
                                                rounded
                                                size="small"
                                                className="absolute top-0 right-0 m-1 p-button-sm"
                                                onClick={() => setHeaderRMData({ ...headerRMData, foto_before: '' })}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        className="border-2 border-dashed border-300 border-round-xl flex flex-column align-items-center justify-content-center p-3 text-center cursor-pointer hover:border-teal-500 bg-white"
                                        style={{ width: '100%', maxWidth: '240px', minHeight: '100px' }}
                                        onClick={() => !isFormSaved && document.getElementById('before_photo_input')?.click()}
                                    >
                                        <i className="pi pi-upload text-teal-600 text-2xl mb-1" />
                                        <span className="text-xs font-bold text-700">Unggah Foto Before</span>
                                        <span className="text-[10px] text-400">Format: JPG, PNG, WEBP</span>
                                    </div>
                                )}
                                <input
                                    id="before_photo_input"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleBeforePhotoUpload}
                                    disabled={isFormSaved || uploadingBefore}
                                />
                            </div>
                        </div>

                        {/* 1. ANAMNESIS & RIWAYAT PASIEN */}
                        <div>
                            <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border">
                                1. ANAMNESIS &amp; RIWAYAT PASIEN (REKAM MEDIS)
                            </label>
                            <div className="grid formgrid p-fluid text-sm">
                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Keluhan Utama Pasien</label>
                                    <InputTextarea
                                        value={headerRMData.keluhan}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, keluhan: e.target.value })}
                                        rows={2}
                                        placeholder="Tuliskan keluhan utama pasien..."
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Durasi Keluhan</label>
                                    <InputText
                                        value={headerRMData.durasi_keluhan}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, durasi_keluhan: e.target.value })}
                                        placeholder="Misal: 2 minggu, 1 bulan..."
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Riwayat Alergi Pasien</label>
                                    <InputTextarea
                                        value={headerRMData.riwayat_alergi}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, riwayat_alergi: e.target.value })}
                                        rows={2}
                                        placeholder="Riwayat alergi obat / kosmetik / bahan..."
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Riwayat Treatment Sebelumnya</label>
                                    <InputTextarea
                                        value={headerRMData.riwayat_treatment}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, riwayat_treatment: e.target.value })}
                                        rows={2}
                                        placeholder="Perawatan kulit/klinik yang pernah dikunjungi..."
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2. HASIL PEMERIKSAAN KULIT */}
                        <div>
                            <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border">
                                2. HASIL PEMERIKSAAN KULIT
                            </label>
                            <div className="grid formgrid p-fluid text-sm">
                                <div className="col-12 md:col-4 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Pemeriksaan Acne</label>
                                    <Dropdown
                                        value={headerRMData.pemeriksaan_acne}
                                        options={[
                                            { label: 'Tidak Ada', value: 'Tidak Ada' },
                                            { label: 'Ringan', value: 'Ringan' },
                                            { label: 'Sedang', value: 'Sedang' },
                                            { label: 'Berat', value: 'Berat' },
                                        ]}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_acne: e.value })}
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-4 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Pemeriksaan Inflammation</label>
                                    <Dropdown
                                        value={headerRMData.pemeriksaan_inflammation}
                                        options={[
                                            { label: 'Tidak Ada', value: 'Tidak Ada' },
                                            { label: 'Ringan', value: 'Ringan' },
                                            { label: 'Sedang', value: 'Sedang' },
                                            { label: 'Berat', value: 'Berat' },
                                        ]}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_inflammation: e.value })}
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-4 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Jenis / Tipe Kulit</label>
                                    <Dropdown
                                        value={headerRMData.pemeriksaan_skin_type}
                                        options={[
                                            { label: 'Normal', value: 'Normal' },
                                            { label: 'Kering', value: 'Kering' },
                                            { label: 'Berminyak', value: 'Berminyak' },
                                            { label: 'Kombinasi', value: 'Kombinasi' },
                                            { label: 'Sensitif', value: 'Sensitif' },
                                        ]}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_skin_type: e.value })}
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Pemeriksaan Pigmentasi</label>
                                    <Dropdown
                                        value={headerRMData.pemeriksaan_pigmentation}
                                        options={[
                                            { label: 'Tidak Ada', value: 'Tidak Ada' },
                                            { label: 'Melasma', value: 'Melasma' },
                                            { label: 'PIH', value: 'PIH' },
                                            { label: 'Freckles', value: 'Freckles' },
                                            { label: 'Lentigo', value: 'Lentigo' },
                                        ]}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_pigmentation: e.value })}
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Sensitivitas Kulit</label>
                                    <Dropdown
                                        value={headerRMData.pemeriksaan_sensitivity}
                                        options={[
                                            { label: 'Rendah', value: 'Rendah' },
                                            { label: 'Sedang', value: 'Sedang' },
                                            { label: 'Tinggi', value: 'Tinggi' },
                                        ]}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, pemeriksaan_sensitivity: e.value })}
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. DIAGNOSIS DOKTER & SOAP MEDIS */}
                        <div>
                            <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 pb-2 border-bottom-1 surface-border">
                                3. DIAGNOSIS DOKTER &amp; SOAP MEDIS
                            </label>
                            <div className="grid formgrid p-fluid text-sm">
                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold mb-1">Diagnosis Dokter</label>
                                    <InputText
                                        value={headerRMData.diagnosis}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, diagnosis: e.target.value })}
                                        placeholder="Diagnosis medis..."
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-6 mb-3">
                                    <label className="block text-xs font-semibold mb-1">SOAP (Plan / Perencanaan)</label>
                                    <InputText
                                        value={headerRMData.plan}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, plan: e.target.value })}
                                        placeholder="Rencana penanganan / treatment..."
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-4 mb-3">
                                    <label className="block text-xs font-semibold mb-1">SOAP (Subjective)</label>
                                    <InputTextarea
                                        value={headerRMData.subjective}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, subjective: e.target.value })}
                                        rows={2}
                                        placeholder="Catatan subjektif pasien..."
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-4 mb-3">
                                    <label className="block text-xs font-semibold mb-1">SOAP (Objective)</label>
                                    <InputTextarea
                                        value={headerRMData.objective}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, objective: e.target.value })}
                                        rows={2}
                                        placeholder="Catatan objektif fisik..."
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                                <div className="col-12 md:col-4 mb-3">
                                    <label className="block text-xs font-semibold mb-1">SOAP (Assessment)</label>
                                    <InputTextarea
                                        value={headerRMData.assessment}
                                        onChange={(e) => setHeaderRMData({ ...headerRMData, assessment: e.target.value })}
                                        rows={2}
                                        placeholder="Penilaian klinis dokter..."
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* KONTROL UI: LANJUT KE TREATMENT? (HANYA JIKA BUKAN DARI KONSULTASI WAJIB) */}
                        {!((activePatient as any)?.wajib_konsultasi === 'wajib' || (activePatient?.nama_layanan && !activePatient.nama_layanan.toLowerCase().includes('konsul'))) && (
                            <div className="p-3 surface-100 border-round-lg border-1 surface-border flex align-items-center justify-content-between">
                                <div>
                                    <span className="font-bold text-sm text-900 block">Lanjut ke Treatment Sesi Ini?</span>
                                    <span className="text-xs text-500">Jika Ya, sistem otomatis menerbitkan antrean di ruang tindakan pasien tanpa daftar ulang.</span>
                                </div>
                                <div className="flex align-items-center gap-3">
                                    <div className="flex align-items-center gap-1">
                                        <Checkbox
                                            inputId="lanjut_ya_active"
                                            checked={lanjutKeTindakan}
                                            disabled={isFormSaved}
                                            onChange={(e) => setLanjutKeTindakan(true)}
                                        />
                                        <label htmlFor="lanjut_ya_active" className="text-sm font-bold text-teal-800 cursor-pointer">Ya (Lanjut Treatment)</label>
                                    </div>
                                    <div className="flex align-items-center gap-1">
                                        <Checkbox
                                            inputId="lanjut_tidak_active"
                                            checked={!lanjutKeTindakan}
                                            disabled={isFormSaved}
                                            onChange={(e) => {
                                                setLanjutKeTindakan(false);
                                                setRekomendasiItems((prev) => prev.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)));
                                            }}
                                        />
                                        <label htmlFor="lanjut_tidak_active" className="text-sm font-bold text-500 cursor-pointer">Tidak</label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION INFORMASI TERDAFTAR TREATMENT ATAU PILIH REKOMENDASI */}
                    {lanjutKeTindakan && (
                        ((activePatient as any)?.wajib_konsultasi === 'wajib' || (activePatient?.nama_layanan && !activePatient.nama_layanan.toLowerCase().includes('konsul'))) ? (
                            <div className="surface-card p-4 border-round-xl border-1 surface-border bg-teal-50/80 shadow-1 flex align-items-center justify-content-between">
                                <div className="flex align-items-center gap-3">
                                    <div className="w-3rem h-3rem border-circle bg-teal-100 flex align-items-center justify-content-center text-teal-700">
                                        <i className="pi pi-check-circle text-2xl" />
                                    </div>
                                    <div>
                                        <span className="font-extrabold text-teal-900 text-sm block">PASIEN TERDAFTAR TREATMENT: {activePatient.nama_layanan}</span>
                                        <span className="text-xs text-teal-700">Setelah sesi konsultasi disimpan, sistem otomatis menerbitkan antrean ke ruang tindakan untuk perawatan ini.</span>
                                    </div>
                                </div>
                                <Tag value="Treatment Terdaftar" severity="info" className="px-3 py-1 font-bold text-xs" />
                            </div>
                        ) : (
                            <RekomendasiTreatmentPanel
                                toast={toast}
                                selectedItems={rekomendasiItems}
                                onChangeSelectedItems={setRekomendasiItems}
                                disabled={isFormSaved}
                            />
                        )
                    )}

                    {/* SECTION CATATAN PETUGAS / OBSERVASI KONSULTASI */}
                    <div className="p-3 border-round-xl border-1 surface-border bg-white shadow-1">
                        <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 flex align-items-center gap-2">
                            <i className="pi pi-pencil text-teal-600 text-sm" />
                            CATATAN DOKTER &amp; OBSERVASI KONSULTASI
                        </label>
                        <InputTextarea
                            value={catatanPetugas}
                            onChange={(e) => setCatatanPetugas(e.target.value)}
                            rows={4}
                            placeholder="Tuliskan rincian hasil konsultasi, resep, atau catatan khusus observasi pasien..."
                            disabled={isFormSaved}
                            className="w-full text-sm border-round-md bg-white border-300 focus:border-teal-500"
                        />
                    </div>

                    {/* SAVE ACTION FOOTER BAR */}
                    <div className="flex align-items-center justify-content-end gap-3 mt-2 pt-3 border-top-1 surface-border">
                        {isFormSaved ? (
                            <Tag value="✅ Form Penanganan & Konsultasi Telah Disimpan & Dikunci" severity="success" className="px-3 py-2 text-xs font-bold" />
                        ) : (
                            <Button
                                label="Simpan Form & Selesaikan Konsultasi"
                                icon="pi pi-check-circle"
                                severity="success"
                                size="small"
                                loading={saving}
                                onClick={() => handleSaveForm('selesai')}
                                className="font-bold text-xs bg-teal-600 border-none border-round-lg px-4 text-white shadow-2"
                            />
                        )}
                    </div>
                </div>
            ) : (
                /* RUANG TINDAKAN VIEW */
                /* RUANG TINDAKAN VIEW */
                <div className="flex flex-column gap-0">
                    {/* TAB HEADER FOR TREATMENT ROOM */}
                    <div className="flex flex-column sm:flex-row align-items-center justify-content-between p-3 bg-teal-50 border-bottom-1 surface-border gap-2">
                        <div className="flex align-items-center gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setActiveStep('form')}
                                className={`flex align-items-center gap-2 px-3 py-2 border-round-lg font-bold text-xs cursor-pointer border-none transition-all ${
                                    activeStep === 'form'
                                        ? 'bg-teal-700 text-white shadow-2'
                                        : 'surface-card text-700 hover:surface-200 border-1 surface-border'
                                }`}
                            >
                                <span className={`w-1.5rem h-1.5rem border-circle flex align-items-center justify-content-center text-xs font-extrabold ${
                                    activeStep === 'form' ? 'bg-white text-teal-800' : 'bg-teal-100 text-teal-800'
                                }`}>
                                    1
                                </span>
                                <span>Form Penanganan Ruangan</span>
                            </button>

                            <i className="pi pi-chevron-right text-400 text-sm hidden sm:inline-block" />

                            <button
                                type="button"
                                onClick={() => setActiveStep('hasil')}
                                className={`flex align-items-center gap-2 px-3 py-2 border-round-lg font-bold text-xs cursor-pointer border-none transition-all ${
                                    activeStep === 'hasil'
                                        ? 'bg-teal-700 text-white shadow-2'
                                        : 'surface-card text-700 hover:surface-200 border-1 surface-border'
                                }`}
                            >
                                <span className={`w-1.5rem h-1.5rem border-circle flex align-items-center justify-content-center text-xs font-extrabold ${
                                    activeStep === 'hasil' ? 'bg-white text-teal-800' : 'bg-teal-100 text-teal-800'
                                }`}>
                                    2
                                </span>
                                <span>Hasil Treatment (Foto After) &amp; Rekomendasi Produk</span>
                            </button>
                        </div>

                        {activeStep === 'hasil' && (
                            <Button
                                label="Kembali ke Form Penanganan"
                                icon="pi pi-arrow-left"
                                outlined
                                size="small"
                                severity="secondary"
                                className="text-xs font-bold border-round-lg"
                                onClick={() => setActiveStep('form')}
                            />
                        )}
                    </div>

                    {activeStep === 'form' ? (
                        /* TAB 1: FORM PENANGANAN RUANGAN TINDAKAN */
                        <div className="p-4 flex flex-column gap-4 surface-ground">
                            {/* SECTION PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP) */}
                            <div className="surface-card p-3 border-round-xl border-1 surface-border shadow-1">
                                <div className="flex align-items-center justify-content-between mb-3 pb-2 border-bottom-1 surface-border">
                                    <label className="text-xs font-extrabold text-teal-800 uppercase tracking-wider flex align-items-center gap-2 m-0">
                                        <i className="pi pi-user text-teal-600 text-sm" />
                                        PETUGAS / DOKTER PENANGGUNG JAWAB (SESUAI SIP)
                                    </label>
                                    <span className="text-[10px] text-500 font-semibold">Tersimpan berdasar No. SIP</span>
                                </div>
                                <div className="p-fluid">
                                    <Dropdown
                                        value={selectedPetugas}
                                        options={karyawanOptions}
                                        onChange={(e) => setSelectedPetugas(e.value)}
                                        placeholder="-- Pilih Nama Petugas / Dokter --"
                                        filter
                                        filterBy="label,value,nama"
                                        showClear
                                        disabled={isFormSaved}
                                        className="w-full text-sm border-round-md shadow-1 bg-white"
                                        valueTemplate={(option) => {
                                            if (option) {
                                                return (
                                                    <div className="flex align-items-center gap-2">
                                                        <span className="font-bold text-teal-900">{option.nama || option.label}</span>
                                                        {option.value && (
                                                            <span className="text-xs text-500 font-normal">(No. SIP: {option.value})</span>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return <span>-- Pilih Nama Petugas / Dokter --</span>;
                                        }}
                                        itemTemplate={(option) => (
                                            <div className="flex align-items-center justify-content-between py-1">
                                                <div>
                                                    <span className="font-bold text-teal-900 block text-sm">{option.nama || option.label}</span>
                                                    <span className="text-xs text-500 block">No. SIP: {option.value}</span>
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* 1. DISPLAY FORM HASIL KONSULTASI DOKTER DI RUANG TINDAKAN (READ-ONLY) */}
                            {hasDataKonsul && (
                                <div className="surface-card p-4 border-round-xl border-1 surface-border bg-blue-50/70 shadow-1">
                                    <div className="flex align-items-center gap-2 mb-3 pb-2 border-bottom-1 border-blue-200">
                                        <i className="pi pi-file-edit text-blue-600 text-lg" />
                                        <span className="font-extrabold text-blue-900 text-sm uppercase">FORM HASIL KONSULTASI DOKTER (DARI SESI KONSULTASI)</span>
                                    </div>
                                    <div className="grid text-xs">
                                        {(dataKonsul.data_konsultasi_foto_before || dataKonsul.foto_before) && (
                                            <div className="col-12 mb-3">
                                                <span className="font-semibold text-color-secondary block mb-1">Foto Before (Sebelum Treatment):</span>
                                                <img
                                                    src={dataKonsul.data_konsultasi_foto_before || dataKonsul.foto_before}
                                                    alt="Foto Before"
                                                    className="border-round-lg border-1 surface-border shadow-1"
                                                    style={{ maxWidth: '160px', maxHeight: '160px', objectFit: 'cover' }}
                                                />
                                            </div>
                                        )}
                                        <div className="col-12 md:col-6 mb-3">
                                            <span className="font-semibold text-color-secondary block mb-1">Keluhan Utama Pasien:</span>
                                            <span className="font-bold text-blue-900 text-sm block">{dataKonsul.data_konsultasi_keluhan || '-'}</span>
                                        </div>
                                        <div className="col-12 md:col-6 mb-3">
                                            <span className="font-semibold text-color-secondary block mb-1">Riwayat Alergi:</span>
                                            <span className="font-bold text-red-600 text-sm block">{dataKonsul.data_konsultasi_riwayat_alergi || 'Tidak Ada'}</span>
                                        </div>
                                        <div className="col-12 md:col-6 mb-3">
                                            <span className="font-semibold text-color-secondary block mb-1">Diagnosis Dokter:</span>
                                            <span className="font-bold text-blue-900 text-sm block">{dataKonsul.data_konsultasi_diagnosis || '-'}</span>
                                        </div>
                                        <div className="col-12 md:col-6 mb-3">
                                            <span className="font-semibold text-color-secondary block mb-1">Rencana Penanganan (SOAP Plan):</span>
                                            <span className="font-bold text-blue-900 text-sm block">{dataKonsul.data_konsultasi_plan || dataKonsul.data_konsultasi_assessment || '-'}</span>
                                        </div>



                                        {extraFormFields.length > 0 && (
                                            <div className="col-12 mt-2 pt-2 border-top-1 border-blue-200 grid">
                                                <span className="font-bold text-blue-800 block col-12 mb-1">Catatan Isian Tambahan Konsultasi:</span>
                                                {extraFormFields.map((ef, idx) => (
                                                    <div key={idx} className="col-12 md:col-6 mb-1">
                                                        <span className="font-semibold text-color-secondary block">{ef.label}:</span>
                                                        <span className="font-bold text-blue-900">{ef.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}



                            {/* SECTION CATATAN PETUGAS / OBSERVASI RUANGAN */}
                            <div className="p-3 border-round-xl border-1 surface-border bg-white shadow-1">
                                <label className="block text-xs font-extrabold text-teal-800 uppercase tracking-wider mb-2 flex align-items-center gap-2">
                                    <i className="pi pi-pencil text-teal-600 text-sm" />
                                    CATATAN PETUGAS &amp; OBSERVASI TINDAKAN RUANGAN
                                </label>
                                <InputTextarea
                                    value={catatanPetugas}
                                    onChange={(e) => setCatatanPetugas(e.target.value)}
                                    rows={4}
                                    placeholder="Tuliskan rincian hasil tindakan, obat/alat yang digunakan, resep, atau catatan khusus observasi pasien saat berada di ruangan ini..."
                                    disabled={isFormSaved}
                                    className="w-full text-sm border-round-md bg-white border-300 focus:border-teal-500"
                                />
                            </div>

                            {/* ACTION FOOTER BAR: LANJUT KE STEP 2 */}
                            <div className="flex align-items-center justify-content-end gap-3 mt-2 pt-3 border-top-1 surface-border">
                                <Button
                                    label="Selanjutnya →"
                                    icon="pi pi-arrow-right"
                                    iconPos="right"
                                    severity="success"
                                    size="small"
                                    onClick={() => {
                                        if (!selectedPetugas) {
                                            showError(toast, 'Petugas / Dokter Penanggung Jawab wajib dipilih!');
                                            return;
                                        }
                                        setActiveStep('hasil');
                                    }}
                                    className="font-bold text-xs bg-teal-600 border-none border-round-lg px-4 text-white shadow-2"
                                />
                            </div>
                        </div>
                    ) : (
                        /* TAB 2: PANEL HASIL TREATMENT & REKOMENDASI PRODUK KASIR */
                        <div className="p-4 surface-ground">
                            <HasilTreatmentPanel
                                activePatient={activePatient}
                                toast={toast}
                                getGridData={getGridData}
                                kodeRuangan={kodeRuangan}
                                namaRuangan={namaRuangan}
                                savedFormData={formData}
                                savedCatatanPetugas={catatanPetugas}
                                savedPetugasNama={karyawanOptions.find((k) => k.value === selectedPetugas)?.nama}
                                selectedPetugas={selectedPetugas}
                                onHasilSavedChange={(saved) => setIsHasilSaved(saved)}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* CONFIRM DIALOG & HASIL MODAL */}
            <Dialog
                visible={showConfirmModal && !showHasilModal}
                onHide={() => setShowConfirmModal(false)}
                header="Konfirmasi Penanganan & Rekomendasi"
                style={{ width: '480px' }}
                modal
                className="p-fluid"
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Batal"
                            icon="pi pi-times"
                            className="p-button-outlined p-button-secondary text-xs"
                            onClick={() => setShowConfirmModal(false)}
                        />
                        <Button
                            label="Ya, Simpan & Terbitkan"
                            icon="pi pi-check"
                            className="p-button-success font-bold text-xs"
                            onClick={handleConfirmAccept}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3 py-1 text-left">
                    <div className="p-3 border-round-xl" style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4' }}>
                        <span className="text-[10px] font-bold uppercase block" style={{ color: '#0d9488' }}>Pasien Aktif</span>
                        <span className="font-extrabold text-sm block" style={{ color: '#134e4a' }}>{activePatient?.nama_pasien || hasilPasienNama || 'Pasien'}</span>
                        <span className="text-xs" style={{ color: '#0f766e' }}>No. RM: {activePatient?.no_rm || hasilNoRm} | Ruangan: {namaRuangan}</span>
                    </div>

                    <div className="flex flex-column gap-2">
                        {rekomendasiItems.filter((i) => ['layanan', 'paket_layanan'].includes(i.jenis)).length > 0 && (
                            <div className="p-3 border-round-xl text-xs" style={{ background: '#f0fdfa', border: '1.5px solid #5eead4' }}>
                                <span className="font-bold block mb-1" style={{ color: '#0f766e' }}>
                                    <i className="pi pi-ticket mr-1" />
                                    Menerbitkan {rekomendasiItems.filter((i) => ['layanan', 'paket_layanan'].includes(i.jenis)).length} Nomor Antrean Layanan:
                                </span>
                                <span className="font-semibold" style={{ color: '#115e59' }}>{rekomendasiItems.filter((i) => ['layanan', 'paket_layanan'].includes(i.jenis)).map((l) => l.nama).join(', ')}</span>
                            </div>
                        )}

                        {rekomendasiItems.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)).length > 0 && (
                            <div className="p-3 border-round-xl text-xs" style={{ background: '#fffbeb', border: '1.5px solid #fcd34d' }}>
                                <span className="font-bold block mb-1" style={{ color: '#b45309' }}>
                                    <i className="pi pi-shopping-bag mr-1" />
                                    Memasukkan {rekomendasiItems.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)).length} Produk ke Draf Transaksi Kasir:
                                </span>
                                <span className="font-semibold" style={{ color: '#78350f' }}>{rekomendasiItems.filter((i) => ['produk', 'paket_produk'].includes(i.jenis)).map((p) => `${p.nama} (${p.qty || 1}x)`).join(', ')}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-gray-700 m-0">
                        Apakah Anda yakin ingin menyimpan hasil penanganan &amp; menerbitkan nomor antrean/transaksi untuk pasien ini?
                    </p>
                </div>
            </Dialog>

            <DialogHasilTerbitAntrian
                visible={showHasilModal}
                onHide={() => setShowHasilModal(false)}
                pasienNama={hasilPasienNama}
                noRm={hasilNoRm}
                kodeKunjungan={hasilKodeKunjungan}
                antrianList={hasilAntrianList}
                transaksiDraft={hasilTransaksiDraft}
            />

            {/* DRAWER PANEL RIWAYAT PASIEN */}
            <DrawerRiwayatPasien
                visible={drawerRiwayatVisible}
                onHide={() => setDrawerRiwayatVisible(false)}
                noRm={activePatient?.no_rm || ''}
                namaPasien={activePatient?.nama_pasien || ''}
                excludeKodeKunjungan={activePatient?.kode_kunjungan || ''}
                toast={toast}
            />
        </div>
    );
};
