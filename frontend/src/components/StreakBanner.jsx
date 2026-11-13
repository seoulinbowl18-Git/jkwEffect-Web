import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Flame } from "lucide-react";
import { api } from "@/lib/api";

export const StreakBanner = ({ data }) => {
  const [s, setS] = useState(data);
  useEffect(() => {
    if (data) setS(data);
    else api.get("/streak").then((r) => setS(r.data)).catch(() => {});
  }, [data]);
  if (!s) return null;
  const target = s.streak < 3 ? 3 : s.streak < 7 ? 7 : 30;
  return (
    <div data-testid="streak-banner" className="relative overflow-hidden bg-card rounded-2xl shadow-soft p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-card-gradient text-white grid place-items-center shadow-glow">
            <div className="text-center">
              <p className="text-2xl font-extrabold leading-none" data-testid="streak-count">{s.streak}</p>
              <p className="text-[11px] text-white/85">hari</p>
            </div>
          </div>
          <div>
            <p className="font-bold text-lg flex items-center gap-1.5">
              {s.streak > 0 ? <><Flame className="h-5 w-5 text-primary" /> Streak {s.streak} hari</> : "Mulai streak"}
            </p>
            <p className="text-sm font-semibold text-primary">Target berikutnya: {target} hari</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-1 max-w-xl">
          {s.week.map((d) => (
            <div key={d.date} className="flex-1 text-center">
              <div className={`h-2.5 rounded-full ${d.posted ? "bg-primary" : d.label === "Hari ini" ? "border-2 border-dashed border-primary/50 bg-card" : "bg-secondary"}`} />
              <p className={`text-[11px] mt-1.5 ${d.label === "Hari ini" ? "font-bold" : "text-muted-foreground"}`}>{d.label}</p>
            </div>
          ))}
        </div>
        <Link to="/cara-kerja" className="lg:ml-auto text-sm font-bold text-primary flex items-center">Cara kerja <ChevronRight className="h-4 w-4" /></Link>
      </div>
      <div className="mt-4 pt-3 border-t-2 border-dashed border-border text-sm flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${s.posted_today ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
        {s.posted_today ? <span><b>Mantap!</b> Kamu sudah posting hari ini.</span> : <span><b>Mulai hari ini.</b> Posting 1 video.</span>}
      </div>
    </div>
  );
};
