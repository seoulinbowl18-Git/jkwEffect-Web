import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Building2, User, Send, MessageCircle, Clapperboard, Upload, Wallet, Megaphone, BadgeDollarSign, Eye, IdCard, HandHeart, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { BrandBadge } from "@/components/Logo";
import { Footer, useIsDesktop } from "@/components/Footer";
import VaporizeTextCycle, { Tag } from "@/components/ui/vapour-text-effect";
import { CampaignCard } from "@/components/CampaignCard";
import { InstructionDialog } from "@/components/CampaignDialogs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from "@/context/AuthContext";
import { useCommunity } from "@/lib/community";
import { whatsappLink } from "@/lib/contact";
import { PARTNER_BRANDS } from "@/lib/brands";
import { useSync } from "@/lib/useSync";
import { api, rp } from "@/lib/api";

const STEPS = {
  creator: [[Clapperboard, "Pilih campaign", "Cari campaign dengan rate terbaik sesuai niche kamu."], [Upload, "Posting & submit", "Upload video di TikTok, IG, Threads atau YouTube, lalu kirim link-nya."], [Wallet, "Tarik cuan", "Views diverifikasi, saldo masuk. Tarik mulai Rp 50.000."]],
  brand: [[Megaphone, "Buat campaign", "Tulis brief, pilih platform & kategori."], [BadgeDollarSign, "Set rate per 1K views", "Bayar hanya untuk views yang benar-benar terjadi."], [Eye, "Dapat ribuan views", "Ratusan kreator posting konten untuk brand kamu."]],
};

// Kartu ajakan bergabung di hero (menggantikan kalkulator cuan): [jenis, judul, deskripsi, ikon, tombol utama?]
const JOIN = [
  ["anggota", "Daftar Member", "Jadi member resmi PAGI dengan KTA.", IdCard, true],
  ["relawan", "Daftar Relawan", "Ikut bergerak & berkegiatan bersama relawan.", HandHeart, false],
];

// Tagline hero di samping kotak PAGI: berganti dengan efek "menguap" (sama seperti footer).
// Konstanta di luar komponen agar canvas tidak digambar ulang tiap render.
const HERO_TAGLINES = ["Pasukan Gibran Indonesia.", "Satu barisan,", "bergerak bersama", "untuk Indonesia."];
const HERO_TAGLINE_ANIMATION = { vaporizeDuration: 1.1, fadeInDuration: 0.6, waitDuration: 1.1 };

