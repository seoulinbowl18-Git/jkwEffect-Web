import { Instagram, Youtube, AtSign, Music2 } from "lucide-react";

const ICONS = { tiktok: Music2, instagram: Instagram, threads: AtSign, youtube: Youtube };

export const PlatformIcon = ({ p, className = "h-4 w-4" }) => {
  const I = ICONS[p] || Music2;
  return <I className={className} aria-label={p} />;
};
