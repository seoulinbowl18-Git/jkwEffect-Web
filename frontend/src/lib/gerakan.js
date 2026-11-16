import { UserPlus, BadgeCheck, HeartHandshake, IdCard, Download } from "lucide-react";

// Peran di ekosistem GIBRAN2029 (pengganti "Saya Kreator / Saya Brand").
// Nilai `anggota` dipakai oleh URL & backend (/daftar/anggota); labelnya "Member".
export const PERAN = [
  ["relawan", "Saya Relawan"],
  ["anggota", "Saya Member"],
];

export const PERAN_COPY = {
  relawan: {
    title: "Tiga langkah jadi relawan GIBRAN2029.",
    cta: "Daftar Relawan",
    closing: "Siap bergerak bersama?",
    closingDesc: "Daftar relawan gratis pakai akun Google. Satu langkah nyata untuk Indonesia Maju 2029.",
    steps: [
      [UserPlus, "Daftar relawan", "Isi formulir relawan & unggah foto KTP. Gratis, cukup pakai akun Google."],
      [BadgeCheck, "Diverifikasi admin", "Tim GIBRAN2029 memverifikasi data dan domisilimu, lalu kamu diberi notifikasi."],
      [HeartHandshake, "Bergerak & berkarya", "Ikut aksi sosial, kegiatan wilayah, dan misi konten kreator untuk meraih apresiasi."],
    ],
  },
  anggota: {
    title: "Tiga langkah jadi member resmi.",
    cta: "Daftar Member",
    closing: "Siap jadi member resmi GIBRAN2029?",
    closingDesc: "Daftar member gratis pakai akun Google dan dapatkan KTA digital bernomor unik.",
    steps: [
      [IdCard, "Isi data sesuai KTP", "Lengkapi data pribadi, alamat domisili, dan unggah foto KTP (maks. 3 MB)."],
      [BadgeCheck, "Verifikasi & nomor KTA", "Setelah admin menyetujui, nomor KTA digital unik terbit otomatis."],
      [Download, "Unduh KTA digital", "Simpan kartu KTA-mu dan terhubung dengan koordinasi wilayah hingga kelurahan."],
    ],
  },
};

export const FAQ_GERAKAN = [
  ["Apakah pendaftarannya bayar?", "Tidak. Pendaftaran member dan relawan GIBRAN2029 gratis. Cukup masuk dengan akun Google."],
  ["Apa beda Member dan Relawan?", "Member adalah anggota resmi dengan KTA digital bernomor unik dan terhubung ke koordinasi wilayah. Relawan bergerak di aksi sosial, kegiatan, dan misi konten kreator."],
  ["Boleh daftar Member sekaligus Relawan?", "Boleh. Masing-masing bisa didaftarkan satu kali per akun Google dan per NIK."],
  ["Kapan nomor KTA saya terbit?", "Setelah admin memverifikasi dan menyetujui pendaftaranmu. Nomor & kartu KTA langsung muncul di halaman KTA Saya."],
  ["Bagaimana keamanan data KTP saya?", "Data dikirim melalui koneksi terenkripsi (HTTPS). NIK & foto KTP hanya dapat dilihat admin untuk verifikasi."],
  ["Pendaftaran saya ditolak, bisa daftar lagi?", "Bisa. Lihat alasan penolakan di halaman KTA Saya, perbaiki datanya, lalu kirim ulang."],
];

