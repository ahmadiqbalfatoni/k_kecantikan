'use client';

import React from 'react';

export type DashboardRole = 'owner' | 'dokter' | 'beautician' | 'kasir' | 'warehouse';

interface RoleNavColumn {
  id: DashboardRole;
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  items: string[];
}

const ROLE_COLUMNS: RoleNavColumn[] = [
  {
    id: 'owner',
    title: 'OWNER / MANAGER',
    icon: 'pi pi-user',
    iconBg: '#0284c7',
    iconColor: '#ffffff',
    items: ['KPI Klinik', 'Pendapatan', 'Treatment', 'Inventory', 'Performa SDM'],
  },
  {
    id: 'dokter',
    title: 'DOKTER',
    icon: 'pi pi-heart-fill',
    iconBg: '#0f766e',
    iconColor: '#ffffff',
    items: ['Pasien Hari Ini', 'Rekam Medis', 'Treatment Plan', 'Follow Up'],
  },
  {
    id: 'beautician',
    title: 'BEAUTICIAN',
    icon: 'pi pi-sparkles',
    iconBg: '#9333ea',
    iconColor: '#ffffff',
    items: ['Treatment Hari Ini', 'Antrian', 'SOP', 'Before After'],
  },
  {
    id: 'kasir',
    title: 'KASIR',
    icon: 'pi pi-calculator',
    iconBg: '#16a34a',
    iconColor: '#ffffff',
    items: ['Transaksi', 'Payment', 'Invoice', 'Refund'],
  },
  {
    id: 'warehouse',
    title: 'WAREHOUSE',
    icon: 'pi pi-box',
    iconBg: '#ea580c',
    iconColor: '#ffffff',
    items: ['Stock', 'Low Stock', 'Expired', 'Receiving'],
  },
];

interface DashboardRoleNavProps {
  activeRole: DashboardRole;
  onSelectRole: (role: DashboardRole) => void;
}

export const DashboardRoleNav: React.FC<DashboardRoleNavProps> = ({ activeRole, onSelectRole }) => {
  return (
    <div
      className="mb-4 surface-card border-round-2xl overflow-hidden shadow-2 border-1"
      style={{
        borderColor: '#93c5fd',
        background: 'linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%)',
      }}
    >
      {/* HEADER CARD: TITLE WITH ICON */}
      <div className="pt-3 pb-2 px-4 text-center border-bottom-1" style={{ borderColor: '#e0f2fe' }}>
        <div className="inline-flex align-items-center justify-content-center gap-2">
          <div
            className="flex align-items-center justify-content-center border-round-xl shadow-1"
            style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#1d4ed8', color: '#ffffff', flexShrink: 0 }}
          >
            <i className="pi pi-shield text-base" />
          </div>
          <h2 className="text-xl md:text-2xl font-black m-0 tracking-wide" style={{ color: '#1e3a8a' }}>
            DASHBOARD ROLE BASED
          </h2>
        </div>
        <p className="text-xs text-blue-800 m-0 mt-1 font-medium">
          Klik pada peran di bawah ini untuk beralih dan melihat modul analitik khusus tiap divisi klinik
        </p>
      </div>

      {/* 5 COLUMNS SESUAI DIAGRAM GAMBAR 2 */}
      <div className="grid m-0 p-2 md:p-3">
        {ROLE_COLUMNS.map((col, idx) => {
          const isActive = activeRole === col.id;
          return (
            <div
              key={col.id}
              className={`col-12 sm:col-6 lg:col ${idx < ROLE_COLUMNS.length - 1 ? 'lg:border-right-1' : ''}`}
              style={{ borderColor: '#e2e8f0' }}
            >
              <div
                onClick={() => onSelectRole(col.id)}
                className={`p-3 h-full border-round-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-white shadow-3 border-2 border-primary ring-2 ring-blue-200'
                    : 'hover:bg-white hover:shadow-1 border-1 border-transparent'
                }`}
                style={{
                  transform: isActive ? 'translateY(-2px)' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                {/* ROLE HEADER */}
                <div className="flex align-items-center gap-2 mb-2.5 pb-2 border-bottom-1 surface-border">
                  <div
                    className="flex align-items-center justify-content-center border-round-xl shadow-1"
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      backgroundColor: col.iconBg,
                      color: col.iconColor,
                      flexShrink: 0,
                    }}
                  >
                    <i className={`${col.icon} text-sm`} />
                  </div>
                  <div>
                    <span
                      className="text-xs md:text-sm font-extrabold tracking-tight block"
                      style={{ color: isActive ? '#1d4ed8' : '#1e293b' }}
                    >
                      {col.title}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 border-round">
                        ● Aktif
                      </span>
                    )}
                  </div>
                </div>

                {/* ROLE ITEMS BULLET LIST PERSIS GAMBAR */}
                <ul className="list-none p-0 m-0 flex flex-column gap-1.5 text-xs">
                  {col.items.map((item, itemIdx) => (
                    <li
                      key={itemIdx}
                      className="flex align-items-center gap-2 text-gray-700 hover:text-blue-700 transition-colors"
                    >
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: isActive ? '#2563eb' : '#64748b',
                        }}
                      />
                      <span className={isActive ? 'font-semibold text-gray-900' : 'font-medium'}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardRoleNav;
