import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck, Smartphone, KeyRound, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { LogoMark, BrandWordmark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";

/** "0812-3456 7890", "62812...", "+62 812..." → "+62812..." */
export const toE164 = (raw) => {
  const d = (raw || "").replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.startsWith("62")) return `+${d}`;
  if (d.startsWith("0")) return `+62${d.slice(1)}`;
  return `+62${d}`;
};

/**
 * Owner (Admin Pusat) sign-in: phone number + 6-digit OTP sent over WhatsApp (Fonnte) by the backend
 * (POST /api/admin/request-otp → POST /api/admin/verify-otp). Only numbers in OWNER_PHONES can sign in.
 * Creators and brands keep using Google Sign-In.
 */
export default function AdminLogin() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (user?.is_owner) return <Navigate to="/admin" replace />;

  const send = async (e) => {
    e?.preventDefault();
    const e164 = toE164(phone);
    if (!/^\+62\d{8,13}$/.test(e164)) return toast.error("Masukkan nomor Indonesia yang valid, mis. 0812xxxxxxx");
    setBusy(true);
    try {
      const { data } = await api.post("/admin/request-otp", { phone: e164 });
      setSentTo(data.phone || e164);
      setResendIn(data.resend_in || 60);
      setCode("");
      toast.success("Kode OTP dikirim lewat WhatsApp");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(code)) return toast.error("Kode OTP terdiri dari 6 angka");
    setBusy(true);
    try {
      const { data } = await api.post("/admin/verify-otp", { phone: toE164(phone), code });
      setUser(data.user || data);
      toast.success("Selamat datang, Owner");
      navigate("/admin", { replace: true });
    } catch (err) {
      setCode("");
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <section className="relative overflow-hidden hero-gradient hero-arcs text-white rounded-b-[32px] lg:rounded-none px-6 sm:px-10 lg:px-16 pt-10 pb-12 lg:py-16 flex flex-col">
        <a href="/" className="flex items-center gap-2.5 w-fit" aria-label="Pasukan Gibran Indonesia (PAGI)">
          <LogoMark size={40} className="text-white" />
          <BrandWordmark light large />
        </a>
        <div className="relative mt-10 lg:mt-auto lg:mb-auto max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Admin Pusat</span>
          <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">Owner<br />Control Center</h1>
          <p className="mt-5 text-white/90 text-base sm:text-lg leading-relaxed">Kelola campaign, pengguna, saldo, dan penarikan di seluruh ekosistem PAGI, web dan aplikasi.</p>
        </div>
      </section>

      <section className="px-6 sm:px-10 lg:px-16 py-10 lg:py-16 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto lg:mx-0" data-testid="admin-login">
          <h2 className="text-3xl font-extrabold tracking-tight">Masuk sebagai Owner</h2>
          <p className="mt-2 text-muted-foreground">Hanya nomor WhatsApp Owner yang terdaftar yang bisa masuk. Kode OTP dikirim lewat chat WhatsApp.</p>

          {!sentTo ? (
            <form onSubmit={send} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-foreground/80">Nomor WhatsApp</span>
                <div className="mt-1.5 flex items-center rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
                  <span className="pl-4 pr-2 text-muted-foreground font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4" /> +62</span>
                  <input data-testid="admin-phone-input" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="812 3456 7890" className="flex-1 h-12 pr-4 bg-transparent focus:outline-none text-base" />
                </div>
              </label>
              <button data-testid="admin-send-otp" disabled={busy} className="btn-primary w-full h-14 rounded-2xl text-lg">
                <MessageCircle className="h-5 w-5" /> {busy ? "Mengirim kode..." : "Kirim kode OTP via WhatsApp"}
              </button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-8 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-foreground/80">Kode OTP (6 angka) yang dikirim ke WhatsApp {sentTo}</span>
                <div className="mt-1.5 flex items-center rounded-xl border border-border bg-card focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
                  <span className="pl-4 pr-2 text-muted-foreground"><KeyRound className="h-4 w-4" /></span>
                  <input data-testid="admin-otp-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                    autoFocus onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••"
                    className="flex-1 h-12 pr-4 bg-transparent focus:outline-none text-2xl tracking-[0.5em] font-bold" />
                </div>
              </label>
              <button data-testid="admin-verify-otp" disabled={busy} className="btn-primary w-full h-14 rounded-2xl text-lg">
                {busy ? "Memverifikasi..." : "Masuk"}
              </button>
              <button type="button" data-testid="admin-resend-otp" onClick={send} disabled={busy || resendIn > 0} className="btn-ghost w-full">
                {resendIn > 0 ? `Kirim ulang kode dalam ${resendIn} detik` : "Kirim ulang kode"}
              </button>
              <button type="button" onClick={() => { setSentTo(""); setCode(""); }} className="btn-ghost w-full">
                <ArrowLeft className="h-4 w-4" /> Ganti nomor
              </button>
            </form>
          )}
          <p className="mt-8 text-center text-xs text-muted-foreground">Bukan Owner? <a href="/masuk" className="text-primary font-semibold">Masuk sebagai pengguna</a></p>
        </div>
      </section>
    </div>
  );
}
