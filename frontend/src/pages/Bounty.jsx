import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CampaignCard } from "@/components/CampaignCard";
import { InstructionDialog, SubmitDialog } from "@/components/CampaignDialogs";
import { StreakBanner } from "@/components/StreakBanner";
import { useAuth } from "@/context/AuthContext";
import { useSync } from "@/lib/useSync";
import { api, CATEGORIES } from "@/lib/api";
import { toast } from "sonner";

const Row = ({ title, desc, items, ranked, onInfo, onSubmit, id }) => {
  const ref = useRef(null);
  const scroll = (d) => ref.current?.scrollBy({ left: d * 600, behavior: "smooth" });
  if (!items?.length) return null;
  return (
    <section className="mt-12 first:mt-0" data-testid={`row-${id}`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <div className="flex">
          <button data-testid={`row-${id}-prev`} aria-label="Sebelumnya" onClick={() => scroll(-1)} className="h-10 w-10 grid place-items-center rounded-full bg-card shadow-soft hover:text-primary transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          <button data-testid={`row-${id}-next`} aria-label="Berikutnya" onClick={() => scroll(1)} className="h-10 w-10 ml-2 grid place-items-center rounded-full bg-card shadow-soft hover:text-primary transition-colors"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div ref={ref} className={`mt-5 flex ${ranked ? "gap-10 pl-8" : "gap-4"} overflow-x-auto pt-1 pb-6 -mx-1 px-1 snap-x no-scrollbar`}>
        {items.map((c, i) => <CampaignCard key={c.campaign_id} c={c} rank={ranked ? i + 1 : null} onInfo={onInfo} onSubmit={onSubmit} />)}
      </div>
    </section>
  );
};

export default function Bounty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState(null);
  const [tab, setTab] = useState("public");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [all, setAll] = useState([]);
  const [info, setInfo] = useState(null);
  const [sub, setSub] = useState(null);

  const version = useSync();
  useEffect(() => { api.get("/campaigns/sections").then((r) => setSections(r.data)); }, [version]);
  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/campaigns", { params: { q, category: cat, exclusive: tab === "exclusive" } }).then((r) => setAll(r.data));
    }, 250);
    return () => clearTimeout(t);
  }, [q, cat, tab, version]);

  const onSubmit = (c) => {
    if (!user) return navigate("/masuk?next=/jelajah");
    if (user.role !== "creator") return toast.error("Hanya akun kreator yang bisa submit video");
    setSub(c);
  };
  const browsing = q || tab === "exclusive";

  const browsingAll = browsing || cat !== "Semua";
  const tabBtn = (k, label, Icon, extra) => (
    <button data-testid={`bounty-tab-${k}`} onClick={() => setTab(k)}
      className={`h-10 px-4 rounded-full flex items-center gap-2 font-semibold text-sm transition-colors ${tab === k ? "bg-white text-primary shadow-soft" : "text-white/90 hover:bg-white/15"}`}>
      <Icon className="h-4 w-4" /> {label} {extra}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HEADER — red gradient with search, like the mobile Jelajah screen */}
      <header className="relative overflow-hidden hero-gradient hero-arcs text-white rounded-b-[28px] sm:rounded-b-[32px]">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10 lg:pt-12 lg:pb-14 grid lg:grid-cols-12 gap-6 lg:gap-8 items-end">
          <div className="lg:col-span-5">
            <p className="text-sm font-medium text-white/80">Jelajah</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">Pilih campaign,<br className="hidden sm:block" /> posting, dibayar.</h1>
          </div>
          <div className="lg:col-span-7 space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input data-testid="bounty-search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari campaign, brand, atau produk..."
                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white text-foreground text-base shadow-soft-lg focus:outline-none focus:ring-4 focus:ring-white/40" />
            </div>
            <div className="inline-flex gap-1 p-1 rounded-full bg-white/15">
              {tabBtn("public", "Public", Sparkles, <span className="text-xs opacity-80">{sections?.total ?? ""}</span>)}
              {tabBtn("exclusive", "Exclusive", Lock)}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-12">
        {/* SIDEBAR — categories (horizontal chips on mobile) */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="hidden lg:block text-sm font-semibold text-muted-foreground mb-3 px-1">Kategori</p>
          <nav className="flex lg:flex-col gap-2 lg:gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:p-2 lg:bg-card lg:rounded-2xl lg:shadow-soft pb-1">
            {["Semua", ...CATEGORIES].map((c) => (
              <button key={c} data-testid={`category-${c}`} onClick={() => setCat(c)}
                className={`shrink-0 h-9 lg:h-10 px-4 lg:px-3 rounded-full lg:rounded-xl text-sm font-semibold text-left whitespace-nowrap transition-colors ${cat === c ? "bg-primary text-white shadow-glow lg:bg-soft lg:text-primary lg:shadow-none" : "bg-card shadow-soft text-muted-foreground hover:text-foreground lg:bg-transparent lg:shadow-none lg:hover:bg-secondary"}`}>
                {c}
              </button>
            ))}
          </nav>
          <div className="hidden lg:block mt-6 rounded-2xl bg-soft p-4">
            <p className="font-bold text-sm text-primary-dark">Aturan singkat</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground list-disc pl-4">
              <li>1 link video = 1 submission</li>
              <li>Views diverifikasi manual</li>
              <li>Tarik saldo mulai Rp 50.000</li>
            </ul>
          </div>
        </aside>

        <div className="min-w-0">
          {user?.role === "creator" && <div className="mb-10"><StreakBanner /></div>}

          {!browsingAll && sections && (
            <>
              <Row id="trending" title="Lagi rame minggu ini" desc="Paling banyak kreator yang submit dalam 7 hari terakhir." items={sections.trending} ranked onInfo={setInfo} onSubmit={onSubmit} />
              <Row id="closing" title="Segera ditutup" desc="Daftarkan videomu sebelum campaign ini tutup." items={sections.closing} onInfo={setInfo} onSubmit={onSubmit} />
              <Row id="toprate" title="Rate tertinggi" desc="Bayaran per 1.000 views paling tinggi." items={sections.top_rate} onInfo={setInfo} onSubmit={onSubmit} />
              <Row id="newest" title="Campaign baru" desc="Campaign yang baru dibuka." items={sections.newest} onInfo={setInfo} onSubmit={onSubmit} />
            </>
          )}

          <section className={browsingAll ? "" : "mt-14"}>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">
                {tab === "exclusive" ? "Campaign exclusive" : cat !== "Semua" ? `Kategori: ${cat}` : "Semua campaign"}
              </h2>
              <span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-soft text-primary tabular-nums" data-testid="all-count">{all.length}</span>
            </div>
            {all.length === 0 ? (
              <div className="mt-6 rounded-2xl bg-card shadow-soft p-10 text-center" data-testid="no-campaigns">
                <p className="font-bold">Belum ada campaign di sini.</p>
                <p className="text-sm text-muted-foreground mt-1">Coba kategori lain atau ubah kata kunci pencarian.</p>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5 [&>div]:w-auto">
                {all.map((c) => <CampaignCard key={c.campaign_id} c={c} onInfo={setInfo} onSubmit={onSubmit} />)}
              </div>
            )}
          </section>
        </div>
      </main>
      <InstructionDialog c={info} onClose={() => setInfo(null)} onSubmit={onSubmit} />
      <SubmitDialog c={sub} onClose={() => setSub(null)} onDone={() => navigate("/dasbor-lama")} />
      <Footer />
    </div>
  );
}
