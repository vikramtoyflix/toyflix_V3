/**
 * Optional E2E/admin login (email + password). Shown ONLY when VITE_E2E_LOGIN_ENABLED=true.
 * Does not replace or disable OTP auth: production builds do not set that env, so this returns null
 * and customers always use SignupFirstAuth (OTP).
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { e2eEmailPasswordLogin, isE2ELoginEnabled } from '@/services/auth/e2eEmailPasswordLogin';
import { useToast } from '@/hooks/use-toast';

export function E2EAdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAuth } = useCustomAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  if (!isE2ELoginEnabled()) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await e2eEmailPasswordLogin(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      toast({ title: 'Login failed', description: result.error, variant: 'destructive' });
      return;
    }
    if (result.user && result.session) {
      setAuth(result.user, result.session);
      const redirect = searchParams.get('redirect') ? decodeURIComponent(searchParams.get('redirect')!) : '/admin';
      navigate(redirect, { replace: true });
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 mb-6">
      <p className="text-xs font-medium text-amber-800 mb-3">E2E / Admin login (testing only)</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="e2e-email">Email</Label>
          <Input
            id="e2e-email"
            type="email"
            placeholder="vikram@toyflix.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="e2e-password">Password</Label>
          <Input
            id="e2e-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1"
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in…' : 'Sign in (E2E)'}
        </Button>
      </form>
    </div>
  );
}
