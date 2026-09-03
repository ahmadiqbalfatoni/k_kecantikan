import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Paginator, PaginatorPageChangeEvent } from 'primereact/paginator';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import { AntrianLayananData, State } from './interfaces';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';
import { apiEndpointPanggil, apiEndpointReset, apiEndpointData } from './endpoints';
import { getTzUser } from '@/lib/tools/dateTools';
import { ActiveTreatmentPanel } from './ActiveTreatmentPanel';
import { DrawerRiwayatPasien } from './DrawerRiwayatPasien';

interface PanelAntrianRuanganProps {
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    toast: React.RefObject<Toast>;
    getGridData: () => void;
    initialRuangan?: string;
}

interface RuanganItem {
    kode_ruangan: string;
    nama_ruangan: string;
    is_konsultasi?: number;
}

// ─── Audio Chime ─────────────────────────────────────────────────────────────
const playChime = () => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notes = [523.25, 659.25]; // C5 → E5
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.4;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.45, t + 0.05);
            gain.gain.linearRampToValueAtTime(0, t + 0.45);
            osc.start(t);
            osc.stop(t + 0.5);
        });
    } catch (_) {
        console.warn('AudioContext tidak tersedia');
    }
};

// ─── TTS Panggilan Suara ─────────────────────────────────────────────────────
const speakNomorLayanan = (noAntrian: string, namaPasien?: string, namaRuangan?: string) => {
    try {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        let teks = `Nomor antrian ${noAntrian}`;
        if (namaPasien && namaPasien !== '-') {
            teks += `, ${namaPasien}`;
        }
        if (namaRuangan && namaRuangan !== '-') {
            teks += `, silakan menuju ke ${namaRuangan}`;
        } else {
            teks += `, silakan menuju ke ruang tindakan`;
        }

        const utter = new SpeechSynthesisUtterance(teks);
        utter.lang = 'id-ID';
        utter.rate = 0.85;
        utter.pitch = 1.05;
        utter.volume = 1;

        const speak = () => {
            const voices = window.speechSynthesis.getVoices();
            const idVoice = voices.find((v) => v.lang === 'id-ID' || v.lang.startsWith('id'));
            if (idVoice) utter.voice = idVoice;
            window.speechSynthesis.speak(utter);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            setTimeout(speak, 900);
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                setTimeout(speak, 900);
            };
        }
    } catch (_) {
        console.warn('TTS Error');
    }
};

const STATUS_CONFIG: Record<string, { bg: string; border: string; color: string; shadow: string; cursor: string; label: string }> = {
    menunggu: {
        bg: 'linear-gradient(135deg, #fef9c3, #fde68a)',
        border: '#f59e0b', color: '#92400e',
        shadow: '0 4px 12px rgba(245,158,11,0.25)', cursor: 'pointer', label: '⏳ Menunggu'
    },
    dipanggil: {
        bg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
        border: '#2563eb', color: '#1e40af',
        shadow: '0 4px 14px rgba(37,99,235,0.35)', cursor: 'pointer', label: '📢 Dipanggil'
    },
    selesai: {
        bg: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
        border: '#16a34a', color: '#14532d',
        shadow: '0 2px 8px rgba(22,163,74,0.15)', cursor: 'default', label: '✅ Selesai'
    },
    batal: {
        bg: 'linear-gradient(135deg, #fee2e2, #fca5a5)',
        border: '#dc2626', color: '#7f1d1d',
        shadow: '0 2px 8px rgba(220,38,38,0.15)', cursor: 'default', label: '❌ Batal'
    },
};

const NEXT_AKSI: Record<string, { aksi: string; label: string; pesan: string }> = {
    menunggu: { aksi: 'dipanggil', label: 'Panggil ke Ruangan', pesan: 'Panggil pasien ini ke ruang tindakan?' },
    dipanggil: { aksi: 'selesai', label: 'Selesaikan Tindakan', pesan: 'Tandai tindakan di ruangan ini selesai?' },
};

