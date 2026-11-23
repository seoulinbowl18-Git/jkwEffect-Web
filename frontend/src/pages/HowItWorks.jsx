import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PERAN, PERAN_COPY } from "@/lib/gerakan";

/** /cara-kerja: cara bergabung sebagai Relawan atau Member Gibran for 2029. */
export default function HowItWorks() {
  const navigate = useNavigate();
  const [role, setRole] = useState("relawan");
  const copy = PERAN_COPY[role];
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-sm font-semibold text-primary">Cara bergabung</p>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mt-3 max-w-2xl" data-testid="how-title">{copy.title}</h1>
        <div className="mt-6 inline-flex p-1 rounded-full bg-card shadow-soft" role="tablist" aria-label="Pilih peran">
          {PERAN.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={role === k} data-testid={`how-role-${k}`} onClick={() => setRole(k)}
              className={`h-10 px-5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${role === k ? "bg-[#C8102E] text-white" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {copy.steps.map(([I, t, d], i) => (
            <div key={t} className="bg-card rounded-2xl shadow-soft p-7 animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
              <div className="flex items-center justify-between"><span className="icon-tile"><I className="h-5 w-5" /></span><span className="text-sm font-bold text-primary/40">0{i + 1}</span></div>
              <h3 className="mt-5 font-bold text-lg">{t}</h3>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <button data-testid="how-cta" onClick={() => navigate(`/daftar/${role}`)} className="btn-primary mt-12 h-14 px-8 text-base">
          {copy.cta} <ArrowRight className="h-4 w-4" />
        </button>
      </main>
      <Footer />
    </div>
  );
}
