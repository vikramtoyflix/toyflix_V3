import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useHeaderState } from "@/hooks/useHeaderState";
import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DashboardHeader = () => {
  const { handleSignOut, isSigningOut } = useHeaderState();
  const { data: profile, isLoading } = useProfile();
  const navigate = useNavigate();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  return (
    <header className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-4">
        {/* Back to Site Button */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:bg-primary hover:text-white transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Site</span>
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold text-primary">Dashboard</h1>
          {isLoading ? (
            <Skeleton className="h-6 w-48 mt-2" />
          ) : (
            <p className="text-muted-foreground">
              Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}!
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {isLoading ? (
          <Skeleton className="h-10 w-10 rounded-full" />
        ) : (
          <Avatar>
            <AvatarImage src={profile?.avatar_url || ''} alt={profile?.first_name || 'User'} />
            <AvatarFallback>{getInitials(profile?.first_name, profile?.last_name)}</AvatarFallback>
          </Avatar>
        )}
        <Button onClick={handleSignOut} variant="outline" disabled={isSigningOut}>
          {isSigningOut ? "Signing out..." : "Sign Out"}
        </Button>
      </div>
    </header>
  );
};

export default DashboardHeader;
