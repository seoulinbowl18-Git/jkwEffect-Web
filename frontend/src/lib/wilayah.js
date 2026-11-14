import { useEffect, useState } from "react";

// Data wilayah administratif Indonesia (provinsi → kab/kota → kecamatan → kelurahan/desa).
// Sumber publik statis (tanpa API key). Jika gagal dimuat, form beralih ke input teks biasa.
const BASE = process.env.REACT_APP_WILAYAH_API || "https://www.emsifa.com/api-wilayah-indonesia/api";
const cache = new Map();

const load = (path) => {
  if (!cache.has(path)) {
    cache.set(path, fetch(`${BASE}/${path}.json`).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).catch((e) => { cache.delete(path); throw e; }));
  }
  return cache.get(path);
};

/** Daftar wilayah untuk satu tingkat. `path` null = belum bisa dimuat (induk belum dipilih). */
export const useWilayah = (path) => {
  const [state, setState] = useState({ items: [], loading: false, failed: false });
  useEffect(() => {
    if (!path) { setState({ items: [], loading: false, failed: false }); return undefined; }
    let alive = true;
    setState((s) => ({ ...s, loading: true, failed: false }));
    load(path)
      .then((items) => alive && setState({ items, loading: false, failed: false }))
      .catch(() => alive && setState({ items: [], loading: false, failed: true }));
    return () => { alive = false; };
  }, [path]);
  return state;
};

export const LEVELS = [
  ["provinsi", "Provinsi", () => "provinces"],
  ["kabupaten", "Kabupaten / Kota", (id) => id && `regencies/${id}`],
  ["kecamatan", "Kecamatan", (id) => id && `districts/${id}`],
  ["kelurahan", "Kelurahan / Desa", (id) => id && `villages/${id}`],
];
