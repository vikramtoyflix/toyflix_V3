import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Gamepad2, 
  CreditCard, 
  Info, 
  Settings, 
  Users, 
  LogOut, 
  Sparkles 
} from "lucide-react";

interface MobileMenuProps {
  user: any;
  navigate: (path: string) => void;
  isActive: (path: string) => boolean;
  handleSignOut: () => void;
  isSigningOut: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const MobileMenu = ({ 
  user, 
  navigate, 
  isActive, 
  handleSignOut, 
  isSigningOut, 
  setIsMobileMenuOpen 
}: MobileMenuProps) => {
  const navigationItems = [
    { 
      path: "/", 
      label: "Home", 
      icon: Home,
      gradient: "from-toy-mint to-toy-sky",
      color: "text-toy-mint"
    },
    { 
      path: "/toys", 
      label: "Toys", 
      icon: Gamepad2,
      gradient: "from-toy-coral to-toy-sunshine",
      color: "text-toy-coral"
    },
    { 
      path: "/pricing", 
      label: "Pricing", 
      icon: CreditCard,
      gradient: "from-toy-sky to-toy-mint",
      color: "text-toy-sky"
    },
    { 
      path: "/about", 
      label: "About", 
      icon: Info,
      gradient: "from-toy-sunshine to-toy-coral",
      color: "text-toy-sunshine"
    },
  ];

  const userMenuItems = user ? [
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
  ] : [];

  return (
    <div className="md:hidden mt-4 pb-4 border-t border-gray-200/50 pt-4 bg-white/90 backdrop-blur-md rounded-xl mx-2 shadow-lg">
      <div className="flex flex-col gap-2 p-2">
        {/* Basic Navigation - Show for all users */}
        {navigationItems.map(item => {
          const isActiveItem = isActive(item.path);
          return (
            <Button
              key={item.path}
              variant="ghost"
              className={`
                relative justify-start font-source font-semibold gentle-hover rounded-xl p-4 h-auto
                transition-all duration-300 ease-out group overflow-hidden
                ${isActiveItem 
                  ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg transform scale-[1.02]` 
                  : `text-gray-700 hover:text-white hover:shadow-md hover:scale-[1.02]`
                }
              `}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
            >
              {/* Background gradient for hover */}
              {!isActiveItem && (
                <div className={`
                  absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 
                  group-hover:opacity-100 transition-opacity duration-300 rounded-xl
                `} />
              )}
              
              {/* Sparkle effect for active item */}
              {isActiveItem && (
                <Sparkles className="absolute top-2 right-2 w-3 h-3 text-white/70 animate-pulse" />
              )}
              
              {/* Content */}
              <div className="relative flex items-center gap-3">
                <item.icon className={`w-5 h-5 transition-transform duration-300 ${
                  isActiveItem ? 'animate-bounce' : 'group-hover:scale-110'
                }`} />
                <span className="font-medium tracking-wide">{item.label}</span>
              </div>
            </Button>
          );
        })}
        
        {/* User-specific menu items */}
        {user && userMenuItems.length > 0 && (
          <div className="border-t border-gray-200/50 pt-2 mt-2">
            {userMenuItems.map(item => (
              <Button
                key={item.path}
                variant="ghost"
                className={`
                  relative justify-start font-source font-semibold gentle-hover rounded-xl p-4 h-auto
                  transition-all duration-300 ease-out group overflow-hidden
                  text-gray-700 hover:text-white hover:shadow-md hover:scale-[1.02]
                `}
                onClick={() => {
                  navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
              >
                {/* Background gradient for hover */}
                <div className={`
                  absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 
                  group-hover:opacity-100 transition-opacity duration-300 rounded-xl
                `} />
                
                {/* Content */}
                <div className="relative flex items-center gap-3">
                  <item.icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  <span className="font-medium tracking-wide">{item.label}</span>
                </div>
              </Button>
            ))}
            
            <Button
              variant="ghost"
              className="justify-start text-red-600 hover:text-white hover:bg-red-500 font-source font-semibold gentle-hover rounded-xl p-4 h-auto transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        )}

        {/* Auth actions for non-logged in users */}
        {!user && (
          <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-gray-200/50">
            <Button
              variant="outline"
              className="justify-start border-2 border-toy-coral text-toy-coral hover:bg-toy-coral hover:text-white font-source font-semibold gentle-hover rounded-xl p-4 h-auto transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
              onClick={() => {
                navigate("/auth?mode=signin");
                setIsMobileMenuOpen(false);
              }}
            >
              <span className="font-medium tracking-wide">Sign In</span>
            </Button>
            <Button
              className="justify-start bg-gradient-to-r from-toy-mint to-toy-sky hover:from-toy-sky hover:to-toy-mint text-white font-source font-semibold gentle-hover rounded-xl p-4 h-auto transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
              onClick={() => {
                navigate("/auth");
                setIsMobileMenuOpen(false);
              }}
            >
              <span className="font-medium tracking-wide">Sign Up</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileMenu;
