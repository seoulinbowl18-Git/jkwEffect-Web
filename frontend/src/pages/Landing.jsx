import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Building2, User, Send, MessageCircle, Clapperboard, Upload, Wallet, Megaphone, BadgeDollarSign, Eye, Calculator } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CampaignCard } from "@/components/CampaignCard";
import { InstructionDialog } from "@/components/CampaignDialogs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/context/AuthContext";
import { useCommunity } from "@/lib/community";
import { whatsappLink } from "@/lib/contact";
import { PARTNER_BRANDS } from "@/lib/brands";
import { useSync } from "@/lib/useSync";
import { api, rp, num } from "@/lib/api";

const STEPS = {
  creator: [[Clapperboard, "Pilih campaign", "Cari campaign dengan rate terbaik sesuai niche kamu."], [Upload, "Posting & submit", "Upload video di TikTok, IG, Threads atau YouTube, lalu kirim link-nya."], [Wallet, "Tarik cuan", "Views diverifikasi, saldo masuk. Tarik mulai Rp 50.000."]],
  brand: [[Megaphone, "Buat campaign", "Tulis brief, pilih platform & kategori."], [BadgeDollarSign, "Set rate per 1K views", "Bayar hanya untuk views yang benar-benar terjadi."], [Eye, "Dapat ribuan views", "Ratusan kreator posting konten untuk brand kamu."]],
};

export default function Landing() {
  const community = useCommunity();
  const [role, setRole] = useState("creator");
  const [sections, setSections] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [views, setViews] = useState([100000]);
  const [info, setInfo] = useState(null);
  const { user } = useAuth();
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

      {/* HERO — black gradient with rounded bottom (mobile app header), calculator card on the right */}
      <section className="relative overflow-hidden hero-gradient hero-arcs text-white rounded-b-[32px] sm:rounded-b-[48px]">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3.5 py-1.5 text-sm font-semibold animate-rise">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" /> {isBrand ? "Bayar hanya per views" : "Dibayar per views"}
            </span>
            <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.02] animate-rise [animation-delay:80ms]" data-testid="hero-title">
              {isBrand ? <>Bikin brand kamu<br />viral</> : <>Posting video,<br />cairkan cuan.</>}
            </h1>
            <p className="mt-6 text-base sm:text-lg text-white/90 max-w-lg leading-relaxed animate-rise [animation-delay:140ms]">
              {isBrand
                ? <>Ratusan kreator TikTok, Instagram, YouTube, dan Threads siap posting konten brand kamu. <b>Bayar hanya untuk views</b> yang benar-benar terverifikasi.</>
                : <>Dapat bayaran dari setiap 1.000 views video TikTok, Instagram, YouTube, dan Threads kamu. <b>100% gratis</b> untuk kreator.</>}
            </p>
            <div className="mt-8 inline-flex p-1 rounded-full bg-white/15 animate-rise [animation-delay:200ms]">
              {[["creator", "Saya Kreator", User], ["brand", "Saya Brand", Building2]].map(([k, l, I]) => (
                <button key={k} data-testid={`hero-role-${k}`} onClick={() => setRole(k)}
                  className={`h-11 px-4 sm:px-5 rounded-full whitespace-nowrap flex items-center gap-2 font-semibold transition-colors ${role === k ? "bg-white text-primary shadow-soft" : "text-white hover:bg-white/10"}`}>
                  <I className="h-4 w-4" /> {l}
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3 animate-rise [animation-delay:260ms]">
              <button data-testid="hero-start-button" onClick={start} className="btn-light h-14 px-7 text-base rounded-2xl">
                {role === "brand" ? "Buat Campaign" : "Mulai Sekarang"} <ArrowRight className="h-4 w-4" />
              </button>
              {role === "brand" ? (
                <a data-testid="hero-contact-button" href={contactUrl || "#"} target="_blank" rel="noreferrer"
                  onClick={(e) => { if (!contactUrl) { e.preventDefault(); toast.info("Kontak WhatsApp admin segera tersedia"); } }}
                  className="h-14 px-6 rounded-2xl ring-1 ring-white/50 text-white font-semibold flex items-center gap-2 hover:bg-white/10 transition-colors">
                  <MessageCircle className="h-4 w-4" /> Hubungi Kami
                </a>
              ) : (
                <a data-testid="hero-community-button" href={community?.telegram_url || "#"} target="_blank" rel="noreferrer"
                  onClick={(e) => { if (!community?.telegram_url) { e.preventDefault(); toast.info("Link grup Telegram PAGI segera tersedia"); } }}
                  className="h-14 px-6 rounded-2xl ring-1 ring-white/50 text-white font-semibold flex items-center gap-2 hover:bg-white/10 transition-colors">
                  <Send className="h-4 w-4" /> Gabung Komunitas
                </a>
              )}
            </div>
            <dl className="mt-12 grid grid-cols-3 max-w-md gap-3 animate-rise [animation-delay:320ms]">
              {stats.map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3">
                  <dt className="text-xl sm:text-2xl font-extrabold">{v}</dt>
                  <dd className="text-xs text-white/80 mt-0.5">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="lg:col-span-5 animate-rise [animation-delay:200ms]">
            <div className="bg-card text-foreground rounded-3xl shadow-soft-lg p-7 sm:p-8" data-testid="earnings-calculator">
              <div className="flex items-center gap-3">
                <span className="icon-tile"><Calculator className="h-5 w-5" /></span>
                <div>
                  <p className="font-bold">{isBrand ? "Kalkulator budget" : "Kalkulator cuan"}</p>
                  <p className="text-sm text-muted-foreground">{isBrand ? "Target views campaign kamu" : "Kalau videomu tembus"}</p>
                </div>
              </div>
              <p className="text-4xl font-extrabold mt-6 tabular-nums tracking-tight" data-testid="calc-views">{num(views[0])} views</p>
              <Slider data-testid="calc-slider" className="mt-6" min={1000} max={2000000} step={1000} value={views} onValueChange={setViews} />
              <div className="mt-7 rounded-2xl bg-card-gradient text-white p-5 shadow-glow">
                <p className="text-white/85 text-sm">{isBrand ? "Estimasi budget" : "Estimasi penghasilan"} (rate rata-rata {rp(avgRate)}/1K)</p>
                <p className="text-3xl sm:text-4xl font-extrabold mt-1 tabular-nums tracking-tight" data-testid="calc-result">{rp(Math.floor((views[0] / 1000) * avgRate))}</p>
              </div>
              {isBrand
                ? <button data-testid="calc-brand-cta" onClick={start} className="btn-outline w-full mt-5 h-12">Buat campaign sekarang <ArrowRight className="h-4 w-4" /></button>
                : <button onClick={goSubmit} className="btn-outline w-full mt-5 h-12">Jelajah campaign <ArrowRight className="h-4 w-4" /></button>}
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