export default function Landing() {
  const community = useCommunity();
  const [role, setRole] = useState("creator");
  const [sections, setSections] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [info, setInfo] = useState(null);
  const { user } = useAuth();
  const desktop = useIsDesktop();
  const taglineFont = useMemo(
    () => ({ fontFamily: "Inter, sans-serif", fontSize: desktop ? "26px" : "22px", fontWeight: 800 }),
    [desktop],
  );
  const navigate = useNavigate();

  const version = useSync();
  useEffect(() => {
    api.get("/campaigns/sections").then((r) => setSections(r.data));
    api.get("/public/payouts").then((r) => setPayouts(r.data));
  }, [version]);

  const start = () => (user ? navigate(user.role ? "/dashboard" : "/onboarding") : navigate("/masuk?next=/dashboard"));
  const goSubmit = () => navigate("/jelajah");
  const avgRate = 5000;
  const ticker = payouts.length ? payouts.map((p) => [p.name, `+${rp(p.amount)}`]) : (sections?.top_rate || []).map((c) => [c.title, `${rp(c.rate_per_1k)}/1K`]);

  const isBrand = role === "brand";
  const stats = isBrand
    ? [[sections?.total ?? "—", "Campaign aktif"], [rp(avgRate), "Rate rata-rata/1K"], ["4", "Platform"]]
    : [[sections?.total ?? "—", "Campaign aktif"], ["Rp 50rb", "Min. penarikan"], ["4", "Platform"]];
  const contactUrl = whatsappLink();
  // Diulang agar barisan running text tetap penuh walau brand masih sedikit.
  const brandRow = Array.from({ length: Math.max(1, Math.ceil(8 / PARTNER_BRANDS.length)) }, () => PARTNER_BRANDS).flat();

  return (
    <div className="bg-background">
      <Navbar />

      {/* HERO — red brand gradient with rounded bottom (mobile app header), black join CTA (Member / Relawan) on the right */}
      <section className="relative overflow-hidden hero-gradient-red hero-arcs text-white rounded-b-[32px] sm:rounded-b-[48px]">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7" data-testid="hero-brand">
            {/* Lockup tulisan logo PAGI: PASUKAN / GIBRAN / Indonesia / (PAGI) — PAGI dibuat paling menonjol */}
            <div className="flex items-center gap-4 sm:gap-5 animate-rise">
              <BrandBadge size={128} className="hidden sm:block ring-4 ring-white shadow-[0_18px_40px_-10px_rgba(70,0,12,0.7)]" />
              <BrandBadge size={96} className="sm:hidden ring-[3px] ring-white shadow-[0_14px_30px_-10px_rgba(70,0,12,0.7)]" />
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2.5 rounded-full bg-black/15 backdrop-blur px-3.5 py-1.5 text-[11px] sm:text-sm font-bold tracking-[0.14em] uppercase">
                  <span className="flex h-3 w-5 shrink-0 flex-col overflow-hidden rounded-[3px] ring-1 ring-white/40" aria-hidden><span className="h-1/2 bg-[#E11D2E]" /><span className="h-1/2 bg-white" /></span>
                  Komunitas relawan &amp; member
                </span>
                <p className="mt-2 text-sm sm:text-base font-semibold text-white/85">Pasukan Gibran Indonesia (PAGI)</p>
              </div>
            </div>
            <h1 className="mt-6 leading-none animate-rise [animation-delay:80ms]" aria-label="Pasukan Gibran Indonesia (PAGI)">
              <span className="block text-2xl sm:text-4xl lg:text-[2.6rem] font-extrabold tracking-[0.32em] text-white/95 [text-shadow:0_3px_0_rgba(90,0,15,0.45)]">PASUKAN</span>
              <span className="mt-1 block text-[4.3rem] sm:text-8xl lg:text-[8.5rem] font-black italic tracking-tight -skew-x-6 text-white leading-[0.9] [text-shadow:0_5px_0_#7A0016,0_14px_30px_rgba(60,0,10,0.45)]">GIBRAN</span>
              <span className="mt-1 block font-script text-4xl sm:text-5xl lg:text-6xl text-white [text-shadow:0_3px_12px_rgba(60,0,10,0.4)] pl-2">Indonesia</span>
            </h1>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 animate-rise [animation-delay:160ms]">
              <span className="inline-flex items-center rounded-[28px] bg-white px-7 sm:px-9 py-2 sm:py-3 shadow-[0_18px_40px_-12px_rgba(70,0,12,0.65)] ring-4 ring-white/25"
                data-testid="hero-pagi">
                <span className="text-[#C8102E] font-black tracking-tight leading-none text-7xl sm:text-8xl lg:text-[7.5rem]">PAGI</span>
              </span>
              <div className="relative h-14 w-full sm:w-auto sm:flex-1 sm:min-w-[280px] sm:max-w-[360px]" data-testid="hero-vapour-text">
                <VaporizeTextCycle
                  texts={HERO_TAGLINES}
                  font={taglineFont}
                  color="rgb(255, 255, 255)"
                  spread={5}
                  density={5}
                  animation={HERO_TAGLINE_ANIMATION}
                  direction="left-to-right"
                  alignment="left"
                  tag={Tag.P}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 animate-rise [animation-delay:200ms]">
            <div className="rounded-3xl bg-[#121212]/90 ring-1 ring-white/10 backdrop-blur p-7 sm:p-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]" data-testid="join-cta">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-white/50">Bergabung bersama</p>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">Pasukan Gibran Indonesia</p>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">Pilih cara kamu ikut berkontribusi. Pendaftaran gratis dan cukup memakai akun Google.</p>
              <div className="mt-7 grid gap-3">
                {JOIN.map(([jenis, title, desc, Icon, primary]) => (
                  <button key={jenis} type="button" data-testid={`join-${jenis}`} onClick={() => navigate(`/daftar/${jenis}`)}
                    className={`group w-full text-left rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${primary ? "bg-white text-[#0A0A0A] hover:bg-[#F0F0F0] shadow-[0_12px_30px_-12px_rgba(255,255,255,0.35)]" : "bg-[#1E1E1E] text-white ring-1 ring-white/15 hover:bg-[#262626]"}`}>
                    <span className={`grid place-items-center h-12 w-12 shrink-0 rounded-xl ${primary ? "bg-[#0A0A0A] text-white" : "bg-white/10 text-white"}`}><Icon className="h-6 w-6" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-extrabold leading-tight">{title}</span>
                      <span className={`block text-sm mt-0.5 ${primary ? "text-[#525252]" : "text-white/65"}`}>{desc}</span>
                    </span>
                    <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
                  </button>
                ))}
              </div>
              <p className="mt-5 text-xs text-white/45 flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Data pribadi kamu disimpan aman dan hanya dipakai untuk keperluan organisasi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND TICKER (mode "Saya Brand") */}
      {role === "brand" && (
        <section className="py-8 overflow-hidden" data-testid="brand-ticker">
          <p className="text-center text-sm font-medium text-muted-foreground mb-4">
            Brand yang sudah bergabung di <b className="text-foreground">PAGI</b>
          </p>
          <div className="relative [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="flex w-max animate-marquee gap-4 py-1">
              {[...brandRow, ...brandRow].map((name, i) => (
                <div key={i} className="shrink-0 whitespace-nowrap flex items-center gap-3 bg-card rounded-2xl shadow-soft pl-2 pr-5 py-2" aria-hidden={i >= brandRow.length}>
                  <span className="h-9 w-9 rounded-xl bg-card-gradient text-white grid place-items-center font-extrabold">{name[0]}</span>
                  <span className="text-lg font-extrabold tracking-tight" data-testid="brand-name">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PAYOUT TICKER */}
      {role !== "brand" && ticker.length > 0 && (
        <section className="py-8 overflow-hidden" data-testid="payout-ticker">
          <p className="text-center text-sm font-medium text-muted-foreground mb-4">
            {payouts.length ? "Bayaran terbaru di PAGI" : "Rate campaign yang lagi buka"}
          </p>
          <div className="flex w-max animate-marquee gap-3 py-1">
            {[...ticker, ...ticker].map(([n, a], i) => (
              <div key={i} className="shrink-0 whitespace-nowrap flex items-center gap-3 bg-card rounded-2xl shadow-soft pl-2 pr-4 py-2">
                <span className="h-8 w-8 rounded-full bg-soft text-primary grid place-items-center font-bold text-sm">{n[0]}</span>
                <span className="text-sm font-semibold max-w-[180px] truncate">{n}</span>
                <span className="text-sm font-bold text-success tabular-nums">{a}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24" id="cara-kerja">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-primary">Cara kerja</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 max-w-xl">{role === "brand" ? "Bayar per performa, bukan per janji." : "Tiga langkah dari konten ke cuan."}</h2>
          </div>
          <div className="inline-flex p-1 rounded-full bg-card shadow-soft self-start md:self-auto">
            {[["creator", "Kreator"], ["brand", "Brand"]].map(([k, l]) => (
              <button key={k} onClick={() => setRole(k)} className={`h-10 px-5 rounded-full text-sm font-semibold transition-colors ${role === k ? "bg-soft text-primary" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
        </div>
        <ol className="mt-10 grid md:grid-cols-3 gap-5">
          {STEPS[role].map(([I, t, d], i) => (
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

      {/* TRENDING CAMPAIGNS */}
      {sections?.trending?.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-primary">Trending</p>
              <h2 className="text-3xl font-extrabold tracking-tight mt-1">Lagi rame minggu ini</h2>
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
          {[["Daftarnya bayar?", "Tidak. 100% gratis untuk kreator. Cukup login pakai akun Google."], ["Minimal penarikan berapa?", "Minimal Rp 50.000 ke rekening bank atau e-wallet. Diproses manual oleh tim kami."], ["Berapa lama review video?", "Konten direview Admin PAGI. Setelah views tercapai, kamu klaim dengan bukti rekaman layar analitik dan views diverifikasi sebelum saldo masuk."], ["Bagaimana mencegah kecurangan?", "Setiap link video hanya bisa didaftarkan sekali, views diverifikasi manual, dan akun yang memakai bot akan diblokir."]].map(([q, a], i) => (
            <AccordionItem key={q} value={`f${i}`} className="border-border/70 last:border-0">
              <AccordionTrigger data-testid={`faq-${i}`} className="text-left text-base font-bold py-5 hover:no-underline hover:text-primary">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-[15px]">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CLOSING CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="relative overflow-hidden hero-gradient hero-arcs text-white rounded-3xl shadow-glow p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{role === "brand" ? "Siap dapat ribuan views?" : "Siap dapat cuan dari kontenmu?"}</h2>
            <p className="mt-2 text-white/90">Daftar gratis pakai akun Google, langsung mulai hari ini.</p>
          </div>
          <button onClick={start} className="relative btn-light h-14 px-8 text-base rounded-2xl shrink-0">
            {role === "brand" ? "Buat Campaign" : "Mulai Sekarang"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <InstructionDialog c={info} onClose={() => setInfo(null)} onSubmit={goSubmit} />
      <Footer />
    </div>
  );
}
