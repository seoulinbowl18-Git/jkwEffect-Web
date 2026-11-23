import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Clock, Download, HandHeart, IdCard, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { KtaCard, downloadKta, KTA_TITLE } from "@/components/KtaCard";
import { Shell, GoogleGate, cardCls } from "@/pages/Registration";

const LABEL = { anggota: "Member", relawan: "Relawan" };
const KTA_HEADER = { title: "KTA Digital", short: "KTA", icon: IdCard, desc: "Kartu Tanda Anggota digital resmi Gibran for 2029 milikmu." };

/** Halaman /kta: kartu digital untuk pendaftaran yang sudah disetujui admin, bisa diunduh sebagai PNG. */
export default function Kta() {
  const { user, loading } = useAuth();
  const [regs, setRegs] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.get("/registrations/me").then((r) => setRegs(Array.isArray(r.data) ? r.data : [])).catch((e) => { setRegs([]); toast.error(errMsg(e)); });
  }, [user]);

  if (loading || (user && !regs)) {
    return <Shell jenis={KTA_HEADER}><div className="py-16 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-white/60" /></div></Shell>;
  }
  if (!user) return <Shell jenis={KTA_HEADER}><GoogleGate next="/kta" desc="Masuk dengan akun Google yang kamu pakai saat mendaftar untuk melihat dan mengunduh KTA digitalmu." /></Shell>;

  const approved = regs.filter((r) => r.status === "diterima" && r.kta_number);
  const others = regs.filter((r) => !(r.status === "diterima" && r.kta_number));
  const download = async (r) => {
    setBusy(r.jenis);
    try { await downloadKta(r); } catch { toast.error("Gagal membuat file KTA. Coba lagi."); } finally { setBusy(null); }
  };

  return (
    <Shell jenis={KTA_HEADER}>
      <div className="space-y-6" data-testid="kta-page">
        {approved.map((r) => (
          <section key={r.registration_id} className={cardCls}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-xs font-semibold tracking-[0.16em] uppercase text-white/45">{KTA_TITLE[r.jenis]}</p>
                <p className="text-lg font-extrabold">{LABEL[r.jenis]} · <span className="tabular-nums">{r.kta_number}</span></p>
              </div>
              <button type="button" onClick={() => download(r)} disabled={busy === r.jenis} data-testid={`kta-download-${r.jenis}`}
                className="h-11 px-5 rounded-xl bg-white text-[#0A0A0A] font-bold inline-flex items-center gap-2 hover:bg-[#F0F0F0] disabled:opacity-60">
                {busy === r.jenis ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Unduh KTA (PNG)
              </button>
            </div>
            <div className="mx-auto max-w-[560px]"><KtaCard reg={r} /></div>
            <p className="mt-4 text-xs text-white/40 text-center">Tunjukkan kartu ini saat kegiatan resmi Gibran for 2029. Jangan bagikan foto KTP-mu ke siapa pun.</p>
          </section>
        ))}

        {others.map((r) => (
          <section key={r.registration_id} className={`${cardCls} flex flex-col sm:flex-row sm:items-center gap-4`} data-testid={`kta-status-${r.jenis}`}>
            <span className={`grid place-items-center h-12 w-12 shrink-0 rounded-xl ${r.status === "ditolak" ? "bg-[#C8102E]" : "bg-white/10"}`}>
              {r.status === "ditolak" ? <XCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold">Pendaftaran {LABEL[r.jenis]} {r.status === "ditolak" ? "ditolak" : "sedang diverifikasi"}</p>
              <p className="text-sm text-white/55">{r.status === "ditolak" ? (r.status_note ? `Alasan: ${r.status_note}` : "Perbaiki data lalu kirim ulang.") : "KTA digital muncul di sini setelah admin menyetujui pendaftaranmu."}</p>
            </div>
            {r.status === "ditolak" && <Link to={`/daftar/${r.jenis}`} className="h-11 px-5 rounded-xl bg-white text-[#0A0A0A] font-bold inline-flex items-center justify-center hover:bg-[#F0F0F0]">Kirim ulang</Link>}
          </section>
        ))}

        {regs.length === 0 && (
          <section className={`${cardCls} text-center`} data-testid="kta-empty">
            <IdCard className="mx-auto h-12 w-12 text-white/70" />
            <h2 className="mt-3 text-xl font-extrabold">Belum ada KTA</h2>
            <p className="mt-1 text-sm text-white/55">Akun {user.email} belum terdaftar. Daftar dulu, lalu tunggu verifikasi admin.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link to="/daftar/anggota" className="h-11 px-5 rounded-xl bg-white text-[#0A0A0A] font-bold inline-flex items-center gap-2 hover:bg-[#F0F0F0]"><IdCard className="h-4 w-4" /> Daftar Member</Link>
              <Link to="/daftar/relawan" className="h-11 px-5 rounded-xl ring-1 ring-white/20 font-bold inline-flex items-center gap-2 hover:bg-white/10"><HandHeart className="h-4 w-4" /> Daftar Relawan</Link>
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}
