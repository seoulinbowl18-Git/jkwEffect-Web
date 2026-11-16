import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Logo, SLOGAN } from "@/components/Logo";
import VaporizeTextCycle, { Tag } from "@/components/ui/vapour-text-effect";

// Konstanta di luar komponen: VaporizeTextCycle menggambar ulang canvas setiap kali
// referensi `texts`/`font`/`animation` berubah.
const VAPOUR_TEXTS = ["GIBRAN2029", "Bergerak Bersama,", "Menuju Indonesia Maju 2029", "Satukan Barisan, Kawal Masa Depan"];
const VAPOUR_ANIMATION = { vaporizeDuration: 2, fadeInDuration: 1, waitDuration: 1.5 };

export const useIsDesktop = () => {
  const query = "(min-width: 768px)";
  const [desktop, setDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return desktop;
};

export const Footer = () => {
  const desktop = useIsDesktop();
  const vapourFont = useMemo(
    () => ({ fontFamily: "Inter, sans-serif", fontSize: desktop ? "30px" : "24px", fontWeight: 700 }),
    [desktop],
  );
  return (
    <footer className="bg-white border-t border-border/70 mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row gap-8 justify-between">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">Wadah resmi member & relawan GIBRAN2029 untuk bergerak bersama menuju Indonesia Maju 2029.</p>
        </div>
        <div className="flex flex-col md:items-end gap-3 text-sm text-muted-foreground w-full md:w-auto">
          <div className="relative w-full h-12 md:h-14 md:w-[360px]" data-testid="footer-vapour-text">
            <VaporizeTextCycle
              texts={VAPOUR_TEXTS}
              font={vapourFont}
              color="rgb(200, 16, 46)"
              spread={5}
              density={5}
              animation={VAPOUR_ANIMATION}
              direction="left-to-right"
              alignment={desktop ? "right" : "left"}
              tag={Tag.P}
            />
          </div>
          <nav className="flex gap-5 font-medium">
            <Link to="/jelajah" className="hover:text-primary">Jelajah</Link>
            <Link to="/cara-kerja" className="hover:text-primary">Cara Bergabung</Link>
            <Link to="/kta" className="hover:text-primary">KTA Saya</Link>
          </nav>
          <p>© {new Date().getFullYear()} GIBRAN2029 — {SLOGAN}</p>
        </div>
      </div>
    </footer>
  );
};
