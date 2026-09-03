'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from 'primereact/button';

export default function DataPasienUserPage() {
  const router = useRouter();

  return (
    <div className="surface-ground min-h-screen p-4 flex align-items-center justify-content-center border-round-xl">
      <div className="surface-card p-5 md:p-6 border-round-2xl shadow-2 text-center max-w-lg border-1 border-200">
        <div
          className="flex align-items-center justify-content-center border-round-3xl mx-auto mb-4"
          style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: '#fef3c7', color: '#d97706' }}
        >
          <i className="pi pi-user text-4xl"></i>
        </div>

        <h1 className="text-2xl font-bold text-900 mb-2">Data Pasien</h1>
        <p className="text-amber-600 font-semibold text-lg mb-3">Fitur ini masih dalam proggres</p>

        <p className="text-600 text-sm mb-5 leading-normal">
          Halaman pengelolaan data master pasien sedang dalam tahap pengembangan akhir dan akan segera siap digunakan.
        </p>

        <div className="flex justify-content-center gap-3">
          <Button
            label="Kembali ke Dashboard"
            icon="pi pi-home"
            className="p-button-primary border-round-lg px-4 py-2"
            onClick={() => router.push('/dashboard')}
          />
        </div>
      </div>
    </div>
  );
}
