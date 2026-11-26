import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, IdCard, HandHeart, ShieldCheck, BadgeCheck, Network, BellRing, Lightbulb, HeartHandshake, Coins } from "lucide-react";
import { Footer } from "@/components/Footer";
import { GibranEditorialHero } from "@/pages/GibranHero";
import { CampaignCard } from "@/components/CampaignCard";
import { InstructionDialog } from "@/components/CampaignDialogs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSync } from "@/lib/useSync";
import { api } from "@/lib/api";
import { PERAN, PERAN_COPY, FAQ_GERAKAN } from "@/lib/gerakan";


// Kartu ajakan bergabung di hero (menggantikan kalkulator cuan): [jenis, judul, deskripsi, ikon, tombol utama?]
const JOIN = [
  ["anggota", "Daftar Member", "Jadi member resmi Gibran for 2029 dengan KTA.", IdCard, true],
  ["relawan", "Daftar Relawan", "Ikut bergerak & berkegiatan bersama relawan.", HandHeart, false],
];

// Seksi "Keuntungan bergabung" di bawah hero: [jenis, judul, ikon, gelap?, [[ikon, judul, deskripsi], ...]]
const BENEFITS = [
  ["anggota", "Bagi Member", IdCard, true, [
    [BadgeCheck, "KTA digital resmi", "Kartu Tanda Anggota digital dengan nomor registrasi unik atas namamu."],
    [Network, "Jaringan koordinasi wilayah", "Terhubung dengan barisan Gibran for 2029 dari provinsi hingga kelurahan tempatmu."],
    [BellRing, "Akses informasi prioritas", "Kabar agenda, kegiatan, dan arahan resmi kamu terima lebih dulu."],
  ]],
  ["relawan", "Bagi Relawan", HandHeart, false, [
    [Lightbulb, "Ruang gerak berkreasi", "Suarakan gagasan positif lewat karya, konten, dan ide-ide segar."],
    [HeartHandshake, "Terlibat dalam aksi sosial", "Turun langsung dalam kegiatan sosial yang berdampak di lingkunganmu."],
    [Coins, "Apresiasi & cuan", "Berkesempatan mendapat apresiasi dan cuan melalui misi konten kreator."],
  ]],
];

