import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { API } from "@/lib/api";

// URL bukti dari backend berupa path bertanda tangan "/api/proofs/...". Jika web
// memakai REACT_APP_BACKEND_URL (backend beda origin), path itu ditempel ke sana.
export const proofSrc = (url) => (url?.startsWith("/api/") ? API + url.slice(4) : url);

/** Thumbnail bukti analitik (screenshot / rekaman layar). Klik untuk memperbesar/memutar. */
export const ProofGallery = ({ proofs, testid, size = "h-14 w-14" }) => {
  const [open, setOpen] = useState(null);
  if (!proofs?.length) return null;
  return (
    <div data-testid={testid}>
      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Bukti analitik ({proofs.length})</p>
      <div className="flex flex-wrap gap-2">
        {proofs.map((p, i) => (
          <button key={p.proof_id} type="button" onClick={() => setOpen(p)} data-testid={`${testid}-item-${i}`}
            className={`${size} rounded-lg overflow-hidden bg-soft grid place-items-center ring-1 ring-border hover:ring-primary transition`}
            aria-label={p.kind === "video" ? "Putar rekaman layar" : "Lihat screenshot"}>
            {p.kind === "video" ? <PlayCircle className="h-7 w-7 text-primary" /> : <img src={proofSrc(p.url)} alt="" className="h-full w-full object-cover" loading="lazy" />}
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-3 rounded-2xl border-0" data-testid="proof-viewer">
          <DialogTitle className="sr-only">Bukti analitik</DialogTitle>
          {open && (open.kind === "video"
            ? <video src={proofSrc(open.url)} controls autoPlay playsInline className="w-full max-h-[80vh] rounded-xl bg-black" />
            : <img src={proofSrc(open.url)} alt="Bukti analitik" className="w-full max-h-[80vh] object-contain rounded-xl" />)}
        </DialogContent>
      </Dialog>
    </div>
  );
};
