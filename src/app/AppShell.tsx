import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Home, Package, LayoutDashboard, User } from "lucide-react";
import { useCustomAuth } from "@/hooks/useCustomAuth";

const AppHome = lazy(() => import("@/app/pages/AppHome"));
const AppToys = lazy(() => import("@/app/pages/AppToys"));
const AppToyDetail = lazy(() => import("@/app/pages/AppToyDetail"));
const AppDashboard = lazy(() => import("@/app/pages/AppDashboard"));
const AppAccount = lazy(() => import("@/app/pages/AppAccount"));
const AppAuth = lazy(() => import("@/app/pages/AppAuth"));

function AppNotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <p className="text-slate-300 text-lg font-medium mb-2">Page not found</p>
      <p className="text-slate-500 text-sm mb-4">The page you're looking for doesn't exist.</p>
      <button
        type="button"
        onClick={() => navigate("/")}
        className="px-4 py-2 rounded-lg bg-amber-500 text-slate-900 font-medium"
      >
        Go to Home
      </button>
    </div>
  );
}

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/toys", icon: Package, label: "Toys" },
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/account", icon: User, label: "Account" },
] as const;

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-700/80 bg-slate-900/95 backdrop-blur safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path || (path !== "/" && location.pathname.startsWith(path));
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors ${
                isActive ? "text-amber-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AppLayout() {
  const { user, loading } = useCustomAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user && !isAuthPage) {
    return <AppAuth />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-16">
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<AppHome />} />
          <Route path="/toys" element={<AppToys />} />
          <Route path="/toys/:id" element={<AppToyDetail />} />
          <Route path="/dashboard" element={<AppDashboard />} />
          <Route path="/account" element={<AppAccount />} />
          <Route path="/auth" element={<AppAuth />} />
          <Route path="*" element={<AppNotFound />} />
        </Routes>
      </Suspense>
      {!isAuthPage && user && <BottomNav />}
    </div>
  );
}

export default function AppShell() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
