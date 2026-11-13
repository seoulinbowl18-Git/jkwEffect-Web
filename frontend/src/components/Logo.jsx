import { Link } from "react-router-dom";

/**
 * PAGI mark — the letter "b" with a play button in its bowl (video creators).
 * Same geometry as the Flutter app's BrandLogo (flutter_app/lib/widgets/brand_logo.dart).
 */
export const LogoMark = ({ size = 32, className = "", color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={className}>
    <rect x="7" y="2" width="19" height="58" rx="9.5" fill={color} />
    <circle cx="56" cy="60" r="30" fill="none" stroke={color} strokeWidth="19" />
    <path d="M48.2 49.2 L67.5 60 L48.2 70.8 Z" fill={color} />
  </svg>
);

/** Wordmark dua baris: singkatan besar + kepanjangan kecil di bawahnya. */
export const BrandWordmark = ({ light = false, large = false }) => (
  <span className="flex flex-col justify-center leading-none">
    <span className={`font-extrabold tracking-tight ${large ? "text-3xl" : "text-[20px]"} ${light ? "text-white" : "text-foreground"}`}>PAGI</span>
    <span className={`mt-1 font-semibold whitespace-nowrap ${large ? "text-sm" : "text-[10.5px]"} ${light ? "text-white/85" : "text-muted-foreground"}`}>Pasukan Gibran Indonesia</span>
  </span>
);

export const Logo = ({ light = false, size = 34 }) => (
  <Link to="/" data-testid="nav-logo" aria-label="Pasukan Gibran Indonesia (PAGI)" className="flex items-center gap-2 select-none shrink-0">
    <LogoMark size={size} className={`shrink-0 ${light ? "text-white" : "text-primary"}`} />
    <BrandWordmark light={light} />
  </Link>
);
