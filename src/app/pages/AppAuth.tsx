import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SignupFirstAuth from "@/components/auth/SignupFirstAuth";
import { useCustomAuth } from "@/hooks/useCustomAuth";

export default function AppAuth() {
  const { user, loading } = useCustomAuth();
  const navigate = useNavigate();

  // After successful sign-in in the app shell, move the user to the main dashboard.
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <header className="pt-safe px-4 pb-4">
        <h1 className="text-2xl font-bold text-white">Toyflix</h1>
        <p className="text-slate-400 text-sm mt-1">Sign in to see your dashboard and catalog.</p>
      </header>

      <div className="flex-1 px-4">
        <div className="[&_.bg-background]:bg-slate-800 [&_.text-foreground]:text-white [&_.border]:border-slate-700 [&_input]:bg-slate-800 [&_input]:border-slate-700 [&_input]:text-white [&_button]:bg-amber-500 [&_button]:text-slate-900 [&_button:hover]:bg-amber-400">
          <SignupFirstAuth />
        </div>
      </div>

      <p className="px-4 pb-8 text-slate-500 text-xs text-center">
        Same login as the website. App works even when the site is down.
      </p>
    </div>
  );
}
