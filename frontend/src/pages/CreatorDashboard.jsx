import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Search, ExternalLink, Wallet, TrendingUp, Clock, Video, LogOut, Banknote, ChevronRight, Upload } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StreakBanner } from "@/components/StreakBanner";
import { StatCard, StatusBadge, Chips, Tabs, Empty, Field, inputCls, PageHeader, HeaderAvatar, panelCls, useRouteTab } from "@/components/Shared";
import { PlatformIcon } from "@/components/PlatformIcon";
import { SocialAccounts } from "@/components/SocialAccounts";
import { ProofGallery } from "@/components/ProofGallery";
import { FeeBreakdown } from "@/components/FeeBreakdown";
import { LedgerList } from "@/components/LedgerList";
import { useFees, withdrawQuote } from "@/lib/fees";
import { minEstimate } from "@/lib/claimGuide";
import { useAuth } from "@/context/AuthContext";
import { useSync } from "@/lib/useSync";
import { api, rp, num, errMsg, fmtDate } from "@/lib/api";

const FILTERS = [["", "Semua"], ["menunggu_views", "Siap Diklaim"], ["direview", "Direview"], ["diproses", "Dicek views"], ["disetujui", "Selesai"], ["ditolak", "Ditolak"]];
const METHODS = ["BCA", "Mandiri", "BRI", "BNI", "DANA", "GoPay", "OVO", "ShopeePay"];

export default function CreatorDashboard() {
  const { user } = useAuth();
  const fees = useFees();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useRouteTab("submission", {}, "/dasbor-lama");
  const load = useCallback(() => api.get("/creator/stats").then((r) => setStats(r.data)), []);
  const version = useSync();
  useEffect(() => { load(); }, [load, version]);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageHeader eyebrow="Kreator" title={`Halo, ${user.name.split(" ")[0]}`} desc="Bikin viral, dapet cuan." testid="dashboard-greeting" avatar={<HeaderAvatar user={user} />}
        actions={<button data-testid="find-campaign-button" onClick={() => navigate("/jelajah")} className="btn-light h-12">Jelajah campaign <ArrowRight className="h-4 w-4" /></button>} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 pb-16 space-y-8">
        {stats && tab !== "profil" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-4">
              <StatCard testid="stat-balance" big icon={Wallet} label="Saldo aktif" value={rp(stats.balance)} sub={`Min. penarikan ${rp(fees.min_withdraw)} · biaya platform ${fees.creator_withdraw_fee_pct}%`} />
              <StatCard testid="stat-total" icon={TrendingUp} label="Total pendapatan" value={rp(stats.total_earned)} sub="Sejak gabung" />
              <StatCard testid="stat-pending" icon={Clock} label="Estimasi pending" value={rp(stats.pending)} sub="Dari video yang lagi diproses" />
              <StatCard testid="stat-videos" icon={Video} label="Video terdaftar" value={stats.videos} sub={`Di ${stats.campaigns} campaign`} />
            </div>
            {tab === "submission" && <StreakBanner data={stats.streak} />}
          </>
        )}
        <Tabs prefix="creator-tab" value={tab} onChange={setTab} items={[["submission", "Konten saya"], ["saldo", "Dompet"], ["profil", "Profil"]]} />
        {tab === "submission" && <Submissions onChange={load} />}
        {tab === "saldo" && stats && <Saldo balance={stats.balance} onChange={load} />}
        {tab === "profil" && <Profile />}
      </main>
    </div>
  );
}

