'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import postData from '@/lib/axios/postData';
import { showError } from '@/lib/tools/generalTools';
import { DashboardRole } from './components/DashboardRoleNav';
import {
  OwnerManagerView,
  DokterView,
  BeauticianView,
  KasirView,
  WarehouseView,
} from './components/RoleViews';

const DashboardPage: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useRef<Toast>(null);

  const [activeRole, setActiveRole] = useState<DashboardRole>('owner');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Set default role based on session user
  useEffect(() => {
    const userRole = String(session?.user?.role || '').toLowerCase();
    if (userRole.includes('dokter')) {
      setActiveRole('dokter');
    } else if (userRole.includes('terapis') || userRole.includes('perawat') || userRole.includes('beautician')) {
      setActiveRole('beautician');
    } else if (userRole.includes('kasir')) {
      setActiveRole('kasir');
    } else if (userRole.includes('gudang') || userRole.includes('warehouse')) {
      setActiveRole('warehouse');
    } else {
      setActiveRole('owner');
    }
  }, [session]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await postData('/master/dashboard/role-data', { role: activeRole });
      if (['00', '0000'].includes(res?.data?.status)) {
        setDashboardData(res.data.data || {});
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat data dashboard');
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeRole]);

  return (
    <div className="surface-ground min-h-screen p-3 md:p-4 border-round-xl">
      <Toast ref={toast} />

      {/* TOP BAR: GREETING & QUICK SHORTCUTS */}
      <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center mb-3 gap-2">
        <div>
          <h1 className="text-2xl font-black text-gray-800 m-0 tracking-tight">
            Dashboard Klinik Kecantikan
          </h1>
          <p className="text-gray-500 m-0 mt-0.5 text-xs md:text-sm">
            Selamat datang, <strong className="text-blue-700">{session?.user?.name || session?.user?.username || 'Admin'}</strong>! Pantau seluruh aktivitas dan performa klinik secara real-time.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            label="Pendaftaran & Antrean"
            icon="pi pi-user-plus"
            size="small"
            className="p-button-primary border-round-lg shadow-1"
            onClick={() => router.push('/pendaftaran-antrean/antrean')}
          />
          <Button
            label="Laporan & Analytics"
            icon="pi pi-chart-bar"
            size="small"
            outlined
            severity="info"
            className="border-round-lg bg-white"
            onClick={() => router.push('/riwayat/rekam-medis')}
          />
          <Button
            icon="pi pi-refresh"
            outlined
            severity="success"
            size="small"
            tooltip="Refresh Data"
            onClick={fetchDashboardData}
            loading={loading}
          />
        </div>
      </div>


      {/* ─── RENDER DASHBOARD SPESIFIK BERDASARKAN ROLE AKTIF ─── */}
      {activeRole === 'owner' && (
        <OwnerManagerView data={dashboardData} onRefresh={fetchDashboardData} loading={loading} />
      )}
      {activeRole === 'dokter' && (
        <DokterView data={dashboardData} onRefresh={fetchDashboardData} loading={loading} />
      )}
      {activeRole === 'beautician' && (
        <BeauticianView data={dashboardData} onRefresh={fetchDashboardData} loading={loading} />
      )}
      {activeRole === 'kasir' && (
        <KasirView data={dashboardData} onRefresh={fetchDashboardData} loading={loading} />
      )}
      {activeRole === 'warehouse' && (
        <WarehouseView data={dashboardData} onRefresh={fetchDashboardData} loading={loading} />
      )}
    </div>
  );
};

export default DashboardPage;