import { rp } from "@/lib/api";

/** Rincian biaya transparan: baris [label, nilai, {strong, minus}] dan satu baris total. */
export const FeeBreakdown = ({ rows, total, testid }) => (
  <dl className="rounded-xl bg-secondary/60 p-4 text-sm space-y-2" data-testid={testid}>
    {rows.map(([label, value, opt = {}]) => (
      <div key={label} className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{label}</dt>
        <dd className={`font-semibold tabular-nums ${opt.minus ? "text-primary" : ""}`} data-testid={opt.testid}>{opt.minus && value > 0 ? "-" : ""}{rp(value)}</dd>
      </div>
    ))}
    <div className="flex justify-between gap-3 border-t border-border pt-2">
      <dt className="font-bold">{total[0]}</dt>
      <dd className="font-extrabold text-base tabular-nums" data-testid={total[2]}>{rp(total[1])}</dd>
    </div>
  </dl>
);
