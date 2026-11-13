import { Link } from "react-router-dom";

/**
 * jkwEffect mark — the letter "b" with a play button in its bowl (video creators).
 * Same geometry as the Flutter app's BrandLogo (flutter_app/lib/widgets/brand_logo.dart).
 */
export const LogoMark = ({ size = 32, className = "", color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden className={className}>
    <rect x="7" y="2" width="19" height="58" rx="9.5" fill={color} />
    <circle cx="56" cy="60" r="30" fill="none" stroke={color} strokeWidth="19" />
    <path d="M48.2 49.2 L67.5 60 L48.2 70.8 Z" fill={color} />
  </svg>
);

export const Logo = ({ light = false, size = 30 }) => (
  <Link to="/" data-testid="nav-logo" aria-label="jkwEffect" className="flex items-center gap-2 select-none">
    <LogoMark size={size} className={light ? "text-white" : "text-primary"} />
    <span className={`font-extrabold text-[22px] tracking-tight leading-none ${light ? "text-white" : "text-foreground"}`}>jkwEffect</span>
  </Link>
);
