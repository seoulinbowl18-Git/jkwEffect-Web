import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { api, rp, fmtDate } from "@/lib/api";
import { useSync } from "@/lib/useSync";

/** Riwayat mutasi saldo (GET /api/ledger) milik akun yang login — kreator maupun brand. */
export const LedgerList = ({ reload = 0 }) => {
  const [items, setItems] = useState(null);
  const syncV = useSync();
  useEffect(() => { api.get("/ledger").then((r) => setItems(r.data)).catch(() => setItems([])); }, [syncV, reload]);
  return (
    <div className="bg-card rounded-2xl shadow-soft overflow-hidden" data-testid="ledger-list">
      <div className="px-6 py-4 border-b border-border/70 font-bold">Riwayat mutasi saldo</div>
      {items && items.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Belum ada mutasi</p>}
      <div className="divide-y divide-border/70">
        {(items || []).map((e) => {
          const plus = e.amount >= 0;
          return (
            <div key={e.entry_id} className="px-6 py-3.5 flex items-center gap-3" data-testid={`ledger-row-${e.type}`}>
              <span className={`h-9 w-9 shrink-0 rounded-full grid place-items-center ${plus ? "bg-emerald-50 text-success" : "bg-soft text-primary"}`}>
                {plus ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{e.label}</p>
                <p className="text-xs text-muted-foreground truncate">{[e.note, fmtDate(e.created_at)].filter(Boolean).join(" · ")}</p>
              </div>
              <p className={`font-bold tabular-nums text-sm ${plus ? "text-success" : ""}`}>{plus ? "+" : "-"}{rp(Math.abs(e.amount))}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
