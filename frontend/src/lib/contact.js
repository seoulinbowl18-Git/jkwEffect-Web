// Kontak admin untuk brand ("Hubungi Kami"). Nomor diatur lewat env Vercel
// REACT_APP_CONTACT_WHATSAPP (format bebas: 0812…, +62 812…, 62812…).
const normalize = (raw) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) return `62${d.slice(1)}`;
  if (d.startsWith("8")) return `62${d}`;
  return d;
};

export const CONTACT_WHATSAPP = normalize(process.env.REACT_APP_CONTACT_WHATSAPP);

export const BRAND_CONTACT_MESSAGE =
  "Halo Admin Gibran for 2029, saya dari brand ... dan ingin konsultasi untuk membuat campaign di Gibran for 2029. Mohon info lebih lanjut, terima kasih!";

/** Link wa.me dengan pesan otomatis, atau "" bila nomor belum diatur. */
export const whatsappLink = (message = BRAND_CONTACT_MESSAGE) =>
  CONTACT_WHATSAPP ? `https://wa.me/${CONTACT_WHATSAPP}?text=${encodeURIComponent(message)}` : "";
