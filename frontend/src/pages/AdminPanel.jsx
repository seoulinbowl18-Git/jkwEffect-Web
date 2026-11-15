import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Users, Megaphone, AlertCircle, Banknote, ShieldCheck, Plus, Pencil, Pause, Play, Lock, Trash2, Search,
  BadgeCheck, Ban, Wallet, History, Radio, Building2, User as UserIcon, Phone, TrendingUp,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StatCard, StatusBadge, Chips, Tabs, PageHeader, Field, inputCls, panelCls, useRouteTab } from "@/components/Shared";
import { ReviewList } from "@/components/ReviewList";
import { ImageUpload } from "@/components/ImageUpload";
import { PlatformIcon } from "@/components/PlatformIcon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useSync } from "@/lib/useSync";
import { api, rp, num, errMsg, fmtDate, CATEGORIES, PLATFORMS } from "@/lib/api";

const DEFAULT_INSTRUCTIONS = "1. Buat video 15-60 detik yang menampilkan produk secara natural.\n2. Sebutkan nama brand di 3 detik pertama.\n3. Wajib pakai hashtag #GIBRAN2029 dan tag akun brand.\n4. Dilarang konten SARA, kekerasan, atau beli views/bot.\n5. Video harus tetap tayang minimal 30 hari.";
const ROLE_LABEL = { creator: "Kreator", brand: "Brand", admin: "Admin" };
const smallBtn = "h-9 px-3 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 transition-colors";
const neutralBtn = `${smallBtn} bg-secondary hover:bg-border`;
const dangerBtn = `${smallBtn} bg-soft text-primary hover:bg-primary hover:text-white`;

export default function AdminPanel() {
  const { user } = useAuth();
  const isOwner = Boolean(user?.is_owner);
  const version = useSync();
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useRouteTab("campaigns", {}, "/admin");
  const [editing, setEditing] = useState(null); // null | {} (new) | campaign
  const load = useCallback(() => api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load, version]);

  // Review konten, cek views & verifikasi bukti klaim hanya untuk Owner (Admin Pusat).
  const tabs = [["campaigns", "Campaign"], ["users", "Pengguna"], ["withdrawals", "Penarikan"]];
  if (isOwner) tabs.push(["submissions", "Verifikasi konten"], ["audit", "Log aktivitas"]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageHeader eyebrow={isOwner ? "Owner Control Center" : "Admin"} title="Admin Pusat" testid="admin-title"
        desc="Kelola campaign, pengguna, saldo, dan penarikan untuk web dan aplikasi."
        avatar={<span className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full bg-white text-primary grid place-items-center ring-4 ring-white/30"><ShieldCheck className="h-7 w-7" /></span>}
        actions={isOwner && (
          <button data-testid="owner-create-campaign" onClick={() => setEditing({})} className="btn-light h-12"><Plus className="h-4 w-4" /> Buat campaign</button>
        )} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 pb-16 space-y-6">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4">
            <StatCard testid="admin-stat-pending" big icon={AlertCircle} label="Perlu tindakan" value={stats.pending_submissions + stats.pending_withdrawals} sub={`${stats.pending_submissions} konten · ${stats.pending_withdrawals} penarikan`} />
            <StatCard testid="admin-stat-users" icon={Users} label="Kreator / Brand" value={`${num(stats.creators)} / ${num(stats.brands)}`} />
            <StatCard testid="admin-stat-campaigns" icon={Megaphone} label="Campaign aktif" value={num(stats.active_campaigns)} sub={`${num(stats.total_views)} views terverifikasi`} />
            <StatCard testid="admin-stat-paid" icon={Banknote} label="Total ditransfer" value={rp(stats.total_paid)} />
            <StatCard testid="admin-stat-revenue" icon={TrendingUp} label="Pendapatan platform" value={rp(stats.platform_revenue || 0)}
              sub={`Fee top up ${rp(stats.revenue_topup_fee || 0)} · fee tarik ${rp(stats.revenue_withdraw_fee || 0)}`} />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs prefix="admin-tab" value={tab} onChange={setTab} items={tabs} />
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-success" title="Perubahan dari web dan aplikasi muncul otomatis">
            <Radio className="h-3.5 w-3.5 animate-pulse" /> Sinkron real-time
          </span>
        </div>

        {!isOwner && (
          <div className="rounded-2xl bg-soft text-primary-dark p-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid="owner-required-banner">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <p className="text-sm flex-1">Kamu masuk sebagai admin moderasi. Review & verifikasi konten kreator, buat, ubah, dan hapus campaign, edit saldo, serta tangguhkan akun hanya bisa dilakukan oleh <b>Owner</b> lewat login OTP WhatsApp.</p>
            <Link to="/admin/login" className="btn-primary h-10 shrink-0"><Phone className="h-4 w-4" /> Masuk sebagai Owner</Link>
          </div>
        )}

        {tab === "campaigns" && <CampaignsTab isOwner={isOwner} version={version} onEdit={setEditing} onChange={load} />}
        {tab === "users" && <UsersTab isOwner={isOwner} version={version} onChange={load} />}
        {tab === "withdrawals" && <WithdrawalsTab version={version} onChange={load} />}
        {tab === "submissions" && isOwner && <SubmissionsTab version={version} onChange={load} />}
        {tab === "audit" && isOwner && <AuditTab version={version} />}
      </main>
      <CampaignDialog campaign={editing} onClose={() => setEditing(null)} onDone={load} />
    </div>
  );
}

