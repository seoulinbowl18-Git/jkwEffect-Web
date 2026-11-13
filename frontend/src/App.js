import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login, { LoginScreen } from "@/pages/Login";
import Landing from "@/pages/Landing";
import Bounty from "@/pages/Bounty";
import Onboarding from "@/pages/Onboarding";
import CreatorDashboard from "@/pages/CreatorDashboard";
import BrandDashboard from "@/pages/BrandDashboard";
import AdminPanel from "@/pages/AdminPanel";
import AdminLogin from "@/pages/AdminLogin";
import HowItWorks from "@/pages/HowItWorks";
import ClaimProof from "@/pages/ClaimProof";

const Guard = ({ children, roles, needRole = true }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>;
  if (!user) return <LoginScreen next={window.location.pathname + window.location.search} />;
  if (needRole && !user.role) return <Navigate to="/onboarding" replace />;
  if (!needRole && user.role) return <Navigate to="/dashboard" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

// Admin area: signed-out visitors go to the Owner phone login, not the Google login.
const AdminGuard = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin" /></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
};

const Dashboard = () => {
  const { user } = useAuth();
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return user.role === "brand" ? <BrandDashboard /> : <CreatorDashboard />;
};

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/jelajah" element={<Bounty />} />
      <Route path="/bounty" element={<Navigate to="/jelajah" replace />} />
      <Route path="/masuk" element={<Login />} />
      <Route path="/cara-kerja" element={<HowItWorks />} />
      <Route path="/untuk-brand" element={<HowItWorks brand />} />
      <Route path="/onboarding" element={<Guard needRole={false}><Onboarding /></Guard>} />
      <Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
      <Route path="/dompet" element={<Guard><Dashboard /></Guard>} />
      <Route path="/profil" element={<Guard><Dashboard /></Guard>} />
      <Route path="/klaim/:sid" element={<Guard roles={["creator"]}><ClaimProof /></Guard>} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminGuard><AdminPanel /></AdminGuard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
