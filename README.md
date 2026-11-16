# GIBRAN2029

Wadah resmi member & relawan GIBRAN2029 — *Bergerak Bersama, Menuju Indonesia Maju 2029.*
Pendaftaran Member/Relawan, KTA digital, panel admin verifikasi, dan misi konten kreator untuk relawan.

- `frontend/` — React (CRA + craco), Tailwind, shadcn/ui, Firebase Auth (Google). Di-deploy ke Vercel (Root Directory: `frontend`).
- Backend: repo `jkwEffect-Mobile-App/backend` (Railway). Web memanggilnya lewat proxy `/api` di `frontend/vercel.json`.

## Menjalankan lokal
```bash
cp frontend/.env.example frontend/.env
cd frontend && yarn install && yarn start
```
Jalankan backend dari repo `jkwEffect-Mobile-App` (`backend/`), lalu isi `REACT_APP_BACKEND_URL=http://localhost:8001` di `frontend/.env`.

Halaman penting: `/daftar/anggota` (Member), `/daftar/relawan`, `/kta` (KTA digital), `/admin` (tab Pendaftaran).
Admin Pusat: `/admin/login` (OTP WhatsApp via Fonnte, khusus nomor Owner). Detail login: `auth_testing.md`. Desain: `design_guidelines.json`.
