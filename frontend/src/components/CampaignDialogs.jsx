import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlatformIcon } from "@/components/PlatformIcon";
import { api, rp, num, errMsg, fmtDate, PLATFORMS } from "@/lib/api";

export const InstructionDialog = ({ c, onClose, onSubmit }) => (
  <Dialog open={!!c} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="rounded-2xl border-0 shadow-soft-lg max-w-lg" data-testid="instruction-dialog">
      {c && (
        <>
          <DialogHeader>
            <DialogTitle className="text-xl">{c.title}</DialogTitle>
            <DialogDescription>oleh {c.brand_name} · tutup {fmtDate(c.deadline)}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Rate" value={`${rp(c.rate_per_1k)}/1K`} />
            <Stat label="Min. views" value={num(c.min_views)} />
            <Stat label="Sisa budget" value={`${c.budget_left_pct}%`} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {c.platforms.map((p) => (
              <span key={p} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-sm"><PlatformIcon p={p} /> {PLATFORMS[p]}</span>
            ))}
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm bg-secondary/60 rounded-xl p-4 max-h-64 overflow-auto" data-testid="instruction-text">{c.instructions}</pre>
          <button data-testid="instruction-submit-button" onClick={() => { onClose(); onSubmit(c); }} className="btn-primary">
            Submit video
          </button>
        </>
      )}
    </DialogContent>
  </Dialog>
);

const Stat = ({ label, value }) => (
  <div className="rounded-xl bg-primary/5 p-3">
    <p className="text-xs text-muted-foreground font-medium">{label}</p>
    <p className="font-bold text-sm mt-1">{value}</p>
  </div>
);

export const SubmitDialog = ({ c, onClose, onDone }) => {
  const [platform, setPlatform] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (c) { setPlatform(c.platforms[0]); setUrl(""); } }, [c]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/submissions", { campaign_id: c.campaign_id, platform, video_url: url });
      toast.success("Video berhasil disubmit! Tunggu review brand.");
      onClose();
      onDone?.();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!c} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-0 shadow-soft-lg max-w-md" data-testid="submit-dialog">
        {c && (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Submit video</DialogTitle>
              <DialogDescription>{c.title}</DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 flex-wrap">
              {c.platforms.map((p) => (
                <button type="button" key={p} data-testid={`submit-platform-${p}`} onClick={() => setPlatform(p)}
                  className={`flex items-center gap-1.5 px-3 h-10 rounded-xl border text-sm font-semibold transition-colors ${platform === p ? "bg-soft text-primary border-primary" : "border-border hover:bg-secondary"}`}>
                  <PlatformIcon p={p} /> {PLATFORMS[p]}
                </button>
              ))}
            </div>
            <input data-testid="submit-video-url-input" required value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder={`https://www.${platform === "youtube" ? "youtube.com/shorts" : platform === "threads" ? "threads.net/@kamu/post" : platform + ".com/@kamu/video"}/...`}
              className="w-full h-12 px-4 rounded-xl border border-border bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary" />
            <p className="text-xs text-muted-foreground">Video harus publik. Setelah konten disetujui, kamu bisa klaim views saat sudah mencapai minimal {num(c.min_views)} views.</p>
            <button data-testid="submit-video-confirm-button" disabled={busy} className="btn-primary h-12 w-full">
              {busy ? "Mengirim..." : "Kirim submission"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
