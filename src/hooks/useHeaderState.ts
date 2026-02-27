import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export const useHeaderState = () => {
  const { user, signOut } = useCustomAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
      
      // Contextual redirect based on current page
      const isOnPrivatePage = location.pathname.includes('/admin') || location.pathname.includes('/dashboard');
      
      if (isOnPrivatePage) {
        navigate("/");
        // Show toast notification for redirect
        setTimeout(() => {
          toast({
            title: "Signed out successfully",
            description: "You've been redirected to the homepage.",
            duration: 3000,
          });
        }, 100); // Small delay to ensure navigation completes
      } else {
        // For public pages, just show signed out confirmation
        toast({
          title: "Signed out",
          description: "You have been signed out successfully.",
          duration: 3000,
        });
      }
    } finally {
      setIsSigningOut(false);
      setIsMobileMenuOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return {
    user,
    navigate,
    location,
    isScrolled,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isSigningOut,
    handleSignOut,
    isActive,
  };
};
