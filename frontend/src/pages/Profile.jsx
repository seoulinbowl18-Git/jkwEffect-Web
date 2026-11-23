import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  BadgeCheck, Clock, Download, ExternalLink, HandHeart, History, IdCard, Loader2, LogOut, Mail, MapPin, Phone, User as UserIcon, XCircle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { KtaCard, downloadKta } from "@/components/KtaCard";
import { PageHeader, HeaderAvatar, StatCard, Tabs, panelCls, useRouteTab } from "@/components/Shared";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, fmtDate, rp } from "@/lib/api";

const JENIS = {
  anggota: { label: "Member", badge: "Member Resmi", icon: IdCard, daftar: "/daftar/anggota" },
  relawan: { label: "Relawan", badge: "Relawan Gibran for 2029", icon: HandHeart, daftar: "/daftar/relawan" },
};
const STATUS_TEXT = { "menunggu verifikasi": "Menunggu", diterima: "Disetujui", ditolak: "Ditolak" };
const titleCase = (s = "") => s.toLowerCase().replace(/(^|[\s'-])\S/g, (m) => m.toUpperCase());
const fmtWa = (t) => (t ? `+${String(t).replace(/\D/g, "")}` : "-");
const fmtDateTime = (s) => new Date(s).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** /profil — profil member & relawan Gibran for 2029: status keanggotaan, KTA digital, data diri, dan riwayat. */
export default function Profile() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useRouteTab("keanggotaan", {}, "/profil");
  const [regs, setRegs] = useState(null);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    api.get("/registrations/me").then((r) => setRegs(Array.isArray(r.data) ? r.data : [])).catch((e) => { setRegs([]); toast.error(errMsg(e)); });
    api.get("/notifications").then((r) => setNotifs(r.data?.items || [])).catch(() => {});
  }, []);

  const byJenis = Object.fromEntries((regs || []).map((r) => [r.jenis, r]));
  const approved = (regs || []).filter((r) => r.status === "diterima" && r.kta_number);
  const latest = (regs || [])[0];
  const since = [...(regs || []).map((r) => r.created_at), user.created_at].filter(Boolean).sort()[0];
  const legacy = ["creator", "brand"].includes(user.role);
  const legacyBalance = user.role === "brand" ? user.brand_balance : user.balance;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageHeader eyebrow="Profil Gibran for 2029" title={titleCase(latest?.nama || user.name || "")} testid="profile-title" avatar={<HeaderAvatar user={user} />}
        desc={since ? `Bergabung sejak ${fmtDate(since)}` : "Bergerak Bersama, Menuju Indonesia Maju 2029."}
        actions={
          <div className="flex flex-wrap gap-2" data-testid="profile-badges">
            {approved.length > 0
              ? approved.map((r) => <span key={r.jenis} className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#C8102E] px-3.5 py-2 text-sm font-bold"><BadgeCheck className="h-4 w-4" /> {JENIS[r.jenis].badge}</span>)
              : <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-sm font-semibold">{regs?.length ? "Menunggu verifikasi" : "Belum terdaftar"}</span>}
          </div>
        } />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 pb-16 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard big testid="profile-kta" icon={IdCard} label="Nomor KTA" value={approved[0]?.kta_number || "Belum terbit"}
            sub={approved[0] ? `Terbit ${fmtDate(approved[0].kta_issued_at)}` : "Terbit otomatis setelah pendaftaran disetujui"} />
          {["anggota", "relawan"].map((j) => (
            <StatCard key={j} testid={`profile-status-${j}`} icon={JENIS[j].icon} label={`Status ${JENIS[j].label}`}
              value={byJenis[j] ? STATUS_TEXT[byJenis[j].status] || byJenis[j].status : "Belum daftar"}
              sub={byJenis[j] ? `Daftar ${fmtDate(byJenis[j].created_at)}` : <Link to={JENIS[j].daftar} className="font-semibold text-primary hover:underline">Daftar {JENIS[j].label.toLowerCase()} →</Link>} />
          ))}
        </div>

        <Tabs prefix="profile-tab" value={tab} onChange={setTab} items={[["keanggotaan", "Keanggotaan & KTA"], ["data", "Data Diri"], ["riwayat", "Riwayat"]]} />

        {regs === null ? (
          <div className={`${panelCls} py-16 grid place-items-center`}><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            {tab === "keanggotaan" && <Membership byJenis={byJenis} />}
            {tab === "data" && <PersonalData user={user} reg={latest} />}
            {tab === "riwayat" && <ActivityLog regs={regs} notifs={notifs} />}
          </>
        )}

        {legacy && (
          <div className="rounded-2xl bg-secondary p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-sm" data-testid="profile-legacy">
            <History className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="flex-1 text-muted-foreground">
              Akun ini masih memiliki fitur lama ({user.role === "brand" ? "campaign brand" : "konten kreator"}){legacyBalance > 0 ? <> dengan saldo <b className="text-foreground">{rp(legacyBalance)}</b></> : null}.
              Gunakan dasbor lama untuk mengelola atau menarik saldo.
            </p>
            <Link to="/dasbor-lama" className="btn-ghost h-10 shrink-0">Buka dasbor lama <ExternalLink className="h-4 w-4" /></Link>
          </div>
        )}

        <button type="button" onClick={logout} data-testid="profile-logout" className="btn-outline h-11"><LogOut className="h-4 w-4" /> Keluar</button>
      </main>
      <Footer />
    </div>
  );
}

/** Kartu per jenis keanggotaan: KTA (disetujui), menunggu, ditolak, atau ajakan mendaftar. */
const Membership = ({ byJenis }) => {
  const [busy, setBusy] = useState(null);
  const download = async (r) => {
    setBusy(r.jenis);
    try { await downloadKta(r); } catch { toast.error("Gagal membuat file KTA. Coba lagi."); } finally { setBusy(null); }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-5" data-testid="profile-membership">
      {["anggota", "relawan"].map((j) => {
        const r = byJenis[j];
        const meta = JENIS[j];
        return (
          <section key={j} className={`${panelCls} p-5 sm:p-6 flex flex-col`} data-testid={`profile-membership-${j}`}>
            <div className="flex items-center gap-3">
              <span className="icon-tile"><meta.icon className="h-5 w-5" /></span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-lg">{meta.label}</p>
                <p className="text-sm text-muted-foreground">{r ? `Didaftarkan ${fmtDate(r.created_at)}` : "Belum terdaftar"}</p>
              </div>
              {r && <StatusPill status={r.status} />}
            </div>
            <div className="mt-5 flex-1">
              {!r && (
                <div className="rounded-xl bg-secondary p-5 text-center">
                  <p className="text-sm text-muted-foreground">{j === "anggota" ? "Jadi member resmi dan dapatkan KTA digital bernomor unik." : "Daftar relawan cukup 1 menit: nama, WhatsApp, dan kota."}</p>
                  <Link to={meta.daftar} className="btn-primary h-11 mt-4">Daftar {meta.label}</Link>
                </div>
              )}
              {r?.status === "diterima" && r.kta_number && (
                <>
                  <KtaCard reg={r} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => download(r)} disabled={busy === j} data-testid={`profile-download-${j}`} className="btn-primary h-11">
                      {busy === j ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Unduh KTA (PNG)
                    </button>
                    <Link to="/kta" className="btn-ghost h-11">Halaman KTA</Link>
                  </div>
                </>
              )}
              {r?.status === "menunggu verifikasi" && (
                <div className="rounded-xl bg-amber-50 text-amber-900 p-4 flex gap-3 text-sm"><Clock className="h-5 w-5 shrink-0" />
                  <p>Data kamu sedang diverifikasi admin Gibran for 2029. Nomor & kartu KTA muncul di sini setelah disetujui.</p></div>
              )}
              {r?.status === "ditolak" && (
                <div className="rounded-xl bg-red-50 text-red-900 p-4 text-sm">
                  <p className="flex gap-2 font-semibold"><XCircle className="h-5 w-5 shrink-0" /> Pendaftaran perlu diperbaiki</p>
                  {r.status_note && <p className="mt-1.5"><b>Alasan:</b> {r.status_note}</p>}
                  <Link to={meta.daftar} className="btn-primary h-10 mt-3">Perbaiki & kirim ulang</Link>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const StatusPill = ({ status }) => {
  const cls = status === "diterima" ? "bg-emerald-100 text-emerald-800" : status === "ditolak" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800";
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>{STATUS_TEXT[status] || status}</span>;
};

const PersonalData = ({ user, reg }) => {
  const rows = [
    [UserIcon, "Nama", titleCase(reg?.nama || user.name || "") || "-"],
    [Mail, "Email (akun Google)", user.email || "-"],
    [Phone, "Nomor WhatsApp", fmtWa(reg?.telepon)],
    [MapPin, "Kota domisili", [reg?.kabupaten, reg?.provinsi].filter(Boolean).map(titleCase).join(", ") || "-"],
  ];
  return (
    <section className={`${panelCls} p-5 sm:p-6`} data-testid="profile-data">
      <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
        {rows.map(([Icon, k, v]) => (
          <div key={k} className="flex gap-3 min-w-0">
            <span className="icon-tile h-10 w-10"><Icon className="h-[18px] w-[18px]" /></span>
            <div className="min-w-0"><dt className="text-xs font-semibold text-muted-foreground">{k}</dt><dd className="font-semibold break-words">{v}</dd></div>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-xs text-muted-foreground">
        {reg ? "Data diambil dari pendaftaran terakhirmu. NIK & foto KTP tidak ditampilkan di sini dan hanya dapat dilihat admin." : "Belum ada data pendaftaran. Daftar sebagai member atau relawan untuk melengkapi profil."}
      </p>
    </section>
  );
};

/** Riwayat partisipasi: pendaftaran, verifikasi, dan notifikasi dari admin. */
const ActivityLog = ({ regs, notifs }) => {
  const events = [
    ...regs.flatMap((r) => [
      [r.created_at, `Mendaftar sebagai ${JENIS[r.jenis].label.toLowerCase()}`, "Formulir pendaftaran terkirim."],
      ...(r.kta_issued_at ? [[r.kta_issued_at, `KTA ${JENIS[r.jenis].label} terbit`, `Nomor ${r.kta_number}`]] : []),
    ]),
    ...notifs.map((n) => [n.created_at, n.title, n.body]),
  ].filter(([t]) => t).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  if (!events.length) return <p className={`${panelCls} p-10 text-center text-sm text-muted-foreground`}>Belum ada aktivitas.</p>;
  return (
    <ol className={`${panelCls} p-5 sm:p-6 space-y-5`} data-testid="profile-activity">
      {events.slice(0, 30).map(([t, title, body], i) => (
        <li key={`${t}-${i}`} className="flex gap-3">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C8102E]" />
          <div className="min-w-0">
            <p className="font-semibold">{title}</p>
            {body && <p className="text-sm text-muted-foreground break-words">{body}</p>}
            <p className="text-xs text-muted-foreground/80 mt-0.5">{fmtDateTime(t)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
};
