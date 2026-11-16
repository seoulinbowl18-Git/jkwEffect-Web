import { Info, ChevronRight } from "lucide-react";
import { PlatformIcon } from "@/components/PlatformIcon";
import { rp, num, isAksi, TARGET_AKSI } from "@/lib/api";

export const CampaignCard = ({ c, onInfo, onSubmit, rank }) => {
  const pct = c.budget_left_pct;
  const bar = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="relative shrink-0 w-[280px] snap-start" data-testid={`campaign-card-${c.campaign_id}`}>
      {rank && (
        <span className="absolute -left-11 bottom-16 text-[120px] leading-none font-black text-transparent [-webkit-text-stroke:2px_#E9E9EF] select-none">{rank}</span>
      )}
      <div className="relative bg-card rounded-2xl shadow-soft p-2 hover:-translate-y-1 hover:shadow-soft-lg transition-[transform,box-shadow] duration-200">
        <div className="relative h-36 rounded-xl overflow-hidden bg-secondary">
          {c.thumbnail && <img src={c.thumbnail} alt={c.title} className="h-full w-full object-cover" loading="lazy" />}
          <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-white/95 text-xs font-semibold shadow-soft">{c.category}</span>
        </div>
        <div className="px-2 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 text-foreground/80">{c.platforms.map((p) => <PlatformIcon key={p} p={p} />)}</div>
            {isAksi(c)
              ? <span className="px-2.5 py-0.5 rounded-full bg-soft text-primary font-bold text-xs" data-testid="campaign-kind">Aksi Gerakan</span>
              : <span className="px-2.5 py-0.5 rounded-full bg-soft text-primary font-bold text-sm" data-testid="campaign-rate">
                  {rp(c.rate_per_1k)} <span className="text-[10px] font-semibold">/1K</span>
                </span>}
          </div>
          <h3 className="mt-2 font-bold text-[15px] leading-snug line-clamp-2 min-h-[42px]">{c.title}</h3>
          {isAksi(c) ? (
            <div className="mt-3 flex flex-wrap gap-1.5 min-h-[44px] content-start" data-testid="campaign-target-aksi">
              {(c.target_actions || []).map((a) => (
                <span key={a} className="px-2 py-0.5 rounded-md bg-secondary text-xs font-semibold">{TARGET_AKSI[a] || a}</span>
              ))}
            </div>
          ) : (
            <>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>Min. <b className="text-foreground">{num(c.min_views)}</b> views</span>
                <span>Budget <b className="text-foreground">{pct}%</b></span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
            <button data-testid={`campaign-info-${c.campaign_id}`} onClick={() => onInfo(c)} className="h-10 px-3 rounded-xl border border-border text-sm font-semibold flex items-center gap-1.5 hover:bg-secondary">
              <Info className="h-4 w-4" /> Instruksi
            </button>
            <button data-testid={`campaign-submit-${c.campaign_id}`} onClick={() => onSubmit(c)} className="btn-primary h-10 px-3">
              Submit <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
