'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Toast } from 'primereact/toast';
import postData from '@/lib/axios/postData';
import { showError } from '@/lib/tools/generalTools';

export interface RekomendasiItem {
  jenis: 'layanan' | 'paket_layanan' | 'produk' | 'paket_produk';
  tipe: string;
  kode: string;
  nama: string;
  harga: number;
  harga_asal?: number;
  is_promo?: boolean;
  kode_promo?: string;
  nama_promo?: string;
  jenis_diskon?: 'persen' | 'nominal';
  nilai_diskon?: number;
  qty?: number;
  satuan?: string;
  kode_ruangan?: string;
  nama_ruangan?: string;
  kode_kategori?: string;
  nama_kategori?: string;
  masa_berlaku_hari?: number;
  is_locked?: boolean;
  is_pendaftaran?: boolean;
}

interface RekomendasiTreatmentPanelProps {
  toast: React.RefObject<Toast>;
  selectedItems: RekomendasiItem[];
  onChangeSelectedItems: (items: RekomendasiItem[]) => void;
  disabled?: boolean;
}

type TabKey = 'layanan' | 'paket_layanan' | 'produk' | 'paket_produk';

const TABS: { key: TabKey; label: string; icon: string; accent: string; bgActive: string }[] = [
  { key: 'layanan', label: 'Layanan', icon: 'pi-briefcase', accent: '#0d9488', bgActive: '#f0fdfa' },
  { key: 'paket_layanan', label: 'Paket Layanan', icon: 'pi-box', accent: '#7c3aed', bgActive: '#faf5ff' },
  { key: 'produk', label: 'Produk', icon: 'pi-shopping-bag', accent: '#d97706', bgActive: '#fffbeb' },
  { key: 'paket_produk', label: 'Paket Produk', icon: 'pi-tags', accent: '#4338ca', bgActive: '#eef2ff' },
];

