import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Persentase fee dibaca dari backend (GET /api/config/fees) supaya bisa diubah di Railway tanpa
// mengubah UI. Nilai di bawah hanya cadangan saat request gagal.
export const DEFAULT_FEES = { brand_topup_fee_pct: 10, creator_withdraw_fee_pct: 15, brand_withdraw_fee_pct: 0, min_topup: 10000, min_withdraw: 50000 };

let cache = null;
let inflight = null;
const loadFees = () => {
  if (cache) return Promise.resolve(cache);
  inflight = inflight || api.get("/config/fees").then((r) => (cache = { ...DEFAULT_FEES, ...r.data })).catch(() => DEFAULT_FEES).finally(() => { inflight = null; });
  return inflight;
};

export const useFees = () => {
  const [fees, setFees] = useState(cache || DEFAULT_FEES);
  useEffect(() => { let alive = true; loadFees().then((f) => alive && setFees(f)); return () => { alive = false; }; }, []);
  return fees;
};

/** Sama persis dengan backend fee_amount(): integer basis point, dibulatkan ke rupiah terdekat. */
export const feeOf = (amount, pct) => {
  const a = Math.max(0, Math.floor(Number(amount) || 0));
  const bp = Math.round((Number(pct) || 0) * 100);
  return Math.floor((a * bp + 5000) / 10000);
};

export const topupQuote = (amount, pct) => {
  const a = Math.max(0, Math.floor(Number(amount) || 0));
  const fee = feeOf(a, pct);
  return { amount: a, fee, total: a + fee, pct };
};

export const withdrawQuote = (amount, pct) => {
  const a = Math.max(0, Math.floor(Number(amount) || 0));
  const fee = feeOf(a, pct);
  return { amount: a, fee, net: a - fee, pct };
};
