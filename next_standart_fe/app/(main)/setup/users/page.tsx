'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'primereact/toast';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import postData from '@/lib/axios/postData';
import { showError, showSuccess } from '@/lib/tools/generalTools';

interface UserRecord {
  id?: number;
  user_code: string;
  username: string;
  fullname: string;
  telp: string;
  role: string;
  status: string | number;
  created_at?: string;
}

const ROLE_OPTIONS = [
  { label: 'Owner / Manager', value: 'owner' },
  { label: 'Dokter', value: 'dokter' },
  { label: 'Beautician / Terapis', value: 'beautician' },
  { label: 'Kasir', value: 'kasir' },
  { label: 'Warehouse / Logistik', value: 'warehouse' },
  { label: 'Superadmin / IT', value: 'superadmin' },
];

const STATUS_OPTIONS = [
  { label: 'Aktif', value: '1' },
  { label: 'Tidak Aktif', value: '0' },
];

const getRoleSeverity = (role: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' => {
  const r = (role || '').toLowerCase();
  if (r.includes('owner') || r.includes('manager')) return 'info';
  if (r.includes('dokter')) return 'danger';
  if (r.includes('beautician') || r.includes('terapis')) return 'warning';
  if (r.includes('kasir')) return 'success';
  if (r.includes('warehouse') || r.includes('gudang')) return 'secondary';
  return 'info';
};