export const PanelAntrianRuangan: React.FC<PanelAntrianRuanganProps> = ({
    state,
    setState,
    toast,
    getGridData,
    initialRuangan,
}) => {
    const [ruanganList, setRuanganList] = useState<RuanganItem[]>([]);
    const [selectedRuangan, setSelectedRuangan] = useState<string>('');
    const [loadingRuangan, setLoadingRuangan] = useState<boolean>(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [queueSearch, setQueueSearch] = useState<string>('');
    const [cardFirst, setCardFirst] = useState<number>(0);
    const [cardRows, setCardRows] = useState<number>(12);
    const [petugasJaga, setPetugasJaga] = useState<any[]>([]);

    useEffect(() => {
        setCardFirst(0);
    }, [selectedRuangan, statusFilter, queueSearch]);

    const [selectedPetugasJaga, setSelectedPetugasJaga] = useState<string>('');

    const loadPetugasJaga = async (kodeRuangan: string) => {
        try {
            const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
            const todayStr = days[new Date().getDay()];
            const res = await postData('/master/jadwal-karyawan-data', {
                kode_ruangan: kodeRuangan,
                hari: todayStr,
                status: 'aktif',
            });
            const list = res.data?.data || [];
            setPetugasJaga(list);
            if (list.length > 0) {
                setSelectedPetugasJaga(list[0].nama_karyawan);
            } else {
                setSelectedPetugasJaga('');
            }
        } catch (_) {
            setPetugasJaga([]);
            setSelectedPetugasJaga('');
        }
    };

    useEffect(() => {
        if (selectedRuangan) {
            loadPetugasJaga(selectedRuangan);
        }
    }, [selectedRuangan]);

    const [drawerRiwayatVisible, setDrawerRiwayatVisible] = useState<boolean>(false);
    const [selectedPatientForRiwayat, setSelectedPatientForRiwayat] = useState<AntrianLayananData | null>(null);

    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type') || '';

    useEffect(() => {
        loadRuangan();
    }, [initialRuangan, typeParam]);

    const loadRuangan = async () => {
        setLoadingRuangan(true);
        try {
            const res = await postData('/master/ruangan-dropdown', {});
            const rawList: RuanganItem[] = res.data.data || [];

            let list = rawList;
            if (typeParam === 'konsul') {
                list = rawList.filter(
                    (r) => r.is_konsultasi === 1 || (r.nama_ruangan && r.nama_ruangan.toLowerCase().includes('konsul'))
                );
            } else if (typeParam === 'layanan') {
                list = rawList.filter((r) => !r.is_konsultasi || r.is_konsultasi === 0);
            }

            setRuanganList(list);
            if (initialRuangan && list.some((r) => r.kode_ruangan === initialRuangan)) {
                setSelectedRuangan(initialRuangan);
            } else if (list.length > 0) {
                setSelectedRuangan(list[0].kode_ruangan);
            } else {
                setSelectedRuangan('');
            }
        } catch (error) {
            showError(toast, 'Gagal memuat daftar ruangan');
        } finally {
            setLoadingRuangan(false);
        }
    };

    const handleAksi = (item: AntrianLayananData, customAksi?: string, skipFormValidation: boolean = false) => {
        const nextCfg = NEXT_AKSI[item.status];
        const targetAksi = customAksi || nextCfg?.aksi;
        if (!targetAksi) return;

        // Validasi form hanya berlaku saat di menu Tindakan / Konsultasi
        if (isLayananOrKonsul && targetAksi === 'selesai' && !skipFormValidation && !item.hasil_form) {
            showError(toast, 'Tindakan tidak dapat diselesaikan! Harap isi dan simpan form penanganan pasien terlebih dahulu.');
            return;
        }

        const isDipanggil = targetAksi === 'dipanggil';
        const isBatal = targetAksi === 'batal';

        confirmDialog({
            message: customAksi === 'batal'
                ? `Batalkan antrean #${item.nomor_antrian} untuk pasien ${item.nama_pasien || ''}?`
                : (nextCfg?.pesan || 'Lanjutkan aksi?'),
            header: isDipanggil ? '📢 Panggil ke Ruangan' : isBatal ? '❌ Batalkan Antrean' : 'Konfirmasi Aksi',
            icon: isDipanggil ? 'pi pi-megaphone' : isBatal ? 'pi pi-times-circle' : 'pi pi-exclamation-triangle',
            acceptLabel: isDipanggil ? 'Panggil Sekarang' : isBatal ? 'Ya, Batalkan' : 'Ya, Lanjutkan',
            rejectLabel: 'Batal',
            acceptClassName: isBatal ? 'p-button-danger' : 'p-button-primary',
            accept: async () => {
                try {
                    const res = await postData(apiEndpointPanggil, {
                        kode_antrian_layanan: item.kode_antrian_layanan,
                        aksi: targetAksi,
                        status: targetAksi,
                        tz: getTzUser(),
                    });
                    showSuccess(toast, res.data.message || 'Status antrean berhasil diperbarui');
                    getGridData();

                    if (isDipanggil) {
                        playChime();
                        speakNomorLayanan(item.nomor_antrian, item.nama_pasien, item.nama_ruangan || item.nama_layanan);
                    }
                } catch (error: any) {
                    showError(toast, error?.response?.data?.message || 'Gagal mengubah status antrean');
                }
            },
        });
    };

    const [currentIndex, setCurrentIndex] = useState<number>(0);

    // Filter gridData based on selected room and status filter
    const allGridData = state.gridData || [];
    const activeRoomObj = ruanganList.find((r) => r.kode_ruangan === selectedRuangan);
    const isKonsul = typeParam === 'konsul' || Boolean(activeRoomObj?.is_konsultasi);
    const isLayananOrKonsul = typeParam === 'layanan' || typeParam === 'konsul';

    const roomFilteredItems = allGridData.filter((item) => {
        const matchRoom = selectedRuangan
            ? (item.kode_ruangan === selectedRuangan || (!item.kode_ruangan && selectedRuangan === ruanganList[0]?.kode_ruangan))
            : true;
        const matchStatus = statusFilter ? item.status === statusFilter : true;
        const matchSearch = queueSearch
            ? (item.nama_pasien?.toLowerCase().includes(queueSearch.toLowerCase()) ||
               item.nomor_antrian?.toLowerCase().includes(queueSearch.toLowerCase()) ||
               item.no_rm?.toLowerCase().includes(queueSearch.toLowerCase()))
            : true;
        return matchRoom && matchStatus && matchSearch;
    });

    // Otomatis arahkan ke antrean pertama yang belum selesai (menunggu / dipanggil)
    useEffect(() => {
        if (roomFilteredItems.length > 0) {
            const firstUnfinishedIdx = roomFilteredItems.findIndex(
                (item) => item.status !== 'selesai' && item.status !== 'batal'
            );
            if (firstUnfinishedIdx !== -1) {
                setCurrentIndex(firstUnfinishedIdx);
            } else {
                setCurrentIndex(0);
            }
        } else {
            setCurrentIndex(0);
        }
    }, [selectedRuangan, statusFilter, queueSearch, state.gridData?.length]);

    const currentItem = roomFilteredItems[currentIndex] || roomFilteredItems[0] || null;

    const handleNextPatient = () => {
        if (currentIndex < roomFilteredItems.length - 1) {
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            const nextItem = roomFilteredItems[nextIdx];
            if (nextItem && nextItem.status === 'menunggu') {
                handleAksi(nextItem, 'dipanggil');
            }
        }
    };

    const handlePrevPatient = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const activeDipanggilPatient = roomFilteredItems.find((i) => i.status === 'dipanggil') || null;
    const nextWaitingPatient = roomFilteredItems.find((i) => i.status === 'menunggu') || null;

    const mCount = roomFilteredItems.filter((i) => i.status === 'menunggu').length;
    const pCount = roomFilteredItems.filter((i) => i.status === 'dipanggil').length;
    const sCount = roomFilteredItems.filter((i) => i.status === 'selesai').length;
    const bCount = roomFilteredItems.filter((i) => i.status === 'batal').length;

    return (
        <div>
            <ConfirmDialog />

            {/* HEADER RUANGAN CARD SELECTOR — hanya tampil jika TIDAK dari sidebar */}
            {!initialRuangan && (
            <div className="card shadow-1 border-round-xl p-4 mb-4 surface-card">
                <div className="flex flex-column md:flex-row align-items-start md:align-items-center justify-content-between gap-3 mb-3 border-bottom-1 surface-border pb-3">
                    <div>
                        <h4 className="text-xl font-bold text-900 m-0 flex align-items-center gap-2">
                            <i className="pi pi-building text-teal-600 text-2xl" />
                            Antrean per Ruangan Tindakan
                        </h4>
                        <p className="text-500 text-xs m-0 mt-1">
                            Pilih salah satu ruangan di bawah ini untuk melihat dan memanggil nomor antrean di ruangan tersebut.
                        </p>
                    </div>

                    <Button
                        label="Refresh Data"
                        icon="pi pi-refresh"
                        outlined
                        size="small"
                        severity="secondary"
                        onClick={getGridData}
                        loading={state.loadGrid}
                    />
                </div>

                {loadingRuangan ? (
                    <div className="flex align-items-center justify-content-center py-4">
                        <ProgressSpinner style={{ width: '35px', height: '35px' }} />
                        <span className="ml-2 text-sm text-500">Memuat daftar ruangan...</span>
                    </div>
                ) : (
                    <div className="grid">
                        {ruanganList.map((ruang) => {
                            const isSelected = ruang.kode_ruangan === selectedRuangan;
                            const roomItems = allGridData.filter((i) => i.kode_ruangan === ruang.kode_ruangan);
                            const totalRuang = roomItems.length;
                            const mRuang = roomItems.filter((i) => i.status === 'menunggu').length;
                            const pRuang = roomItems.filter((i) => i.status === 'dipanggil').length;

                            return (
                                <div key={ruang.kode_ruangan} className="col-12 sm:col-6 md:col-4 lg:col-3">
                                    <div
                                        className={`p-3 border-round-xl border-2 cursor-pointer transition-all transition-duration-200 ${
                                            isSelected
                                                ? 'border-teal-500 bg-teal-50 shadow-3'
                                                : 'surface-border surface-card hover:border-300 shadow-1'
                                        }`}
                                        onClick={() => setSelectedRuangan(ruang.kode_ruangan)}
                                    >
                                        <div className="flex align-items-center justify-content-between mb-2">
                                            <Tag value={ruang.kode_ruangan} severity={isSelected ? 'success' : 'info'} className="text-xs font-bold" />
                                            {totalRuang > 0 && (
                                                <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-1 border-round-md">
                                                    {totalRuang} Antrean
                                                </span>
                                            )}
                                        </div>

                                        <h4 className="font-extrabold text-base text-900 m-0 mb-2 flex align-items-center gap-2">
                                            <i className="pi pi-home text-teal-600" />
                                            {ruang.nama_ruangan}
                                        </h4>

                                        <div className="flex align-items-center gap-2 text-xs">
                                            <span className="text-amber-700 font-semibold">⏳ Menunggu: {mRuang}</span>
                                            <span className="text-blue-700 font-semibold">📢 Call: {pRuang}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            )}

            {/* DETAIL ANTREAN UNTUK RUANGAN TERPILIH */}
            {selectedRuangan && (
                <div className="flex flex-column gap-4">
                    {/* 1. DAFTAR KARTU NOMOR ANTREAN PASIEN RUANGAN */}
                    <div className="card shadow-1 border-round-xl p-4 surface-card border-top-3 border-teal-500 mb-0">
                        <div className="flex flex-column gap-3 mb-4 border-bottom-1 surface-border pb-3">
                            {/* ROW 1: TITLE & ACTION BUTTONS */}
                            <div className="flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3">
                                <div>
                                    <span className="text-xs text-500 font-medium block uppercase tracking-wider mb-1">
                                        {initialRuangan ? 'Layanan Ruangan' : 'Ruangan Terpilih'}
                                    </span>
                                    <h3 className="text-2xl font-extrabold text-teal-900 m-0 flex align-items-center gap-2">
                                        <i className="pi pi-building text-teal-600 text-2xl" />
                                        {activeRoomObj ? activeRoomObj.nama_ruangan : selectedRuangan}
                                    </h3>
                                </div>

                                <div className="flex align-items-center gap-2">
                                    <Button
                                        label="Refresh Data"
                                        icon="pi pi-refresh"
                                        outlined
                                        size="small"
                                        severity="secondary"
                                        className="font-bold text-xs border-round-lg"
                                        onClick={getGridData}
                                        loading={state.loadGrid}
                                    />
                                </div>
                            </div>

                            {/* ROW 2: FILTER DROPDOWN, SEARCH & STATUS BADGES */}
                            <div className="flex flex-column lg:flex-row align-items-start lg:align-items-center justify-content-between gap-3 pt-1">
                                <div className="flex flex-column sm:flex-row align-items-stretch sm:align-items-center gap-2 w-full lg:w-auto">
                                    <Dropdown
                                        value={statusFilter}
                                        options={[
                                            { label: 'Semua Status', value: '' },
                                            { label: '⏳ Menunggu', value: 'menunggu' },
                                            { label: '📢 Dipanggil', value: 'dipanggil' },
                                            { label: '✅ Selesai', value: 'selesai' },
                                            { label: '❌ Batal', value: 'batal' },
                                        ]}
                                        onChange={(e) => setStatusFilter(e.value)}
                                        placeholder="Filter Status"
                                        className="p-inputtext-sm w-full sm:w-12rem border-round-lg"
                                    />

                                    <IconField iconPosition="left" className="w-full sm:w-16rem">
                                        <InputIcon className="pi pi-search" />
                                        <InputText
                                            value={queueSearch}
                                            onChange={(e) => setQueueSearch(e.target.value)}
                                            placeholder="Cari pasien / no. antrean..."
                                            className="p-inputtext-sm w-full border-round-lg"
                                        />
                                    </IconField>
                                </div>

                                <div className="flex gap-2 flex-wrap align-items-center">
                                    {[
                                        { color: '#f59e0b', label: 'Menunggu',  count: mCount },
                                        { color: '#3b82f6', label: 'Dipanggil', count: pCount },
                                        { color: '#22c55e', label: 'Selesai',   count: sCount },
                                        { color: '#ef4444', label: 'Batal',     count: bCount },
                                        { color: '#6b7280', label: 'Total',     count: roomFilteredItems.length },
                                    ].map((item) => (
                                        <span
                                            key={item.label}
                                            className="flex align-items-center gap-2 px-3 py-2 border-round-lg text-sm font-semibold"
                                            style={{
                                                background: `${item.color}18`,
                                                border: `1.5px solid ${item.color}55`,
                                                color: item.color,
                                            }}
                                        >
                                            <span style={{
                                                display: 'inline-block',
                                                width: '14px', height: '14px',
                                                borderRadius: '4px',
                                                backgroundColor: item.color,
                                                boxShadow: `0 1px 4px ${item.color}55`,
                                                flexShrink: 0,
                                            }} />
                                            {item.label}: <strong>{item.count}</strong>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* BARIS KETERANGAN STATUS LEGEND */}
                            <div className="flex flex-wrap align-items-center gap-3 px-2 py-2 border-round-md surface-100 text-xs font-medium text-color-secondary mt-3">
                                <span className="flex align-items-center gap-1">
                                    <i className="pi pi-info-circle" />
                                    <span className="font-semibold">KETERANGAN STATUS:</span>
                                </span>
                                {[
                                    { color: '#f59e0b', label: 'Menunggu = klik kartu untuk panggil' },
                                    { color: '#3b82f6', label: 'Dipanggil = pasien sedang ditangani' },
                                    { color: '#22c55e', label: 'Selesai = tindakan selesai' },
                                    { color: '#ef4444', label: 'Batal = antrean dibatalkan' },
                                ].map((s) => (
                                    <span key={s.label} className="flex align-items-center gap-1">
                                        <span style={{
                                            display: 'inline-block',
                                            width: '12px', height: '12px',
                                            borderRadius: '3px',
                                            backgroundColor: s.color,
                                            boxShadow: `0 1px 3px ${s.color}55`,
                                            flexShrink: 0,
                                        }} />
                                        {s.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* ── TAMPILAN SINGLE ANTREAN SPOTLIGHT (HANYA 1 KARTU + NAVIGATION NEXT/PREV) ── */}
                        {!currentItem ? (
                            <div className="text-center py-6 text-500 border-1 border-dashed border-round-xl surface-50">
                                <i className="pi pi-inbox text-5xl mb-3 text-400 block" />
                                <p className="font-bold text-base m-0 text-700">Belum Ada Nomor Antrean pada Ruangan Ini</p>
                                <p className="text-xs text-500 m-0 mt-1">Nomor antrean yang didaftarkan akan muncul di sini secara otomatis.</p>
                            </div>
                        ) : (() => {
                            const cfg = STATUS_CONFIG[currentItem.status] || STATUS_CONFIG.menunggu;
                            const isDipanggil = currentItem.status === 'dipanggil';
                            const isPaket = currentItem.jenis_layanan === 'paket';

                            return (
                                <div className="flex flex-column align-items-center text-center p-4 border-round-2xl surface-50 border-1 surface-border shadow-1 relative">
                                    <style>{`
                                        @keyframes switchCardAnim {
                                            0% {
                                                opacity: 0.1;
                                                transform: scale(0.88) translateY(14px);
                                            }
                                            60% {
                                                transform: scale(1.03) translateY(-4px);
                                            }
                                            100% {
                                                opacity: 1;
                                                transform: scale(1) translateY(0);
                                            }
                                        }
                                        .card-switch-animation {
                                            animation: switchCardAnim 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
                                        }
                                    `}</style>

                                    {/* ── BARIS INDIKATOR ANTREAN ── */}
                                    <div className="flex flex-column sm:flex-row align-items-center justify-content-between w-full max-w-30rem gap-2 mb-2">
                                        <Tag
                                            value={`Antrean Ke-${currentIndex + 1} dari ${roomFilteredItems.length}`}
                                            severity="secondary"
                                            className="text-xs font-extrabold px-3 py-2 border-round-md"
                                        />
                                        <div className="flex gap-2 flex-wrap justify-content-center">
                                            <Tag value={`Menunggu: ${mCount}`} severity="warning" className="text-xs font-bold px-2 py-1" />
                                            <Tag value={`Dipanggil: ${pCount}`} severity="info" className="text-xs font-bold px-2 py-1" />
                                            <Tag value={`Selesai: ${sCount}`} severity="success" className="text-xs font-bold px-2 py-1" />
                                        </div>
                                    </div>

                                    {/* ── KARTU SINGLE ANTREAN UTAMA (KOTAK DI TENGAH) ── */}
                                    <div
                                        key={`${currentItem.kode_antrian_layanan}_${currentIndex}`}
                                        className="w-full max-w-30rem p-4 border-round-2xl border-3 shadow-3 my-2 card-switch-animation text-center"
                                        style={{
                                            background: cfg.bg,
                                            borderColor: cfg.border,
                                            color: cfg.color,
                                        }}
                                    >
                                        <div className="text-xs font-extrabold uppercase tracking-widest mb-1 opacity-80">
                                            NOMOR ANTREAN AKTIF
                                        </div>
                                        <div className="text-6xl sm:text-7xl font-black my-2" style={{ lineHeight: 1, letterSpacing: '-1px' }}>
                                            {currentItem.nomor_antrian}
                                        </div>

                                        <div className="text-xl font-extrabold text-truncate px-2 mb-2" title={currentItem.nama_pasien}>
                                            {currentItem.nama_pasien || '-'}
                                        </div>

                                        <div
                                            className="inline-block text-xs font-bold px-3 py-1 border-round-lg mb-2"
                                            style={{
                                                background: 'rgba(255,255,255,0.9)',
                                                color: cfg.color,
                                                border: `1px solid ${cfg.border}44`,
                                            }}
                                        >
                                            {isPaket ? '📦 Paket: ' : '💆 Layanan: '} {currentItem.nama_layanan || '-'}
                                        </div>

                                        <div className="mt-1">
                                            <span
                                                className="inline-block text-xs font-extrabold px-3 py-1 border-round-xl uppercase"
                                                style={{
                                                    background: 'rgba(255,255,255,0.85)',
                                                    color: cfg.color,
                                                    border: `1px solid ${cfg.border}44`,
                                                }}
                                            >
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* ── KONTROL AKSI & NAVIGASI DI BAWAH KARTU (RAPI & TERPISAH) ── */}
                                    <div className="w-full max-w-30rem mt-3 flex flex-column gap-3">
                                        {/* BARIS TOMBOL AKSI UTAMA & RIWAYAT PASIEN */}
                                        {currentItem.status === 'menunggu' ? (
                                            <div className="flex gap-2 w-full">
                                                <Button
                                                    label="📢 Panggil Pasien Ini"
                                                    icon="pi pi-megaphone"
                                                    severity="info"
                                                    size="large"
                                                    className="font-bold border-round-lg flex-1 shadow-2 text-sm py-3"
                                                    onClick={() => handleAksi(currentItem, 'dipanggil')}
                                                />
                                                <Button
                                                    label="Riwayat"
                                                    icon="pi pi-history"
                                                    severity="help"
                                                    outlined
                                                    className="font-bold border-round-lg shadow-1 text-xs px-3"
                                                    tooltip="Lihat Riwayat Kunjungan Pasien"
                                                    onClick={() => {
                                                        setSelectedPatientForRiwayat(currentItem);
                                                        setDrawerRiwayatVisible(true);
                                                    }}
                                                />
                                            </div>
                                        ) : isDipanggil ? (
                                            <div className="flex flex-column gap-2 w-full">
                                                <div className="grid grid-nogutter gap-2 align-items-center">
                                                    <div className="col">
                                                        <Button
                                                            label="Panggil Ulang"
                                                            icon="pi pi-volume-up"
                                                            severity="info"
                                                            className="font-bold border-round-lg w-full shadow-2 text-xs py-2 px-2 white-space-nowrap"
                                                            onClick={() => {
                                                                playChime();
                                                                speakNomorLayanan(currentItem.nomor_antrian, currentItem.nama_pasien, currentItem.nama_ruangan || currentItem.nama_layanan);
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="col">
                                                        <Button
                                                            label="Riwayat Pasien"
                                                            icon="pi pi-history"
                                                            severity="help"
                                                            outlined
                                                            className="font-bold border-round-lg w-full shadow-1 text-xs py-2 px-2 white-space-nowrap"
                                                            onClick={() => {
                                                                setSelectedPatientForRiwayat(currentItem);
                                                                setDrawerRiwayatVisible(true);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-nogutter gap-2 align-items-center">
                                                    <div className="col-fixed" style={{ width: '38%' }}>
                                                        <Button
                                                            label="Batalkan"
                                                            icon="pi pi-times"
                                                            severity="danger"
                                                            outlined
                                                            className="font-bold border-round-lg w-full shadow-1 text-xs py-2 px-2 white-space-nowrap"
                                                            onClick={() => handleAksi(currentItem, 'batal')}
                                                        />
                                                    </div>
                                                    <div className="col">
                                                        <Button
                                                            label="Selesai"
                                                            icon="pi pi-check-circle"
                                                            severity="success"
                                                            className="font-bold border-round-lg w-full shadow-2 text-xs py-2 px-2 white-space-nowrap"
                                                            onClick={() => handleAksi(currentItem, 'selesai')}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex align-items-center gap-2 w-full">
                                                <Tag value={cfg.label} severity={currentItem.status === 'selesai' ? 'success' : 'danger'} className="text-sm font-bold py-2 px-4 flex-1 text-center" />
                                                <Button
                                                    label="Riwayat"
                                                    icon="pi pi-history"
                                                    severity="help"
                                                    outlined
                                                    className="font-bold border-round-lg shadow-1 text-xs py-2 px-3 white-space-nowrap"
                                                    tooltip="Lihat Riwayat Kunjungan Pasien"
                                                    onClick={() => {
                                                        setSelectedPatientForRiwayat(currentItem);
                                                        setDrawerRiwayatVisible(true);
                                                    }}
                                                />
                                            </div>
                                        )}

                                        {/* BARIS NAVIGASI PREV & NEXT */}
                                        <div className="flex align-items-center justify-content-between gap-3 pt-2 border-top-1 surface-border">
                                            <Button
                                                label="‹ Prev"
                                                icon="pi pi-chevron-left"
                                                outlined
                                                severity="secondary"
                                                disabled={currentIndex === 0}
                                                onClick={handlePrevPatient}
                                                className="font-bold border-round-lg px-3 py-2 text-xs"
                                            />
                                            <span className="text-xs font-bold text-500">
                                                Antrean {currentIndex + 1} dari {roomFilteredItems.length}
                                            </span>
                                            <Button
                                                label="Next ›"
                                                iconPos="right"
                                                icon="pi pi-chevron-right"
                                                outlined
                                                severity="secondary"
                                                disabled={currentIndex >= roomFilteredItems.length - 1}
                                                onClick={handleNextPatient}
                                                className="font-bold border-round-lg px-3 py-2 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* FORM PENANGANAN MEDIS & HASIL TREATMENT HANYA TAMPIL DI MENU TINDAKAN & KONSULTASI */}
                    {isLayananOrKonsul && Boolean(selectedRuangan) && (() => {
                        const selectedRuanganObj = ruanganList.find((r) => r.kode_ruangan === selectedRuangan);
                        const isRoomKonsul = Boolean(selectedRuanganObj?.is_konsultasi) || typeParam === 'konsul';
                        const activeDipanggilPatient = roomFilteredItems.find((item) => item.status === 'dipanggil') || (currentItem?.status === 'dipanggil' ? currentItem : null);
                        const nextWaitingPatient = roomFilteredItems.find((item) => item.status === 'menunggu') || null;

                        return (
                            <ActiveTreatmentPanel
                                activePatient={activeDipanggilPatient}
                                nextWaitingPatient={nextWaitingPatient}
                                kodeRuangan={selectedRuangan}
                                namaRuangan={selectedRuanganObj?.nama_ruangan || selectedRuangan}
                                isKonsultasi={isRoomKonsul}
                                toast={toast}
                                getGridData={getGridData}
                                handleAksi={handleAksi}
                                playChime={playChime}
                                speakNomorLayanan={speakNomorLayanan}
                            />
                        );
                    })()}
                </div>
            )}

            {/* DRAWER PANEL RIWAYAT PASIEN */}
            <DrawerRiwayatPasien
                visible={drawerRiwayatVisible}
                onHide={() => setDrawerRiwayatVisible(false)}
                noRm={selectedPatientForRiwayat?.no_rm || ''}
                namaPasien={selectedPatientForRiwayat?.nama_pasien || ''}
                excludeKodeKunjungan={selectedPatientForRiwayat?.kode_kunjungan || ''}
                toast={toast}
            />
        </div>
    );
};
