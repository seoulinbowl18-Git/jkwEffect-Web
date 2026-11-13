# jkwEffect

Platform creator marketing berbasis performa: brand bayar per views, kreator dibayar per views.

- `frontend/` — React (CRA + craco), Tailwind, shadcn/ui, Firebase Auth (Google)
- `backend/` — versi lama (tidak di-deploy). Backend produksi ada di repo `OurBuzzer-Mobile-App/backend` (Railway); web memanggilnya lewat proxy `/api` di `frontend/vercel.json`

## Menjalankan lokal
```bash
cp backend/.env.example backend/.env      # isi MONGO_URL, ADMIN_EMAIL, dst.
cd backend && pip install -r requirements.txt && uvicorn server:app --reload --port 8001
```
```bash
cp frontend/.env.example frontend/.env
cd frontend && yarn install && yarn start
```

Admin Pusat: `/admin/login` (OTP WhatsApp via Fonnte, khusus nomor Owner). Detail login: `auth_testing.md`. Desain: `design_guidelines.json`. Produk: `memory/PRD.md`.
