# GIBRAN2029 — PRD

## Ringkasan
GIBRAN2029 adalah platform creator marketing berbasis performa (pay-per-views) berbahasa Indonesia. Brand membuat campaign dengan rate per 1.000 views; kreator memposting video, submit link, dan dibayar sesuai views yang terverifikasi.

## Keputusan produk
- Login: Google via Firebase Authentication (project `jkweffect`); backend memverifikasi ID token lalu membuat sesi cookie sendiri. Admin = ADMIN_EMAIL
- Views: kreator klaim, brand/admin verifikasi manual
- Pembayaran: Komerce (top up brand via QRIS / Virtual Account), sandbox key di KOMERCE_API_KEY
- Payout: kreator ajukan penarikan (min Rp 50.000), admin menyetujui manual
- Ekstra: streak harian, panel admin, notifikasi in-app

## Arsitektur
**Backend produksi = backend bersama di repo `GIBRAN2029-Mobile-App` (`backend/server.py`, Railway).** Web (Vercel) meneruskan `/api/*` ke sana lewat `frontend/vercel.json`, jadi web dan aplikasi Flutter memakai akun, data, dan endpoint yang sama. Folder `backend/` di repo ini adalah versi lama dan tidak di-deploy; fitur backend baru dibuat di repo mobile.

FastAPI + MongoDB (users, user_sessions, campaigns, submissions, withdrawals, topups, notifications, ledger) + React (Tailwind, shadcn/ui, craco). Operasi saldo atomik via conditional find_one_and_update; setiap pergerakan uang dicatat di ledger.

## Brand & desain
- Nama: **GIBRAN2029**. Logo & favicon: `frontend/src/components/Logo.jsx`, `frontend/public/favicon.svg`
- Sistem desain "Premium Red" yang sama dengan aplikasi Flutter: merah #C8102E + gradasi, kartu putih membulat (12–16px), bayangan lembut
- Detail lengkap: `design_guidelines.json`; token warna: `frontend/src/index.css`

## Sudah diimplementasi
- Landing (hero dua kolom + kalkulator cuan, ticker payout, cara kerja, trending, FAQ, CTA), /bounty (header band, sidebar kategori, baris campaign, search, exclusive), /cara-kerja, /untuk-brand
- Onboarding pilih peran (kreator/brand)
- Dashboard kreator: statistik, streak, submission + filter status, klaim views, penarikan, profil
- Dashboard brand: top up Komerce (QRIS / VA), buat campaign (budget dipotong), jeda/tutup + refund, review konten, verifikasi views & bayar
- Panel admin: statistik, verifikasi submission, setujui/tolak penarikan, kelola campaign, user + kredit brand manual
- Notifikasi; callback Komerce (cek signature + konfirmasi ulang status)
- Keamanan: tidak ada over-payout setelah campaign ditutup, normalisasi URL untuk dedup, submission terbuka otomatis ditolak saat campaign ditutup
- Rebranding dari tampilan lama ke GIBRAN2029; semua ketergantungan Emergent (auth, overlay, visual-edits, script) dan PostHog dihapus
- Navigasi Beranda · Jelajah · Dompet · Profil (tab bar bawah di HP), halaman login /masuk khusus Google
- Login Google via Firebase (`/api/auth/firebase`), halaman "Masuk dulu" untuk halaman yang butuh login

## Admin Pusat (Owner Control Center)
- Login khusus Owner di `/admin/login`: nomor WhatsApp + OTP 6 digit yang dikirim lewat WhatsApp (Fonnte). Backend `POST /api/admin/request-otp` → `POST /api/admin/verify-otp`, hanya untuk nomor di env `OWNER_PHONES` (pisahkan dengan koma); token Fonnte di env `FONNTE_TOKEN`.
- Admin lama via Google (`ADMIN_EMAIL`) tetap bisa moderasi (verifikasi konten, penarikan), tapi aksi Owner (buat/edit/hapus campaign brand mana pun, edit saldo, verifikasi & tangguhkan akun, log aktivitas) hanya untuk sesi Owner.
- Sinkron real-time: `GET /api/sync` naik setiap ada perubahan; web (`lib/useSync.js`) dan Flutter (`SyncWatcher`) mengecek tiap 15 detik dan saat aplikasi dibuka lagi.
- Brand bisa menarik saldo brand; penolakan mengembalikan saldo ke akun yang benar.

## Backlog
- P0: Tambahkan domain produksi ke Firebase Authentication > Authorized domains sebelum go-live
- P1: Ambil views otomatis via API TikTok/YouTube; uji callback Komerce live
- P1: Sistem undangan campaign exclusive
- P2: Poin/reward, leaderboard, upload gambar campaign (object storage), notifikasi email
