import { UserPlus, BadgeCheck, HeartHandshake, IdCard, Download } from "lucide-react";

// Peran di ekosistem Gibran for 2029 (pengganti "Saya Kreator / Saya Brand").
// Nilai `anggota` dipakai oleh URL & backend (/daftar/anggota); labelnya "Member".
export const PERAN = [
  ["relawan", "Saya Relawan"],
  ["anggota", "Saya Member"],
];

export const PERAN_COPY = {
  relawan: {
    title: "Tiga langkah jadi relawan Gibran for 2029.",
    cta: "Daftar Relawan",
    closing: "Siap bergerak bersama?",
    closingDesc: "Daftar relawan gratis pakai akun Google. Satu langkah nyata untuk Indonesia Maju 2029.",
    steps: [
      [UserPlus, "Daftar relawan", "Cukup isi nama, WhatsApp, dan kota domisili. Tanpa KTP, gratis pakai akun Google."],
      [BadgeCheck, "Diverifikasi admin", "Tim Gibran for 2029 memverifikasi data dan domisilimu, lalu kamu diberi notifikasi."],
      [HeartHandshake, "Bergerak & berkarya", "Ikut aksi sosial, kegiatan wilayah, dan misi konten kreator untuk meraih apresiasi."],
    ],
  },
  anggota: {
    title: "Tiga langkah jadi member resmi.",
    cta: "Daftar Member",
    closing: "Siap jadi member resmi Gibran for 2029?",
    closingDesc: "Daftar member gratis pakai akun Google dan dapatkan KTA digital bernomor unik.",
    steps: [
      [IdCard, "Isi data sesuai KTP", "Lengkapi data pribadi, alamat domisili, dan unggah foto KTP (maks. 3 MB)."],
      [BadgeCheck, "Verifikasi & nomor KTA", "Setelah admin menyetujui, nomor KTA digital unik terbit otomatis."],
      [Download, "Unduh KTA digital", "Simpan kartu KTA-mu dan terhubung dengan koordinasi wilayah hingga kelurahan."],
    ],
  },
};

export const FAQ_GERAKAN = [
  ["Apakah pendaftarannya bayar?", "Tidak. Pendaftaran member dan relawan Gibran for 2029 gratis. Cukup masuk dengan akun Google."],
  ["Apa beda Member dan Relawan?", "Member adalah anggota resmi dengan KTA digital bernomor unik dan terhubung ke koordinasi wilayah; pendaftarannya wajib NIK & foto KTP. Relawan bergerak di aksi sosial, kegiatan, dan misi konten kreator; cukup nama, WhatsApp, dan kota tanpa KTP."],
  ["Boleh daftar Member sekaligus Relawan?", "Boleh. Masing-masing bisa didaftarkan satu kali per akun Google dan per NIK."],
  ["Kapan nomor KTA saya terbit?", "Setelah admin memverifikasi dan menyetujui pendaftaranmu. Nomor & kartu KTA langsung muncul di halaman KTA Saya."],
  ["Bagaimana keamanan data KTP saya?", "Relawan tidak perlu mengunggah KTP. Untuk member, data dikirim melalui koneksi terenkripsi (HTTPS) dan NIK & foto KTP hanya dapat dilihat admin untuk verifikasi."],
  ["Pendaftaran saya ditolak, bisa daftar lagi?", "Bisa. Lihat alasan penolakan di halaman KTA Saya, perbaiki datanya, lalu kirim ulang."],
];

