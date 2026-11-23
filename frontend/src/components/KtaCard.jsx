import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { fmtDate } from "@/lib/api";
import { SLOGAN } from "@/components/Logo";

// Kartu Tanda Anggota (KTA) digital Gibran for 2029 — rasio kartu ID standar (85,6 × 54 mm).
export const KTA_TITLE = { anggota: "Kartu Tanda Anggota", relawan: "Kartu Tanda Relawan" };
export const KTA_ROLE = { anggota: "MEMBER", relawan: "RELAWAN" };
const LOGO = "/gibran2029-logo.png";

const domisili = (r) => [r.kabupaten, r.provinsi].filter(Boolean).join(", ");
/** Baris NIK hanya untuk Member; kartu Relawan tidak menampilkan NIK sama sekali. */
const showNik = (r) => r.jenis === "anggota";
const titleCase = (s = "") => s.toLowerCase().replace(/(^|[\s'-])\S/g, (m) => m.toUpperCase());

// Barcode KTA: Code 128 berisi nomor KTA, dibuat otomatis untuk setiap pendaftaran yang sudah punya nomor.
const BARCODE_OPTS = { format: "CODE128", displayValue: false, margin: 0, background: "#ffffff", lineColor: "#0A0A0A" };

export const KtaBarcode = ({ value, className = "", testid = "kta-barcode" }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try { JsBarcode(ref.current, value, { ...BARCODE_OPTS, width: 2, height: 60 }); } catch { /* nomor tidak valid: barcode dikosongkan */ }
  }, [value]);
  if (!value) return null;
  return (
    <div className={`rounded-[0.45em] bg-white px-[0.55em] pt-[0.45em] pb-[0.3em] text-[#0A0A0A] ${className}`} data-testid={testid}>
      <svg ref={ref} className="block h-[2.3em] w-full" preserveAspectRatio="none" aria-label={`Barcode ${value}`} />
      <p className="mt-[0.2em] text-center text-[0.42em] font-bold tracking-[0.2em] tabular-nums">{value}</p>
    </div>
  );
};

/** Tampilan kartu di halaman (HTML). */
export const KtaCard = ({ reg }) => (
  <div className="relative w-full aspect-[1.586] overflow-hidden rounded-[22px] text-white shadow-[0_30px_60px_-24px_rgba(90,0,15,0.7)] ring-1 ring-black/10 select-none"
    style={{ background: "linear-gradient(135deg, #8E001C 0%, #C8102E 45%, #F21D43 100%)", containerType: "inline-size" }}
    data-testid={`kta-card-${reg.jenis}`}>
    <div className="absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 105% -10%, transparent 42%, rgba(255,255,255,.14) 42.4%, transparent 43%), radial-gradient(circle at 105% -10%, transparent 58%, rgba(255,255,255,.1) 58.4%, transparent 59%)" }} />
    <div className="absolute left-0 right-0 bottom-0 h-[4.5%] flex"><span className="flex-1 bg-[#E11D2E]" /><span className="flex-1 bg-white" /></div>
    <div className="relative h-full flex flex-col p-[5.5%]" style={{ fontSize: "clamp(9px, 3.2cqw, 22px)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-[0.6em]">
          <img src={LOGO} alt="" className="h-[3.4em] w-[3.4em] rounded-full ring-2 ring-white/80" draggable={false} />
          <div className="leading-tight">
            <p className="font-black tracking-tight text-[1.35em] whitespace-nowrap">Gibran for 2029</p>
            <p className="text-[0.56em] font-semibold text-white/85">{SLOGAN}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-[0.7em] shrink-0">
          <span className="rounded-full bg-[#0A0A0A] px-[0.8em] py-[0.35em] text-[0.58em] font-bold tracking-[0.14em] uppercase whitespace-nowrap">{KTA_TITLE[reg.jenis]}</span>
          <KtaBarcode value={reg.kta_number} className="w-[9.5em]" />
        </div>
      </div>
      <div className="mt-auto">
        <p className="text-[0.6em] font-semibold tracking-[0.16em] uppercase text-white/70">Nama</p>
        <p className="font-extrabold text-[1.55em] leading-tight truncate">{titleCase(reg.nama)}</p>
        <div className="mt-[0.5em] inline-flex items-center gap-[0.6em] rounded-[0.5em] bg-[#0A0A0A]/85 px-[0.7em] py-[0.35em]">
          <span className="text-[0.55em] font-bold tracking-[0.14em] text-white/60">NO. KTA</span>
          <span className="font-black tracking-[0.06em] text-[1.05em] tabular-nums" data-testid="kta-number">{reg.kta_number}</span>
        </div>
      </div>
      <div className={`mt-[0.9em] mb-[0.5em] grid ${showNik(reg) ? "grid-cols-[1.4fr_1fr_0.9fr]" : "grid-cols-[2.4fr_0.9fr]"} gap-[0.8em] text-[0.62em]`}>
        <div className="min-w-0"><p className="text-white/65 font-semibold uppercase tracking-wider text-[0.85em]">Domisili</p><p className="font-bold truncate">{titleCase(domisili(reg)) || "-"}</p></div>
        {showNik(reg) && <div className="min-w-0" data-testid="kta-nik"><p className="text-white/65 font-semibold uppercase tracking-wider text-[0.85em]">NIK</p><p className="font-bold tabular-nums">{reg.nik_masked || "-"}</p></div>}
        <div className="min-w-0 text-right"><p className="text-white/65 font-semibold uppercase tracking-wider text-[0.85em]">Sejak</p><p className="font-bold">{reg.kta_issued_at ? fmtDate(reg.kta_issued_at) : "-"}</p></div>
      </div>
    </div>
  </div>
);

// ---------------- Unduh sebagai PNG (digambar ulang di canvas, tanpa pustaka tambahan) ----------------
const loadImg = (src) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

const fitText = (ctx, text, maxW, weight, size, min = 18) => {
  let s = size;
  ctx.font = `${weight} ${s}px Inter, sans-serif`;
  while (ctx.measureText(text).width > maxW && s > min) { s -= 2; ctx.font = `${weight} ${s}px Inter, sans-serif`; }
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Gambar KTA ke canvas 1600×1009 px lalu unduh sebagai PNG. */
export const downloadKta = async (reg) => {
  const W = 1600, H = Math.round(W / 1.586), P = 88;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  await document.fonts?.ready;
  const logo = await loadImg(LOGO);

  roundRect(ctx, 0, 0, W, H, 56); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#8E001C"); g.addColorStop(0.45, "#C8102E"); g.addColorStop(1, "#F21D43");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 6;
  [0.62, 0.86].forEach((k) => { ctx.beginPath(); ctx.arc(W * 1.05, -H * 0.1, W * k, 0, Math.PI * 2); ctx.stroke(); });
  ctx.fillStyle = "#E11D2E"; ctx.fillRect(0, H - 46, W / 2, 46);
  ctx.fillStyle = "#FFFFFF"; ctx.fillRect(W / 2, H - 46, W / 2, 46);

  // Kepala kartu: logo + Gibran for 2029 + label jenis
  const L = 170;
  if (logo) {
    ctx.save(); ctx.beginPath(); ctx.arc(P + L / 2, P + L / 2, L / 2, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(logo, P, P, L, L); ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(P + L / 2, P + L / 2, L / 2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = "#fff"; ctx.textBaseline = "alphabetic";
  const label = KTA_TITLE[reg.jenis].toUpperCase();
  ctx.font = "700 30px Inter, sans-serif";
  const lw = ctx.measureText(label).width + 64;
  // Nama gerakan: dikecilkan bila perlu agar tidak menabrak label jenis kartu di kanan.
  ctx.fillText(fitText(ctx, "Gibran for 2029", W - P - lw - 40 - (P + L + 34), 900, 70, 40), P + L + 34, P + 92);
  // Slogan di bawah Gibran for 2029: dikecilkan bila perlu agar tidak menabrak label jenis kartu di kanan.
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const sloganMaxW = W - P - lw - 40 - (P + L + 36);
  ctx.fillText(fitText(ctx, SLOGAN, sloganMaxW, 600, 32, 20), P + L + 36, P + 142);
  ctx.font = "700 30px Inter, sans-serif";
  ctx.fillStyle = "#0A0A0A"; roundRect(ctx, W - P - lw, P + 18, lw, 64, 32); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillText(label, W - P - lw + 32, P + 61);

  // Nama + nomor KTA
  ctx.fillStyle = "rgba(255,255,255,0.72)"; ctx.font = "600 30px Inter, sans-serif"; ctx.fillText("NAMA", P, H - 410);
  ctx.fillStyle = "#fff"; ctx.fillText(fitText(ctx, titleCase(reg.nama), W - 2 * P, 800, 82, 40), P, H - 330);
  ctx.font = "900 62px Inter, sans-serif";
  const nw = ctx.measureText(reg.kta_number).width;
  ctx.fillStyle = "rgba(10,10,10,0.88)"; roundRect(ctx, P, H - 300, nw + 250, 100, 22); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = "700 28px Inter, sans-serif"; ctx.fillText("NO. KTA", P + 34, H - 238);
  ctx.fillStyle = "#fff"; ctx.font = "900 62px Inter, sans-serif"; ctx.fillText(reg.kta_number, P + 200, H - 227);

  // Baris bawah: domisili, NIK (khusus Member), sejak
  const cols = [["DOMISILI", titleCase(domisili(reg)) || "-", P, showNik(reg) ? 640 : 1050, "left"],
    ...(showNik(reg) ? [["NIK", reg.nik_masked || "-", P + 700, 420, "left"]] : []),
    ["SEJAK", reg.kta_issued_at ? fmtDate(reg.kta_issued_at) : "-", W - P, 330, "right"]];
  // Barcode Code 128 (nomor KTA) di kanan, di bawah label jenis kartu.
  if (reg.kta_number) {
    const bc = document.createElement("canvas");
    try {
      JsBarcode(bc, reg.kta_number, { ...BARCODE_OPTS, width: 2, height: 130 });
      const bw = Math.max(bc.width + 56, 420), bh = bc.height + 92, bx = W - P - bw, by = P + 118;
      ctx.fillStyle = "#FFFFFF"; roundRect(ctx, bx, by, bw, bh, 22); ctx.fill();
      ctx.drawImage(bc, Math.round(bx + (bw - bc.width) / 2), by + 24);
      ctx.fillStyle = "#0A0A0A"; ctx.font = "700 26px Inter, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(reg.kta_number.split("").join(String.fromCharCode(8202)), bx + bw / 2, by + bh - 24);
      ctx.textAlign = "left";
    } catch { /* nomor tidak valid: kartu tetap diunduh tanpa barcode */ }
  }

  cols.forEach(([k, v, x, maxW, align]) => {
    ctx.textAlign = align;
    ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = "600 26px Inter, sans-serif"; ctx.fillText(k, x, H - 140);
    ctx.fillStyle = "#fff"; ctx.fillText(fitText(ctx, v, maxW, 700, 38, 24), x, H - 92);
  });
  ctx.textAlign = "left";

  const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `KTA-${reg.kta_number}.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