const Submissions = ({ onChange }) => {
  const [items, setItems] = useState([]);
  const [f, setF] = useState("");
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const load = () => api.get("/creator/submissions").then((r) => setItems(r.data));
  const syncV = useSync();
  useEffect(() => { load(); }, [syncV]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = items.filter((s) => (!f || s.status === f || (f === "diproses" && s.status === "verifying")) && s.campaign_title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input data-testid="submission-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari campaign..." className={`${inputCls} pl-10 h-12`} />
      </div>
      <ReadyToClaimBanner items={items.filter((s) => s.status === "menunggu_views")} active={f === "menunggu_views"} onClick={() => setF("menunggu_views")} />
      <Chips prefix="submission-filter" items={FILTERS.map(([v, l]) => { const n = v ? items.filter((s) => s.status === v || (v === "diproses" && s.status === "verifying")).length : 0; return [v, n ? `${l} (${n})` : l]; })} value={f} onChange={setF} />
      {shown.length === 0 ? (
        <Empty title="Belum ada submission" desc="Video yang kamu daftarkan ke kampanye akan muncul di sini.">
          <button data-testid="start-earning-button" onClick={() => navigate("/jelajah")} className="btn-primary">Jelajah campaign</button>
        </Empty>
      ) : (
        <div className={`${panelCls} divide-y divide-border/70 overflow-hidden`}>
          {shown.map((s) => (
            <div key={s.submission_id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`submission-row-${s.submission_id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><PlatformIcon p={s.platform} /><p className="font-bold truncate">{s.campaign_title}</p></div>
                <a href={s.video_url} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 truncate">{s.video_url} <ExternalLink className="h-3 w-3 shrink-0" /></a>
                {s.note && <p className="text-xs text-red-600 mt-1">{s.note}</p>}
                {s.proofs?.length > 0 && <div className="mt-2"><ProofGallery proofs={s.proofs} testid={`submission-proofs-${s.submission_id}`} /></div>}
              </div>
              <div className="text-sm text-muted-foreground sm:text-right">
                {s.status === "disetujui" ? <p className="font-bold text-success" data-testid="submission-payout">+{rp(s.payout)}</p> : s.claimed_views > 0 && <p>{num(s.claimed_views)} views diklaim</p>}
                <p className="text-xs">{fmtDate(s.created_at)}</p>
              </div>
              <StatusBadge s={s.status} />
              {s.status === "menunggu_views" && (
                <button data-testid={`claim-button-${s.submission_id}`} onClick={() => navigate(`/klaim/${s.submission_id}`)} className="btn-primary h-9 px-4 text-xs"><Upload className="h-3.5 w-3.5" /> Klaim</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Ringkasan konten siap diklaim + estimasi minimal rupiahnya (views minimum × rate). */
const ReadyToClaimBanner = ({ items, active, onClick }) => {
  if (!items.length) return null;
  return (
    <button type="button" onClick={onClick} disabled={active} data-testid="ready-to-claim-banner"
      className="w-full text-left bg-card-gradient text-white rounded-2xl shadow-glow p-4 sm:p-5 flex items-center gap-4 disabled:cursor-default">
      <span className="h-12 w-12 shrink-0 rounded-xl bg-white/15 grid place-items-center"><Banknote className="h-6 w-6" /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-lg font-extrabold" data-testid="ready-to-claim-count">{items.length} video siap diklaim</span>
        <span className="block font-bold" data-testid="ready-to-claim-total">Estimasi min. {rp(minEstimate(items))}</span>
        <span className="block text-sm text-white/85">Kirim rekaman layar analitik untuk mencairkan.</span>
      </span>
      {!active && <ChevronRight className="h-5 w-5 shrink-0" />}
    </button>
  );
};

export const Saldo = ({ balance, onChange }) => {
  const { user } = useAuth();
  const brand = user.role === "brand";
  const fees = useFees();
  const pct = brand ? fees.brand_withdraw_fee_pct : fees.creator_withdraw_fee_pct;
  const min = fees.min_withdraw;
  const p = user.profile || {};
  const [form, setForm] = useState({ amount: "", method: p.bank_method || "BCA", account_number: p.bank_account || "", account_holder: p.bank_holder || "" });
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const base = brand ? "/brand/withdrawals" : "/creator/withdrawals";
  const load = () => api.get(base).then((r) => setList(r.data));
  const syncV = useSync();
  useEffect(() => { load(); }, [syncV, base]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const q = withdrawQuote(form.amount, pct);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(brand ? "/brand/withdrawals" : "/withdrawals", { ...form, amount: Number(form.amount) });
      toast.success(`Penarikan ${rp(q.amount)} diproses. Dana diterima ${rp(q.net)}.`);
      setForm({ ...form, amount: "" }); load(); onChange(); setTick((t) => t + 1);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-6">
      <form onSubmit={submit} className="bg-card rounded-2xl shadow-soft p-6 space-y-4 h-fit" data-testid="withdraw-form">
        <h3 className="font-bold text-lg flex items-center gap-3"><span className="icon-tile h-9 w-9 rounded-lg"><Wallet className="h-4 w-4" /></span> Tarik saldo</h3>
        {brand && <p className="text-sm text-muted-foreground">Cairkan saldo brand yang mengendap, termasuk sisa budget campaign yang sudah dikembalikan.</p>}
        {balance < min && <p className="text-sm bg-amber-50 text-amber-900 rounded-xl p-3" data-testid="withdraw-min-warning">Saldo kamu belum mencapai minimal penarikan {rp(min)}.</p>}
        <Field label="Nominal penarikan (Rp)"><input data-testid="withdraw-amount-input" type="number" min={min} max={balance} required value={form.amount} onChange={set("amount")} className={inputCls} /></Field>
        {q.amount > 0 && (
          <FeeBreakdown testid="withdraw-breakdown"
            rows={[["Nominal penarikan", q.amount, { testid: "withdraw-gross" }], [`Biaya platform (${pct}%)`, q.fee, { minus: true, testid: "withdraw-fee" }]]}
            total={["Total dana diterima bersih", q.net, "withdraw-net"]} />
        )}
        <Field label="Tujuan">
          <select data-testid="withdraw-method-select" value={form.method} onChange={set("method")} className={inputCls}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
        </Field>
        <Field label="No. rekening / HP"><input data-testid="withdraw-account-input" required value={form.account_number} onChange={set("account_number")} className={inputCls} /></Field>
        <Field label="Nama pemilik"><input data-testid="withdraw-holder-input" required value={form.account_holder} onChange={set("account_holder")} className={inputCls} /></Field>
        <button data-testid="withdraw-submit-button" disabled={busy || balance < min} className="btn-primary w-full">{q.amount > 0 ? `Konfirmasi penarikan · terima ${rp(q.net)}` : "Ajukan penarikan"}</button>
      </form>
      <div className="space-y-6 min-w-0">
      <div className="bg-card rounded-2xl shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-border/70 font-bold">Riwayat penarikan</div>
        {list.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Belum ada penarikan</p> : (
          <div className="divide-y divide-border/70">
            {list.map((w) => (
              <div key={w.withdrawal_id} className="px-6 py-4 flex items-center gap-4" data-testid={`withdrawal-row-${w.withdrawal_id}`}>
                <div className="flex-1">
                  <p className="font-bold">{rp(w.net_amount ?? w.amount)} <span className="font-normal text-xs text-muted-foreground">diterima</span></p>
                  {w.fee > 0 && <p className="text-xs text-muted-foreground">Ditarik {rp(w.amount)} · biaya platform {w.fee_pct}% {rp(w.fee)}</p>}
                  <p className="text-xs text-muted-foreground">{w.method} · {w.account_number} · {fmtDate(w.created_at)}</p>
                  {w.reference && <p className="text-xs text-muted-foreground">Ref: {w.reference}</p>}
                </div>
                <StatusBadge s={w.status} />
              </div>
            ))}
          </div>
        )}
      </div>
        <LedgerList reload={tick} />
      </div>
    </div>
  );
};

export const Profile = () => {
  const { user, setUser, logout } = useAuth();
  const p = user.profile || {};
  const [form, setForm] = useState(user.role === "brand"
    ? { name: user.name, brand_name: p.brand_name || "" }
    : { name: user.name, bank_method: p.bank_method || "", bank_account: p.bank_account || "", bank_holder: p.bank_holder || "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try { const { data } = await api.put("/users/profile", form); setUser(data); toast.success("Profil disimpan"); }
    catch (err) { toast.error(errMsg(err)); }
  };
  const fields = user.role === "brand" ? [["name", "Nama"], ["brand_name", "Nama brand"]] : [["name", "Nama"], ["bank_method", "Bank / e-wallet"], ["bank_account", "No. rekening / HP"], ["bank_holder", "Nama pemilik rekening"]];
  return (
    <div className="space-y-6">
    {user.role === "creator" && <SocialAccounts />}
    <form onSubmit={save} className="bg-card rounded-2xl shadow-soft p-6 grid sm:grid-cols-2 gap-4 max-w-3xl" data-testid="profile-form">
      <p className="sm:col-span-2 text-sm text-muted-foreground">{user.email}</p>
      {fields.map(([k, l]) => <Field key={k} label={l}><input data-testid={`profile-${k}`} value={form[k]} onChange={set(k)} className={inputCls} /></Field>)}
      <div className="sm:col-span-2 flex flex-wrap gap-3 pt-2">
        <button data-testid="profile-save-button" className="btn-primary">Simpan</button>
        <button type="button" data-testid="profile-logout-button" onClick={logout} className="btn-outline"><LogOut className="h-4 w-4" /> Keluar</button>
      </div>
    </form>
    </div>
  );
};
