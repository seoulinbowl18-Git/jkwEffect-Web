import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Wallet, QrCode, Landmark, RefreshCw, Megaphone, TrendingUp, Users, PiggyBank, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Navbar } from "@/components/Navbar";
import { StatCard, StatusBadge, Tabs, Field, inputCls, PageHeader, HeaderAvatar, useRouteTab } from "@/components/Shared";
import { ImageUpload } from "@/components/ImageUpload";
import { PlatformIcon } from "@/components/PlatformIcon";
import { Profile, Saldo } from "@/pages/CreatorDashboard";
import { FeeBreakdown } from "@/components/FeeBreakdown";
import { useFees, topupQuote } from "@/lib/fees";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useSync } from "@/lib/useSync";
import { api, rp, num, errMsg, fmtDate, CATEGORIES, PLATFORMS } from "@/lib/api";

export default function BrandDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useRouteTab("campaign", {}, "/dasbor-lama");
  const [create, setCreate] = useState(false);
  const [topup, setTopup] = useState(false);
  const [key, setKey] = useState(0);
  const load = useCallback(() => { api.get("/brand/stats").then((r) => setStats(r.data)); setKey((k) => k + 1); }, []);
  const version = useSync();
  useEffect(() => { load(); }, [load, version]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageHeader eyebrow="Brand" title={user.profile?.brand_name || user.name} desc="Bayar per performa, bukan per janji." testid="dashboard-greeting" avatar={<HeaderAvatar user={{ ...user, name: user.profile?.brand_name || user.name }} />}
        actions={<>
          <button data-testid="topup-open-button" onClick={() => setTopup(true)} className="btn-light h-12"><Wallet className="h-4 w-4" /> Top up</button>
          <button data-testid="create-campaign-open-button" onClick={() => setCreate(true)} className="btn-light h-12 bg-white/15 text-white shadow-none ring-1 ring-white/50 hover:bg-white/25"><Plus className="h-4 w-4" /> Buat campaign</button>
        </>} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 pb-16 space-y-8">
        {stats && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-4">
              <StatCard testid="brand-stat-balance" big icon={Wallet} label="Saldo brand" value={rp(stats.brand_balance)} sub="Untuk campaign baru atau ditarik" />
              <StatCard testid="brand-stat-budget-left" icon={PiggyBank} label="Sisa budget campaign" value={rp(stats.budget_left)} sub={`${stats.active} campaign aktif`} />
              <StatCard testid="brand-stat-creators" icon={Users} label="Kreator terdaftar" value={num(stats.creators)} sub="Di semua campaign" />
              <StatCard testid="brand-stat-views" icon={TrendingUp} label="Total views" value={num(stats.views)} sub={`${rp(stats.spent)} dibayarkan`} />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5" data-testid="brand-review-by-admin-note"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Review konten & verifikasi views kreator ditangani Admin Pusat Gibran for 2029.</p>
          </div>
        )}
        <Tabs prefix="brand-tab" value={tab} onChange={setTab} items={[["campaign", "Campaign"], ["topup", "Dompet"], ["profil", "Profil"]]} />
        {tab === "campaign" && <BrandCampaigns key={key} onChange={load} />}
        {tab === "topup" && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground" data-testid="brand-escrow-note">Budget campaign dikunci dari saldo brand saat campaign dibuat dan hanya terpakai saat klaim views kreator disetujui. Sisa budget otomatis kembali ke saldo saat campaign ditutup atau masa berlakunya habis.</p>
            {stats && <Saldo balance={stats.brand_balance} onChange={load} />}
            <div>
              <h3 className="font-bold text-lg mb-3">Riwayat top up</h3>
              <TopupHistory key={key} onChange={load} />
            </div>
          </div>
        )}
        {tab === "profil" && <Profile />}
      </main>
      <CreateCampaign open={create} onClose={() => setCreate(false)} balance={stats?.brand_balance || 0} onDone={load} />
      <TopupDialog open={topup} onClose={() => setTopup(false)} onDone={load} />
    </div>
  );
}