const SearchBox = ({ value, onChange, placeholder, testid }) => (
  <div className="relative flex-1 min-w-[220px]">
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <input data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} pl-10`} />
  </div>
);

const EmptyRow = ({ children }) => <p className={`${panelCls} p-10 text-center text-sm text-muted-foreground`}>{children}</p>;

// ---------------------------------------------------------------- Campaigns
const CampaignsTab = ({ isOwner, version, onEdit, onChange }) => {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState("");
  const load = useCallback(() => api.get("/admin/campaigns").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load, version]);

  const shown = useMemo(() => (items || []).filter((c) => (!f || c.status === f)
    && `${c.title} ${c.brand_name}`.toLowerCase().includes(q.toLowerCase())), [items, q, f]);

  const act = async (c, fn, ok) => {
    try { await fn(); toast.success(ok); load(); onChange(); } catch (e) { toast.error(errMsg(e)); }
  };
  const setStatus = (c, status) => {
    if (status === "closed" && !window.confirm(`Tutup "${c.title}"? Konten yang belum selesai ditolak dan sisa budget dikembalikan ke brand.`)) return;
    act(c, () => api.patch(`/campaigns/${c.campaign_id}/status`, { status }), status === "paused" ? "Campaign dijeda" : status === "active" ? "Campaign aktif" : "Campaign ditutup");
  };
  const remove = (c) => {
    if (!window.confirm(`Hapus "${c.title}"? Campaign ditutup (sisa budget dikembalikan ke brand) lalu disembunyikan dari web dan aplikasi. Riwayat konten tetap tersimpan.`)) return;
    act(c, () => api.delete(`/admin/campaigns/${c.campaign_id}`), "Campaign dihapus");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchBox value={q} onChange={setQ} placeholder="Cari judul campaign atau brand..." testid="admin-campaign-search" />
        <Chips prefix="admin-campaign-filter" value={f} onChange={setF} items={[["", "Semua"], ["active", "Aktif"], ["paused", "Dijeda"], ["closed", "Ditutup"]]} />
      </div>
      {items && !shown.length && <EmptyRow>Tidak ada campaign.</EmptyRow>}
      <div className="grid md:grid-cols-2 gap-4">
        {shown.map((c) => (
          <div key={c.campaign_id} className={`${panelCls} p-5 flex flex-col`} data-testid={`admin-campaign-${c.campaign_id}`}>
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                {c.thumbnail && <img src={c.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold leading-snug line-clamp-2">{c.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.brand_name} · {c.category}{c.exclusive ? " · Exclusive" : ""}{c.funded_by === "owner" ? " · Dibiayai Owner" : ""}</p>
              </div>
              <StatusBadge s={c.status} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <div><p className="text-muted-foreground text-xs">Rate</p><p className="font-bold">{rp(c.rate_per_1k)}/1K</p></div>
              <div><p className="text-muted-foreground text-xs">Terpakai</p><p className="font-bold">{rp(c.spent)}</p></div>
              <div><p className="text-muted-foreground text-xs">Budget</p><p className="font-bold">{rp(c.budget)}</p></div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-button-gradient" style={{ width: `${100 - c.budget_left_pct}%` }} /></div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex gap-1 text-foreground/70">{c.platforms.map((p) => <PlatformIcon key={p} p={p} />)}</span>
              <span>· {num(c.submission_count)} video · tutup {fmtDate(c.deadline)}</span>
            </div>
            {c.status !== "closed" && (
              <div className="mt-4 pt-4 border-t border-border/70 flex flex-wrap gap-2">
                {isOwner && <button data-testid={`admin-campaign-edit-${c.campaign_id}`} onClick={() => onEdit(c)} className={neutralBtn}><Pencil className="h-3.5 w-3.5" /> Edit</button>}
                <button data-testid={`admin-campaign-toggle-${c.campaign_id}`} onClick={() => setStatus(c, c.status === "active" ? "paused" : "active")} className={neutralBtn}>
                  {c.status === "active" ? <><Pause className="h-3.5 w-3.5" /> Jeda</> : <><Play className="h-3.5 w-3.5" /> Aktifkan</>}
                </button>
                <button data-testid={`admin-campaign-close-${c.campaign_id}`} onClick={() => setStatus(c, "closed")} className={neutralBtn}><Lock className="h-3.5 w-3.5" /> Tutup</button>
                {isOwner && <button data-testid={`admin-campaign-delete-${c.campaign_id}`} onClick={() => remove(c)} className={`${dangerBtn} ml-auto`}><Trash2 className="h-3.5 w-3.5" /> Hapus</button>}
              </div>
            )}
            {c.status === "closed" && isOwner && (
              <div className="mt-4 pt-4 border-t border-border/70 flex">
                <button onClick={() => remove(c)} className={`${dangerBtn} ml-auto`}><Trash2 className="h-3.5 w-3.5" /> Hapus</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const emptyForm = (c) => ({
  brand_id: c?.brand_id || "", title: c?.title || "", category: c?.category || "Produk", platforms: c?.platforms || ["tiktok"],
  rate_per_1k: c?.rate_per_1k ?? 5000, min_views: c?.min_views ?? 1000, budget: c?.budget ?? 1000000,
  thumbnail: c?.thumbnail || "", instructions: c?.instructions || DEFAULT_INSTRUCTIONS, exclusive: Boolean(c?.exclusive),
  deadline_days: 30, deadline: c?.deadline ? c.deadline.slice(0, 10) : "", charge_brand: false,
});

const CampaignDialog = ({ campaign, onClose, onDone }) => {
  const open = campaign !== null;
  const isNew = open && !campaign.campaign_id;
  const [f, setF] = useState(emptyForm());
  const [brands, setBrands] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    setF(emptyForm(campaign));
    if (isNew) api.get("/admin/users").then((r) => setBrands(r.data.filter((u) => u.role === "brand" && u.status !== "suspended"))).catch(() => {});
  }, [open, isNew, campaign]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const togglePlat = (p) => setF({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p] });
  const brand = brands.find((b) => b.user_id === f.brand_id);

  const submit = async (e) => {
    e.preventDefault();
    if (!f.platforms.length) return toast.error("Pilih minimal satu platform");
    setBusy(true);
    const base = { title: f.title, category: f.category, platforms: f.platforms, rate_per_1k: Number(f.rate_per_1k),
      min_views: Number(f.min_views), budget: Number(f.budget), thumbnail: f.thumbnail, instructions: f.instructions, exclusive: f.exclusive };
    try {
      if (isNew) {
        if (!f.brand_id) throw new Error("Pilih brand pemilik campaign");
        await api.post("/admin/campaigns", { ...base, brand_id: f.brand_id, charge_brand: f.charge_brand, deadline_days: Number(f.deadline_days) });
        toast.success("Campaign dibuat dan langsung tampil di web & aplikasi");
      } else {
        await api.put(`/admin/campaigns/${campaign.campaign_id}`, { ...base, ...(f.deadline ? { deadline: new Date(`${f.deadline}T23:59:00+07:00`).toISOString() } : {}) });
        toast.success("Perubahan disimpan");
      }
      onClose(); onDone();
    } catch (err) {
      toast.error(err.response ? errMsg(err) : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-0 shadow-soft-lg max-w-2xl max-h-[90vh] overflow-auto" data-testid="owner-campaign-dialog">
        <DialogHeader>
          <DialogTitle>{isNew ? "Buat campaign" : "Edit campaign"}</DialogTitle>
          <DialogDescription>{isNew ? "Campaign langsung aktif di web dan aplikasi." : `${campaign?.brand_name} · terpakai ${rp(campaign?.spent)}`}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          {isNew && (
            <Field label="Brand">
              <select data-testid="owner-cc-brand" required value={f.brand_id} onChange={set("brand_id")} className={inputCls}>
                <option value="">Pilih brand…</option>
                {brands.map((b) => <option key={b.user_id} value={b.user_id}>{b.profile?.brand_name || b.name} · saldo {rp(b.brand_balance)}</option>)}
              </select>
            </Field>
          )}
          <div className={isNew ? "" : "sm:col-span-2"}>
            <Field label="Judul"><input data-testid="owner-cc-title" required minLength={3} maxLength={120} value={f.title} onChange={set("title")} className={inputCls} /></Field>
          </div>
          <Field label="Kategori"><select value={f.category} onChange={set("category")} className={inputCls}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Rate per 1.000 views (Rp)"><input type="number" min={500} required value={f.rate_per_1k} onChange={set("rate_per_1k")} className={inputCls} /></Field>
          <Field label="Minimal views"><input type="number" min={100} required value={f.min_views} onChange={set("min_views")} className={inputCls} /></Field>
          <Field label="Budget (Rp)"><input data-testid="owner-cc-budget" type="number" min={100000} required value={f.budget} onChange={set("budget")} className={inputCls} /></Field>
          {isNew
            ? <Field label="Durasi (hari)"><input type="number" min={1} max={180} value={f.deadline_days} onChange={set("deadline_days")} className={inputCls} /></Field>
            : <Field label="Tanggal tutup"><input type="date" value={f.deadline} onChange={set("deadline")} className={inputCls} /></Field>}
          <div className="sm:col-span-2">
            <Field label="Platform">
              <div className="flex flex-wrap gap-2">
                {Object.entries(PLATFORMS).map(([k, l]) => (
                  <button type="button" key={k} onClick={() => togglePlat(k)}
                    className={`h-10 px-3 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-colors ${f.platforms.includes(k) ? "bg-soft text-primary border-primary" : "border-border hover:bg-secondary"}`}>
                    <PlatformIcon p={k} /> {l}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <span className="text-sm font-semibold text-foreground/80">Foto / banner campaign (opsional)</span>
            <div className="mt-1.5"><ImageUpload value={f.thumbnail} onChange={(url) => setF((x) => ({ ...x, thumbnail: url }))} testid="owner-cc-image" /></div>
          </div>
          <div className="sm:col-span-2">
            <Field label="Instruksi untuk kreator">
              <textarea data-testid="owner-cc-instructions" required minLength={10} rows={6} value={f.instructions} onChange={set("instructions")} className={`${inputCls} h-auto py-3 leading-relaxed`} />
            </Field>
          </div>
          <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={f.exclusive} onChange={set("exclusive")} className="h-4 w-4 accent-primary" /> Campaign exclusive</label>
          {isNew && (
            <label className="flex items-start gap-3 text-sm font-medium">
              <input type="checkbox" checked={f.charge_brand} onChange={set("charge_brand")} className="h-4 w-4 mt-0.5 accent-primary" />
              <span>Potong budget dari saldo brand{brand ? ` (${rp(brand.brand_balance)})` : ""}<span className="block text-xs text-muted-foreground font-normal">Jika tidak dicentang, budget dibiayai Owner dan tidak dikembalikan ke brand saat ditutup.</span></span>
            </label>
          )}
          {!isNew && campaign?.funded_by !== "owner" && (
            <p className="sm:col-span-2 text-xs text-muted-foreground bg-secondary rounded-xl p-3">Mengubah budget menyesuaikan saldo brand: kenaikan dipotong dari saldo brand, penurunan dikembalikan ke saldo brand.</p>
          )}
          <button data-testid="owner-cc-submit" disabled={busy} className="btn-primary sm:col-span-2 h-12">{busy ? "Menyimpan..." : isNew ? "Buat campaign" : "Simpan perubahan"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------- Users
const UsersTab = ({ isOwner, version, onChange }) => {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState("");
  const [balanceFor, setBalanceFor] = useState(null);
  const [ledgerFor, setLedgerFor] = useState(null);
  const load = useCallback(() => api.get("/admin/users").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load, version]);

  const shown = useMemo(() => (items || []).filter((u) => {
    if (f === "suspended") { if (u.status !== "suspended") return false; } else if (f && u.role !== f) return false;
    return `${u.name} ${u.email} ${u.phone || ""} ${u.profile?.brand_name || ""}`.toLowerCase().includes(q.toLowerCase());
  }), [items, q, f]);

  const patch = async (u, body, ok) => {
    try { await api.patch(`/admin/users/${u.user_id}`, body); toast.success(ok); load(); onChange(); } catch (e) { toast.error(errMsg(e)); }
  };
  const suspend = (u) => {
    const reason = window.prompt(`Tangguhkan ${u.name}? Akun akan keluar dari web dan aplikasi. Alasan:`);
    if (reason === null) return;
    patch(u, { status: "suspended", suspend_reason: reason }, "Akun ditangguhkan");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <SearchBox value={q} onChange={setQ} placeholder="Cari nama, email, atau nomor..." testid="admin-user-search" />
        <Chips prefix="admin-user-filter" value={f} onChange={setF} items={[["", "Semua"], ["creator", "Kreator"], ["brand", "Brand"], ["admin", "Admin"], ["suspended", "Ditangguhkan"]]} />
      </div>
      {items && !shown.length && <EmptyRow>Tidak ada pengguna.</EmptyRow>}
      {shown.length > 0 && (
        <div className={`${panelCls} divide-y divide-border/70 overflow-hidden`}>
          {shown.map((u) => {
            const bal = u.role === "brand" ? u.brand_balance : u.balance;
            return (
              <div key={u.user_id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-3" data-testid={`admin-user-${u.user_id}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="h-10 w-10 rounded-full bg-soft text-primary grid place-items-center font-bold shrink-0 overflow-hidden">
                    {u.picture ? <img src={u.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : (u.role === "brand" ? <Building2 className="h-5 w-5" /> : u.name?.[0]?.toUpperCase() || <UserIcon className="h-5 w-5" />)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold truncate flex items-center gap-1.5">
                      {u.role === "brand" ? u.profile?.brand_name || u.name : u.name}
                      {u.verified && <BadgeCheck className="h-4 w-4 text-primary shrink-0" aria-label="Terverifikasi" />}
                      {u.is_owner && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-card-gradient text-white">Owner</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.phone || u.email} · bergabung {fmtDate(u.created_at)}</p>
                    {u.status === "suspended" && u.suspend_reason && <p className="text-xs text-red-600 truncate">Alasan: {u.suspend_reason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary">{ROLE_LABEL[u.role] || "Belum pilih"}</span>
                  {u.status === "suspended" && <StatusBadge s="suspended" />}
                  {(u.role === "creator" || u.role === "brand") && <span className="text-sm font-bold tabular-nums w-32 text-right">{rp(bal)}</span>}
                </div>
                {isOwner && !u.is_owner && (
                  <div className="flex flex-wrap gap-2">
                    <button data-testid={`admin-verify-${u.user_id}`} onClick={() => patch(u, { verified: !u.verified }, u.verified ? "Verifikasi dicabut" : "Akun diverifikasi")} className={neutralBtn}>
                      <BadgeCheck className="h-3.5 w-3.5" /> {u.verified ? "Cabut" : "Verifikasi"}
                    </button>
                    {(u.role === "creator" || u.role === "brand") && <button data-testid={`admin-balance-${u.user_id}`} onClick={() => setBalanceFor(u)} className={neutralBtn}><Wallet className="h-3.5 w-3.5" /> Saldo</button>}
                    <button onClick={() => setLedgerFor(u)} className={neutralBtn} aria-label="Riwayat saldo"><History className="h-3.5 w-3.5" /></button>
                    {u.status === "suspended"
                      ? <button data-testid={`admin-activate-${u.user_id}`} onClick={() => patch(u, { status: "active" }, "Akun diaktifkan kembali")} className={neutralBtn}><Play className="h-3.5 w-3.5" /> Aktifkan</button>
                      : <button data-testid={`admin-suspend-${u.user_id}`} onClick={() => suspend(u)} className={dangerBtn}><Ban className="h-3.5 w-3.5" /> Tangguhkan</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <BalanceDialog u={balanceFor} onClose={() => setBalanceFor(null)} onDone={() => { load(); onChange(); }} />
      <LedgerDialog u={ledgerFor} onClose={() => setLedgerFor(null)} />
    </div>
  );
};

const BalanceDialog = ({ u, onClose, onDone }) => {
  const [mode, setMode] = useState("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { setMode("add"); setAmount(""); setNote(""); }, [u]);
  if (!u) return null;
  const field = u.role === "brand" ? "brand_balance" : "balance";
  const current = u[field] || 0;
  const delta = (mode === "add" ? 1 : -1) * Number(amount || 0);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/admin/users/${u.user_id}/balance`, { field, delta, note });
      toast.success(`Saldo ${mode === "add" ? "ditambah" : "dikurangi"} ${rp(Math.abs(delta))}`);
      onClose(); onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-0 shadow-soft-lg max-w-md" data-testid="owner-balance-dialog">
        <DialogHeader>
          <DialogTitle>Edit saldo</DialogTitle>
          <DialogDescription>{u.profile?.brand_name || u.name} · {u.role === "brand" ? "Saldo brand" : "Saldo kreator"} saat ini <b>{rp(current)}</b></DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-secondary">
            {[["add", "Tambah"], ["sub", "Kurangi"]].map(([k, l]) => (
              <button type="button" key={k} onClick={() => setMode(k)} className={`h-10 rounded-full text-sm font-semibold ${mode === k ? "bg-card text-primary shadow-soft" : "text-muted-foreground"}`}>{l}</button>
            ))}
          </div>
          <Field label="Nominal (Rp)"><input data-testid="owner-balance-amount" type="number" min={1} max={mode === "sub" ? current : undefined} required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} /></Field>
          <Field label="Catatan (wajib, tercatat di riwayat)"><input data-testid="owner-balance-note" required minLength={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. Bonus campaign Oktober" className={inputCls} /></Field>
          <p className="text-sm">Saldo setelahnya: <b className={delta < 0 ? "text-primary" : "text-success"}>{rp(current + delta)}</b></p>
          <button data-testid="owner-balance-submit" disabled={busy || !amount} className="btn-primary w-full h-12">{busy ? "Menyimpan..." : "Simpan"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const LEDGER_LABEL = { earning: "Pendapatan", withdraw_hold: "Penarikan", withdraw_refund: "Penarikan dikembalikan", topup: "Top up",
  campaign_budget: "Budget campaign", campaign_refund: "Refund campaign", admin_credit: "Kredit admin", owner_adjust: "Penyesuaian Owner" };

const LedgerDialog = ({ u, onClose }) => {
  const [items, setItems] = useState(null);
  useEffect(() => { if (u) { setItems(null); api.get(`/admin/users/${u.user_id}/ledger`).then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e))); } }, [u]);
  return (
    <Dialog open={!!u} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-0 shadow-soft-lg max-w-lg max-h-[85vh] overflow-auto">
        <DialogHeader><DialogTitle>Riwayat saldo</DialogTitle><DialogDescription>{u?.profile?.brand_name || u?.name}</DialogDescription></DialogHeader>
        {items && !items.length && <p className="text-sm text-muted-foreground py-6 text-center">Belum ada transaksi.</p>}
        <div className="divide-y divide-border/70">
          {(items || []).map((x) => (
            <div key={x.entry_id} className="py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{LEDGER_LABEL[x.type] || x.type}</p>
                <p className="text-xs text-muted-foreground truncate">{fmtDate(x.created_at)}{x.note ? ` · ${x.note}` : ""}</p>
              </div>
              <p className={`text-sm font-bold tabular-nums ${x.amount < 0 ? "text-primary" : "text-success"}`}>{x.amount < 0 ? "−" : "+"}{rp(Math.abs(x.amount))}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------- Withdrawals
const WithdrawalsTab = ({ version, onChange }) => {
  const [items, setItems] = useState(null);
  const [f, setF] = useState("diproses");
  const [acting, setActing] = useState(null); // {w, action}
  const load = useCallback(() => api.get("/admin/withdrawals").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e))), []);
  useEffect(() => { load(); }, [load, version]);
  const shown = (items || []).filter((w) => !f || w.status === f);

  return (
    <div className="space-y-4">
      <Chips prefix="admin-wd-filter" value={f} onChange={setF} items={[["diproses", "Menunggu"], ["disetujui", "Ditransfer"], ["ditolak", "Ditolak"], ["", "Semua"]]} />
      {items && !shown.length && <EmptyRow>Tidak ada penarikan di sini.</EmptyRow>}
      {shown.length > 0 && (
        <div className={`${panelCls} divide-y divide-border/70 overflow-hidden`}>
          {shown.map((w) => (
            <div key={w.withdrawal_id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3" data-testid={`admin-wd-row-${w.withdrawal_id}`}>
              <span className="icon-tile">{(w.role || w.account_type) === "brand" ? <Building2 className="h-5 w-5" /> : <UserIcon className="h-5 w-5" />}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold">Transfer {rp(w.net_amount ?? w.amount)} <span className="font-normal text-muted-foreground">· {w.creator_name}</span>
                  <span className="ml-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary align-middle">{(w.role || w.account_type) === "brand" ? "Brand" : "Kreator"}</span></p>
                {w.fee > 0 && <p className="text-xs text-muted-foreground" data-testid={`admin-wd-fee-${w.withdrawal_id}`}>Ditarik {rp(w.amount)} · biaya platform {w.fee_pct}% {rp(w.fee)}</p>}
                <p className="text-xs text-muted-foreground">{w.method} {w.account_number} a.n. {w.account_holder} · {fmtDate(w.created_at)}{w.reference ? ` · Ref ${w.reference}` : ""}</p>
              </div>
              <StatusBadge s={w.status} />
              {w.status === "diproses" && (
                <div className="flex gap-2">
                  <button data-testid={`admin-wd-approve-${w.withdrawal_id}`} onClick={() => setActing({ w, action: "approve" })} className="btn-primary h-9 px-4 text-sm">Sudah ditransfer</button>
                  <button data-testid={`admin-wd-reject-${w.withdrawal_id}`} onClick={() => setActing({ w, action: "reject" })} className={neutralBtn}>Tolak</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <WithdrawActionDialog acting={acting} onClose={() => setActing(null)} onDone={() => { load(); onChange(); }} />
    </div>
  );
};

const WithdrawActionDialog = ({ acting, onClose, onDone }) => {
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setRef(""), [acting]);
  if (!acting) return null;
  const { w, action } = acting;
  const approve = action === "approve";
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/admin/withdrawals/${w.withdrawal_id}`, { action, reference: ref });
      toast.success(approve ? "Penarikan ditandai sudah ditransfer" : "Penarikan ditolak, saldo dikembalikan");
      onClose(); onDone();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-0 shadow-soft-lg max-w-md">
        <DialogHeader>
          <DialogTitle>{approve ? "Konfirmasi transfer" : "Tolak penarikan"}</DialogTitle>
          <DialogDescription>Transfer <b>{rp(w.net_amount ?? w.amount)}</b> ke {w.method} {w.account_number} a.n. {w.account_holder}{w.fee > 0 ? ` (ditarik ${rp(w.amount)}, biaya platform ${rp(w.fee)})` : ""}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label={approve ? "ID / bukti transfer" : "Alasan penolakan"}>
            <input data-testid="admin-wd-reference" required={!approve} value={ref} onChange={(e) => setRef(e.target.value)} className={inputCls} placeholder={approve ? "mis. TRF-20261111-001" : "mis. Nomor rekening tidak valid"} />
          </Field>
          {!approve && <p className="text-xs text-muted-foreground">Saldo {rp(w.amount)} dikembalikan utuh ke akun {(w.role || w.account_type) === "brand" ? "brand" : "kreator"}.</p>}
          <button data-testid="admin-wd-confirm" disabled={busy} className="btn-primary w-full h-12">{busy ? "Memproses..." : approve ? "Tandai sudah ditransfer" : "Tolak penarikan"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------- Submissions & audit
const SubmissionsTab = ({ version, onChange }) => {
  const [f, setF] = useState("diproses");
  const [items, setItems] = useState([]);
  const load = useCallback(() => api.get("/admin/submissions", { params: { status: f } }).then((r) => setItems(r.data)), [f]);
  useEffect(() => { load(); }, [load, version]);
  return (
    <div className="space-y-4">
      <Chips prefix="admin-sub-filter" value={f} onChange={setF} items={[["diproses", "Verifikasi views"], ["direview", "Review konten"], ["menunggu_views", "Menunggu klaim"], ["disetujui", "Disetujui"], ["ditolak", "Ditolak"], ["", "Semua"]]} />
      <ReviewList items={items} onChange={() => { load(); onChange(); }} />
    </div>
  );
};

const AUDIT_LABEL = { "campaign.create": "Membuat campaign", "campaign.edit": "Mengubah campaign", "campaign.delete": "Menghapus campaign",
  "campaign.status": "Mengubah status campaign", "user.edit": "Mengubah akun", "user.balance": "Mengubah saldo",
  "withdrawal.approve": "Menyetujui penarikan", "withdrawal.reject": "Menolak penarikan",
  "submission.review.approve": "Menyetujui konten", "submission.review.reject": "Menolak konten",
  "submission.verify.approve": "Memverifikasi views", "submission.verify.reject": "Menolak klaim views" };

const AuditTab = ({ version }) => {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get("/admin/audit").then((r) => setItems(r.data)).catch((e) => toast.error(errMsg(e))); }, [version]);
  if (items && !items.length) return <EmptyRow>Belum ada aktivitas Owner.</EmptyRow>;
  return (
    <div className={`${panelCls} divide-y divide-border/70 overflow-hidden`}>
      {(items || []).map((a) => (
        <div key={a.audit_id} className="px-5 py-3.5 flex items-center gap-3">
          <span className="icon-tile h-9 w-9 rounded-lg"><History className="h-4 w-4" /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{AUDIT_LABEL[a.action] || a.action} <span className="font-normal text-muted-foreground">· {a.target}</span></p>
            <p className="text-xs text-muted-foreground truncate">{fmtDate(a.created_at)} · {Object.entries(a.detail || {}).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
