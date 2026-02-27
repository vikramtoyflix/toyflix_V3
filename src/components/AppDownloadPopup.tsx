import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Smartphone, Sparkles, Gift, Zap } from "lucide-react";

const STORAGE_KEY = "toyflix_app_download_popup_shown";

const AppDownloadPopup = ({
  rideOnSectionRef,
}: {
  rideOnSectionRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const [open, setOpen] = useState(false);
  const hasShown = useRef(false);

  useEffect(() => {
    if (hasShown.current) return;
    const alreadyShown = sessionStorage.getItem(STORAGE_KEY);
    if (alreadyShown === "1") return;

    const checkAndShow = () => {
      const el = rideOnSectionRef?.current;
      if (!el || hasShown.current || sessionStorage.getItem(STORAGE_KEY) === "1") return;
      const rect = el.getBoundingClientRect();
      // Show when user has scrolled past the ride-on section
      const scrolledPast = rect.bottom <= 80;
      if (!scrolledPast) return;
      hasShown.current = true;
      sessionStorage.setItem(STORAGE_KEY, "1");
      setOpen(true);
    };

    let cleanup: (() => void) | undefined;

    // Start after a short delay so ref and lazy content are ready
    const startId = setTimeout(() => {
      const el = rideOnSectionRef?.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        () => checkAndShow(),
        { root: null, rootMargin: "0px 0px -80px 0px", threshold: [0, 0.01, 0.5, 1] }
      );
      observer.observe(el);

      const onScroll = () => checkAndShow();
      window.addEventListener("scroll", onScroll, { passive: true });

      cleanup = () => {
        observer.disconnect();
        window.removeEventListener("scroll", onScroll);
      };
    }, 400);

    return () => {
      clearTimeout(startId);
      cleanup?.();
    };
  }, [rideOnSectionRef]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-[420px] p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-3xl bg-transparent max-h-[90vh] overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="relative rounded-3xl overflow-hidden">
          {/* Gradient background with soft shapes */}
          <div className="absolute inset-0 bg-gradient-to-br from-terracotta/90 via-toy-coral to-toy-sunshine/90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.25),transparent)]" />
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/10 blur-2xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 p-8 pb-8">
            {/* Close button - floating */}
            <div className="absolute right-4 top-4 z-20">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition-colors"
                aria-label="Close"
              >
                <span className="text-lg leading-none font-light">×</span>
              </button>
            </div>

            {/* Hero: phone icon with glow */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-3xl blur-2xl scale-150 opacity-80" />
                <div className="relative w-20 h-20 rounded-3xl bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/50">
                  <Smartphone className="w-10 h-10 text-terracotta" />
                </div>
              </div>
            </div>

            {/* Headline */}
            <h2 className="font-playfair font-bold text-white text-2xl sm:text-3xl text-center mb-2 drop-shadow-sm">
              Get the Toyflix app
            </h2>
            <p className="text-white/95 text-center text-base mb-6 font-medium">
              Latest collections & exclusive offers—all in one place.
            </p>

            {/* Benefit pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white">
                <Sparkles className="w-3.5 h-3.5" />
                New arrivals first
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white">
                <Gift className="w-3.5 h-3.5" />
                App-only offers
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white">
                <Zap className="w-3.5 h-3.5" />
                Smoother experience
              </span>
            </div>

            {/* Store badges - prominent App Store & Google Play logos */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5">
              <a
                href="https://apps.apple.com/app/id1501836409"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full max-w-[200px] sm:max-w-[220px] transition-transform duration-200 hover:scale-105 active:scale-[0.98]"
              >
                <img
                  src="/app-store-badge.png"
                  alt="Download on the App Store"
                  className="h-14 sm:h-16 w-full object-contain object-center"
                />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.bommalu.toyrentalapp"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full max-w-[200px] sm:max-w-[220px] transition-transform duration-200 hover:scale-105 active:scale-[0.98]"
              >
                <img
                  src="/google-play-badge.png"
                  alt="Get it on Google Play"
                  className="h-14 sm:h-16 w-full object-contain object-center"
                />
              </a>
            </div>

            <p className="text-center text-white/80 text-xs mt-5">
              Free to download • Join 50,000+ families
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppDownloadPopup;