export const RekomendasiTreatmentPanel: React.FC<RekomendasiTreatmentPanelProps> = ({
  toast,
  selectedItems,
  onChangeSelectedItems,
  disabled = false,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('layanan');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('ALL');
  const [showOnlyPromo, setShowOnlyPromo] = useState<boolean>(false);

  const [options, setOptions] = useState<Record<TabKey, RekomendasiItem[]>>({
    layanan: [],
    paket_layanan: [],
    produk: [],
    paket_produk: [],
  });

  useEffect(() => {
    fetchOptions();
  }, []);

  const lastNavigatedKeyRef = React.useRef<string>('');

  useEffect(() => {
    if (selectedItems && selectedItems.length > 0) {
      const targetItem = selectedItems.find((s) => s.is_locked || s.is_pendaftaran);
      if (targetItem) {
        const itemKey = `${targetItem.jenis}_${targetItem.kode}`;
        if (lastNavigatedKeyRef.current !== itemKey) {
          lastNavigatedKeyRef.current = itemKey;
          let targetTab: TabKey = 'layanan';
          const j = (targetItem.jenis || '').toLowerCase();
          if (j.includes('paket') && j.includes('produk')) {
            targetTab = 'paket_produk';
          } else if (j.includes('paket')) {
            targetTab = 'paket_layanan';
          } else if (j.includes('produk')) {
            targetTab = 'produk';
          } else {
            targetTab = 'layanan';
          }

          setActiveTab(targetTab);

          if (targetItem.kode_ruangan) {
            setSelectedRoomFilter(targetItem.kode_ruangan);
          }
        }
      }
    } else {
      lastNavigatedKeyRef.current = '';
    }
  }, [selectedItems]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/ruangan-rekomendasi-options', {});
      if (['00', '0000'].includes(res?.data?.status)) {
        setOptions({
          layanan: res.data.data.layanan || [],
          paket_layanan: res.data.data.paket_layanan || [],
          produk: res.data.data.produk || [],
          paket_produk: res.data.data.paket_produk || [],
        });
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat opsi rekomendasi');
      }
    } catch {
      showError(toast, 'Gagal terhubung ke server untuk opsi rekomendasi');
    } finally {
      setLoading(false);
    }
  };

  const activeTreatmentRoom = useMemo(() => {
    const activeItem = selectedItems.find((s) => ['layanan', 'paket_layanan'].includes(s.jenis));
    if (!activeItem) return null;
    return {
      kode_ruangan: activeItem.kode_ruangan || 'UNASSIGNED',
      nama_ruangan: activeItem.nama_ruangan || activeItem.kode_ruangan || 'Ruang Treatment',
    };
  }, [selectedItems]);

  const roomList = useMemo(() => {
    const roomsMap = new Map<string, string>();
    [...options.layanan, ...options.paket_layanan].forEach((item) => {
      const k = item.kode_ruangan || 'UNASSIGNED';
      const n = item.nama_ruangan || item.kode_ruangan || 'Ruangan Lainnya';
      if (!roomsMap.has(k)) roomsMap.set(k, n);
    });
    return Array.from(roomsMap.entries()).map(([kode, nama]) => ({ kode, nama }));
  }, [options.layanan, options.paket_layanan]);

  const isItemSelected = (item: RekomendasiItem) =>
    selectedItems.some((s) => s.jenis === item.jenis && s.kode === item.kode);

  const handleToggleSelect = (item: RekomendasiItem) => {
    if (disabled) return;
    const isService = ['layanan', 'paket_layanan'].includes(item.jenis);
    const existing = selectedItems.find((s) => s.jenis === item.jenis && s.kode === item.kode);

    if (existing) {
      if (existing.is_locked || existing.is_pendaftaran) {
        showError(toast, `Item "${existing.nama}" dipilih saat pendaftaran dan tidak dapat diubah/dihapus.`);
        return;
      }
      onChangeSelectedItems(selectedItems.filter((s) => !(s.jenis === item.jenis && s.kode === item.kode)));
      return;
    }

    if (isService) {
      const itemRoomCode = item.kode_ruangan || 'UNASSIGNED';
      if (activeTreatmentRoom !== null && activeTreatmentRoom.kode_ruangan !== itemRoomCode) {
        showError(
          toast,
          `Tidak bisa memilih layanan dari ruangan berbeda! Aktif: "${activeTreatmentRoom.nama_ruangan}". Batalkan pilihan sebelumnya terlebih dahulu.`
        );
        return;
      }
    }

    onChangeSelectedItems([...selectedItems, { ...item, qty: item.jenis.includes('produk') ? 1 : undefined }]);
  };

  const handleQtyChange = (item: RekomendasiItem, newQty: number) => {
    if (disabled) return;
    const validQty = Math.max(1, newQty || 1);
    onChangeSelectedItems(
      selectedItems.map((s) => (s.jenis === item.jenis && s.kode === item.kode ? { ...s, qty: validQty } : s))
    );
  };

  const filterItems = (list: RekomendasiItem[], checkRoom = false) => {
    let result = list;
    if (checkRoom && selectedRoomFilter !== 'ALL') {
      result = result.filter((i) => (i.kode_ruangan || 'UNASSIGNED') === selectedRoomFilter);
    }
    if (showOnlyPromo) {
      result = result.filter((i) => i.is_promo);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.nama.toLowerCase().includes(q) ||
          i.kode.toLowerCase().includes(q) ||
          (i.nama_ruangan && i.nama_ruangan.toLowerCase().includes(q)) ||
          (i.nama_kategori && i.nama_kategori.toLowerCase().includes(q)) ||
          (i.nama_promo && i.nama_promo.toLowerCase().includes(q))
      );
    }
    return result;
  };

  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const isServiceTab = activeTab === 'layanan' || activeTab === 'paket_layanan';
  const displayItems = filterItems(options[activeTab], isServiceTab);

  const totalPromoItemsCount = useMemo(() => {
    return Object.values(options).flatMap((arr) => arr).filter((i) => i.is_promo).length;
  }, [options]);

  const cleanSelectedItems = useMemo(() => {
    const map = new Map<string, RekomendasiItem>();
    (selectedItems || []).forEach((item) => {
      const normJenis = (item.jenis || '').includes('paket') ? 'paket_layanan' : item.jenis;
      const key = `${normJenis}_${item.kode}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values());
  }, [selectedItems]);

  const countLayanan = cleanSelectedItems.filter((s) => ['layanan', 'paket_layanan'].includes(s.jenis)).length;
  const countProduk = cleanSelectedItems.filter((s) => ['produk', 'paket_produk'].includes(s.jenis)).length;
  const totalHargaSelected = cleanSelectedItems.reduce((sum, i) => sum + (i.harga || 0) * (i.qty || 1), 0);

  const formatRupiah = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div
      className="p-3.5 border-round-2xl surface-card select-none"
      style={{
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* ── HEADER ── */}
      <div className="flex flex-column sm:flex-row sm:align-items-center justify-content-between mb-3 pb-2.5 border-bottom-1 surface-border gap-2">
        <div className="flex align-items-center gap-2.5">
          <div
            className="flex align-items-center justify-content-center border-round-xl"
            style={{
              width: '38px',
              height: '38px',
              background: 'linear-gradient(135deg, #0d9488, #059669)',
              boxShadow: '0 3px 10px rgba(13, 148, 136, 0.25)',
            }}
          >
            <i className="pi pi-sparkles text-white text-base" />
          </div>
          <div>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
              Treatment &amp; Produk Rekomendasi
            </span>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              Pilih tindakan lanjut &amp; produk rekomendasi untuk pasien ini
            </span>
          </div>
        </div>

        <div className="flex align-items-center gap-2 flex-wrap">
          {totalPromoItemsCount > 0 && (
            <span
              className="inline-flex align-items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-round-pill cursor-pointer transition-all"
              style={{
                background: showOnlyPromo ? 'linear-gradient(135deg, #ef4444, #f97316)' : '#fff1f2',
                color: showOnlyPromo ? '#ffffff' : '#e11d48',
                border: '1.5px solid #fecdd3',
                boxShadow: showOnlyPromo ? '0 2px 8px rgba(239,68,68,0.3)' : 'none',
              }}
              onClick={() => setShowOnlyPromo(!showOnlyPromo)}
            >
              <i className="pi pi-percentage text-xs" />
              {totalPromoItemsCount} Promo Aktif
            </span>
          )}
          {countLayanan > 0 && (
            <span
              className="inline-flex align-items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-round-pill"
              style={{ background: '#ccfbf1', color: '#0f766e', border: '1.5px solid #99f6e4' }}
            >
              <i className="pi pi-ticket text-xs" />
              {countLayanan} Antrean
            </span>
          )}
          {countProduk > 0 && (
            <span
              className="inline-flex align-items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-round-pill"
              style={{ background: '#fef3c7', color: '#b45309', border: '1.5px solid #fde68a' }}
            >
              <i className="pi pi-shopping-bag text-xs" />
              {countProduk} Produk
            </span>
          )}
        </div>
      </div>

      {/* ── SEARCH & PROMO FILTER TOGGLE ── */}
      <div className="flex flex-column sm:flex-row gap-2 mb-3">
        <div className="p-inputgroup flex-1">
          <span className="p-inputgroup-addon surface-50 border-1 border-300 border-right-none border-round-left-xl">
            <i className="pi pi-search text-500 text-xs" />
          </span>
          <InputText
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari layanan, paket, produk, atau nama promo..."
            className="p-inputtext-sm text-xs border-1 border-300 shadow-none focus:border-teal-500"
            style={{
              borderRadius: searchQuery ? '0' : '0 12px 12px 0',
            }}
          />
          {searchQuery && (
            <Button
              icon="pi pi-times"
              className="p-button-text p-button-secondary p-button-sm border-1 border-300 border-left-none border-round-right-xl"
              onClick={() => setSearchQuery('')}
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowOnlyPromo(!showOnlyPromo)}
          className="px-3 py-2 border-round-xl text-xs font-extrabold border-1 cursor-pointer flex align-items-center justify-content-center gap-2 transition-all flex-shrink-0"
          style={{
            borderColor: showOnlyPromo ? '#ef4444' : '#cbd5e1',
            background: showOnlyPromo ? 'linear-gradient(135deg, #ef4444, #f97316)' : '#ffffff',
            color: showOnlyPromo ? '#ffffff' : '#e11d48',
          }}
        >
          <i className="pi pi-percentage text-xs" />
          Hanya Promo 🔥
        </button>
      </div>

      {/* ── ROOM LOCK BANNER ── */}
      {activeTreatmentRoom && (
        <div
          className="flex align-items-center gap-2 mb-3 px-3 py-2 border-round-xl text-xs font-medium"
          style={{ background: 'linear-gradient(90deg, #f0fdfa, #ecfdf5)', border: '1.5px solid #6ee7b7', color: '#065f46' }}
        >
          <i className="pi pi-lock text-emerald-600 text-xs" />
          <span>
            Ruangan Aktif: <strong>{activeTreatmentRoom.nama_ruangan}</strong>
            <span className="ml-2 font-normal text-500">— Layanan dari ruangan lain terkunci</span>
          </span>
        </div>
      )}

      {/* ── SEGMENTED CONTROL TABS ── */}
      <div className="flex gap-1.5 mb-3 p-1.5 border-round-xl overflow-x-auto surface-100 border-1 surface-border">
        {TABS.map((tab) => {
          const count = filterItems(options[tab.key], tab.key === 'layanan' || tab.key === 'paket_layanan').length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedRoomFilter('ALL');
              }}
              className="flex-1 border-none py-2 px-3 border-round-lg cursor-pointer transition-all flex align-items-center justify-content-center gap-2 shadow-1"
              style={{
                minWidth: '120px',
                border: isActive ? `1.5px solid ${tab.accent}` : '1.5px solid transparent',
                background: isActive ? '#ffffff' : 'transparent',
                boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
              }}
            >
              <i className={`pi ${tab.icon}`} style={{ fontSize: '13px', color: isActive ? tab.accent : '#94a3b8' }} />
              <span style={{ fontSize: '12px', fontWeight: isActive ? 800 : 600, color: isActive ? tab.accent : '#64748b', whiteSpace: 'nowrap' }}>
                {tab.label}
              </span>
              {count > 0 && (
                <span
                  className="text-[10px] font-extrabold px-2 py-0.5 border-round-pill text-white"
                  style={{ background: isActive ? tab.accent : '#94a3b8' }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── ROOM FILTER CHIPS (ONLY FOR SERVICE TABS) ── */}
      {isServiceTab && roomList.length > 0 && (
        <div className="flex align-items-center gap-1.5 flex-wrap mb-3 p-2 surface-50 border-round-xl border-1 surface-border">
          <span className="text-xs font-extrabold text-500 mr-1 flex align-items-center gap-1 uppercase tracking-wider">
            <i className="pi pi-filter text-xs text-teal-600" />
            Ruangan:
          </span>
          {[{ kode: 'ALL', nama: 'Semua' }, ...roomList].map((r) => {
            const isActive = selectedRoomFilter === r.kode;
            const isLocked = r.kode !== 'ALL' && activeTreatmentRoom !== null && activeTreatmentRoom.kode_ruangan !== r.kode;
            return (
              <button
                key={r.kode}
                type="button"
                onClick={() => setSelectedRoomFilter(r.kode)}
                className="px-3 py-1 text-xs font-bold border-round-pill border-1 cursor-pointer transition-all flex align-items-center gap-1"
                style={{
                  borderColor: isActive ? currentTab.accent : '#cbd5e1',
                  background: isActive ? currentTab.accent : isLocked ? '#f8fafc' : '#ffffff',
                  color: isActive ? '#ffffff' : isLocked ? '#94a3b8' : '#334155',
                  opacity: isLocked ? 0.6 : 1,
                }}
              >
                {isLocked && <i className="pi pi-lock text-[9px]" />}
                {r.nama}
              </button>
            );
          })}
        </div>
      )}

      {/* ── CATALOG ITEMS GRID ── */}
      {loading ? (
        <div className="flex align-items-center justify-content-center py-5">
          <ProgressSpinner style={{ width: '28px', height: '28px' }} />
          <span className="ml-2 text-xs font-semibold text-gray-500">Memuat katalog rekomendasi...</span>
        </div>
      ) : displayItems.length === 0 ? (
        <div
          className="flex flex-column align-items-center justify-content-center py-5 border-round-2xl text-center surface-50 border-1 border-dashed surface-border"
        >
          <i className="pi pi-inbox text-4xl mb-2 text-400" />
          <span className="text-xs font-bold text-600">
            {showOnlyPromo ? 'Tidak ada promo aktif untuk kategori ini' : `Tidak ada ${currentTab.label.toLowerCase()} ditemukan`}
          </span>
        </div>
      ) : (
        <div className="grid formgrid overflow-y-auto pr-1" style={{ maxHeight: '24rem' }}>
          {displayItems.map((item) => {
            const selected = isItemSelected(item);
            const selectedObj = selectedItems.find((s) => s.jenis === item.jenis && s.kode === item.kode);
            const isPendaftaranLocked = Boolean(selectedObj?.is_locked || selectedObj?.is_pendaftaran);
            const isRoomLocked =
              isServiceTab &&
              activeTreatmentRoom !== null &&
              !selected &&
              (item.kode_ruangan || 'UNASSIGNED') !== activeTreatmentRoom.kode_ruangan;
            const isProduk = activeTab === 'produk' || activeTab === 'paket_produk';

            return (
              <div key={item.kode} className="col-12 sm:col-6 md:col-4 mb-2 p-1">
                <div
                  onClick={() => {
                    if (isPendaftaranLocked) {
                      showError(toast, `Layanan/paket "${item.nama}" sudah terpilih dari pendaftaran awal dan tidak dapat diubah.`);
                      return;
                    }
                    if (!isRoomLocked) handleToggleSelect(item);
                  }}
                  className="p-3 border-round-xl cursor-pointer transition-all flex flex-column justify-content-between relative surface-card hover:shadow-2"
                  style={{
                    border: isPendaftaranLocked
                      ? '2px solid #d97706'
                      : selected
                      ? `2px solid ${item.is_promo ? '#ef4444' : currentTab.accent}`
                      : isRoomLocked
                      ? '1.5px solid #e2e8f0'
                      : item.is_promo
                      ? '1.5px solid #fca5a5'
                      : '1.5px solid #e2e8f0',
                    background: isPendaftaranLocked
                      ? '#fffbeb'
                      : selected
                      ? currentTab.bgActive
                      : isRoomLocked
                      ? '#f8fafc'
                      : item.is_promo
                      ? '#fff1f2'
                      : '#ffffff',
                    opacity: isRoomLocked ? 0.55 : 1,
                    boxShadow: selected ? `0 4px 14px -2px ${currentTab.accent}30` : '0 1px 3px rgba(0, 0, 0, 0.03)',
                    minHeight: '135px',
                  }}
                >
                  {/* Pendaftaran Locked / Checkmark / Room Locked badge */}
                  {isPendaftaranLocked ? (
                    <span className="absolute bg-amber-600 text-white border-round-md px-2 py-0.5 text-[9px] font-extrabold flex align-items-center gap-1 shadow-1" style={{ top: '10px', right: '10px' }}>
                      <i className="pi pi-lock text-[9px]" />
                      PENDAFTARAN (TERKUNCI)
                    </span>
                  ) : selected ? (
                    <span
                      className="absolute border-circle flex align-items-center justify-content-center text-white shadow-1"
                      style={{
                        top: '10px',
                        right: '10px',
                        width: '22px',
                        height: '22px',
                        background: item.is_promo ? '#ef4444' : currentTab.accent,
                      }}
                    >
                      <i className="pi pi-check text-xs font-black" />
                    </span>
                  ) : isRoomLocked ? (
                    <span className="absolute bg-slate-100 text-slate-400 border-round px-2 py-0.5 text-[9px] font-extrabold flex align-items-center gap-1" style={{ top: '10px', right: '10px' }}>
                      <i className="pi pi-lock text-[9px]" />
                      RUANGAN BEDA
                    </span>
                  ) : null}

                  {/* ITEM INFO */}
                  <div className="pr-4">
                    <div className="flex gap-1 flex-wrap mb-1">
                      {item.is_promo && (
                        <span className="inline-flex align-items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 border-round-md bg-gradient-to-r text-white shadow-1" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                          <i className="pi pi-percentage text-[8px]" />
                          PROMO {item.jenis_diskon === 'persen' ? `-${item.nilai_diskon}%` : ''}
                        </span>
                      )}

                      {(activeTab === 'paket_layanan' || activeTab === 'paket_produk') && (
                        <span className="inline-block text-[9px] font-extrabold px-2 py-0.5 border-round-md" style={{ background: `${currentTab.accent}18`, color: currentTab.accent }}>
                          {activeTab === 'paket_layanan' ? 'PAKET LAYANAN' : 'PAKET PRODUK'}
                        </span>
                      )}
                    </div>

                    <div className="text-sm font-extrabold text-900 line-height-2 mb-1" style={{ letterSpacing: '-0.2px' }}>
                      {item.nama}
                    </div>
                    <div className="text-xs text-500 font-medium">
                      {item.nama_promo ? `${item.nama_promo} • ` : ''}
                      {item.nama_kategori || currentTab.label}
                      {isProduk && item.satuan ? ` • ${item.satuan}` : ''}
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="mt-2 pt-2 border-top-1 surface-border flex align-items-center justify-content-between gap-2">
                    <div className="flex align-items-center gap-1 flex-wrap">
                      {item.is_promo && item.harga_asal && item.harga_asal > item.harga && (
                        <span className="text-xs text-400 line-through font-semibold">
                          {formatRupiah(item.harga_asal)}
                        </span>
                      )}
                      <span className="text-xs font-black" style={{ color: item.is_promo ? '#e11d48' : currentTab.accent }}>
                        {formatRupiah(item.harga)}
                      </span>
                    </div>

                    {isServiceTab && (
                      <span
                        className="text-[10px] font-bold px-2 py-1 border-round-pill flex align-items-center gap-1 flex-shrink-0"
                        style={{
                          background: selected ? currentTab.accent : `${currentTab.accent}15`,
                          color: selected ? '#ffffff' : currentTab.accent,
                        }}
                        title={item.nama_ruangan || 'Ruangan'}
                      >
                        <i className="pi pi-building text-[9px]" />
                        <span>{item.nama_ruangan || 'Ruangan'}</span>
                      </span>
                    )}

                    {isProduk && selected && (
                      <div className="flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item, (selectedObj?.qty || 1) - 1)}
                          className="w-1.5rem h-1.5rem border-round-md border-1 border-300 surface-50 cursor-pointer font-bold text-xs flex align-items-center justify-content-center text-700"
                        >
                          −
                        </button>
                        <span className="min-w-1.5rem text-center text-xs font-extrabold" style={{ color: currentTab.accent }}>
                          {selectedObj?.qty || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQtyChange(item, (selectedObj?.qty || 1) + 1)}
                          className="w-1.5rem h-1.5rem border-round-md border-none text-white cursor-pointer font-bold text-xs flex align-items-center justify-content-center shadow-1"
                          style={{ background: currentTab.accent }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SELECTED SUMMARY DRAWER BAR ── */}
      {cleanSelectedItems.length > 0 && (
        <div
          className="mt-3 p-3 border-round-2xl flex flex-column sm:flex-row align-items-start sm:align-items-center justify-content-between gap-3 shadow-2"
          style={{
            background: 'linear-gradient(135deg, #f0fdfa, #e6fffa)',
            border: '1.5px solid #5eead4',
          }}
        >
          <div className="flex align-items-center gap-3">
            <div className="w-2.5rem h-2.5rem border-round-xl bg-teal-600 text-white flex align-items-center justify-content-center font-bold text-base shadow-1 flex-shrink-0">
              ✓
            </div>
            <div>
              <span className="text-xs font-black text-teal-950 block">
                {cleanSelectedItems.length} ITEM TERPILIH UNTUK REKOMENDASI
              </span>
              <div className="flex align-items-center gap-2 mt-1 flex-wrap">
                {cleanSelectedItems.map((item, idx) => {
                  const isLocked = item.is_locked || item.is_pendaftaran;
                  return (
                    <span
                      key={idx}
                      className={`inline-flex align-items-center gap-1 border-1 px-2 py-0.5 border-round-md text-xs font-semibold ${
                        isLocked ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-white text-teal-900 border-teal-200'
                      }`}
                    >
                      {isLocked && <i className="pi pi-lock text-[10px] text-amber-700 mr-1" />}
                      {item.nama} {item.qty ? `(${item.qty}x)` : ''}
                      {!isLocked && (
                        <i
                          className="pi pi-times text-[9px] text-red-500 cursor-pointer ml-1 hover:text-red-700"
                          onClick={() => onChangeSelectedItems(cleanSelectedItems.filter((_, i) => i !== idx))}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex align-items-center gap-3 w-full sm:w-auto justify-content-between sm:justify-content-end border-top-1 sm:border-top-none pt-2 sm:pt-0 surface-border">
            <div className="text-right">
              <span className="text-[10px] text-teal-700 block font-bold uppercase">Total Estimasi</span>
              <span className="text-base font-black text-teal-900">{formatRupiah(totalHargaSelected)}</span>
            </div>

            <Button
              label="Hapus Pilihan Tambahan"
              icon="pi pi-trash"
              outlined
              severity="danger"
              size="small"
              className="font-bold text-xs border-round-lg"
              onClick={() => onChangeSelectedItems(selectedItems.filter((i) => i.is_locked || i.is_pendaftaran))}
            />
          </div>
        </div>
      )}
    </div>
  );
};
