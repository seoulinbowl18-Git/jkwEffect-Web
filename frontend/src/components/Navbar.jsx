import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, User, ShieldCheck, LogOut, BookOpen, IdCard } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/context/AuthContext";

/** Navigasi utama: tamu · member/relawan (Beranda · Jelajah · KTA Saya · Profil) · admin. */
export const useNavItems = () => {
  const { user } = useAuth();
  const role = user?.role;
  if (!user) {
    return [
      { to: "/", label: "Beranda", icon: Home, match: (p) => p === "/" },
      { to: "/jelajah", label: "Jelajah", icon: Search, match: (p) => p === "/jelajah" || p === "/bounty" },
      { to: "/cara-kerja", label: "Cara Bergabung", icon: BookOpen, match: (p) => p === "/cara-kerja" || p === "/untuk-brand" },
      { to: "/kta", label: "KTA Saya", icon: IdCard, match: (p) => p === "/kta" },
    ];
  }
  if (user && role !== "admin") {
    // Member & relawan (termasuk akun kreator/brand lama): menu gerakan GIBRAN2029.
    return [
      { to: "/", label: "Beranda", icon: Home, match: (p) => p === "/" },
      { to: "/jelajah", label: "Jelajah", icon: Search, match: (p) => p === "/jelajah" || p === "/bounty" },
      { to: "/kta", label: "KTA Saya", icon: IdCard, match: (p) => p === "/kta" },
      { to: "/profil", label: "Profil", icon: User, match: (p) => p === "/profil" },
    ];
  }
  if (role === "admin") {
    return [
      { to: "/admin", label: "Beranda", icon: Home, match: (p) => p === "/admin" || p === "/dashboard" },
      { to: "/jelajah", label: "Jelajah", icon: Search, match: (p) => p === "/jelajah" || p === "/bounty" },
      { to: "/admin?tab=withdrawals", label: "Penarikan", icon: ShieldCheck, match: () => false },
    ];
  }
  return [];
};

export const Navbar = () => {
  const { user, logout, signingIn } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const items = useNavItems();
  const showTabBar = Boolean(user && user.role !== "admin");

  // Reserve room for the fixed bottom tab bar on phones.
  useEffect(() => {
    document.body.classList.toggle("has-tabbar", showTabBar);
    return () => document.body.classList.remove("has-tabbar");
  }, [showTabBar]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-border/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-1 ml-6" aria-label="Navigasi utama">
            {items.map(({ to, label, match }) => (
              <Link key={label} to={to} data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`h-10 px-4 rounded-full text-[15px] font-semibold grid place-items-center transition-colors ${match(pathname) ? "bg-soft text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />
                {user.role !== "admin" && (
                  <Link to="/profil" aria-label="Profil" className="hidden md:grid h-10 w-10 place-items-center rounded-full bg-soft text-primary font-bold overflow-hidden">
                    {user.picture ? <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : user.name?.[0]?.toUpperCase()}
                  </Link>
                )}
                <button data-testid="logout-button" onClick={logout} className="btn-ghost h-10 px-3 hidden lg:inline-flex" title="Keluar">
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              </>
            ) : (
              <>
                <button data-testid="nav-join-button" onClick={() => navigate("/daftar/relawan")} className="hidden lg:inline-flex btn-ghost h-10">
                  Daftar Relawan
                </button>
                <button data-testid="nav-login-button" disabled={signingIn} onClick={() => navigate(`/masuk?next=${encodeURIComponent(pathname === "/" ? "/kta" : pathname)}`)} className="btn-primary h-10">
                  Masuk
                </button>
              </>
            )}
          </div>
        </div>
        {!showTabBar && (
          <nav className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto no-scrollbar" aria-label="Navigasi">
            {items.map(({ to, label, match }) => (
              <Link key={label} to={to} className={`h-9 px-4 rounded-full text-sm font-semibold grid place-items-center whitespace-nowrap ${match(pathname) ? "bg-soft text-primary" : "text-muted-foreground"}`}>{label}</Link>
            ))}
          </nav>
        )}
      </header>

      {showTabBar && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-border/70 pb-[env(safe-area-inset-bottom)]" aria-label="Tab utama" data-testid="bottom-tabbar">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map(({ to, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <Link key={label} to={to} className={`flex flex-col items-center gap-1 py-2 text-xs ${active ? "text-primary font-bold" : "text-muted-foreground font-medium"}`}>
                  <span className={`h-8 w-14 grid place-items-center rounded-full transition-colors ${active ? "bg-soft" : ""}`}><Icon className="h-5 w-5" /></span>
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
};
