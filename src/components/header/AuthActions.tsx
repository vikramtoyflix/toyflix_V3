
import React from "react";
import { Button } from "@/components/ui/button";
import { UserCircle } from "lucide-react";

interface AuthActionsProps {
  user: any;
  navigate: (path: string) => void;
}

const AuthActions = ({ user, navigate }: AuthActionsProps) => {
  if (!user) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-memory-dusty-rose text-memory-dusty-rose hover:bg-memory-dusty-rose hover:text-white font-source font-medium gentle-hover rounded-full text-xs px-3"
          onClick={() => navigate("/auth?mode=signin")}
        >
          Sign In
        </Button>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 text-white font-source font-medium gentle-hover rounded-full text-xs px-3"
          onClick={() => navigate("/auth")}
        >
          Sign Up
        </Button>
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <Button
        variant="ghost"
        className="text-memory-warm-gray hover:text-primary gentle-hover rounded-full"
        onClick={() => navigate("/dashboard")}
      >
        <UserCircle className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default AuthActions;
