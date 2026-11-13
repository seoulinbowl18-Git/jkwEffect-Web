import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, User, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { inputCls } from "@/components/Shared";

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const [role, setRole] = useState("creator");
  const [brandName, setBrandName] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/users/role", { role, brand_name: brandName || undefined });
      setUser(data);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  };

  const opts = [["creator", "Saya Kreator", "Saya mau dapat cuan dari bikin konten.", User], ["brand", "Saya Brand", "Saya mau buat campaign & bayar per views.", Building2]];
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Halo, {user?.name?.split(" ")[0]}!</h1>
        <p className="text-muted-foreground mt-2">Kamu mau pakai jkwEffect sebagai apa? Pilihan ini tidak bisa diubah nanti.</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-8">
          {opts.map(([k, t, d, I]) => (
            <button key={k} data-testid={`onboarding-role-${k}`} onClick={() => setRole(k)}
              className={`text-left p-6 rounded-2xl border-2 bg-card flex flex-col items-start justify-start shadow-soft transition-[border-color,box-shadow] ${role === k ? "border-primary shadow-glow" : "border-transparent hover:border-primary/30"}`}>
              <I className={`h-7 w-7 ${role === k ? "text-primary" : "text-muted-foreground"}`} />
              <p className="mt-4 font-bold text-lg">{t}</p>
              <p className="text-sm text-muted-foreground mt-1">{d}</p>
            </button>
          ))}
        </div>
        {role === "brand" && (
          <input data-testid="onboarding-brand-name" className={`${inputCls} mt-5`} placeholder="Nama brand (mis. Glow Skincare)" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
        )}
        <button data-testid="onboarding-continue" disabled={busy} onClick={save} className="btn-primary mt-8 h-12 px-6">
          Lanjut <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
