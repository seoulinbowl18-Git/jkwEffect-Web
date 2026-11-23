import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Unlink, ExternalLink, Send, Check, X, Loader2 } from "lucide-react";
import { PlatformIcon } from "@/components/PlatformIcon";
import { inputCls } from "@/components/Shared";
import { useSync } from "@/lib/useSync";
import { useCommunity } from "@/lib/community";
import { api, errMsg } from "@/lib/api";

const PLATFORMS = [
  ["tiktok", "TikTok", "bg-black text-white", "@username atau link profil TikTok"],
  ["instagram", "Instagram", "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5] text-white", "@username atau link profil Instagram"],
  ["threads", "Threads", "bg-black text-white", "@username atau link profil Threads"],
];
const TELEGRAM_BLUE = "bg-[#229ED9]";
const linkBtn = "text-sm font-semibold inline-flex items-center gap-1 whitespace-nowrap";

/** Kelola akun TikTok / Instagram / Threads dan hubungkan Telegram komunitas Gibran for 2029. */
export const SocialAccounts = () => {
  const version = useSync();
  const community = useCommunity();
  const [social, setSocial] = useState(null);
  const [editing, setEditing] = useState(null); // platform key
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => api.get("/users/social").then((r) => setSocial(r.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load, version]);

  const save = async (p) => {
    setBusy(p);
    try {
      const { data } = await api.put(`/users/social/${p}`, { handle: value });
      setSocial(data); setEditing(null); setValue("");
      toast.success("Akun tersimpan");
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(""); }
  };
  const unlink = async (p, label) => {
    if (!window.confirm(`Putuskan akun ${label}?`)) return;
    setBusy(p);
    try { const { data } = await api.delete(`/users/social/${p}`); setSocial(data); toast.success(`${label} diputuskan`); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(""); }
  };
  const connectTelegram = async () => {
    // Buka tab lebih dulu (masih dalam klik pengguna) agar tidak diblokir popup blocker.
    const tab = window.open("", "_blank");
    setBusy("telegram");
    try {
      const { data } = await api.post("/users/social/telegram/link");
      if (tab) tab.location.href = data.url; else window.location.href = data.url;
      toast.success("Lanjutkan di Telegram: ketuk START pada bot Gibran for 2029");
    } catch (e) {
      if (tab) tab.close();
      toast.error(errMsg(e));
    } finally { setBusy(""); }
  };

  const tg = social?.telegram;
  return (
    <section className="bg-card rounded-2xl shadow-soft p-6 max-w-3xl" data-testid="social-accounts">
      <h2 className="text-xl font-extrabold tracking-tight">Akun Sosial Media</h2>
      <p className="mt-1 text-sm text-muted-foreground">Akun yang terhubung dipakai untuk semua submission. Telegram untuk komunitas dan info campaign terbaru.</p>

      <div className="mt-4 divide-y divide-border/70">
        {PLATFORMS.map(([k, label, tile, placeholder]) => {
          const acc = social?.[k];
          return (
            <div key={k} className="py-4" data-testid={`social-${k}`}>
              <div className="flex items-center gap-3">
                <span className={`h-11 w-11 shrink-0 rounded-xl grid place-items-center ${tile}`}><PlatformIcon p={k} className="h-5 w-5" /></span>
                <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3">
                  <span className="font-bold">{label}</span>
                  {acc
                    ? <a href={acc.url} target="_blank" rel="noreferrer" className="text-sm text-primary font-semibold truncate inline-flex items-center gap-1">@{acc.username} <ExternalLink className="h-3 w-3" /></a>
                    : <span className="text-sm text-muted-foreground">Belum terhubung</span>}
                </div>
                {editing !== k && (acc ? (
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setEditing(k); setValue(acc.username); }} className={`${linkBtn} text-foreground/70 hover:text-foreground`} data-testid={`social-${k}-edit`}><Pencil className="h-3.5 w-3.5" /> Ubah</button>
                    <button type="button" disabled={busy === k} onClick={() => unlink(k, label)} className={`${linkBtn} text-primary`} data-testid={`social-${k}-unlink`}><Unlink className="h-3.5 w-3.5" /> Putuskan</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setEditing(k); setValue(""); }} className={`${linkBtn} text-primary`} data-testid={`social-${k}-add`}><Plus className="h-4 w-4" /> Tambah</button>
                ))}
              </div>
              {editing === k && (
                <form onSubmit={(e) => { e.preventDefault(); save(k); }} className="mt-3 flex gap-2">
                  <input autoFocus required value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className={inputCls} data-testid={`social-${k}-input`} />
                  <button disabled={busy === k} className="btn-primary h-11 px-4 shrink-0" data-testid={`social-${k}-save`}>{busy === k ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Simpan</button>
                  <button type="button" onClick={() => setEditing(null)} className="h-11 w-11 shrink-0 rounded-xl bg-secondary grid place-items-center" aria-label="Batal"><X className="h-4 w-4" /></button>
                </form>
              )}
            </div>
          );
        })}

        <div className="py-4" data-testid="social-telegram">
          <div className="flex items-center gap-3">
            <span className={`h-11 w-11 shrink-0 rounded-xl grid place-items-center text-white ${TELEGRAM_BLUE}`}><Send className="h-5 w-5 -translate-x-px" /></span>
            <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-3">
              <span className="font-bold">Telegram</span>
              {tg && <span className="text-sm text-success font-semibold truncate">Terhubung{tg.username ? ` · @${tg.username}` : tg.name ? ` · ${tg.name}` : ""}</span>}
            </div>
            {tg && <button type="button" disabled={busy === "telegram"} onClick={() => unlink("telegram", "Telegram")} className={`${linkBtn} text-primary`} data-testid="social-telegram-unlink"><Unlink className="h-3.5 w-3.5" /> Putuskan</button>}
          </div>
          {tg ? (
            community?.telegram_url && (
              <a href={community.telegram_url} target="_blank" rel="noreferrer" className={`mt-4 h-12 w-full rounded-2xl ${TELEGRAM_BLUE} text-white font-bold flex items-center justify-center gap-2 hover:brightness-105`}>
                <Send className="h-4 w-4" /> Buka grup komunitas
              </a>
            )
          ) : community?.telegram_connect_enabled ? (
            <button type="button" onClick={connectTelegram} disabled={busy === "telegram"} data-testid="social-telegram-connect"
              className={`mt-4 h-12 w-full rounded-2xl ${TELEGRAM_BLUE} text-white font-bold flex items-center justify-center gap-2 hover:brightness-105 disabled:opacity-70`}>
              {busy === "telegram" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Hubungkan Telegram
            </button>
          ) : community?.telegram_url ? (
            <a href={community.telegram_url} target="_blank" rel="noreferrer" data-testid="social-telegram-join"
              className={`mt-4 h-12 w-full rounded-2xl ${TELEGRAM_BLUE} text-white font-bold flex items-center justify-center gap-2 hover:brightness-105`}>
              <Send className="h-4 w-4" /> Gabung grup Telegram
            </a>
          ) : (
            <button type="button" disabled className={`mt-4 h-12 w-full rounded-2xl ${TELEGRAM_BLUE} text-white font-bold opacity-60`}>Hubungkan Telegram (segera hadir)</button>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {tg ? "Info campaign baru dan pengumuman Gibran for 2029 dikirim lewat Telegram." : "Kamu otomatis diarahkan ke grup komunitas Telegram Gibran for 2029 lewat bot resmi kami."}
          </p>
        </div>
      </div>
    </section>
  );
};
