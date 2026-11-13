import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, RefreshCw, Trash2, Link2 } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { inputCls } from "@/components/Shared";

const MAX_BYTES = 2 * 1024 * 1024; // batas backend (POST /api/uploads)
const MAX_SIDE = 1600;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Perkecil foto besar (mis. dari kamera HP) di browser agar < 2 MB sebelum diunggah. */
const shrink = (file) => new Promise((resolve, reject) => {
  if (file.size <= MAX_BYTES && file.type !== "image/png") return resolve(file);
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * k);
    canvas.height = Math.round(img.height * k);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const encode = (q) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Gagal memproses gambar"));
      if (blob.size > MAX_BYTES && q > 0.5) return encode(q - 0.15);
      // PNG kecil (mis. logo transparan) tetap dipakai apa adanya.
      if (file.type === "image/png" && file.size <= MAX_BYTES && file.size <= blob.size) return resolve(file);
      resolve(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
    }, "image/jpeg", q);
    encode(0.85);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("File bukan gambar yang valid")); };
  img.src = url;
});

/**
 * Pilih / seret foto → unggah ke backend (POST /api/uploads) → `onChange(url)`.
 * URL disimpan relatif (/api/uploads/…) sehingga tampil di web (lewat proxy Vercel) dan aplikasi.
 * Tetap bisa menempel URL gambar manual.
 */
export const ImageUpload = ({ value, onChange, testid = "image-upload" }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error("Format gambar harus JPG, PNG, atau WebP");
    setBusy(true);
    try {
      const ready = await shrink(file);
      if (ready.size > MAX_BYTES) throw new Error("Ukuran gambar maksimal 2 MB");
      const body = new FormData();
      body.append("file", ready);
      const { data } = await api.post("/uploads", body);
      onChange(data.upload_id ? `/api/uploads/${data.upload_id}` : data.url);
      toast.success("Foto terunggah");
    } catch (e) {
      toast.error(e.response ? errMsg(e) : e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (!busy) upload(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="space-y-2" data-testid={testid}>
      <input ref={input} type="file" accept={TYPES.join(",")} className="hidden" data-testid={`${testid}-file`}
        onChange={(e) => upload(e.target.files?.[0])} />
      <div
        role="button" tabIndex={0}
        onClick={() => !busy && input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
        className={`relative aspect-[16/9] w-full overflow-hidden rounded-2xl border-2 border-dashed transition-colors cursor-pointer
          ${drag ? "border-primary bg-soft" : value ? "border-transparent" : "border-border bg-secondary hover:border-primary/50"}`}
      >
        {value ? (
          <img src={value} alt="Pratinjau banner campaign" className="h-full w-full object-cover" data-testid={`${testid}-preview`}
            onError={(e) => { e.currentTarget.style.opacity = 0.25; }} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center p-4 text-muted-foreground">
            <div>
              <span className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-soft text-primary grid place-items-center"><ImagePlus className="h-6 w-6" /></span>
              <p className="text-sm font-semibold text-foreground">Klik atau seret foto ke sini</p>
              <p className="text-xs mt-0.5">JPG, PNG, atau WebP · rasio 16:9 disarankan · foto besar otomatis diperkecil</p>
            </div>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
            <span className="flex items-center gap-2 text-sm font-semibold"><Loader2 className="h-5 w-5 animate-spin" /> Mengunggah…</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => input.current?.click()} data-testid={`${testid}-pick`}
          className="h-9 px-3 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 bg-secondary hover:bg-border disabled:opacity-60">
          {value ? <RefreshCw className="h-3.5 w-3.5" /> : <ImagePlus className="h-3.5 w-3.5" />} {value ? "Ganti foto" : "Pilih foto"}
        </button>
        {value && (
          <button type="button" disabled={busy} onClick={() => onChange("")} data-testid={`${testid}-remove`}
            className="h-9 px-3 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 bg-soft text-primary hover:bg-primary hover:text-white">
            <Trash2 className="h-3.5 w-3.5" /> Hapus
          </button>
        )}
        <button type="button" onClick={() => setShowUrl((s) => !s)}
          className="ml-auto h-9 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <Link2 className="h-3.5 w-3.5" /> {showUrl ? "Sembunyikan URL" : "Pakai URL gambar"}
        </button>
      </div>
      {showUrl && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…" className={inputCls} data-testid={`${testid}-url`} />
      )}
    </div>
  );
};
