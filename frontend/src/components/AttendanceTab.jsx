import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, CameraOff, CheckCircle2, AlertTriangle, XCircle, ScanLine, Trash2, Users, Keyboard, IdCard } from "lucide-react";
import { Field, inputCls, panelCls } from "@/components/Shared";
import { api, errMsg, fmtDate } from "@/lib/api";

/**
 * Kehadiran Acara: admin memindai barcode KTA (Code 128 berisi nomor KTA) lewat kamera HP/laptop,
 * atau mengetik nomor / memakai pemindai barcode USB. Tanpa acara dipilih = cek keabsahan KTA saja.
 */
const JENIS = { anggota: "Member", relawan: "Relawan" };
const CHECK_ONLY = "";
const REPEAT_MS = 3000; // kode yang sama dari kamera diabaikan selama 3 detik
const titleCase = (s = "") => s.toLowerCase().replace(/(^|[\s'-])\S/g, (m) => m.toUpperCase());
const wilayah = (r) => titleCase([r.kabupaten, r.provinsi].filter(Boolean).join(", "));

const feedback = (ok) => {
  try { navigator.vibrate?.(ok ? 80 : [60, 60, 60]); } catch { /* tidak didukung */ }
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = ok ? 880 : 220; g.gain.value = 0.08;
    o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + (ok ? 0.12 : 0.3));
  } catch { /* tidak didukung */ }
};

export const AttendanceTab = ({ version }) => {
  const [events, setEvents] = useState(null);
  const [eventId, setEventId] = useState(CHECK_ONLY);
  const [list, setList] = useState(null);
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const last = useRef({ code: "", at: 0 });
  const busyRef = useRef(false);

  useEffect(() => {
    api.get("/admin/attendance/events").then((r) => {
      setEvents(r.data);
      setEventId((cur) => (cur && !r.data.some((e) => e.campaign_id === cur) ? CHECK_ONLY : cur));
    }).catch((e) => toast.error(errMsg(e)));
  }, [version]);

  const loadList = useCallback(() => {
    if (!eventId) return setList(null);
    api.get(`/admin/campaigns/${eventId}/attendance`).then((r) => setList(r.data)).catch(() => setList(null));
  }, [eventId]);
  useEffect(() => { loadList(); }, [loadList, version]);

  const handleCode = useCallback(async (raw, fromCamera = false) => {
    const code = (raw || "").replace(/\s+/g, "").toUpperCase();
    if (!code || busyRef.current) return;
    const t = Date.now();
    if (fromCamera && last.current.code === code && t - last.current.at < REPEAT_MS) return;
    last.current = { code, at: t };
    busyRef.current = true; setBusy(true);
    try {
      if (eventId) {
        const { data } = await api.post(`/admin/campaigns/${eventId}/attendance`, { kta_number: code });
        setResult({ kind: data.already ? "already" : "ok", reg: data.registration, at: data.attendance?.created_at });
        feedback(!data.already);
        loadList();
      } else {
        const { data } = await api.get(`/admin/kta/${encodeURIComponent(code)}`);
        setResult({ kind: data.valid ? "valid" : "invalid", reg: data.registration, msg: data.reason });
        feedback(data.valid);
      }
    } catch (e) {
      setResult({ kind: "error", code, msg: errMsg(e) });
      feedback(false);
    } finally {
      busyRef.current = false; setBusy(false);
    }
  }, [eventId, loadList]);

  const submitManual = (e) => { e.preventDefault(); handleCode(manual); setManual(""); };

  const remove = async (a) => {
    if (!window.confirm(`Batalkan kehadiran ${titleCase(a.nama)} (${a.kta_number})?`)) return;
    try { await api.delete(`/admin/campaigns/${eventId}/attendance/${a.attendance_id}`); toast.success("Kehadiran dibatalkan"); loadList(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const event = events?.find((e) => e.campaign_id === eventId);

  return (
    <div className="grid lg:grid-cols-[1.05fr_1fr] gap-4 items-start" data-testid="attendance-tab">
      <div className={`${panelCls} p-5 space-y-4`}>
        <Field label="Acara">
          <select data-testid="attendance-event" value={eventId} onChange={(e) => { setEventId(e.target.value); setResult(null); }} className={inputCls}>
            <option value={CHECK_ONLY}>Cek keabsahan KTA saja (tanpa mencatat)</option>
            {(events || []).map((e) => <option key={e.campaign_id} value={e.campaign_id}>{e.title}{e.status === "paused" ? " (dijeda)" : ""}</option>)}
          </select>
        </Field>
        {events && !events.length && (
          <p className="text-xs text-muted-foreground -mt-2">Belum ada acara. Buat campaign dengan target aksi <b>Kehadiran Acara</b> agar bisa mencatat kehadiran.</p>
        )}

        <Scanner onCode={(c) => handleCode(c, true)} />

        <form onSubmit={submitManual} className="flex gap-2">
          <div className="relative flex-1">
            <Keyboard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input data-testid="attendance-manual" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ketik / pindai nomor KTA (mis. G2029-M-33-000001)"
              className={`${inputCls} pl-10 uppercase placeholder:normal-case`} autoComplete="off" />
          </div>
          <button data-testid="attendance-manual-submit" disabled={busy || !manual.trim()} className="btn-primary h-11 px-4">{eventId ? "Catat" : "Cek"}</button>
        </form>
        <p className="text-xs text-muted-foreground">Pemindai barcode USB juga bisa dipakai: klik kolom di atas lalu pindai kartu.</p>

        <Result result={result} eventTitle={event?.title} />
      </div>

      <div className={`${panelCls} p-5`}>
        {eventId ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Daftar hadir</p>
                <p className="font-bold truncate">{event?.title}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-soft text-primary px-3 h-10 font-extrabold tabular-nums" data-testid="attendance-total">
                <Users className="h-4 w-4" /> {list?.total ?? 0}
              </span>
            </div>
            <ul className="mt-4 divide-y divide-border/70 max-h-[520px] overflow-auto" data-testid="attendance-list">
              {list && !list.items.length && <li className="py-10 text-center text-sm text-muted-foreground">Belum ada yang tercatat hadir.</li>}
              {(list?.items || []).map((a) => (
                <li key={a.attendance_id} className="py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{titleCase(a.nama)} <span className="text-xs font-medium text-muted-foreground">· {JENIS[a.jenis]}</span></p>
                    <p className="text-xs text-muted-foreground truncate tabular-nums">{a.kta_number} · {wilayah(a) || "-"} · {new Date(a.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <button onClick={() => remove(a)} title="Batalkan" className="h-9 w-9 shrink-0 rounded-xl grid place-items-center text-muted-foreground hover:bg-soft hover:text-primary"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <IdCard className="h-8 w-8 mx-auto mb-3 text-foreground/40" />
            Pilih acara untuk mencatat kehadiran dan melihat daftar hadir.<br />Tanpa acara, pemindaian hanya mengecek keabsahan KTA.
          </div>
        )}
      </div>
    </div>
  );
};

const RESULT_STYLE = {
  ok: ["bg-emerald-50 text-emerald-900 ring-emerald-200", CheckCircle2, "text-emerald-600", "Hadir tercatat"],
  valid: ["bg-emerald-50 text-emerald-900 ring-emerald-200", CheckCircle2, "text-emerald-600", "KTA sah"],
  already: ["bg-amber-50 text-amber-900 ring-amber-200", AlertTriangle, "text-amber-600", "Sudah tercatat sebelumnya"],
  invalid: ["bg-red-50 text-red-900 ring-red-200", XCircle, "text-red-600", "KTA tidak aktif"],
  error: ["bg-red-50 text-red-900 ring-red-200", XCircle, "text-red-600", "Tidak bisa diproses"],
};

const Result = ({ result, eventTitle }) => {
  if (!result) return (
    <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
      <ScanLine className="h-6 w-6 mx-auto mb-2" /> Hasil pindaian muncul di sini.
    </div>
  );
  const [cls, Icon, iconCls, label0] = RESULT_STYLE[result.kind];
  const label = result.kind === "error" && /tidak terdaftar/i.test(result.msg || "") ? "KTA tidak ditemukan" : label0;
  const r = result.reg;
  return (
    <div className={`rounded-2xl p-4 ring-1 ${cls}`} data-testid={`attendance-result-${result.kind}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon className={`h-7 w-7 shrink-0 ${iconCls}`} />
        <div className="min-w-0">
          <p className="font-extrabold">{label}</p>
          {r ? (
            <>
              <p className="text-lg font-bold leading-tight mt-1">{titleCase(r.nama)}</p>
              <p className="text-sm mt-0.5">{JENIS[r.jenis]} · <span className="tabular-nums">{r.kta_number}</span></p>
              <p className="text-sm opacity-80">{wilayah(r) || "-"}{r.kta_issued_at ? ` · KTA sejak ${fmtDate(r.kta_issued_at)}` : ""}</p>
              {result.kind === "already" && result.at && <p className="text-xs mt-1 opacity-80">Tercatat pukul {new Date(result.at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}{eventTitle ? ` di ${eventTitle}` : ""}.</p>}
              {result.msg && <p className="text-xs mt-1 opacity-80">{result.msg}</p>}
            </>
          ) : (
            <p className="text-sm mt-1">{result.msg}{result.code ? <span className="block text-xs opacity-70 tabular-nums mt-0.5">Kode: {result.code}</span> : null}</p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Pemindai kamera (@zxing/library, dimuat saat dibutuhkan): Code 128 (barcode KTA) & QR. */
const Scanner = ({ onCode }) => {
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const video = useRef(null);
  const cb = useRef(onCode);
  cb.current = onCode;

  useEffect(() => {
    if (!on) return undefined;
    let stream; let timer; let stopped = false;
    (async () => {
      try {
        const Z = await import("@zxing/library");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current;
        v.srcObject = stream;
        await v.play().catch(() => {});
        const reader = new Z.MultiFormatReader();
        reader.setHints(new Map([[Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.QR_CODE]],
          [Z.DecodeHintType.TRY_HARDER, true]]));
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        // Setiap ~250 ms: ambil satu frame, baca barcode (Code 128 / QR) dari seluruh frame.
        const tick = () => {
          if (stopped) return;
          if (v.readyState >= 2 && v.videoWidth) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            try {
              const src = new Z.HTMLCanvasElementLuminanceSource(canvas);
              const res = reader.decode(new Z.BinaryBitmap(new Z.HybridBinarizer(src)));
              if (res) cb.current(res.getText());
            } catch { /* belum ada barcode terbaca di frame ini */ }
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (e) {
        const m = String(e?.name || "") + String(e?.message || e);
        setErr(/NotAllowed|Permission/i.test(m)
          ? "Izin kamera ditolak. Izinkan kamera di browser, atau ketik nomor KTA."
          : "Kamera tidak bisa dibuka di perangkat ini. Ketik nomor KTA atau pakai pemindai USB.");
        setOn(false);
      }
    })();
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [on]);

  return (
    <div>
      {on && (
        <div className="relative overflow-hidden rounded-2xl bg-[#0A0A0A] aspect-[4/3] sm:aspect-video">
          <video ref={video} muted playsInline className="absolute inset-0 h-full w-full object-cover" data-testid="attendance-camera" />
          {/* Bingkai bidik: arahkan barcode KTA ke dalam kotak. */}
          <div className="pointer-events-none absolute inset-x-[7%] top-1/2 -translate-y-1/2 h-[38%] rounded-xl ring-2 ring-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
            <span className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-[#F21D43] animate-pulse" />
          </div>
          <p className="absolute bottom-2 inset-x-0 text-center text-xs font-semibold text-white/90">Arahkan barcode KTA ke dalam kotak</p>
        </div>
      )}
      <button type="button" data-testid="attendance-camera-toggle" onClick={() => { setErr(""); setOn((x) => !x); }}
        className={`${on ? "mt-3 bg-secondary hover:bg-border text-foreground" : "btn-primary"} w-full h-12 rounded-xl font-bold inline-flex items-center justify-center gap-2`}>
        {on ? <><CameraOff className="h-4 w-4" /> Matikan kamera</> : <><Camera className="h-4 w-4" /> Pindai barcode KTA dengan kamera</>}
      </button>
      {err && <p className="mt-2 text-xs text-primary">{err}</p>}
    </div>
  );
};
