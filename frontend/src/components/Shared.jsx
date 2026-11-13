import { useLocation, useNavigate } from "react-router-dom";
import { STATUS } from "@/lib/api";

/**
 * Dashboard tab state that lives in the URL, so the main nav (Beranda/Dompet/Profil)
 * and the in-page tabs stay in sync. `routes` maps a tab to its own path
 * (e.g. { saldo: "/dompet", profil: "/profil" }); other tabs use ?tab= on `base`.
 */
export const useRouteTab = (defaultTab, routes = {}, base = "/dashboard") => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const byPath = Object.keys(routes).find((t) => routes[t] === pathname);
  const tab = byPath || new URLSearchParams(search).get("tab") || defaultTab;
  const setTab = (t) => navigate(routes[t] || (t === defaultTab ? base : `${base}?tab=${t}`));
  return [tab, setTab];
};

/** Card surface used across the app: white, 16px radius, soft shadow (no hard borders). */
export const panelCls = "bg-card rounded-2xl shadow-soft";

/**
 * Gradient header shared by the Creator, Brand and Admin dashboards — the same red
 * gradient with rounded bottom corners as the mobile app's headers.
 */
export const PageHeader = ({ eyebrow, title, desc, actions, testid, avatar, children }) => (
  <header className="relative overflow-hidden hero-gradient hero-arcs text-white rounded-b-[28px] sm:rounded-b-[32px]">
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-24 flex flex-wrap items-end justify-between gap-6">
      <div className="flex items-center gap-4 min-w-0">
        {avatar}
        <div className="min-w-0">
          {eyebrow && <p className="text-sm font-medium text-white/80">{eyebrow}</p>}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-0.5 break-words" data-testid={testid}>{title}</h1>
          {desc && <p className="mt-1.5 text-white/85">{desc}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
    {children}
  </header>
);

/** Round avatar on red headers (photo, else the first letter). */
export const HeaderAvatar = ({ user }) => (
  <span className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full bg-white text-primary grid place-items-center text-2xl font-extrabold ring-4 ring-white/30 overflow-hidden">
    {user?.picture ? <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : user?.name?.[0]?.toUpperCase()}
  </span>
);

export const StatCard = ({ label, value, sub, big, testid, icon: Icon, children }) => (
  <div data-testid={testid}
    className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 ${big ? "col-span-2 lg:col-span-1 bg-card-gradient text-white shadow-glow" : "bg-card shadow-soft"}`}>
    {big && <span aria-hidden className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />}
    <div className="relative flex items-center justify-between gap-3">
      <p className={`text-sm font-medium ${big ? "text-white/85" : "text-muted-foreground"}`}>{label}</p>
      {Icon && <span className={`h-9 w-9 rounded-xl grid place-items-center ${big ? "bg-white/15 text-white" : "bg-soft text-primary"}`}><Icon className="h-[18px] w-[18px]" /></span>}
    </div>
    <p className={`relative ${big ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"} font-extrabold tracking-tight mt-2 break-words tabular-nums`} data-testid={testid && `${testid}-value`}>{value}</p>
    {sub && <p className={`relative text-xs mt-2 ${big ? "text-white/80" : "text-muted-foreground"}`}>{sub}</p>}
    {children}
  </div>
);

export const StatusBadge = ({ s }) => {
  const m = STATUS[s] || { label: s, cls: "bg-secondary" };
  return <span className={`inline-block w-fit self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${m.cls}`}>{m.label}</span>;
};

export const Chips = ({ items, value, onChange, prefix }) => (
  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
    {items.map(([k, label]) => (
      <button key={k} data-testid={`${prefix}-${k || "all"}`} onClick={() => onChange(k)}
        className={`h-9 px-4 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${value === k ? "bg-primary text-white shadow-glow" : "bg-card text-muted-foreground shadow-soft hover:text-foreground"}`}>
        {label}
      </button>
    ))}
  </div>
);

/** Segmented pill tabs (active = soft pink pill, as in the mobile app). */
export const Tabs = ({ items, value, onChange, prefix }) => (
  <div className="inline-flex max-w-full gap-1 p-1 rounded-full bg-card shadow-soft overflow-x-auto no-scrollbar">
    {items.map(([k, label]) => (
      <button key={k} data-testid={`${prefix}-${k}`} onClick={() => onChange(k)}
        className={`h-10 px-5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${value === k ? "bg-soft text-primary" : "text-muted-foreground hover:text-foreground"}`}>
        {label}
      </button>
    ))}
  </div>
);

export const Empty = ({ title, desc, children }) => (
  <div className="bg-card rounded-2xl shadow-soft py-14 px-6 text-center" data-testid="empty-state">
    <p className="font-bold">{title}</p>
    <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">{desc}</p>
    {children && <div className="mt-5">{children}</div>}
  </div>
);

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-sm font-semibold text-foreground/80">{label}</span>
    <div className="mt-1.5">{children}</div>
  </label>
);

export const inputCls = "w-full h-11 px-3.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors";
