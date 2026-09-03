'use client';

import { useFormik } from 'formik';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { showError, showSuccess, showWarning } from '../../../../lib/tools/generalTools';
import { signIn } from 'next-auth/react';
import { Toast } from 'primereact/toast';
import axios from 'axios';
import { LoginFormik, LoginState } from './component/interfaces';

export default function LoginPage() {
  const router = useRouter();
  const toast = useRef<Toast>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<LoginState>({
    load: false,
    googleLoad: false,
  });

  const formik = useFormik<LoginFormik>({
    initialValues: {
      username: '',
      password: '',
      remember_me: true,
    },
    validate: (data: LoginFormik) => {
      const errors = {} as Record<keyof LoginFormik, string>;
      if (!data.username) {
        errors.username = 'Username wajib diisi';
      }
      if (!data.password) {
        errors.password = 'Password wajib diisi';
      }
      return errors;
    },
    onSubmit: (data) => {
      handleSubmit(data);
    },
  });

  const handleSubmit = async (data: LoginFormik) => {
    setState((p) => ({ ...p, load: true }));
    try {
      const { data: vaLogin } = await axios.post('/api/auth/login', {
        username: data.username,
        password: data.password,
        remember_me: data.remember_me ? '1' : '0',
      });

      const nAuth = await signIn('credentials', {
        userData: JSON.stringify(vaLogin.data),
        redirect: false,
      });

      if (nAuth?.error) {
        showError(toast, 'Username atau kata sandi tidak sesuai.');
      } else {
        showSuccess(toast, 'Login Berhasil! Mengalihkan ke Dashboard...');
        setTimeout(() => router.push('/dashboard'), 400);
      }
    } catch (error: any) {
      const e = error?.response?.data || error;
      const errorMsg = (e?.message && e.message !== 'Error')
        ? e.message
        : 'Gagal terhubung ke server. Periksa koneksi backend atau kredensial Anda.';
      showError(toast, errorMsg);
    } finally {
      setState((p) => ({ ...p, load: false }));
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    showWarning(
      toast,
      'Lupa kata sandi? Silakan hubungi Administrator IT atau Super Admin klinik untuk mereset kata sandi akun Anda.'
    );
  };

  return (
    <>
      <Toast ref={toast} position="top-right" />

      {/* Google Fonts & Material Symbols */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,600&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        rel="stylesheet"
      />

      <style>{`
        /* Reset & Fixed Natural Canvas (No Scroll) */
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body {
          width: 100%;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          background-color: #ecfdf5;
        }

        .kk-page-wrapper {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: radial-gradient(120% 120% at 50% 10%, #f0fdf4 0%, #d1fae5 100%);
          color: #0d1f18;
          width: 100vw;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 24px;
          position: relative;
        }

        .font-serif-display {
          font-family: 'Playfair Display', Georgia, serif;
        }

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined', sans-serif;
          font-weight: normal;
          font-style: normal;
          font-size: 18px;
          line-height: 1;
          letter-spacing: normal;
          text-transform: none;
          display: inline-block;
          white-space: nowrap;
          word-wrap: normal;
          direction: ltr;
          -webkit-font-smoothing: antialiased;
        }

        .material-symbols-filled {
          font-variation-settings: 'FILL' 1;
        }

        /* ── MAIN CONTAINER & GRID ── */
        .kk-container {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
        }

        .kk-grid {
          display: grid;
          grid-template-columns: 1.34fr 1fr;
          gap: 24px;
          align-items: stretch;
          max-height: 94vh;
        }

        @media (max-width: 960px) {
          html, body, .kk-page-wrapper {
            height: auto;
            max-height: none;
            overflow-y: auto;
          }
          .kk-grid {
            grid-template-columns: 1fr;
            max-height: none;
          }
        }

        /* ── LEFT SHOWCASE PANEL (Aesthetic Botanicals) ── */
        .kk-left-card {
          background: linear-gradient(165deg, #064e3b 0%, #065f46 55%, #047857 100%);
          border-radius: 26px;
          border: 1px solid rgba(52, 211, 153, 0.25);
          box-shadow: 0 20px 48px rgba(6, 78, 59, 0.28);
          position: relative;
          overflow: hidden;
          padding: 26px 30px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .kk-glow-top {
          position: absolute;
          right: -60px;
          top: -60px;
          width: 250px;
          height: 250px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.2);
          filter: blur(50px);
          pointer-events: none;
        }

        .kk-glow-bottom {
          position: absolute;
          left: -60px;
          bottom: -30px;
          width: 230px;
          height: 230px;
          border-radius: 50%;
          background: rgba(5, 150, 105, 0.25);
          filter: blur(50px);
          pointer-events: none;
        }

        .kk-dot-pattern {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0.16;
          pointer-events: none;
        }

        .kk-tag-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 11px;
          background: rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          margin-bottom: 8px;
        }

        .kk-pulsing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 6px #34d399;
          animation: pulseAnim 2s infinite ease-in-out;
        }

        @keyframes pulseAnim {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.85); opacity: 0.45; }
        }

        .kk-tag-text {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.2px;
          color: #a7f3d0;
          text-transform: uppercase;
        }

        .kk-headline {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(23px, 2.3vw, 30px);
          font-weight: 700;
          color: #ffffff;
          line-height: 1.2;
          margin: 0 0 12px 0;
          letter-spacing: -0.3px;
        }

        .kk-headline-highlight {
          color: #6ee7b7;
          text-decoration: underline;
          text-decoration-style: wavy;
          text-decoration-color: rgba(110, 231, 183, 0.45);
          text-underline-offset: 6px;
        }

        /* Floating Card Stack */
        .kk-floating-stack {
          position: relative;
          z-index: 10;
          margin: 4px 0 10px 0;
        }

        .kk-badge-verified-wrap {
          display: flex;
          justify-content: flex-end;
          margin-bottom: -11px;
          margin-right: 14px;
          position: relative;
          z-index: 20;
        }

        .kk-badge-verified {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 12px;
          background: #ffffff;
          color: #065f46;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
          border: 1px solid #d1fae5;
        }

        .kk-card-katalog {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-radius: 16px;
          padding: 13px 16px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
          border: 1px solid rgba(255, 255, 255, 0.6);
        }

        .kk-katalog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }

        .kk-katalog-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .kk-katalog-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: #d1fae5;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #059669;
        }

        .kk-katalog-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #0d1f18;
          margin: 0;
          line-height: 1.15;
        }

        .kk-katalog-desc {
          font-size: 10.5px;
          color: #404944;
          margin: 1px 0 0 0;
        }

        .kk-badge-reservasi {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          border-radius: 999px;
        }

        .kk-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 11px;
          border-radius: 10px;
          background: #f0fdf4;
          border: 1px solid #d1fae5;
          margin-bottom: 6px;
        }

        .kk-item-row:last-child {
          margin-bottom: 0;
        }

        .kk-item-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .kk-item-icon-box {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kk-item-title {
          font-size: 12px;
          font-weight: 600;
          color: #0d1f18;
          margin: 0;
        }

        .kk-item-subtitle {
          font-size: 10px;
          color: #404944;
          margin: 0;
        }

        .kk-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 700;
          background: #d1fae5;
          color: #065f46;
        }

        .kk-status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
        }

        /* 2 Subcards */
        .kk-subcards-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 8px;
        }

        .kk-subcard {
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .kk-subcard-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: #ecfdf5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .kk-subcard-tag {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          display: block;
        }

        .kk-subcard-title {
          font-size: 11px;
          font-weight: 600;
          color: #0d1f18;
          margin-top: 1px;
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Bottom Narrative Banner */
        .kk-narrative-banner {
          background: rgba(0, 0, 0, 0.32);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 10px 14px;
          color: #ffffff;
          position: relative;
          z-index: 10;
        }

        .kk-banner-top {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 7px;
          margin-bottom: 7px;
        }

        .kk-shield-icon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: rgba(16, 185, 129, 0.2);
          border: 1px solid rgba(16, 185, 129, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a7f3d0;
          flex-shrink: 0;
        }

        .kk-banner-heading-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .kk-banner-heading {
          font-size: 12.5px;
          font-weight: 700;
          color: #ffffff;
        }

        .kk-spesialis-badge {
          font-size: 9px;
          font-weight: 600;
          background: rgba(16, 185, 129, 0.2);
          color: #a7f3d0;
          padding: 1.5px 6px;
          border-radius: 999px;
          border: 1px solid rgba(16, 185, 129, 0.35);
        }

        .kk-banner-sub {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.82);
          margin: 1px 0 0 0;
        }

        .kk-banner-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 6px;
        }

        .kk-banner-mini-card {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 6px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .kk-mini-card-title {
          font-size: 9.5px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.15;
          display: block;
        }

        .kk-mini-card-sub {
          font-size: 8.5px;
          color: rgba(255, 255, 255, 0.7);
          display: block;
          margin-top: 1px;
        }

        /* ── RIGHT AUTHENTICATION PANEL (Clean Natural Form) ── */
        .kk-right-card {
          background: #ffffff;
          border-radius: 26px;
          padding: 34px 34px;
          box-shadow: 0 16px 40px rgba(6, 78, 59, 0.08);
          border: 1px solid rgba(167, 243, 208, 0.6);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .kk-auth-brand-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 16px;
        }

        .kk-auth-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 5px 16px rgba(16, 185, 129, 0.25);
          margin-bottom: 9px;
        }

        .kk-auth-portal-title {
          font-size: 18px;
          font-weight: 700;
          color: #10b981;
          letter-spacing: -0.2px;
        }

        .kk-auth-portal-sub {
          font-size: 10.5px;
          font-weight: 700;
          color: #404944;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .kk-auth-welcome {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          color: #0d1f18;
          text-align: center;
          margin: 0 0 3px 0;
        }

        .kk-auth-welcome-sub {
          font-size: 12.5px;
          color: #404944;
          text-align: center;
          margin: 0 0 18px 0;
        }

        .kk-form-group {
          margin-bottom: 14px;
          text-align: left;
        }

        .kk-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #0d1f18;
          margin-bottom: 5px;
        }

        .kk-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .kk-input-icon {
          position: absolute;
          left: 13px;
          color: #10b981;
          pointer-events: none;
          font-size: 19px;
        }

        .kk-input {
          width: 100%;
          height: 44px;
          padding-left: 40px;
          padding-right: 14px;
          background: #f0fdf4;
          border: 1px solid #d1fae5;
          border-radius: 11px;
          font-size: 13.5px;
          font-family: inherit;
          color: #0d1f18;
          outline: none;
          transition: all 0.2s ease;
        }

        .kk-input.has-eye {
          padding-right: 40px;
        }

        .kk-input:focus {
          background: #ffffff;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.18);
        }

        .kk-input::placeholder {
          color: #707973;
        }

        .kk-eye-btn {
          position: absolute;
          right: 9px;
          background: none;
          border: none;
          cursor: pointer;
          color: #707973;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: color 0.2s;
        }

        .kk-eye-btn:hover {
          color: #10b981;
        }

        .kk-error-msg {
          font-size: 11.5px;
          color: #ba1a1a;
          margin-top: 4px;
          font-weight: 500;
        }

        .kk-form-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 10px 0 18px 0;
        }

        .kk-remember-label {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 12.5px;
          color: #0d1f18;
          user-select: none;
        }

        .kk-remember-checkbox {
          width: 15px;
          height: 15px;
          accent-color: #10b981;
          cursor: pointer;
        }

        .kk-forgot-link {
          font-size: 12px;
          font-weight: 600;
          color: #059669;
          text-decoration: none;
          cursor: pointer;
        }

        .kk-forgot-link:hover {
          color: #047857;
          text-decoration: underline;
        }

        .kk-submit-btn {
          width: 100%;
          height: 44px;
          border-radius: 999px;
          background: #10b981;
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 700;
          font-family: inherit;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
          transition: all 0.2s ease;
        }

        .kk-submit-btn:hover {
          background: #059669;
          box-shadow: 0 6px 18px rgba(16, 185, 129, 0.35);
          transform: translateY(-1px);
        }

        .kk-submit-btn:active {
          transform: translateY(0);
        }

        .kk-submit-btn:disabled {
          opacity: 0.75;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>

      <div className="kk-page-wrapper">
        <div className="kk-container">
          <div className="kk-grid">
            {/* ── LEFT COLUMN: Showcase & Stacked Floating Cards ── */}
            <div className="kk-left-card">
              {/* Background Ambient Glows */}
              <div className="kk-glow-top"></div>
              <div className="kk-glow-bottom"></div>

              {/* Dot Matrix SVG Pattern */}
              <svg className="kk-dot-pattern" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="kk-dots-v3" width="22" height="22" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1.2" fill="#a7f3d0"></circle>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#kk-dots-v3)"></rect>
              </svg>

              {/* Top Brand Tag & Headline */}
              <div style={{ position: 'relative', zIndex: 10 }}>
                <div className="kk-tag-pill">
                  <span className="kk-pulsing-dot"></span>
                  <span className="kk-tag-text">KLINIK KECANTIKAN</span>
                </div>

                <h1 className="kk-headline">
                  Eksplorasi Perawatan <br />
                  <span className="kk-headline-highlight">Estetika Terbaik</span>
                </h1>
              </div>

              {/* Dynamic Showcase Floating Stack */}
              <div className="kk-floating-stack">
                {/* Floating Top Right Badge */}
                <div className="kk-badge-verified-wrap">
                  <div className="kk-badge-verified">
                    <span className="material-symbols-outlined material-symbols-filled" style={{ color: '#047857', fontSize: '15px' }}>
                      verified
                    </span>
                    <span>Terverifikasi</span>
                    <span style={{ color: '#bfc9c2' }}>|</span>
                    <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <span>Lihat Semua</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>arrow_forward</span>
                    </span>
                  </div>
                </div>

                {/* Main Floating Card: Katalog Perawatan */}
                <div className="kk-card-katalog">
                  <div className="kk-katalog-header">
                    <div className="kk-katalog-left">
                      <div className="kk-katalog-icon">
                        <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>spa</span>
                      </div>
                      <div>
                        <h2 className="kk-katalog-title">Katalog Perawatan</h2>
                        <p className="kk-katalog-desc">Solusi kecantikan &amp; estetika terpadu</p>
                      </div>
                    </div>
                    <span className="kk-badge-reservasi">Siap Reservasi</span>
                  </div>

                  <div>
                    {/* Item 1: Facial */}
                    <div className="kk-item-row">
                      <div className="kk-item-left">
                        <div className="kk-item-icon-box" style={{ background: '#d1fae5', color: '#047857' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>face</span>
                        </div>
                        <div>
                          <h3 className="kk-item-title">Facial &amp; Skin Rejuvenation</h3>
                          <p className="kk-item-subtitle">Dermatology Care</p>
                        </div>
                      </div>
                      <span className="kk-status-pill">
                        <span className="kk-status-dot"></span>
                        Aktif
                      </span>
                    </div>

                    {/* Item 2: Laser */}
                    <div className="kk-item-row">
                      <div className="kk-item-left">
                        <div className="kk-item-icon-box" style={{ background: '#fedeb2', color: '#4e3a1b' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>auto_awesome</span>
                        </div>
                        <div>
                          <h3 className="kk-item-title">Laser &amp; Anti-Aging</h3>
                          <p className="kk-item-subtitle">Teknologi Medis Modern</p>
                        </div>
                      </div>
                      <span className="kk-status-pill">
                        <span className="kk-status-dot"></span>
                        Aktif
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subcards: Konsultasi & Resep */}
                <div className="kk-subcards-grid">
                  <div className="kk-subcard">
                    <div className="kk-subcard-icon">
                      <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: '18px' }}>
                        medical_services
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span className="kk-subcard-tag" style={{ color: '#059669' }}>KONSULTASI DOKTER</span>
                      <span className="kk-subcard-title">Dokter Spesialis</span>
                    </div>
                  </div>

                  <div className="kk-subcard">
                    <div className="kk-subcard-icon">
                      <span className="material-symbols-outlined" style={{ color: '#4e3a1b', fontSize: '18px' }}>
                        prescriptions
                      </span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span className="kk-subcard-tag" style={{ color: '#4e3a1b' }}>RESEP &amp; PRODUK</span>
                      <span className="kk-subcard-title">BPOM &amp; Halal Certified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Narrative Banner */}
              <div className="kk-narrative-banner">
                <div className="kk-banner-top">
                  <div className="kk-shield-icon">
                    <span className="material-symbols-outlined material-symbols-filled" style={{ fontSize: '18px' }}>
                      verified_user
                    </span>
                  </div>
                  <div>
                    <div className="kk-banner-heading-wrap">
                      <span className="kk-banner-heading">10.000+ Pasien Terpercaya</span>
                      <span className="kk-spesialis-badge">Spesialis Sp.KK/Sp.DVE</span>
                    </div>
                    <p className="kk-banner-sub">
                      Ditangani dokter spesialis berlisensi resmi &amp; teknologi bersertifikasi FDA
                    </p>
                  </div>
                </div>

                <div className="kk-banner-grid">
                  <div className="kk-banner-mini-card">
                    <span className="material-symbols-outlined" style={{ color: '#a7f3d0', fontSize: '16px' }}>
                      clinical_notes
                    </span>
                    <div>
                      <span className="kk-mini-card-title">100% Medis</span>
                      <span className="kk-mini-card-sub">Dokter Berlisensi</span>
                    </div>
                  </div>

                  <div className="kk-banner-mini-card">
                    <span className="material-symbols-outlined" style={{ color: '#a7f3d0', fontSize: '16px' }}>
                      biomedical
                    </span>
                    <div>
                      <span className="kk-mini-card-title">Alat Canggih</span>
                      <span className="kk-mini-card-sub">FDA &amp; CE Approved</span>
                    </div>
                  </div>

                  <div className="kk-banner-mini-card">
                    <span className="material-symbols-outlined" style={{ color: '#a7f3d0', fontSize: '16px' }}>
                      sanitizer
                    </span>
                    <div>
                      <span className="kk-mini-card-title">Higienis &amp; Steril</span>
                      <span className="kk-mini-card-sub">Standar Medis RS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: Authentication Form (Clean & Focused) ── */}
            <div className="kk-right-card">
              {/* Brand Center */}
              <div className="kk-auth-brand-center">
                <div className="kk-auth-icon-box">
                  <span className="material-symbols-outlined" style={{ fontSize: '26px' }}>spa</span>
                </div>
                <span className="kk-auth-portal-title">Klinik Kecantikan</span>
                <span className="kk-auth-portal-sub">Aesthetic &amp; Wellness Portal</span>
              </div>

              {/* Heading */}
              <h2 className="kk-auth-welcome">Selamat Datang</h2>
              <p className="kk-auth-welcome-sub">Silakan masuk ke akun Anda</p>

              {/* Form */}
              <form onSubmit={formik.handleSubmit}>
                {/* Email / Username */}
                <div className="kk-form-group">
                  <label className="kk-label" htmlFor="username-input">
                    Email / Username
                  </label>
                  <div className="kk-input-wrap">
                    <span className="material-symbols-outlined kk-input-icon">person</span>
                    <input
                      id="username-input"
                      name="username"
                      type="text"
                      required
                      value={formik.values.username}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="Masukkan username Anda"
                      className="kk-input"
                    />
                  </div>
                  {formik.touched.username && formik.errors.username && (
                    <div className="kk-error-msg">{formik.errors.username}</div>
                  )}
                </div>

                {/* Password */}
                <div className="kk-form-group">
                  <label className="kk-label" htmlFor="password-input">
                    Password
                  </label>
                  <div className="kk-input-wrap">
                    <span className="material-symbols-outlined kk-input-icon">lock</span>
                    <input
                      id="password-input"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formik.values.password}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                      placeholder="Masukkan password Anda"
                      className="kk-input has-eye"
                    />
                    <button
                      type="button"
                      aria-label="Tampilkan atau sembunyikan kata sandi"
                      onClick={() => setShowPassword(!showPassword)}
                      className="kk-eye-btn"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {formik.touched.password && formik.errors.password && (
                    <div className="kk-error-msg">{formik.errors.password}</div>
                  )}
                </div>

                {/* Options: Remember me & Forgot Password */}
                <div className="kk-form-options">
                  <label className="kk-remember-label">
                    <input
                      type="checkbox"
                      name="remember_me"
                      checked={Boolean(formik.values.remember_me)}
                      onChange={formik.handleChange}
                      className="kk-remember-checkbox"
                    />
                    <span>Ingat Saya</span>
                  </label>

                  <a href="#" onClick={handleForgotPassword} className="kk-forgot-link">
                    Lupa password?
                  </a>
                </div>

                {/* Submit Button */}
                <button type="submit" disabled={state.load} className="kk-submit-btn">
                  {state.load ? (
                    <>
                      <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite', fontSize: '16px' }}>
                        progress_activity
                      </span>
                      <span>Memproses Masuk...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}