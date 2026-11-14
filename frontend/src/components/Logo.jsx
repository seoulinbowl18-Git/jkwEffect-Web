import { Link } from "react-router-dom";

/**
 * PAGI mark — the letter "P" with a play button in its bowl (video creators).
 * Same geometry as the Flutter app's BrandLogo (flutter_app/lib/widgets/brand_logo.dart).
 */
export const LogoMark = ({ size = 32, className = "", color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={className}>
    <rect x="10" y="4" width="19" height="92" rx="9.5" fill={color} />
    <circle cx="53" cy="37.5" r="27.5" fill="none" stroke={color} strokeWidth="19" />
    <path d="M45.6 27.3 L64.2 37.5 L45.6 47.7 Z" fill={color} />
  </svg>
);

/** Merah brand PAGI: #C8102E di latar terang, #F21D43 (lebih terang) di latar gelap agar tetap kontras. */
export const BRAND_RED = "text-[#C8102E]";
export const BRAND_RED_ON_DARK = "text-[#F21D43]";

/** Wordmark dua baris: singkatan besar (merah brand) + kepanjangan kecil di bawahnya. `light` = di atas latar gelap. */
export const BrandWordmark = ({ light = false, large = false }) => (
  <span className="flex flex-col justify-center leading-none">
    <span className={`font-extrabold tracking-tight ${large ? "text-3xl" : "text-[20px]"} ${light ? BRAND_RED_ON_DARK : BRAND_RED}`}>PAGI</span>
    <span className={`mt-1 font-semibold whitespace-nowrap ${large ? "text-sm" : "text-[10.5px]"} ${light ? "text-white/85" : "text-muted-foreground"}`}>Pasukan Gibran Indonesia</span>
  </span>
);

export const Logo = ({ light = false, size = 34 }) => (
  <Link to="/" data-testid="nav-logo" aria-label="Pasukan Gibran Indonesia (PAGI)" className="flex items-center gap-2 select-none shrink-0">
    <LogoMark size={size} className={`shrink-0 ${light ? BRAND_RED_ON_DARK : BRAND_RED}`} />
    <BrandWordmark light={light} />
  </Link>
);
