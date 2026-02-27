import React from "react";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { 
  Home, 
  Gamepad2, 
  CreditCard, 
  Info, 
  Sparkles,
  Star,
  Heart
} from "lucide-react";
import UserAccountMenu from "./UserAccountMenu";

interface DesktopNavigationProps {
  user: any;
  navigate: (path: string) => void;
  isActive: (path: string) => boolean;
  handleSignOut: () => void;
  isSigningOut: boolean;
}

const DesktopNavigation = ({ user, navigate, isActive, handleSignOut, isSigningOut }: DesktopNavigationProps) => {
  const navigationItems = [
    { 
      path: "/", 
      label: "Home", 
      icon: Home,
      gradient: "from-toy-mint to-toy-sky",
      hoverColor: "hover:text-toy-mint"
    },
    { 
      path: "/toys", 
      label: "Toys", 
      icon: Gamepad2,
      gradient: "from-toy-coral to-toy-sunshine",
      hoverColor: "hover:text-toy-coral"
    },
    { 
      path: "/pricing", 
      label: "Pricing", 
      icon: CreditCard,
      gradient: "from-toy-sky to-toy-mint",
      hoverColor: "hover:text-toy-sky"
    },
    { 
      path: "/about", 
      label: "About", 
      icon: Info,
      gradient: "from-toy-sunshine to-toy-coral",
      hoverColor: "hover:text-toy-sunshine"
    },
  ];

  return (
    <NavigationMenu className="hidden md:flex">
      <NavigationMenuList className="flex gap-2">
        {navigationItems.map(item => {
          const isActiveItem = isActive(item.path);
          return (
            <NavigationMenuItem key={item.path}>
              <NavigationMenuLink asChild>
                <Button
                  variant="ghost"
                  className={`
                    relative font-source font-semibold gentle-hover rounded-full px-6 py-2.5 h-auto
                    transition-all duration-300 ease-out group overflow-hidden nav-button-glow btn-press
                    ${isActiveItem 
                      ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg transform scale-105` 
                      : `text-gray-700 hover:text-white ${item.hoverColor} hover:shadow-md hover:scale-105`
                    }
                  `}
                  onClick={() => navigate(item.path)}
                >
                  {/* Background gradient for hover */}
                  {!isActiveItem && (
                    <div className={`
                      absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 
                      group-hover:opacity-100 transition-opacity duration-300 rounded-full
                    `} />
                  )}
                  
                  {/* Sparkle effect for active item */}
                  {isActiveItem && (
                    <Sparkles className="absolute top-1 right-1 w-3 h-3 text-white/70 animate-pulse" />
                  )}
                  
                  {/* Content */}
                  <div className="relative flex items-center gap-2">
                    <item.icon className={`w-4 h-4 transition-transform duration-300 ${
                      isActiveItem ? 'animate-bounce' : 'group-hover:scale-110'
                    }`} />
                    <span className="font-medium tracking-wide">{item.label}</span>
                  </div>
                  
                  {/* Active indicator dot */}
                  {isActiveItem && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  )}
                </Button>
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}

        {user && (
          <UserAccountMenu 
            navigate={navigate}
            handleSignOut={handleSignOut}
            isSigningOut={isSigningOut}
          />
        )}
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export default DesktopNavigation;