export default function ManajemenUserPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [keyword, setKeyword] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Modal Create / Edit
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [formData, setFormData] = useState<any>({
    user_code: '',
    fullname: '',
    username: '',
    telp: '',
    role: 'owner',
    password: '',
    status: '1',
  });
  const [formLoading, setFormLoading] = useState<boolean>(false);

  const toast = useRef<Toast>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const payload: any = {};
      if (keyword) payload.search = keyword;
      if (selectedRole) payload.role = selectedRole;

      const res = await postData('/setup/user-login/user-data', payload);
      if (['00', '0000'].includes(res?.data?.status)) {
        setUsers(res.data.data || []);
      } else {
        showError(toast, res?.data?.message || 'Gagal memuat data user');
      }
    } catch (err: any) {
      showError(toast, err?.message || 'Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedRole]);

  const handleOpenCreate = () => {
    setIsEdit(false);
    setFormData({
      user_code: '',
      fullname: '',
      username: '',
      telp: '',
      role: 'owner',
      password: '',
      status: '1',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (u: UserRecord) => {
    setIsEdit(true);
    setFormData({
      user_code: u.user_code,
      fullname: u.fullname || '',
      username: u.username || '',
      telp: u.telp || '',
      role: u.role || 'owner',
      password: '',
      status: String(u.status) === '1' || u.status === 1 ? '1' : '0',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.fullname || !formData.username || !formData.telp || !formData.role) {
      showError(toast, 'Harap lengkapi semua kolom yang wajib diisi!');
      return;
    }
    if (!isEdit && !formData.password) {
      showError(toast, 'Password wajib diisi untuk pengguna baru!');
      return;
    }

    setFormLoading(true);
    try {
      if (isEdit) {
        const payload: any = {
          user_code: formData.user_code,
          fullname: formData.fullname,
          username: formData.username,
          telp: formData.telp,
          role: formData.role,
          status: formData.status,
        };
        if (formData.password) payload.password = formData.password;

        const res = await postData('/setup/user-login/user-update', payload);
        if (['00', '0000'].includes(res?.data?.status)) {
          showSuccess(toast, 'Data pengguna berhasil diperbarui');
          setShowModal(false);
          fetchUsers();
        } else {
          showError(toast, res?.data?.message || 'Gagal memperbarui pengguna');
        }
      } else {
        const payload = {
          fullname: formData.fullname,
          username: formData.username,
          telp: formData.telp,
          role: formData.role,
          password: formData.password,
          status: formData.status,
        };

        const res = await postData('/setup/user-login/user-create', payload);
        if (['00', '0000'].includes(res?.data?.status)) {
          showSuccess(toast, 'Pengguna baru berhasil ditambahkan');
          setShowModal(false);
          fetchUsers();
        } else {
          showError(toast, res?.data?.message || 'Gagal menambahkan pengguna');
        }
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Terjadi kesalahan sistem';
      showError(toast, errMsg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (u: UserRecord) => {
    confirmDialog({
      message: `Apakah Anda yakin ingin menghapus akun pengguna "${u.fullname}" (${u.username})?`,
      header: 'Konfirmasi Hapus Pengguna',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      acceptLabel: 'Ya, Hapus',
      rejectLabel: 'Batal',
      accept: async () => {
        try {
          const res = await postData('/setup/user-login/user-delete', { user_code: u.user_code });
          if (['00', '0000'].includes(res?.data?.status)) {
            showSuccess(toast, 'Pengguna berhasil dihapus');
            fetchUsers();
          } else {
            showError(toast, res?.data?.message || 'Gagal menghapus pengguna');
          }
        } catch (err: any) {
          const errMsg = err?.response?.data?.message || err?.message || 'Gagal menghapus pengguna';
          showError(toast, errMsg);
        }
      },
    });
  };

  return (
    <div className="surface-ground min-h-screen p-3 md:p-4 border-round-xl">
      <Toast ref={toast} />
      <ConfirmDialog />

      <div className="surface-card p-4 border-round-xl border-1 surface-border shadow-1">
        {/* HEADER BAR */}
        <div className="flex flex-column md:flex-row justify-content-between align-items-start md:align-items-center gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-800 m-0">Manajemen Pengguna &amp; Hak Akses Role</h1>
            <p className="text-gray-500 m-0 mt-1 text-xs md:text-sm">
              Kelola akun login operasional klinik berdasarkan 5 peran dashboard (Owner, Dokter, Beautician, Kasir, Warehouse).
            </p>
          </div>

          <div className="flex flex-wrap gap-2 align-items-center">
            <Button
              label="Tambah User Baru"
              icon="pi pi-user-plus"
              className="p-button-success p-button-sm border-round-lg shadow-1"
              onClick={handleOpenCreate}
            />
            <Button icon="pi pi-refresh" outlined severity="success" size="small" onClick={fetchUsers} loading={loading} />
          </div>
        </div>

        {/* BARIS KETERANGAN STATUS PERSIS STANDAR MASTER DATA */}
        <div className="flex flex-wrap align-items-center gap-3 px-2 py-2 mb-3 border-round-md surface-100 text-xs font-medium text-color-secondary">
          <span className="flex align-items-center gap-1">
            <i className="pi pi-info-circle text-gray-500" />
            <span className="font-semibold text-gray-700">KETERANGAN STATUS:</span>
          </span>
          <span className="flex align-items-center gap-1.5 text-gray-700">
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: '#22c55e',
                boxShadow: '0 1px 3px #22c55e55',
              }}
            />
            Aktif
          </span>
          <span className="flex align-items-center gap-1.5 text-gray-700">
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '3px',
                backgroundColor: '#ef4444',
                boxShadow: '0 1px 3px #ef444455',
              }}
            />
            Tidak Aktif
          </span>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="flex flex-column md:flex-row justify-content-between align-items-center gap-2 mb-3">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <IconField iconPosition="left" className="w-full md:w-20rem">
              <InputIcon className="pi pi-search" />
              <InputText
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                placeholder="Cari Nama, Username, Telp..."
                className="w-full text-sm"
              />
            </IconField>
            <Button
              type="button"
              icon="pi pi-filter-slash"
              outlined
              severity="danger"
              tooltip="Reset Pencarian"
              onClick={() => {
                setKeyword('');
                setSelectedRole(null);
                fetchUsers();
              }}
            />
          </div>

          <div className="flex align-items-center gap-2 w-full md:w-auto ml-auto">
            <span className="text-xs font-bold text-gray-600">Filter Role:</span>
            <Dropdown
              value={selectedRole}
              options={[{ label: 'Semua Role', value: null }, ...ROLE_OPTIONS]}
              onChange={(e) => setSelectedRole(e.value)}
              placeholder="Pilih Role"
              className="p-inputtext-sm w-full md:w-14rem"
            />
          </div>
        </div>

        {/* DATA TABLE USERS */}
        <DataTable
          value={users}
          loading={loading}
          paginator
          rows={10}
          rowsPerPageOptions={[10, 25, 50]}
          size="small"
          className="p-datatable-sm"
          emptyMessage="Data pengguna tidak ditemukan."
          responsiveLayout="scroll"
        >
          <Column
            header=""
            headerStyle={{ width: '3rem' }}
            align="center"
            body={(r: UserRecord) => {
              const isActive = String(r.status) === '1' || r.status === 1 || r.status === 'aktif';
              return (
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    borderRadius: '3px',
                    backgroundColor: isActive ? '#22c55e' : '#ef4444',
                    boxShadow: `0 1px 3px ${isActive ? '#22c55e55' : '#ef444455'}`,
                  }}
                  title={isActive ? 'Status: Aktif' : 'Status: Tidak Aktif'}
                />
              );
            }}
          />
          <Column field="user_code" header="Kode" sortable headerStyle={{ fontWeight: 'bold' }} className="font-bold text-blue-700" />
          <Column field="fullname" header="Nama Lengkap" sortable headerStyle={{ fontWeight: 'bold' }} className="font-semibold text-gray-800" />
          <Column field="username" header="Username / Email" sortable />
          <Column field="telp" header="No. Telepon" />
          <Column
            field="role"
            header="Role Dashboard"
            sortable
            body={(r: UserRecord) => (
              <Tag
                value={String(r.role || 'USER').toUpperCase()}
                severity={getRoleSeverity(r.role)}
                className="text-xs font-bold px-2 py-0.5"
              />
            )}
          />
          <Column
            field="status"
            header="Status Akun"
            body={(r: UserRecord) => {
              const isActive = String(r.status) === '1' || r.status === 1 || r.status === 'aktif';
              return (
                <Tag
                  value={isActive ? 'AKTIF' : 'TIDAK AKTIF'}
                  severity={isActive ? 'success' : 'danger'}
                  className="text-[10px] font-semibold"
                />
              );
            }}
          />
          <Column
            header="Aksi"
            align="center"
            headerStyle={{ width: '8rem', textAlign: 'center' }}
            body={(r: UserRecord) => (
              <div className="flex align-items-center justify-content-center gap-2">
                <Button
                  icon="pi pi-pencil"
                  outlined
                  severity="success"
                  size="small"
                  className="border-round-md"
                  tooltip="Edit Pengguna"
                  onClick={() => handleOpenEdit(r)}
                />
                <Button
                  icon="pi pi-trash"
                  outlined
                  severity="danger"
                  size="small"
                  className="border-round-md"
                  tooltip="Hapus Pengguna"
                  onClick={() => handleDelete(r)}
                />
              </div>
            )}
          />
        </DataTable>
      </div>

      {/* DIALOG CREATE / EDIT USER */}
      <Dialog
        header={isEdit ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
        visible={showModal}
        style={{ width: '500px' }}
        modal
        onHide={() => setShowModal(false)}
      >
        <div className="flex flex-column gap-3 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Nama Lengkap *</label>
            <InputText
              value={formData.fullname}
              onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
              placeholder="Contoh: dr. Amanda Wijaya"
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Username / Email Login *</label>
            <InputText
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Contoh: dokter.amanda@klinik.com"
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">No. Telepon / WhatsApp *</label>
            <InputText
              value={formData.telp}
              onChange={(e) => setFormData({ ...formData, telp: e.target.value })}
              placeholder="Contoh: 081234567890"
              className="w-full text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Role Dashboard *</label>
            <Dropdown
              value={formData.role}
              options={ROLE_OPTIONS}
              onChange={(e) => setFormData({ ...formData, role: e.value })}
              placeholder="Pilih Role Operasional"
              className="w-full text-sm"
            />
            <span className="text-[11px] text-gray-500 mt-1 block">
              Menentukan tampilan dashboard spesifik (Owner, Dokter, Beautician, Kasir, Warehouse).
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              {isEdit ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Login *'}
            </label>
            <Password
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimal 6 karakter"
              toggleMask
              className="w-full"
              inputClassName="w-full text-sm"
            />
            <span className="text-[11px] text-gray-500 mt-1 block">Minimal 6 karakter untuk keamanan akun.</span>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Status Akun</label>
            <Dropdown
              value={formData.status}
              options={STATUS_OPTIONS}
              onChange={(e) => setFormData({ ...formData, status: e.value })}
              className="w-full text-sm"
            />
          </div>

          <div className="flex justify-content-end gap-2 mt-4 pt-3 border-top-1 surface-border">
            <Button
              label="Batal"
              icon="pi pi-times"
              outlined
              severity="secondary"
              onClick={() => setShowModal(false)}
            />
            <Button
              label={isEdit ? 'Simpan Perubahan' : 'Tambah Pengguna'}
              icon="pi pi-check"
              onClick={handleSubmit}
              loading={formLoading}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}