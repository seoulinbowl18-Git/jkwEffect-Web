import { Navigate, useSearchParams } from "react-router-dom";
import { Megaphone, Wallet, MonitorSmartphone } from "lucide-react";
import { BrandBadge, BrandWordmark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

const BENEFITS = [
  [Megaphone, "Ratusan campaign aktif dari brand"],
  [Wallet, "Tarik saldo mulai Rp 50.000"],
  [MonitorSmartphone, "Satu akun untuk aplikasi & versi web"],
];

export const GoogleG = () => (
  <span className="h-8 w-8 rounded-full bg-white grid place-items-center shrink-0" aria-hidden>
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  </span>
);

/** Google-only sign-in, same layout as the mobile app's login screen. */
export const LoginScreen = ({ next = "/dashboard" }) => {
  const { login, signingIn } = useAuth();
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <section className="relative overflow-hidden hero-gradient hero-arcs text-white rounded-b-[32px] lg:rounded-none px-6 sm:px-10 lg:px-16 pt-10 pb-12 lg:py-16 flex flex-col">
        <a href="/" className="flex items-center gap-2.5 w-fit" aria-label="Pasukan Gibran Indonesia (GIBRAN2029)">
          <BrandBadge size={52} className="ring-2 ring-white/25" />
          <BrandWordmark light large />
        </a>
        <div className="relative mt-10 lg:mt-auto lg:mb-auto max-w-lg">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]">Posting video,<br />cairkan cuan.</h1>
          <p className="mt-5 text-white/90 text-base sm:text-lg leading-relaxed">Dapat bayaran dari setiap 1.000 views video TikTok, Instagram, YouTube, dan Threads kamu.</p>
        </div>
      </section>

      <section className="px-6 sm:px-10 lg:px-16 py-10 lg:py-16 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto lg:mx-0" data-testid="login-screen">
          <h2 className="hidden lg:block text-3xl font-extrabold tracking-tight">Masuk ke GIBRAN2029</h2>
          <p className="hidden lg:block mt-2 text-muted-foreground">Cukup pakai akun Google kamu, tanpa password.</p>
          <ul className="space-y-4 lg:mt-10">
            {BENEFITS.map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-4">
                <span className="icon-tile"><Icon className="h-5 w-5" /></span>
                <span className="font-semibold text-[15px]">{text}</span>
              </li>
            ))}
          </ul>
          <button data-testid="google-login-button" disabled={signingIn} onClick={() => login(next)}
            className="btn-primary w-full h-14 mt-12 rounded-2xl text-lg">
            <GoogleG /> {signingIn ? "Membuka Google..." : "Masuk dengan Google"}
          </button>
          <p className="mt-4 text-center text-sm text-muted-foreground">Belum punya akun? Akun dibuat otomatis saat pertama kali masuk.</p>
          <p className="mt-6 text-center text-xs text-muted-foreground">Dengan masuk, kamu menyetujui Syarat &amp; Ketentuan GIBRAN2029.</p>
        </div>
      </section>
    </div>
  );
};

export default function Login() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  const raw = params.get("next") || "/dashboard";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  if (!loading && user) return <Navigate to={user.role ? next : "/onboarding"} replace />;
  return <LoginScreen next={next} />;
}
