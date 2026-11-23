import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// One shared poller for the whole app: GET /api/sync returns a version number the backend bumps after
// every write (from this web app, the mobile app, or the Owner). Screens put `version` in their effect
// deps and refetch when it moves, so changes appear on web and mobile within seconds.
const INTERVAL = 15000;
let version = 0;
let timer = null;
const listeners = new Set();

const poll = async () => {
  if (typeof document !== "undefined" && document.hidden) return;
  try {
    const { data } = await api.get("/sync");
    if (typeof data?.v === "number" && data.v !== version) {
      const first = version === 0;
      version = data.v;
      if (!first) listeners.forEach((fn) => fn(version));
    }
  } catch { /* offline: try again next tick */ }
};

const start = () => {
  if (timer) return;
  poll();
  timer = setInterval(poll, INTERVAL);
  window.addEventListener("focus", poll);
  document.addEventListener("visibilitychange", poll);
};
const stop = () => {
  clearInterval(timer);
  timer = null;
  window.removeEventListener("focus", poll);
  document.removeEventListener("visibilitychange", poll);
};

/** Returns a number that changes whenever data changed anywhere in the Gibran for 2029 ecosystem. */
export const useSync = () => {
  const [v, setV] = useState(version);
  useEffect(() => {
    listeners.add(setV);
    start();
    return () => {
      listeners.delete(setV);
      if (!listeners.size) stop();
    };
  }, []);
  return v;
};
