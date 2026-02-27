import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useCustomAuthStatus } from '@/hooks/useCustomAuthStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const AzureDebugInfo = () => {
  const { user, loading } = useCustomAuth();
  const {
    isAuthenticated,
    isPhoneVerified,
    isLoading,
    isCompletelySetup
  } = useCustomAuthStatus();

  return (
    <Card className="mt-4 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="text-sm">🔧 Azure Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div>User Loading: <Badge variant={loading ? "destructive" : "default"}>{loading.toString()}</Badge></div>
          <div>Auth Loading: <Badge variant={isLoading ? "destructive" : "default"}>{isLoading.toString()}</Badge></div>
          <div>Authenticated: <Badge variant={isAuthenticated ? "default" : "destructive"}>{isAuthenticated.toString()}</Badge></div>
          <div>Phone Verified: <Badge variant={isPhoneVerified ? "default" : "destructive"}>{isPhoneVerified.toString()}</Badge></div>
          <div>Complete Setup: <Badge variant={isCompletelySetup ? "default" : "destructive"}>{isCompletelySetup.toString()}</Badge></div>
          <div>User ID: <Badge variant="outline">{user?.id?.slice(0, 8) || 'none'}</Badge></div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Current URL: {window.location.href}</div>
          <div className="text-xs text-muted-foreground">User Agent: {navigator.userAgent.includes('Azure') ? 'Azure Environment' : 'Local/Other'}</div>
        </div>
      </CardContent>
    </Card>
  );
}; 