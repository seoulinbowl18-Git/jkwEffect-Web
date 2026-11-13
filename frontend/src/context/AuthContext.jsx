import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getRedirectResult, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { toast } from "sonner";
import { api, errMsg } from "@/lib/api";
import { firebaseAuth, firebaseReady, googleProvider } from "@/lib/firebase";

const AuthCtx = createContext(null);
const NEXT_KEY = "ourbuzzer:login-next";

const FIREBASE_ERRORS = {
  "auth/unauthorized-domain": "Domain ini belum diizinkan di Firebase Auth (Authorized domains).",
  "auth/configuration-not-found": "Login Google belum diaktifkan di Firebase Authentication.",
  "auth/operation-not-allowed": "Provider Google belum diaktifkan di Firebase Authentication.",
  "auth/network-request-failed": "Koneksi ke Google gagal. Cek internet kamu lalu coba lagi.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.",
  "auth/user-disabled": "Akun ini dinonaktifkan.",
};
const loginError = (err) => FIREBASE_ERRORS[err?.code] || errMsg(err);

const remember = (path) => { try { sessionStorage.setItem(NEXT_KEY, path); } catch { /* storage unavailable */ } };
const recall = () => { try { const p = sessionStorage.getItem(NEXT_KEY); sessionStorage.removeItem(NEXT_KEY); return p; } catch { return null; } };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Swap a Firebase ID token for an jkwEffect session cookie, then go to `next`. */
  const finishLogin = useCallback(async (fbUser, next) => {
    const idToken = await fbUser.getIdToken();
    const { data } = await api.post("/auth/firebase", { id_token: idToken });
    // Our own httpOnly session cookie is the source of truth from here on.
    await signOut(firebaseAuth).catch(() => {});
    setUser(data);
    const target = !data.role ? "/onboarding" : next && next !== "/onboarding" ? next : "/dashboard";
    if (window.location.pathname !== target) window.location.assign(target);
  }, []);

  useEffect(() => {
    // Returning from the redirect fallback (used when a popup is blocked)?
    getRedirectResult(firebaseAuth)
      .then((res) => (res?.user ? finishLogin(res.user, recall()) : refresh()))
      .catch((err) => { toast.error(loginError(err)); refresh(); });
  }, [finishLogin, refresh]);

  const login = useCallback(async (path = "/dashboard") => {
    if (!firebaseReady) return toast.error("Login belum dikonfigurasi. Hubungi admin.");
    if (signingIn) return;
    setSigningIn(true);
    try {
      const res = await signInWithPopup(firebaseAuth, googleProvider);
      await finishLogin(res.user, path);
    } catch (err) {
      const code = err?.code || "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        remember(path);
        await signInWithRedirect(firebaseAuth, googleProvider);
        return;
      }
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        toast.error(loginError(err));
      }
    } finally {
      setSigningIn(false);
    }
  }, [finishLogin, signingIn]);

  const logout = async () => {
    await api.post("/auth/logout").catch(() => {});
    await signOut(firebaseAuth).catch(() => {});
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, signingIn, refresh, login, logout }}>{children}</AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
