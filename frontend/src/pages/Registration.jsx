import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, HandHeart, IdCard, ImagePlus, Loader2, LogOut, MapPin, Phone, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { GoogleG } from "@/pages/Login";
import { api, errMsg, fmtDate } from "@/lib/api";
import { LEVELS, useWilayah } from "@/lib/wilayah";

const JENIS = {
  anggota: { title: "Daftar Member", short: "Member", icon: IdCard, desc: "Formulir pendaftaran member resmi Pasukan Gibran Indonesia (GIBRAN2029)." },
  relawan: { title: "Daftar Relawan", short: "Relawan", icon: HandHeart, desc: "Formulir pendaftaran relawan Pasukan Gibran Indonesia (GIBRAN2029)." },
};
const STATUS_NIKAH = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];
const KTP_MAX = 3 * 1024 * 1024; // 3 MB
const KTP_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EMPTY = {
  nik: "", nama: "", kota_lahir: "", tanggal_lahir: "", jenis_kelamin: "",
  provinsi: null, kabupaten: null, kecamatan: null, kelurahan: null, alamat: "",
  status_pernikahan: "", telepon: "", email: "", referral: "",
};

// ---- Gaya gelap (Sleek Black) ----
const inputCls = "w-full h-12 px-4 rounded-xl bg-[#0A0A0A] border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed [color-scheme:dark]";
const selectCls = `${inputCls} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%23ffffff99' stroke-width='2'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_1rem_center] pr-10 [&>option]:bg-[#121212]`;
const cardCls = "rounded-2xl bg-[#121212] ring-1 ring-white/10 p-5 sm:p-7";

/** Perkecil foto KTP besar (mis. dari kamera HP) agar ≤ 3 MB, tetap tajam untuk dibaca. */
const shrinkKtp = (file) => new Promise((resolve, reject) => {
  if (file.size <= KTP_MAX) return resolve(file);
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const k = Math.min(1, 2400 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * k);
    canvas.height = Math.round(img.height * k);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const encode = (q) => canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Gagal memproses foto KTP"));
      if (blob.size > KTP_MAX && q > 0.5) return encode(q - 0.1);
      resolve(new File([blob], "ktp.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", q);
    encode(0.9);
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("File bukan gambar yang valid")); };
  img.src = url;
});

const validate = (f, ktp, setuju) => {
  const e = {};
  if (!/^\d{16}$/.test(f.nik)) e.nik = "NIK harus 16 digit angka sesuai KTP";
  if (f.nama.trim().length < 3) e.nama = "Isi nama lengkap sesuai KTP";
  if (!f.kota_lahir.trim()) e.kota_lahir = "Isi kota kelahiran";
  if (!f.tanggal_lahir) e.tanggal_lahir = "Pilih tanggal lahir";
  else {
    const age = (Date.now() - new Date(f.tanggal_lahir).getTime()) / (365.25 * 864e5);
    if (age < 17) e.tanggal_lahir = "Usia minimal 17 tahun";
    if (age > 120) e.tanggal_lahir = "Tanggal lahir tidak valid";
  }
  if (!f.jenis_kelamin) e.jenis_kelamin = "Pilih jenis kelamin";
  LEVELS.forEach(([k, label]) => { if (!f[k]?.name?.trim()) e[k] = `Pilih ${label.toLowerCase()}`; });
  if (f.alamat.trim().length < 10) e.alamat = "Tulis alamat lengkap (jalan, RT/RW, nomor rumah)";
  if (!f.status_pernikahan) e.status_pernikahan = "Pilih status pernikahan";
  if (!/^(\+62|62|0)8\d{7,12}$/.test(f.telepon.replace(/[\s-]/g, ""))) e.telepon = "Nomor WhatsApp tidak valid (contoh: 081234567890)";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Email tidak valid";
  if (f.referral && !/^[A-Za-z0-9_-]{3,32}$/.test(f.referral.trim())) e.referral = "Kode referral hanya huruf/angka (3–32 karakter)";
  if (!ktp) e.ktp = "Unggah foto KTP";
  if (!setuju) e.setuju = "Centang pernyataan persetujuan untuk melanjutkan";
  return e;
};

