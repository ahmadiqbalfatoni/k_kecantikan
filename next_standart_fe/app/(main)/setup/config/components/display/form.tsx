'use client'

import { Dialog } from "primereact/dialog";
import { FormProps, initValue } from "../interfaces"
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { apiEndpointCreate, apiEndpointGet, } from "../endpoints";
import postData from "@/lib/axios/postData";
import { showError, showSuccess } from "@/lib/tools/generalTools";
import { useEffect, useRef } from "react";
import formUpload from "@/lib/axios/formData";
import { Toolbar } from "primereact/toolbar";
import { ProgressBar } from "primereact/progressbar";
import { InputTextarea } from "primereact/inputtextarea";
import { Divider } from "primereact/divider";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";

const Form = ({
    state,
    setState,
    formik,
    toast,
    getData
}: FormProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchComponentData = async () => {
        setState((p) => ({ ...p, load: true }));

        try {


        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(toast, e?.message || "Terjadi Kesalahan");
        } finally {
            setState((p) => ({ ...p, load: false }));
        }
    }

    const handleSave = async (input: initValue) => {
        setState((p) => ({ ...p, load: true }));

        try {
            const oHeaders = {
                "X-Level": "1",
            };

            const formData = new FormData();

            const { msLogoPerusahaan, ...rest } = input;

            const key = Object.keys(rest);
            const keterangan = Object.values(rest);

            formData.append("kode", JSON.stringify(key));
            formData.append("keterangan", JSON.stringify(keterangan));

            if (msLogoPerusahaan) {
                formData.append("msLogoPerusahaan", msLogoPerusahaan);
            }

            const vaData = await formUpload(
                apiEndpointCreate,
                formData,
                oHeaders
            );

            const res = vaData.data;

            showSuccess(
                toast,
                res.data?.message || "Data saved successfully"
            );

            formik.resetForm();
            setState((p) => ({
                ...p,
                add: false,
                edit: false,
                approval: false,
                delete: false,
            }));

            await getData(apiEndpointGet);

        } catch (error: any) {
            const e = error?.response?.data || error;
            showError(
                toast,
                e?.message || "An unexpected error occurred"
            );
        } finally {
            setState((p) => ({ ...p, load: false, submittedData: null }));
        }
    };

    const onFileSelect = (event: any) => {
        const file = event?.target?.files[0];
        if (!file) return;

        if (file.size > 1024 * 1024) { // 1MB
            formik.setFieldValue("msLogoPerusahaan", null);
            return showError(toast, "File tidak boleh lebih dari 1MB.");
        }

        // langsung simpan file object ke formik
        formik.setFieldValue("msLogoPerusahaan", file);
        setState(p => ({ ...p, imgPrev: URL.createObjectURL(file) }))
    };

    const konfigurasiFooter = (
        <>
            <Button
                type="submit"
                label="Save"
                icon="pi pi-check"
                className="p-button-text"
                onClick={() => formik.handleSubmit()}
            />
        </>
    );



    const isFormFieldInvalid = (name: keyof initValue) => !!(formik?.touched[name] && formik?.errors[name]);

    const getFormErrorMessage = (name: keyof initValue) => {
        return isFormFieldInvalid(name) ? <small className="p-error">{formik?.errors[name]}</small> : <small className="p-error">&nbsp;</small>;
    };
    useEffect(() => {
        return () => {
            if (state.imgPrev) URL.revokeObjectURL(state.imgPrev);
        };
    }, [state.imgPrev]);

    useEffect(() => {
        if (state.submittedData) {
            handleSave(state.submittedData)
        }
    }, [state.submittedData])

    useEffect(() => {
        getData(apiEndpointGet);
    }, []);

    return <>
        <div className="grid justify-content-center">
            <div className="col-12 xl:col-12">
                <div className="card border-none shadow-3 p-0 overflow-hidden">
                    {/* Header / Banner Area */}
                    <div className="bg-primary-reverse p-4 flex align-items-center gap-3 border-bottom-1 surface-border">
                        <i className="pi pi-building text-primary" style={{ fontSize: '2rem' }}></i>
                        <div>
                            <h3 className="m-0 font-bold text-900">Profil Perusahaan</h3>
                            <p className="m-0 text-600">Kelola informasi dasar dan identitas visual instansi Anda</p>
                        </div>
                    </div>

                    {state.load && (
                        <ProgressBar mode="indeterminate" style={{ height: "4px" }} />
                    )}

                    <div className="grid p-4 md:p-6">
                        {/* Bagian Kiri: Profile Identity Card */}
                        <div className="col-12 lg:col-4">
                            <div className="flex flex-column align-items-center p-4 surface-50 border-round-xl border-1 surface-border">
                                <span className="text-900 font-bold mb-4">Logo Instansi</span>

                                <div className="relative group">
                                    <div className="p-2 border-circle border-2 border-primary border-dashed">
                                        <img
                                            src={state.imgPrev ? state.imgPrev : '/layout/images/profile.png'}
                                            alt="logo_perusahaan"
                                            className="border-circle shadow-4 w-12rem h-12rem"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </div>
                                    <Button
                                        icon="pi pi-camera"
                                        className="p-button-rounded p-button-primary absolute shadow-5"
                                        style={{ bottom: '10px', right: '10px', width: '3rem', height: '3rem' }}
                                        onClick={() => fileInputRef.current?.click()}
                                        tooltip="Ubah Logo"
                                        tooltipOptions={{ position: 'bottom' }}
                                    />
                                </div>

                                <div className="text-center mt-4">
                                    <p className="text-sm text-600 line-height-3">
                                        Format: JPG, PNG atau WebP.<br />
                                        Maksimal ukuran file 2MB.
                                    </p>
                                </div>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={onFileSelect}
                                />
                            </div>
                        </div>

                        {/* Bagian Kanan: Detailed Form */}
                        <div className="col-12 lg:col-8 lg:pl-5">
                            <div className="grid formgrid p-fluid">

                                {/* Section 1: Identitas Utama */}
                                <div className="col-12 mb-2">
                                    <span className="text-primary font-bold uppercase text-xs tracking-wider">Identitas Utama</span>
                                    <Divider className="mt-2 mb-4" />
                                </div>

                                <div className="field col-12 mb-4">
                                    <label htmlFor="msNamaPerusahaan" className="font-semibold mb-2">Nama Resmi Perusahaan</label>
                                    {/* Pembaruan IconField Pertama */}
                                    <IconField iconPosition="left">
                                        <InputIcon className="pi pi-briefcase" />
                                        <InputText
                                            id="msNamaPerusahaan"
                                            name="msNamaPerusahaan"
                                            value={formik.values.msNamaPerusahaan}
                                            onChange={(e) => formik.setFieldValue('msNamaPerusahaan', e.target.value)}
                                            className={isFormFieldInvalid('msNamaPerusahaan') ? 'p-invalid p-inputtext-lg' : 'p-inputtext-lg'}
                                            placeholder="Contoh: PT. Maju Jaya Sejahtera"
                                        />
                                    </IconField>
                                    {isFormFieldInvalid('msNamaPerusahaan') && getFormErrorMessage('msNamaPerusahaan')}
                                </div>

                                <div className="field col-12 mb-4">
                                    <label htmlFor="msNamaPimpinan" className="font-semibold mb-2">Nama Pimpinan / Direktur</label>
                                    {/* Pembaruan IconField Kedua */}
                                    <IconField iconPosition="left">
                                        <InputIcon className="pi pi-user-edit" />
                                        <InputText
                                            id="msNamaPimpinan"
                                            value={formik.values.msNamaPimpinan}
                                            onChange={(e) => formik.setFieldValue('msNamaPimpinan', e.target.value)}
                                            className={isFormFieldInvalid('msNamaPimpinan') ? 'p-invalid' : ''}
                                            placeholder="Nama Lengkap beserta gelar"
                                        />
                                    </IconField>
                                    {isFormFieldInvalid('msNamaPimpinan') && getFormErrorMessage('msNamaPimpinan')}
                                </div>

                                {/* Section 2: Kontak & Lokasi */}
                                <div className="col-12 mt-3 mb-2">
                                    <span className="text-primary font-bold uppercase text-xs tracking-wider">Kontak & Lokasi</span>
                                    <Divider className="mt-2 mb-4" />
                                </div>

                                <div className="field col-12 mb-4">
                                    <label htmlFor="msAlamatPerusahaan" className="font-semibold mb-2">Alamat Lengkap Kantor</label>
                                    <InputTextarea
                                        id="msAlamatPerusahaan"
                                        autoResize
                                        value={formik.values.msAlamatPerusahaan}
                                        onChange={(e) => formik.setFieldValue('msAlamatPerusahaan', e.target.value)}
                                        rows={3}
                                        className={isFormFieldInvalid('msAlamatPerusahaan') ? 'p-invalid' : ''}
                                        placeholder="Jalan, No. Bangunan, RT/RW..."
                                    />
                                    {isFormFieldInvalid('msAlamatPerusahaan') && getFormErrorMessage('msAlamatPerusahaan')}
                                </div>

                                <div className="field col-12 md:col-6 mb-4">
                                    <label htmlFor="msKotaPerusahaan" className="font-semibold mb-2">Kota / Kabupaten</label>
                                    {/* Pembaruan IconField Ketiga */}
                                    <IconField iconPosition="left">
                                        <InputIcon className="pi pi-map-marker" />
                                        <InputText
                                            id="msKotaPerusahaan"
                                            value={formik.values.msKotaPerusahaan}
                                            onChange={(e) => formik.setFieldValue('msKotaPerusahaan', e.target.value)}
                                            className={isFormFieldInvalid('msKotaPerusahaan') ? 'p-invalid' : ''}
                                        />
                                    </IconField>
                                    {isFormFieldInvalid('msKotaPerusahaan') && getFormErrorMessage('msKotaPerusahaan')}
                                </div>

                                <div className="field col-12 md:col-6 mb-4">
                                    <label htmlFor="msTeleponPerusahaan" className="font-semibold mb-2">Nomor Telepon</label>
                                    {/* Catatan: p-inputgroup tetap valid digunakan di v10 untuk menyatukan komponen */}
                                    <div className="p-inputgroup">
                                        <span className="p-inputgroup-addon bg-white">
                                            <i className="pi pi-phone text-primary"></i>
                                        </span>
                                        <InputText
                                            id="msTeleponPerusahaan"
                                            value={formik.values.msTeleponPerusahaan}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^0-9]/g, '');
                                                formik.setFieldValue('msTeleponPerusahaan', value);
                                            }}
                                            placeholder="Contoh: 021xxxxxxx"
                                            className={isFormFieldInvalid('msTeleponPerusahaan') ? 'p-invalid' : ''}
                                        />
                                    </div>
                                    {isFormFieldInvalid('msTeleponPerusahaan') && getFormErrorMessage('msTeleponPerusahaan')}
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 flex justify-content-end border-top-1 surface-border">
                        <div className="flex gap-2">
                            {konfigurasiFooter}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </>

}

export default Form