import axios from "axios";

// Empty REACT_APP_BACKEND_URL = same origin: on Vercel, /api/* is proxied to the backend (see vercel.json),
// so the session cookie is first-party.
export const API = `${process.env.REACT_APP_BACKEND_URL || ""}/api`;
export const api = axios.create({ baseURL: API, withCredentials: true });

export const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
export const num = (n) => Number(n || 0).toLocaleString("id-ID");
export const errMsg = (e) => {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(", ");
  return d || "Terjadi kesalahan";
};
export const fmtDate = (s) =>
  new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export const PLATFORMS = {
  tiktok: "TikTok",
  instagram: "Instagram",
  threads: "Threads",
  youtube: "YouTube",
  facebook: "Facebook",
};
export const CATEGORIES = ["Produk", "Beauty", "Lifestyle", "F&B", "Edukasi", "Hiburan", "Fashion", "Tech"];
// Campaign gerakan Gibran for 2029 (dibuat Admin Pusat) — tanpa brand, rate, budget & minimal views.
export const GERAKAN_CATEGORIES = ["Agenda", "Sebar Narasi", "Aksi Sosial", "Penggalangan Dukungan"];
export const TARGET_AKSI = { share: "Share", forward: "Forward", komentar: "Komentar", kehadiran: "Kehadiran Acara" };
export const isAksi = (c) => c?.kind === "aksi";

export const STATUS = {
  "menunggu verifikasi": { label: "Menunggu verifikasi", cls: "bg-amber-100 text-amber-800" },
  diterima: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800" },
  direview: { label: "Direview", cls: "bg-amber-100 text-amber-800" },
  menunggu_views: { label: "Siap diklaim", cls: "bg-sky-100 text-sky-800" },
  diproses: { label: "Diproses", cls: "bg-primary/10 text-primary" },
  verifying: { label: "Diproses", cls: "bg-primary/10 text-primary" },
  disetujui: { label: "Disetujui", cls: "bg-emerald-100 text-emerald-800" },
  ditolak: { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  pending: { label: "Menunggu bayar", cls: "bg-amber-100 text-amber-800" },
  paid: { label: "Lunas", cls: "bg-emerald-100 text-emerald-800" },
  expired: { label: "Kadaluarsa", cls: "bg-secondary text-muted-foreground" },
  active: { label: "Aktif", cls: "bg-emerald-100 text-emerald-800" },
  paused: { label: "Dijeda", cls: "bg-secondary text-foreground/80" },
  closed: { label: "Ditutup", cls: "bg-foreground text-background" },
  suspended: { label: "Ditangguhkan", cls: "bg-red-100 text-red-700" },
};
