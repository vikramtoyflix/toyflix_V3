import { useCustomAuth } from "@/hooks/useCustomAuth";
import { signOut } from "@/hooks/auth/authActions";
import { useNavigate } from "react-router-dom";
import { User, LogOut, ExternalLink } from "lucide-react";

export default function AppAccount() {
  const { user } = useCustomAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="pt-safe px-4 pb-6">
        <h1 className="text-xl font-bold text-white">Account</h1>
      </header>

      <div className="px-4 space-y-4">
        <div className="p-4 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <User className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">
              {user?.first_name && user?.last_name
                ? `${user.first_name} ${user.last_name}`
                : user?.phone ?? "User"}
            </p>
            {user?.email && (
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
            )}
            {user?.phone && (
              <p className="text-sm text-slate-400">{user.phone}</p>
            )}
          </div>
        </div>

        <a
          href="https://toyflix.in"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full p-4 rounded-xl bg-slate-800 border border-slate-700/50 text-white font-medium"
        >
          Open full website <ExternalLink className="w-4 h-4 text-slate-400" />
        </a>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 w-full p-4 rounded-xl bg-slate-800 border border-red-900/30 text-red-400 font-medium"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>

      <p className="px-4 mt-8 text-slate-500 text-xs">
        This app uses the same account as the website. It works independently so you can browse and
        see your orders even when the site is unavailable.
      </p>
    </div>
  );
}
