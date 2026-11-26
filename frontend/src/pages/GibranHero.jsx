import Elias from "@/components/ui/elias-author-hero";

/**
 * /gerakan — hero editorial "Gibran for 2029" memakai komponen Elias (src/components/ui/elias-author-hero.tsx).
 * Warna aksen diganti merah brand; ukuran nama raksasa di HP disesuaikan untuk "GIBRAN" / "FOR 2029".
 */
const THEME_CSS = `
.gibran-hero .ea-hero { --color-ea-accent: #C8102E; }
/* Baris label splash: kelas h-19 (Tailwind v4) belum ada di Tailwind v3 proyek ini. */
.gibran-hero .h-19 { height: 4.75rem; }
/* HP & tablet: nama raksasa muat selebar layar, potret berdiri di atas kertas di bawah nama agar "FOR 2029" terbaca. */
@media (max-width: 1023px), (max-aspect-ratio: 1249/1000) {
  .gibran-hero .ea-name-first { font-size: 23.6cqw; }
  .gibran-hero .ea-name-last { font-size: 18.9cqw; }
  .gibran-hero .ea-portrait { top: 37cqw; left: 26cqw; height: calc(100% - 37cqw); }
}
/* Desktop: potret sedikit ke kanan agar tidak menyentuh teks pengantar di kiri. */
@media (min-width: 1024px) and (min-aspect-ratio: 5/4) {
  .gibran-hero .ea-canvas { --ea-portrait-left: max(100cqw - 1040 * var(--ea-u), 250px); }
}
`;

const LETTER = {
  eyebrow: "Surat untuk Indonesia 2029",
  greeting: "Indonesia yang kucintai,",
  stamp: "Segel & kirim",
  postmark: "2029",
  seal: "G",
  sealing: "Disegel untuk 2029",
  counter: "Surat",
  messages: [
    "Aku akan hadir di wilayahku dan bergerak bersama tetangga.",
    "Aku akan menyebarkan kabar baik, bukan hoaks atau kebencian.",
    "Aku akan ikut aksi sosial yang terasa manfaatnya bagi sesama.",
    "Aku akan mengajak satu teman bergabung menuju Indonesia Maju 2029.",
  ],
};

export default function GibranHero() {
  return (
    <div className="gibran-hero">
      <style>{THEME_CSS}</style>
      <Elias
        brand={{ name: "Gibran", href: "/" }}
        navLinks={{
          left: [
            { label: "Beranda", href: "/", active: true },
            { label: "Cara Bergabung", href: "/cara-kerja" },
          ],
          right: [
            { label: "KTA Saya", href: "/kta" },
            { label: "Masuk", href: "/masuk" },
          ],
        }}
        navCta={{ label: "Daftar", href: "/daftar/relawan" }}
        navStatus={{ label: "Pendaftaran", detail: "Dibuka" }}
        name={{ first: "Gibran", last: "for\u00A02029" }}
        intro={{
          roles: ["Relawan", "Member", "Indonesia Maju"],
          headline: ["Bergerak bersama,", "menuju Indonesia", "Maju 2029."],
          description:
            "Wadah relawan dan member yang bergerak dari akar rumput: solid, terstruktur, dan hadir di wilayahnya masing-masing.",
        }}
        portrait={{
          src: "/img/gibran-berdoa-cutout.webp",
          width: 1104,
          height: 1434,
          alt: "Gibran Rakabuming Raka menangkupkan tangan sambil berdoa",
        }}
        letter={LETTER}
        motion={{ cursor: { readLabel: "Buka" } }}
      />
    </div>
  );
}
