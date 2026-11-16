import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ImagePlus, PlayCircle, Send, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { PageHeader, panelCls, inputCls, Empty } from "@/components/Shared";
import { PlatformIcon } from "@/components/PlatformIcon";
import { api, rp, num, errMsg, PLATFORMS } from "@/lib/api";
import { PROOF_GUIDES, PROOF_MUST_SHOW, MAX_PROOF_FILES, checkProofFile, isVideoFile } from "@/lib/claimGuide";

/** Halaman klaim: instruksi rekam layar analitik + form views & unggah bukti. */
export default function ClaimProof() {
  const { sid } = useParams();
  const navigate = useNavigate();
  const [sub, setSub] = useState(undefined);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState("");
  const [views, setViews] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get("/creator/submissions")
      .then((r) => setSub(r.data.find((s) => s.submission_id === sid) || null))
      .catch(() => setSub(null));
  }, [sid]);

  // Pratinjau lokal (object URL) untuk tiap file; dibersihkan saat daftar berubah.
  const previews = useMemo(() => files.map((f) => ({ file: f, url: URL.createObjectURL(f), video: isVideoFile(f) })), [files]);
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  const addFiles = (list) => {
    const errors = [];
    const next = [...files];
    for (const f of Array.from(list || [])) {
      if (next.length >= MAX_PROOF_FILES) { errors.push(`Maksimal ${MAX_PROOF_FILES} file bukti.`); break; }
      const err = checkProofFile(f);
      if (err) errors.push(err); else next.push(f);
    }
    setFiles(next);
    setFileError(errors.join(" "));
  };

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(views);
    if (!files.length) { setFileError("Lampirkan minimal 1 screenshot atau rekaman layar analitik."); return; }
    if (!n || n < sub.min_views) { toast.error(`Views minimal ${num(sub.min_views)}`); return; }
    const fd = new FormData();
    fd.append("views", String(n));
    fd.append("note", note.trim());
    files.forEach((f) => fd.append("files", f, f.name));
    setSending(true);
    try {
      await api.post(`/submissions/${sid}/claim-proof`, fd);
      toast.success("Klaim & bukti terkirim. Brand akan mengecek secara manual.");
      navigate("/dasbor-lama");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  const back = (
    <Link to="/dasbor-lama" className="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-semibold" data-testid="claim-back">
      <ArrowLeft className="h-4 w-4" /> Konten saya
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageHeader eyebrow={back} title="Klaim views" desc="Rekam layar analitik videomu, unggah, lalu kirim klaim." testid="claim-title" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-16 pb-16 relative space-y-6">
        {sub === undefined && <div className={`${panelCls} p-8 text-center text-muted-foreground`}>Memuat…</div>}
        {sub === null && (
          <div className={panelCls}><Empty title="Konten tidak ditemukan" desc="Kembali ke Konten saya lalu pilih konten yang siap diklaim."><Link to="/dasbor-lama" className="btn-primary">Konten saya</Link></Empty></div>
        )}
        {sub && sub.status !== "menunggu_views" && (
          <div className={panelCls} data-testid="claim-not-ready"><Empty title="Konten ini tidak bisa diklaim" desc="Hanya konten berstatus Siap diklaim yang bisa dikirim klaimnya."><Link to="/dasbor-lama" className="btn-primary">Konten saya</Link></Empty></div>
        )}
        {sub && sub.status === "menunggu_views" && (
          <form onSubmit={submit} className="space-y-6" data-testid="claim-form">
            <div className={`${panelCls} p-5 flex items-center gap-4`}>
              <span className="icon-tile"><PlatformIcon p={sub.platform} /></span>
              <div className="min-w-0">
                <p className="font-bold break-words">{sub.campaign_title}</p>
                <p className="text-sm text-muted-foreground">Min. {num(sub.min_views)} views · {rp(sub.rate_per_1k)}/1K views</p>
              </div>
            </div>

            <section className="space-y-2">
              <h2 className="text-lg font-extrabold">1. Rekam layar analitik {PLATFORMS[sub.platform]}</h2>
              <div className={`${panelCls} p-5 space-y-4`} data-testid="claim-guide">
                <ol className="space-y-3">
                  {(PROOF_GUIDES[sub.platform] || PROOF_GUIDES.tiktok).map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="h-6 w-6 shrink-0 rounded-full bg-soft text-primary grid place-items-center text-xs font-extrabold">{i + 1}</span>
                      <span className="text-sm leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="border-t border-border/70 pt-4">
                  <p className="text-sm font-bold mb-2">Pastikan rekaman memperlihatkan:</p>
                  <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                    {PROOF_MUST_SHOW.map((m) => <li key={m} className="flex gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />{m}</li>)}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3">Tips: pakai fitur Rekam Layar bawaan HP, rekam tanpa dipotong, durasi 15–60 detik. Video maks. 15 MB, screenshot maks. 3 MB.</p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-extrabold">2. Unggah bukti</h2>
              <p className="text-sm text-muted-foreground">1–{MAX_PROOF_FILES} file: rekaman layar (MP4/MOV) atau screenshot (JPG/PNG).</p>
              {previews.length > 0 && (
                <ul className="grid sm:grid-cols-3 gap-3" data-testid="proof-files">
                  {previews.map((p, i) => (
                    <li key={p.url} className={`${panelCls} p-2 relative`} data-testid={`proof-file-${i}`}>
                      <div className="aspect-video rounded-xl overflow-hidden bg-soft grid place-items-center">
                        {p.video ? <video src={p.url} muted playsInline className="h-full w-full object-cover" /> : <img src={p.url} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <p className="mt-1.5 text-xs truncate flex items-center gap-1">{p.video && <PlayCircle className="h-3.5 w-3.5 text-primary shrink-0" />}{p.file.name}</p>
                      <p className="text-xs text-muted-foreground">{p.video ? "Rekaman layar" : "Screenshot"} · {(p.file.size / 1048576).toFixed(1)} MB</p>
                      <button type="button" aria-label="Hapus file" disabled={sending} onClick={() => setFiles(files.filter((_, j) => j !== i))}
                        className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/90 shadow grid place-items-center hover:text-primary"><X className="h-4 w-4" /></button>
                    </li>
                  ))}
                </ul>
              )}
              {files.length < MAX_PROOF_FILES && (
                <label
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                  data-testid="proof-dropzone">
                  <ImagePlus className="h-8 w-8 text-primary" />
                  <span className="font-semibold">{files.length ? "Tambah file" : "Pilih atau seret file ke sini"}</span>
                  <span className="text-xs text-muted-foreground">Gambar atau video, maks. {MAX_PROOF_FILES - files.length} file lagi</span>
                  <input ref={inputRef} data-testid="proof-input" type="file" accept="image/*,video/*" multiple className="sr-only"
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                </label>
              )}
              {fileError && <p className="text-sm text-red-600" data-testid="proof-file-error">{fileError}</p>}
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-extrabold">3. Jumlah views</h2>
              <input data-testid="claim-views-input" type="number" min={sub.min_views} value={views} onChange={(e) => setViews(e.target.value)}
                placeholder={`Total views sesuai bukti (min. ${num(sub.min_views)})`} className={inputCls} />
              {Number(views) > 0 && <p className="text-sm font-bold text-success" data-testid="claim-estimate">Estimasi pendapatan: {rp(Math.floor(Number(views) / 1000 * sub.rate_per_1k))}</p>}
              <textarea data-testid="claim-note-input" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} rows={2}
                placeholder="Catatan untuk brand (opsional)" className={`${inputCls} h-auto py-2.5`} />
            </section>

            <button data-testid="claim-submit-button" disabled={sending} className="btn-primary w-full h-12">
              <Send className="h-4 w-4" /> {sending ? "Mengirim…" : "Kirim klaim"}
            </button>
            <p className="text-xs text-center text-muted-foreground">Brand/admin akan mengecek bukti secara manual. Views yang dibayar mengikuti hasil verifikasi.</p>
          </form>
        )}
      </main>
    </div>
  );
}
