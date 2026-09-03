'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';

interface ModulWipCardProps {
  moduleName: string;
  onBackToActive: () => void;
}

export const ModulWipCard: React.FC<ModulWipCardProps> = ({
  moduleName,
  onBackToActive,
}) => {
  return (
    <div className="surface-card p-6 md:p-8 border-round-2xl border-1 surface-border shadow-1 text-center flex flex-column align-items-center justify-content-center">
      <div
        className="flex align-items-center justify-content-center border-round-3xl mb-4 shadow-1"
        style={{
          width: '84px',
          height: '84px',
          borderRadius: '24px',
          backgroundColor: '#fef3c7',
          color: '#d97706',
        }}
      >
        <i className="pi pi-clock text-4xl" />
      </div>

      <Tag
        value="Dalam Progres Pengerjaan"
        severity="warning"
        className="mb-3 px-3 py-1 text-xs font-bold uppercase tracking-wider"
      />

      <h3 className="text-2xl font-bold text-gray-800 m-0 mb-2">
        {moduleName}
      </h3>

      <div
        className="p-3 my-3 border-round-xl border-1 border-amber-200 bg-amber-50/70 text-amber-900 max-w-28rem mx-auto"
      >
        <p className="font-semibold text-base m-0">
          &quot;Maaf modul ini masih dalam progres pengerjaan&quot;
        </p>
      </div>

      <p className="text-gray-500 text-sm max-w-30rem m-0 mb-4 line-height-3">
        Skema database dan integrasi bisnis untuk modul <strong>{moduleName}</strong> sedang dipersiapkan oleh tim pengembang. Modul ini akan segera aktif pada pembaruan rilis sistem berikutnya.
      </p>

      <div className="flex gap-2">
        <Button
          label="Beralih ke Laporan Penjualan"
          icon="pi pi-shopping-cart"
          severity="success"
          size="small"
          className="border-round-lg font-bold"
          onClick={onBackToActive}
        />
      </div>
    </div>
  );
};

export default ModulWipCard;