const BrandCampaigns = ({ onChange }) => {
  const [items, setItems] = useState([]);
  const load = () => api.get("/brand/campaigns").then((r) => setItems(r.data));
  const syncV = useSync();
  useEffect(() => { load(); }, [syncV]); // eslint-disable-line react-hooks/exhaustive-deps
  const setStatus = async (c, status) => {
    const left = Math.max(c.budget - c.spent, 0);
    if (status === "closed" && !window.confirm(`Hentikan & tutup campaign "${c.title}"? Sisa budget ${rp(left)} langsung dikembalikan ke saldo brand.`)) return;
    try {
      const { data } = await api.patch(`/campaigns/${c.campaign_id}/status`, { status });
      if (status === "closed") toast.success(data.refund ? `Campaign ditutup. ${rp(data.refund)} kembali ke saldo brand.` : "Campaign ditutup.");
      load(); onChange();
    } catch (e) { toast.error(errMsg(e)); }
  };
  if (!items.length) return <p className="bg-card rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground" data-testid="brand-no-campaigns">Belum ada campaign. Top up saldo lalu buat campaign pertamamu.</p>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map((c) => (
        <div key={c.campaign_id} className="bg-card rounded-2xl shadow-soft p-5" data-testid={`brand-campaign-${c.campaign_id}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.category} · {rp(c.rate_per_1k)}/1K · tutup {fmtDate(c.deadline)}</p>
            </div>
            <StatusBadge s={c.status} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <div><p className="text-muted-foreground text-xs">Kreator</p><p className="font-bold" data-testid={`brand-campaign-creators-${c.campaign_id}`}>{num(c.creator_count)}</p></div>
            <div><p className="text-muted-foreground text-xs">Total views</p><p className="font-bold">{num(c.total_views)}</p></div>
            <div><p className="text-muted-foreground text-xs">Sisa budget</p><p className="font-bold">{rp(Math.max(c.budget - c.spent, 0))}</p></div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary" style={{ width: `${100 - c.budget_left_pct}%` }} /></div>
          {c.status !== "closed" && (
            <div className="mt-4 flex gap-2">
              <button data-testid={`campaign-toggle-${c.campaign_id}`} onClick={() => setStatus(c, c.status === "active" ? "paused" : "active")} className="h-9 px-4 rounded-xl bg-secondary text-sm font-semibold hover:bg-border transition-colors">{c.status === "active" ? "Jeda" : "Aktifkan"}</button>
              <button data-testid={`campaign-close-${c.campaign_id}`} onClick={() => setStatus(c, "closed")} className="h-9 px-4 rounded-xl bg-soft text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors">Hentikan / Tutup campaign</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const EMPTY = { title: "", category: "Produk", platforms: ["tiktok"], rate_per_1k: 5000, min_views: 5000, budget: 1000000, thumbnail: "", instructions: "", exclusive: false, deadline_days: 30 };

const CreateCampaign = ({ open, onClose, balance, onDone }) => {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k, n) => (e) => setF({ ...f, [k]: n ? Number(e.target.value) : e.target.value });
  const togglePlat = (p) => setF({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p] });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post("/campaigns", f); toast.success("Campaign dibuat!"); setF(EMPTY); onClose(); onDone(); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-0 shadow-soft-lg max-w-2xl max-h-[90vh] overflow-auto" data-testid="create-campaign-dialog">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader><DialogTitle>Buat campaign baru</DialogTitle><DialogDescription>Budget dipotong dari saldo brand ({rp(balance)}). Sisa budget dikembalikan saat campaign ditutup.</DialogDescription></DialogHeader>
          <Field label="Judul"><input data-testid="cc-title" required value={f.title} onChange={set("title")} className={inputCls} /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Kategori"><select data-testid="cc-category" value={f.category} onChange={set("category")} className={inputCls}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Durasi (hari)"><input data-testid="cc-days" type="number" min={1} max={180} value={f.deadline_days} onChange={set("deadline_days", 1)} className={inputCls} /></Field>
          </div>
          <Field label="Platform">
            <div className="flex gap-2 flex-wrap">
              {Object.entries(PLATFORMS).map(([k, l]) => (
                <button type="button" key={k} data-testid={`cc-platform-${k}`} onClick={() => togglePlat(k)} className={`h-10 px-3 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-colors ${f.platforms.includes(k) ? "bg-soft text-primary border-primary" : "border-border hover:bg-secondary"}`}><PlatformIcon p={k} /> {l}</button>
              ))}
            </div>
          </Field>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Rate per 1K views (Rp)"><input data-testid="cc-rate" type="number" min={500} required value={f.rate_per_1k} onChange={set("rate_per_1k", 1)} className={inputCls} /></Field>
            <Field label="Min. views"><input data-testid="cc-min-views" type="number" min={100} required value={f.min_views} onChange={set("min_views", 1)} className={inputCls} /></Field>
            <Field label="Total budget (Rp)"><input data-testid="cc-budget" type="number" min={100000} required value={f.budget} onChange={set("budget", 1)} className={inputCls} /></Field>
          </div>
          <div>
            <span className="text-sm font-semibold text-foreground/80">Foto / banner campaign (opsional)</span>
            <div className="mt-1.5"><ImageUpload value={f.thumbnail} onChange={(url) => setF((x) => ({ ...x, thumbnail: url }))} testid="cc-image" /></div>
          </div>
          <Field label="Brief & aturan"><textarea data-testid="cc-instructions" required minLength={10} rows={5} value={f.instructions} onChange={set("instructions")} className={`${inputCls} h-auto py-3`} /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold"><input data-testid="cc-exclusive" type="checkbox" checked={f.exclusive} onChange={(e) => setF({ ...f, exclusive: e.target.checked })} /> Campaign exclusive</label>
          <button data-testid="cc-submit" disabled={busy || !f.platforms.length} className="btn-primary h-12 w-full">{busy ? "Menyimpan..." : `Buat campaign (${rp(f.budget)})`}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const TopupDialog = ({ open, onClose, onDone }) => {
  const fees = useFees();
  const [amount, setAmount] = useState(1000000);
  const [type, setType] = useState("qris");
  const [bank, setBank] = useState("BCA");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    if (q.amount < fees.min_topup) { toast.error(`Minimal top up ${rp(fees.min_topup)}`); setBusy(false); return; }
    try { const { data } = await api.post("/brand/topups", { amount: q.amount, payment_type: type, channel_code: bank }); setResult(data); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const check = async () => {
    const { data } = await api.post(`/brand/topups/${result.topup_id}/check`);
    setResult(data);
    if (data.status === "paid") { toast.success("Pembayaran diterima!"); onDone(); }
    else toast("Pembayaran belum diterima");
  };
  const close = () => { setResult(null); onClose(); onDone(); };
  const q = topupQuote(amount, fees.brand_topup_fee_pct);
  const breakdown = (t) => (
    <FeeBreakdown testid="topup-breakdown"
      rows={[["Nominal saldo masuk", t.amount, { testid: "topup-net" }], [`Biaya layanan platform (${t.pct ?? t.fee_pct}%)`, t.fee, { testid: "topup-fee" }]]}
      total={["Total tagihan", t.total, "topup-total"]} />
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="rounded-2xl border-0 shadow-soft-lg max-w-md max-h-[90vh] overflow-y-auto" data-testid="topup-dialog">
        <DialogHeader><DialogTitle>Top up saldo brand</DialogTitle><DialogDescription>Pembayaran via Komerce (QRIS / Virtual Account).</DialogDescription></DialogHeader>
        {!result ? (
          <div className="space-y-4">
            <Field label="Nominal saldo yang ingin ditambahkan (Rp)"><input data-testid="topup-amount" type="number" min={fees.min_topup} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} /></Field>
            {q.amount > 0 && breakdown(q)}
            <p className="text-xs text-muted-foreground">Saldo yang masuk ke dompet brand: <b>{rp(q.amount)}</b>. Biaya layanan dibayar sekali saat top up.</p>
            <div className="grid grid-cols-2 gap-2">
              {[["qris", "QRIS", QrCode], ["bank_transfer", "Virtual Account", Landmark]].map(([k, l, I]) => (
                <button key={k} data-testid={`topup-type-${k}`} onClick={() => setType(k)} className={`h-12 rounded-xl border font-semibold flex items-center justify-center gap-2 ${type === k ? "border-primary bg-primary/5" : ""}`}><I className="h-4 w-4" /> {l}</button>
              ))}
            </div>
            {type === "bank_transfer" && (
              <select data-testid="topup-bank" value={bank} onChange={(e) => setBank(e.target.value)} className={inputCls}>{["BCA", "BNI", "BRI", "MANDIRI", "PERMATA"].map((b) => <option key={b}>{b}</option>)}</select>
            )}
            <button data-testid="topup-create-button" disabled={busy} onClick={create} className="btn-primary h-12 w-full">{busy ? "Membuat tagihan..." : `Bayar ${rp(q.total)}`}</button>
          </div>
        ) : (
          <div className="space-y-4 text-center" data-testid="topup-result">
            <p className="text-2xl font-bold" data-testid="topup-result-total">{rp(result.total ?? result.amount)}</p>
            {result.fee > 0 && <div className="text-left">{breakdown(result)}</div>}
            {result.qr_string && <div className="grid place-items-center"><QRCodeSVG value={result.qr_string} size={200} /></div>}
            {result.va_number && <div><p className="text-sm text-muted-foreground">VA {result.channel_code}</p><p className="text-2xl font-mono font-bold" data-testid="topup-va">{result.va_number}</p></div>}
            {result.payment_url && <a href={result.payment_url} target="_blank" rel="noreferrer" className="block text-primary font-semibold text-sm" data-testid="topup-payment-link">Buka halaman pembayaran</a>}
            <div><StatusBadge s={result.status} /></div>
            <button data-testid="topup-check-button" onClick={check} className="btn-outline w-full"><RefreshCw className="h-4 w-4" /> Cek status pembayaran</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TopupHistory = ({ onChange }) => {
  const [items, setItems] = useState([]);
  const load = () => api.get("/brand/topups").then((r) => setItems(r.data));
  const syncV = useSync();
  useEffect(() => { load(); }, [syncV]); // eslint-disable-line react-hooks/exhaustive-deps
  const check = async (t) => { await api.post(`/brand/topups/${t.topup_id}/check`).catch(() => {}); load(); onChange(); };
  if (!items.length) return <p className="bg-card rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Belum ada top up</p>;
  return (
    <div className="bg-card rounded-2xl shadow-soft divide-y divide-border/70">
      {items.map((t) => (
        <div key={t.topup_id} className="px-5 py-4 flex items-center gap-3" data-testid={`topup-row-${t.topup_id}`}>
          <div className="flex-1"><p className="font-bold">+{rp(t.amount)} <span className="font-normal text-xs text-muted-foreground">saldo masuk</span></p>{t.fee > 0 && <p className="text-xs text-muted-foreground">Dibayar {rp(t.total)} (biaya layanan {t.fee_pct}% {rp(t.fee)})</p>}<p className="text-xs text-muted-foreground">{t.topup_id} · {t.payment_type === "qris" ? "QRIS" : `VA ${t.channel_code}`} · {fmtDate(t.created_at)}</p></div>
          <StatusBadge s={t.status} />
          {t.status === "pending" && <button onClick={() => check(t)} className="h-9 px-3 rounded-lg border text-sm font-semibold">Cek</button>}
        </div>
      ))}
    </div>
  );
};
