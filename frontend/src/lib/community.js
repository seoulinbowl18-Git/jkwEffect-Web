import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Link komunitas Telegram diatur di backend (env TELEGRAM_GROUP_URL / TELEGRAM_BOT_USERNAME),
// jadi bisa diganti tanpa deploy ulang web.
let cache = null;
let pending = null;

export const loadCommunity = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = api.get("/public/community")
      .then((r) => (cache = r.data))
      .catch(() => ({ telegram_url: "", telegram_bot: "", telegram_connect_enabled: false }))
      .finally(() => { pending = null; });
  }
  return pending;
};

export const useCommunity = () => {
  const [c, setC] = useState(cache);
  useEffect(() => { let alive = true; loadCommunity().then((v) => alive && setC(v)); return () => { alive = false; }; }, []);
  return c;
};
