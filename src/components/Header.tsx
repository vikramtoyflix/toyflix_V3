
import React from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import NetworkStatusIndicator from "@/components/ui/NetworkStatusIndicator";
import { useHeaderState } from "@/hooks/useHeaderState";
import HeaderLogo from "@/components/header/HeaderLogo";
import DesktopNavigation from "@/components/header/DesktopNavigation";
import AuthActions from "@/components/header/AuthActions";
import MobileMenu from "@/components/header/MobileMenu";
import { useIsMobile } from "@/hooks/use-mobile";

const Header = () => {
  const {
    user,
    navigate,
    isScrolled,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSigningOut,
    handleSignOut,
    isActive,
  } = useHeaderState();
  
  const isMobile = useIsMobile();

  // Hide header completely on mobile - we'll use MobileLayout instead
  if (isMobile) {
    return <NetworkStatusIndicator />;
  }

  return (
    <>
      <NetworkStatusIndicator />
      <header className={`fixed w-full z-40 transition-all duration-300 top-0 ${
        isScrolled 
          ? "bg-background/95 backdrop-blur-sm shadow-lg border-b border-memory-cream" 
          : "bg-background/80 backdrop-blur-sm"
      }`}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <HeaderLogo onLogoClick={() => navigate("/")} />

            {/* Desktop Navigation */}
            <DesktopNavigation 
              user={user}
              navigate={navigate}
              isActive={isActive}
              handleSignOut={handleSignOut}
              isSigningOut={isSigningOut}
            />

            {/* Mobile & Auth Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button - Show for all users */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden text-memory-warm-gray hover:text-primary gentle-hover"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>

              {/* Auth Actions */}
              <AuthActions user={user} navigate={navigate} />
            </div>
          </div>

          {/* Mobile Menu - Show for all users */}
          {isMobileMenuOpen && (
            <MobileMenu 
              user={user}
              navigate={navigate}
              isActive={isActive}
              handleSignOut={handleSignOut}
              isSigningOut={isSigningOut}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />
          )}
        </div>
      </header>
    </>
  );
};

export default Header;