export default function Landing() {
  const [role, setRole] = useState("relawan");
  const [sections, setSections] = useState(null);
  const [info, setInfo] = useState(null);
  const navigate = useNavigate();

  const version = useSync();
  useEffect(() => {
    api.get("/campaigns/sections").then((r) => setSections(r.data)).catch(() => {});
  }, [version]);

  const goSubmit = () => navigate("/jelajah");
  const copy = PERAN_COPY[role];

  return (
    <div className="bg-background">
      {/* HERO — editorial "Gibran for 2029" (komponen Elias): navbar, nama raksasa, potret, surat untuk 2029 */}
      <GibranEditorialHero />

      {/* PITA AJAKAN BERGABUNG — tepat di bawah hero */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14" data-testid="join-cta">
        <div className="rounded-3xl bg-[#0A0A0A] text-white ring-1 ring-white/10 p-6 sm:p-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-white/50">Bergabung bersama</p>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">Gibran for 2029</p>
            <p className="mt-2 text-sm text-white/70 leading-relaxed">Pilih cara kamu ikut berkontribusi. Gratis, cukup akun Google.</p>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-3">
            {JOIN.map(([jenis, title, desc, Icon, primary]) => (
              <button key={jenis} type="button" data-testid={`join-${jenis}`} onClick={() => navigate(`/daftar/${jenis}`)}
                className={`group w-full text-left rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${primary ? "bg-white text-[#0A0A0A] hover:bg-[#F0F0F0]" : "bg-[#C8102E] text-white hover:bg-[#A50021]"}`}>
                <span className={`grid place-items-center h-12 w-12 shrink-0 rounded-xl ${primary ? "bg-[#0A0A0A] text-white" : "bg-white/15 text-white"}`}><Icon className="h-6 w-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold leading-tight">{title}</span>
                  <span className={`block text-sm mt-0.5 ${primary ? "text-[#525252]" : "text-white/80"}`}>{desc}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
            ))}
            <p className="sm:col-span-2 text-xs text-white/45 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 shrink-0" /> Data pribadi kamu disimpan aman dan hanya dipakai untuk keperluan organisasi.</p>
          </div>
        </div>
      </section>

      {/* KEUNTUNGAN BERGABUNG — Member (hitam) & Relawan (merah) */}
      <section id="keuntungan" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20" data-testid="benefits">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-[0.16em] uppercase text-[#C8102E]">Keuntungan bergabung</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Apa yang kamu dapatkan di <span className="text-[#C8102E]">Gibran for 2029</span>?</h2>
          <p className="mt-3 text-muted-foreground">Pilih peran yang paling cocok. Keduanya gratis dan cukup mendaftar dengan akun Google.</p>
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-5">
          {BENEFITS.map(([jenis, title, Icon, dark, items]) => (
            <article key={jenis} data-testid={`benefit-${jenis}`}
              className={`relative overflow-hidden rounded-3xl p-7 sm:p-8 text-white flex flex-col shadow-soft-lg ${dark ? "bg-gradient-to-br from-[#0A0A0A] via-[#121212] to-[#1E1E1E] ring-1 ring-black/5" : "hero-gradient-red hero-arcs"}`}>
              <div className="relative flex items-center gap-3.5">
                <span className={`grid place-items-center h-12 w-12 rounded-2xl ${dark ? "bg-[#C8102E]" : "bg-[#0A0A0A]"}`}><Icon className="h-6 w-6" /></span>
                <h3 className="text-2xl font-extrabold tracking-tight">{title}</h3>
              </div>
              <ul className="relative mt-6 space-y-4 flex-1">
                {items.map(([I, t, d]) => (
                  <li key={t} className="flex gap-3.5">
                    <span className={`grid place-items-center h-10 w-10 shrink-0 rounded-xl ${dark ? "bg-white/10" : "bg-white/15"}`}><I className="h-5 w-5" /></span>
                    <span>
                      <span className="block font-bold">{t}</span>
                      <span className={`block text-sm mt-0.5 leading-relaxed ${dark ? "text-white/65" : "text-white/85"}`}>{d}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => navigate(`/daftar/${jenis}`)} data-testid={`benefit-cta-${jenis}`}
                className={`relative mt-7 h-12 px-6 rounded-xl font-bold inline-flex items-center justify-center gap-2 self-start transition-all hover:-translate-y-0.5 ${dark ? "bg-white text-[#0A0A0A] hover:bg-[#F0F0F0]" : "bg-[#0A0A0A] text-white hover:bg-[#1E1E1E]"}`}>
                {jenis === "anggota" ? "Daftar Member" : "Daftar Relawan"} <ArrowRight className="h-4 w-4" />
              </button>
              {jenis === "anggota" && (
                <button type="button" onClick={() => navigate("/kta")} data-testid="benefit-see-kta"
                  className="relative mt-3 self-start text-sm font-semibold text-white/70 hover:text-white underline underline-offset-4 decoration-white/30">
                  Sudah disetujui? Lihat & unduh KTA digitalmu
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* TENTANG GERAKAN — potret kepemimpinan */}
      <section id="tentang" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20" data-testid="about">
        <div className="overflow-hidden rounded-3xl bg-[#0A0A0A] text-white grid lg:grid-cols-2 items-stretch shadow-soft-lg">
          <div className="relative aspect-[750/713] lg:aspect-auto lg:min-h-full">
            <img src="/img/gibran-jokowi.jpg" alt="Potret Gibran Rakabuming Raka dan Joko Widodo" width="750" height="713" loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#0A0A0A]/80" aria-hidden />
          </div>
          <div className="relative p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
            <p className="text-sm font-bold tracking-[0.16em] uppercase text-[#F21D43]">Tentang gerakan</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">Meneruskan kerja nyata, menatap Indonesia Maju 2029.</h2>
            <p className="mt-4 text-white/75 leading-relaxed">
              Gibran for 2029 adalah wadah member dan relawan yang bergerak dari akar rumput: solid, terstruktur, dan hadir di wilayahnya
              masing-masing untuk mengawal gagasan dan kerja nyata bagi Indonesia.
            </p>
            <ul className="mt-6 space-y-3">
              {[["Gotong royong", "Bergerak bersama dari kelurahan hingga provinsi."], ["Kerja nyata", "Aksi sosial dan kegiatan yang terasa manfaatnya."], ["Generasi muda", "Ruang berkarya dan bersuara untuk anak muda Indonesia."]].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C8102E]" />
                  <span><b className="text-white">{t}.</b> <span className="text-white/70">{d}</span></span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => navigate("/daftar/relawan")} className="h-12 px-6 rounded-xl bg-[#C8102E] font-bold inline-flex items-center gap-2 hover:bg-[#A50021] transition-colors">Daftar Relawan <ArrowRight className="h-4 w-4" /></button>
              <button type="button" onClick={() => navigate("/daftar/anggota")} className="h-12 px-6 rounded-xl bg-white text-[#0A0A0A] font-bold inline-flex items-center gap-2 hover:bg-[#F0F0F0] transition-colors">Daftar Member <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </section>

      {/* FOTO — di antara "Tentang gerakan" dan "Cara bergabung" */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12" data-testid="photo-berdoa">
        <figure className="overflow-hidden rounded-3xl bg-[#0A0A0A] text-white grid lg:grid-cols-[1fr_1.15fr] items-stretch shadow-soft-lg">
          <figcaption className="order-2 lg:order-1 p-7 sm:p-10 lg:p-12 flex flex-col justify-center">
            <p className="text-sm font-bold tracking-[0.16em] uppercase text-[#F21D43]">Gibran for 2029</p>
            <p className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">Bekerja dengan hati, berdoa untuk negeri.</p>
          </figcaption>
          <div className="order-1 lg:order-2 relative aspect-[4/5] sm:aspect-[4/3] lg:aspect-[1104/1000]">
            <img src="/img/gibran-berdoa.jpg" alt="Gibran Rakabuming Raka menangkupkan tangan sambil berdoa" width="1104" height="1440" loading="lazy"
              className="absolute inset-0 h-full w-full object-cover object-[50%_30%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-[#0A0A0A]/70" aria-hidden />
          </div>
        </figure>
      </section>

      {/* CARA BERGABUNG — pilihan peran "Saya Relawan" / "Saya Member" */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24" id="cara-kerja" data-testid="how-to-join">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-primary">Cara bergabung</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 max-w-xl">{copy.title}</h2>
          </div>
          <div className="inline-flex p-1 rounded-full bg-card shadow-soft self-start md:self-auto" role="tablist" aria-label="Pilih peran">
            {PERAN.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={role === k} data-testid={`role-${k}`} onClick={() => setRole(k)}
                className={`h-10 px-5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${role === k ? "bg-[#C8102E] text-white" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
        </div>
        <ol className="mt-10 grid md:grid-cols-3 gap-5">
          {copy.steps.map(([I, t, d], i) => (
            <li key={t} className="relative bg-card rounded-2xl shadow-soft p-7 hover:shadow-soft-lg transition-shadow">
              <div className="flex items-center justify-between">
                <span className="icon-tile"><I className="h-5 w-5" /></span>
                <span className="text-sm font-bold text-primary/40 tabular-nums">0{i + 1}</span>
              </div>
              <h3 className="mt-6 text-xl font-bold">{t}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* MISI KONTEN KREATOR — hanya relevan untuk relawan */}
      {role === "relawan" && sections?.trending?.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16" data-testid="relawan-missions">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Untuk relawan</p>
              <h2 className="text-3xl font-extrabold tracking-tight mt-1">Misi konten kreator</h2>
            </div>
            <button data-testid="landing-see-all" onClick={() => navigate("/jelajah")} className="btn-ghost h-10 text-primary">Lihat semua <ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-6 flex gap-8 overflow-x-auto pt-1 pb-6 pl-6 snap-x no-scrollbar">
            {sections.trending.slice(0, 6).map((c, i) => <CampaignCard key={c.campaign_id} c={c} rank={i + 1} onInfo={setInfo} onSubmit={goSubmit} />)}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-2">Pertanyaan yang sering muncul</h2>
        </div>
        <Accordion type="single" collapsible className="lg:col-span-8 bg-card rounded-2xl shadow-soft px-6">
          {FAQ_GERAKAN.map(([q, a], i) => (
            <AccordionItem key={q} value={`f${i}`} className="border-border/70 last:border-0">
              <AccordionTrigger data-testid={`faq-${i}`} className="text-left text-base font-bold py-5 hover:no-underline hover:text-primary">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-[15px]">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CLOSING CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="relative overflow-hidden hero-gradient-red hero-arcs text-white rounded-3xl shadow-glow p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{copy.closing}</h2>
            <p className="mt-2 text-white/90">{copy.closingDesc}</p>
          </div>
          <button onClick={() => navigate(`/daftar/${role}`)} data-testid="closing-cta" className="relative h-14 px-8 text-base rounded-2xl shrink-0 bg-[#0A0A0A] text-white font-bold inline-flex items-center justify-center gap-2 hover:bg-[#1E1E1E] transition-colors">
            {copy.cta} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <InstructionDialog c={info} onClose={() => setInfo(null)} onSubmit={goSubmit} />
      <Footer />
    </div>
  );
}
