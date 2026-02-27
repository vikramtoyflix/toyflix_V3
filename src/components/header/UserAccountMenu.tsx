import React from "react";
import { Button } from "@/components/ui/button";
import { NavigationMenuItem } from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, Users, UserCircle, Sparkles } from "lucide-react";

interface UserAccountMenuProps {
  navigate: (path: string) => void;
  handleSignOut: () => void;
  isSigningOut: boolean;
}

const UserAccountMenu = ({ navigate, handleSignOut, isSigningOut }: UserAccountMenuProps) => {
  const userMenuItems = [
    { 
      path: "/dashboard", 
      label: "Dashboard", 
      icon: Settings,
      gradient: "from-purple-500 to-pink-500",
      color: "text-purple-600"
    },
    { 
      path: "/subscription-flow", 
      label: "Subscription", 
      icon: Users,
      gradient: "from-blue-500 to-teal-500",
      color: "text-blue-600"
    }
  ];

  return (
    <NavigationMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="
              relative font-source font-semibold gentle-hover rounded-full px-6 py-2.5 h-auto
              transition-all duration-300 ease-out group overflow-hidden
              text-gray-700 hover:text-white hover:shadow-md hover:scale-105
              bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg
            "
          >
            <Sparkles className="absolute top-1 right-1 w-3 h-3 text-white/70 animate-pulse" />
            <div className="relative flex items-center gap-2">
              <UserCircle className="w-4 h-4 animate-bounce" />
              <span className="font-medium tracking-wide">Account</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mt-2 w-[220px] bg-white/95 backdrop-blur-md rounded-xl border border-gray-200/50 shadow-lg">
          {userMenuItems.map((item) => (
            <DropdownMenuItem
              key={item.path}
              className="p-0 focus:bg-transparent"
              onClick={() => navigate(item.path)}
            >
              <Button
                variant="ghost"
                className={`
                  relative w-full justify-start font-source font-semibold gentle-hover rounded-xl p-3 h-auto
                  transition-all duration-300 ease-out group overflow-hidden
                  text-gray-700 hover:text-white hover:shadow-md hover:scale-[1.02]
                `}
              >
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 
                    group-hover:opacity-100 transition-opacity duration-300 rounded-xl
                  `}
                />
                <div className="relative flex items-center gap-3">
                  <item.icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                  <span className="font-medium tracking-wide">{item.label}</span>
                </div>
              </Button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="p-0 focus:bg-transparent"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-white hover:bg-red-500 font-source font-semibold gentle-hover rounded-xl p-3 h-auto transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span className="font-medium tracking-wide">
                {isSigningOut ? "Signing out..." : "Sign Out"}
              </span>
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </NavigationMenuItem>
  );
};

export default UserAccountMenu;