const Field = ({ label, error, hint, optional, children, id }) => (
  <div data-field={id}>
    <label htmlFor={id} className="block text-sm font-semibold text-white/85">
      {label} {optional && <span className="font-normal text-white/40">(opsional)</span>}
    </label>
    <div className="mt-1.5">{children}</div>
    {error ? <p className="mt-1.5 text-xs text-red-400" data-testid={`err-${id}`}>{error}</p> : hint && <p className="mt-1.5 text-xs text-white/40">{hint}</p>}
  </div>
);

const Section = ({ no, icon: Icon, title, desc, children }) => (
  <section className={cardCls}>
    <div className="flex items-start gap-3.5">
      <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-white text-[#0A0A0A]"><Icon className="h-5 w-5" /></span>
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] uppercase text-white/40">Bagian {no}</p>
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">{title}</h2>
        {desc && <p className="text-sm text-white/55 mt-0.5">{desc}</p>}
      </div>
    </div>
    <div className="mt-6 grid sm:grid-cols-2 gap-x-5 gap-y-5">{children}</div>
  </section>
);

/** Satu tingkat wilayah: dropdown dari data publik; jatuh ke input teks bila data gagal dimuat. */
const WilayahField = ({ level, index, form, set, error }) => {
  const [key, label, pathFor] = level;
  const parent = index > 0 ? form[LEVELS[index - 1][0]] : null;
  const parentManual = index > 0 && parent && !parent.id;
  const path = index === 0 ? pathFor() : parentManual ? null : pathFor(parent?.id);
  const { items, loading, failed } = useWilayah(path);
  const manual = failed || parentManual;
  const value = form[key];
  if (manual) {
    return (
      <Field id={key} label={label} error={error} hint="Daftar wilayah tidak tersedia, ketik manual.">
        <input id={key} className={inputCls} value={value?.name || ""} placeholder={label} maxLength={80}
          onChange={(e) => set(key, { id: null, name: e.target.value })} />
      </Field>
    );
  }
  return (
    <Field id={key} label={label} error={error}>
      <select id={key} className={selectCls} disabled={index > 0 && !parent} value={value?.id || ""}
        onChange={(e) => { const it = items.find((x) => x.id === e.target.value); set(key, it ? { id: it.id, name: it.name } : null); }}>
        <option value="">{loading ? "Memuat…" : index > 0 && !parent ? `Pilih ${LEVELS[index - 1][1].toLowerCase()} dulu` : `Pilih ${label.toLowerCase()}`}</option>
        {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
      </select>
    </Field>
  );
};

const KtpUpload = ({ file, onChange, error }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const pick = async (f) => {
    if (!f) return;
    if (!KTP_TYPES.includes(f.type)) return toast.error("Format foto KTP harus JPG, PNG, atau WebP");
    setBusy(true);
    try {
      const ready = await shrinkKtp(f);
      if (ready.size > KTP_MAX) throw new Error("Ukuran foto KTP maksimal 3 MB");
      onChange(ready);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="sm:col-span-2" data-field="ktp">
      <p className="block text-sm font-semibold text-white/85">Foto KTP</p>
      <input ref={input} type="file" accept={KTP_TYPES.join(",")} className="hidden" data-testid="ktp-input" onChange={(e) => pick(e.target.files?.[0])} />
      {file ? (
        <div className="mt-1.5 rounded-xl border border-white/10 bg-[#0A0A0A] p-3 flex flex-col sm:flex-row gap-4 sm:items-center">
          <img src={preview} alt="Pratinjau KTP" className="h-32 sm:h-28 w-full sm:w-48 object-cover rounded-lg ring-1 ring-white/10" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{file.name}</p>
            <p className="text-xs text-white/45">{(file.size / 1024 / 1024).toFixed(2)} MB · siap dikirim</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => input.current?.click()} className="h-9 px-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold">Ganti</button>
              <button type="button" onClick={() => onChange(null)} className="h-9 px-3.5 rounded-lg text-sm font-semibold text-white/70 hover:bg-white/10 flex items-center gap-1.5"><Trash2 className="h-4 w-4" /> Hapus</button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" data-testid="ktp-dropzone" onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          className={`mt-1.5 w-full rounded-xl border-2 border-dashed px-4 py-8 grid place-items-center text-center transition-colors ${drag ? "border-white/60 bg-white/5" : error ? "border-red-400/60" : "border-white/15 hover:border-white/35 hover:bg-white/[0.03]"}`}>
          {busy ? <Loader2 className="h-7 w-7 animate-spin text-white/70" /> : <ImagePlus className="h-7 w-7 text-white/70" />}
          <span className="mt-2 font-semibold">{busy ? "Memproses foto…" : "Klik atau seret foto KTP ke sini"}</span>
          <span className="mt-0.5 text-xs text-white/45">JPG, PNG, atau WebP · maksimal 3 MB · pastikan tulisan terbaca jelas</span>
        </button>
      )}
      {error && <p className="mt-1.5 text-xs text-red-400" data-testid="err-ktp">{error}</p>}
    </div>
  );
};

const Shell = ({ jenis, children }) => (
  <div className="min-h-screen bg-[#0A0A0A] text-white">
    <header className="sticky top-0 z-30 bg-[#0A0A0A]/85 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Logo light />
        <Link to="/" className="text-sm font-semibold text-white/70 hover:text-white flex items-center gap-1.5"><ArrowLeft className="h-4 w-4" /> Beranda</Link>
      </div>
    </header>
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {jenis && (
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold"><jenis.icon className="h-4 w-4" /> {jenis.short}</span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold tracking-tight">{jenis.title}</h1>
          <p className="mt-2 text-white/60">{jenis.desc}</p>
        </div>
      )}
      {children}
    </main>
  </div>
);

/** Belum masuk: pakai login Google yang sudah ada (Firebase), lalu kembali ke formulir ini. */
const GoogleGate = ({ jenisKey }) => {
  const { login, signingIn } = useAuth();
  return (
    <div className={`${cardCls} text-center`} data-testid="registration-google-gate">
      <span className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-white text-[#0A0A0A]"><ShieldCheck className="h-7 w-7" /></span>
      <h2 className="mt-4 text-xl font-extrabold">Masuk dulu dengan akun Google</h2>
      <p className="mt-2 text-sm text-white/60 max-w-md mx-auto">Pendaftaran terhubung ke akun Google kamu agar data aman dan status pendaftaran bisa dipantau. Nama & email akan terisi otomatis.</p>
      <button type="button" data-testid="registration-google-button" disabled={signingIn} onClick={() => login(`/daftar/${jenisKey}`)}
        className="mt-6 mx-auto w-full max-w-sm h-14 rounded-2xl bg-white text-[#0A0A0A] font-bold flex items-center justify-center gap-3 hover:bg-[#F0F0F0] transition-colors disabled:opacity-60">
        {signingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleG />} Lanjutkan dengan Google
      </button>
    </div>
  );
};

const Done = ({ jenis, reg }) => (
  <div className={`${cardCls} text-center`} data-testid="registration-done">
    <CheckCircle2 className="mx-auto h-14 w-14 text-white" />
    <h2 className="mt-4 text-2xl font-extrabold">Pendaftaran {jenis.short.toLowerCase()} diterima</h2>
    <p className="mt-2 text-white/60 max-w-md mx-auto">Terima kasih, {reg.nama}. Data kamu sedang diverifikasi oleh admin GIBRAN2029. Kabar selanjutnya dikirim lewat WhatsApp {reg.telepon}.</p>
    {reg.created_at && <p className="mt-1 text-xs text-white/40">Dikirim {fmtDate(reg.created_at)}{reg.status ? ` · status: ${reg.status}` : ""}</p>}
    <Link to="/" className="mt-6 inline-flex h-12 px-6 rounded-xl bg-white text-[#0A0A0A] font-bold items-center gap-2 hover:bg-[#F0F0F0]">Kembali ke beranda</Link>
  </div>
);

export default function Registration() {
  const { jenis: jenisKey } = useParams();
  const jenis = JENIS[jenisKey];
  const { user, loading, setUser } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [ktp, setKtp] = useState(null);
  const [setuju, setSetuju] = useState(false);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);

  // Isi otomatis dari akun Google yang sedang aktif.
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, nama: f.nama || user.name || "", email: f.email || user.email || "" }));
  }, [user]);

  // Sudah pernah mendaftar? Tampilkan statusnya (abaikan bila endpoint belum tersedia).
  useEffect(() => {
    if (!user || !jenis) return;
    api.get("/registrations/me").then((r) => {
      const mine = (Array.isArray(r.data) ? r.data : []).find((x) => x.jenis === jenisKey);
      if (mine) setDone(mine);
    }).catch(() => {});
  }, [user, jenis, jenisKey]);

  if (!jenis) return <Navigate to="/" replace />;

  // Ganti akun Google tanpa meninggalkan formulir.
  const switchAccount = async () => {
    await api.post("/auth/logout").catch(() => {});
    setUser(null);
    setForm(EMPTY);
    setDone(null);
  };

  const set = (k, v) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Ganti wilayah induk → kosongkan tingkat di bawahnya.
      const i = LEVELS.findIndex(([key]) => key === k);
      if (i >= 0) LEVELS.slice(i + 1).forEach(([key]) => { next[key] = null; });
      return next;
    });
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };
  const bind = (k, transform = (x) => x) => ({ id: k, value: form[k], onChange: (e) => set(k, transform(e.target.value)) });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form, ktp, setuju);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return toast.error("Periksa kembali isian yang ditandai");
    }
    const body = new FormData();
    body.append("jenis", jenisKey);
    Object.entries(form).forEach(([k, v]) => {
      if (LEVELS.some(([key]) => key === k)) { body.append(k, v.name.trim()); if (v.id) body.append(`${k}_id`, v.id); }
      else body.append(k, typeof v === "string" ? v.trim() : v);
    });
    body.set("telepon", form.telepon.replace(/[\s-]/g, ""));
    body.append("persetujuan", "true");
    body.append("ktp", ktp);
    setSending(true);
    try {
      const { data } = await api.post("/registrations", body);
      setDone({ ...data, nama: form.nama.trim(), telepon: form.telepon });
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Pendaftaran terkirim");
    } catch (err) {
      const s = err?.response?.status;
      toast.error(s === 404 || s === 405 ? "Layanan pendaftaran belum aktif di server. Hubungi admin GIBRAN2029." : errMsg(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <Shell jenis={jenis}><div className="py-16 grid place-items-center"><Loader2 className="h-8 w-8 animate-spin text-white/60" /></div></Shell>;
  }
  if (!user) return <Shell jenis={jenis}><GoogleGate jenisKey={jenisKey} /></Shell>;
  if (done) return <Shell jenis={jenis}><Done jenis={jenis} reg={done} /></Shell>;

  return (
    <Shell jenis={jenis}>
      <div className="mb-6 rounded-2xl bg-[#121212] ring-1 ring-white/10 px-4 py-3 flex items-center gap-3 text-sm" data-testid="registration-account">
        <GoogleG />
        <div className="min-w-0 flex-1">
          <p className="text-white/50 text-xs">Terhubung dengan akun Google</p>
          <p className="font-semibold truncate">{user.email}</p>
        </div>
        <button type="button" onClick={switchAccount} className="text-white/60 hover:text-white flex items-center gap-1.5 text-xs font-semibold"><LogOut className="h-4 w-4" /> Ganti akun</button>
      </div>

      <form onSubmit={submit} noValidate className="space-y-5" data-testid="registration-form">
        <Section no={1} icon={UserRound} title="Data Pribadi" desc="Isi sesuai yang tertera di KTP.">
          <Field id="nik" label="NIK KTP" error={errors.nik} hint="16 digit angka">
            <input {...bind("nik", (v) => v.replace(/\D/g, "").slice(0, 16))} inputMode="numeric" autoComplete="off" placeholder="3201xxxxxxxxxxxx" className={`${inputCls} tracking-wider tabular-nums`} />
          </Field>
          <Field id="nama" label="Nama Lengkap" error={errors.nama}>
            <input {...bind("nama")} maxLength={100} autoComplete="name" placeholder="Nama sesuai KTP" className={inputCls} />
          </Field>
          <Field id="kota_lahir" label="Kota Kelahiran" error={errors.kota_lahir}>
            <input {...bind("kota_lahir")} maxLength={60} placeholder="Contoh: Surakarta" className={inputCls} />
          </Field>
          <Field id="tanggal_lahir" label="Tanggal Lahir" error={errors.tanggal_lahir}>
            <input {...bind("tanggal_lahir")} type="date" max={new Date().toISOString().slice(0, 10)} className={inputCls} />
          </Field>
          <div className="sm:col-span-2" data-field="jenis_kelamin">
            <p className="block text-sm font-semibold text-white/85">Jenis Kelamin</p>
            <div className="mt-1.5 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Jenis kelamin">
              {["Laki-laki", "Perempuan"].map((g) => (
                <button key={g} type="button" role="radio" aria-checked={form.jenis_kelamin === g} data-testid={`gender-${g}`} onClick={() => set("jenis_kelamin", g)}
                  className={`h-12 rounded-xl font-semibold border transition-colors ${form.jenis_kelamin === g ? "bg-white text-[#0A0A0A] border-white" : "bg-[#0A0A0A] text-white/80 border-white/10 hover:border-white/35"}`}>
                  {g}
                </button>
              ))}
            </div>
            {errors.jenis_kelamin && <p className="mt-1.5 text-xs text-red-400">{errors.jenis_kelamin}</p>}
          </div>
        </Section>

        <Section no={2} icon={MapPin} title="Alamat Domisili" desc="Alamat tempat kamu tinggal saat ini.">
          {LEVELS.map((lv, i) => <WilayahField key={lv[0]} level={lv} index={i} form={form} set={set} error={errors[lv[0]]} />)}
          <div className="sm:col-span-2">
            <Field id="alamat" label="Alamat Lengkap" error={errors.alamat} hint="Nama jalan, RT/RW, nomor rumah, patokan">
              <textarea {...bind("alamat")} rows={3} maxLength={300} placeholder="Jl. Slamet Riyadi No. 12, RT 03/RW 05" className={`${inputCls} h-auto py-3 resize-none`} />
            </Field>
          </div>
        </Section>

        <Section no={3} icon={Phone} title="Kontak & Verifikasi">
          <Field id="status_pernikahan" label="Status Pernikahan" error={errors.status_pernikahan}>
            <select {...bind("status_pernikahan")} className={selectCls}>
              <option value="">Pilih status</option>
              {STATUS_NIKAH.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field id="telepon" label="No. Telepon (WhatsApp)" error={errors.telepon}>
            <input {...bind("telepon", (v) => v.replace(/[^\d+\s-]/g, "").slice(0, 18))} type="tel" inputMode="tel" autoComplete="tel" placeholder="081234567890" className={inputCls} />
          </Field>
          <Field id="email" label="Email" error={errors.email}>
            <input {...bind("email")} type="email" autoComplete="email" placeholder="nama@email.com" className={inputCls} />
          </Field>
          <Field id="referral" label="Kode Referral" optional error={errors.referral}>
            <input {...bind("referral")} maxLength={32} placeholder="Jika diajak oleh member lain" className={inputCls} />
          </Field>
          <KtpUpload file={ktp} onChange={(f) => { setKtp(f); setErrors((e) => ({ ...e, ktp: undefined })); }} error={errors.ktp} />
        </Section>

        <section className={cardCls} data-field="setuju">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" data-testid="consent" checked={setuju} onChange={(e) => { setSetuju(e.target.checked); setErrors((x) => ({ ...x, setuju: undefined })); }}
              className="mt-1 h-5 w-5 shrink-0 rounded accent-white" />
            <span className="text-sm text-white/75 leading-relaxed">
              Saya menyatakan bahwa seluruh data yang saya isi adalah <b className="text-white">benar dan dapat dipertanggungjawabkan</b>, bersedia data saya
              diverifikasi dan diproses untuk keperluan member, serta bersedia <b className="text-white">tunduk pada AD/ART dan peraturan organisasi</b> Pasukan Gibran Indonesia (GIBRAN2029).
            </span>
          </label>
          {errors.setuju && <p className="mt-2 text-xs text-red-400">{errors.setuju}</p>}
          <button type="submit" disabled={sending} data-testid="registration-submit"
            className="mt-6 w-full h-14 rounded-2xl bg-white text-[#0A0A0A] text-base font-extrabold flex items-center justify-center gap-2 hover:bg-[#F0F0F0] transition-colors disabled:opacity-60">
            {sending ? <><Loader2 className="h-5 w-5 animate-spin" /> Mengirim…</> : `Kirim pendaftaran ${jenis.short.toLowerCase()}`}
          </button>
          <p className="mt-3 text-xs text-white/40 text-center flex items-center justify-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> NIK & foto KTP hanya bisa dilihat admin GIBRAN2029 untuk verifikasi.</p>
        </section>
      </form>
    </Shell>
  );
}
