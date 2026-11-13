// Panduan & batas bukti klaim — sama dengan aplikasi Flutter (claim_proof_view.dart)
// dan backend (MAX_PROOF_* di server.py).
export const MAX_PROOF_FILES = 3;
export const MAX_PROOF_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_PROOF_VIDEO_BYTES = 15 * 1024 * 1024;

export const PROOF_GUIDES = {
  tiktok: [
    "Buka TikTok, masuk ke Profil, lalu buka video yang kamu daftarkan.",
    "Ketuk ikon tiga titik (•••) → \"Analitik\" (atau ketuk angka tayangan di bawah video).",
    "Tampilkan Total tayangan, Total waktu tonton, dan Rata-rata waktu tonton.",
    "Geser ke bawah supaya bagian Penonton & sumber trafik ikut terekam.",
  ],
  instagram: [
    "Buka Instagram, masuk ke Profil → tab Reels, lalu buka reel yang kamu daftarkan.",
    "Ketuk \"Lihat insight\" / \"Lihat wawasan\" di bawah reel.",
    "Tampilkan Tayangan (Views), Jangkauan akun, dan Waktu tonton.",
    "Geser ke bawah supaya detail interaksi ikut terekam.",
  ],
  threads: [
    "Buka Threads, masuk ke Profil, lalu buka postingan video yang kamu daftarkan.",
    "Ketuk ikon grafik / \"Lihat insight\" di bawah postingan.",
    "Tampilkan jumlah Tayangan (Views) dan interaksi postingan.",
  ],
  youtube: [
    "Buka aplikasi YouTube Studio → Konten → Shorts, lalu pilih video yang kamu daftarkan.",
    "Ketuk \"Analytics\" / \"Analitik\".",
    "Tampilkan Penayangan, Waktu tonton, dan Durasi rata-rata penayangan.",
  ],
};

export const PROOF_MUST_SHOW = [
  "Username akunmu (rekam mulai dari halaman profil)",
  "Video yang sama dengan link yang kamu daftarkan",
  "Total views / tayangan terbaru",
  "Waktu tonton (watch time) jika tersedia",
];

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp|mkv)$/i;
export const isVideoFile = (f) => (f.type || "").startsWith("video/") || VIDEO_EXT.test(f.name || "");

/** Pesan error untuk file yang tidak memenuhi syarat, atau null. */
export const checkProofFile = (f) => {
  const video = isVideoFile(f);
  if (!video && !(f.type || "").startsWith("image/")) return `${f.name}: harus gambar atau video`;
  if (video && f.size > MAX_PROOF_VIDEO_BYTES) return `${f.name}: rekaman layar maksimal 15 MB. Potong videonya jadi lebih pendek.`;
  if (!video && f.size > MAX_PROOF_IMAGE_BYTES) return `${f.name}: screenshot maksimal 3 MB.`;
  return null;
};

/** Estimasi minimal (views minimum × rate) untuk konten yang siap diklaim. */
export const minEstimate = (items) => items.reduce((sum, s) => sum + Math.floor((s.min_views || 0) / 1000 * (s.rate_per_1k || 0)), 0);
