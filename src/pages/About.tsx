import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import React from "react";
import {
  Smartphone,
  Sparkles,
  Gift,
  Zap,
  Users,
  Shield,
  RefreshCw,
  BookOpen,
  Heart,
  Brain,
  Home,
  IndianRupee,
} from "lucide-react";

const highlights = [
  {
    icon: Shield,
    title: "Safe & sanitized",
    text: "Every toy is cleaned and safety-checked before it reaches you.",
    color: "from-toy-mint to-emerald-500",
    bg: "bg-toy-mint/15",
  },
  {
    icon: RefreshCw,
    title: "Monthly refresh",
    text: "Swap 3 toys + 1 book every month. No clutter, always fresh.",
    color: "from-toy-coral to-toy-sunshine",
    bg: "bg-toy-coral/10",
  },
  {
    icon: BookOpen,
    title: "Expert-curated",
    text: "Our experts pick toys that support your child’s growth.",
    color: "from-toy-sky to-toy-lavender",
    bg: "bg-toy-sky/10",
  },
  {
    icon: Heart,
    title: "Loved by families",
    text: "Premium toys at a fraction of the cost. Join 50,000+ families.",
    color: "from-terracotta to-toy-coral",
    bg: "bg-terracotta/10",
  },
];

const About = () => {
  const isMobile = useIsMobile();

  const content = (
    <main className={`flex-grow ${isMobile ? "pt-4" : "pt-24"} overflow-hidden`}>
      {/* Hero: reference layout — left image + play value card, right text + benefits */}
      <section className="relative overflow-x-hidden bg-[#FBF8F4] min-h-0">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" aria-hidden>
          <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="about-toys" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="#5C5346" />
                <circle cx="80" cy="40" r="1" fill="#5C5346" />
                <circle cx="50" cy="90" r="1.5" fill="#5C5346" />
                <path d="M100 100 L104 96 L108 100 L104 104 Z" fill="none" stroke="#5C5346" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#about-toys)" />
          </svg>
        </div>

        <div className="container mx-auto px-4 py-10 sm:py-14 relative z-10">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr] gap-8 lg:gap-12 items-start">
            {/* Left column: hero image only (focal area visible on desktop) */}
            <div className="flex flex-col gap-6">
              <div className="relative rounded-2xl overflow-hidden shadow-md border border-black/5 w-full aspect-[4/3] max-h-[300px] sm:max-h-[360px] lg:max-h-[380px]">
                <img
                  src="/images/campaign-hero.jpg"
                  alt="Toyflix - Premium toy subscription for families"
                  className="w-full h-full object-cover object-[center_20%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
              </div>
              {/* Play value card: only on mobile (stacked); desktop uses full-width strip below */}
              <div className="rounded-2xl p-5 sm:p-6 bg-toy-peach/30 border border-terracotta/20 shadow-sm text-center lg:text-left md:hidden">
                <p className="font-outfit font-semibold text-warm-gray text-base sm:text-lg">
                  Play value worth ₹8,000–₹14,000 delivered for a fraction of the cost.
                </p>
                <p className="mt-2 text-warm-gray/80 text-sm">
                  Return, refresh, repeat. We handle everything.
                </p>
              </div>
            </div>

            {/* Right column: label, headline, body, benefits, tagline */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-black/5 shadow-sm">
              <p className="font-outfit text-sm font-semibold text-terracotta uppercase tracking-widest mb-3">
                About Toyflix
              </p>
              <h1 className="font-playfair font-bold text-warm-gray text-3xl sm:text-4xl lg:text-5xl leading-tight">
                Premium toys at home. Without the clutter.
              </h1>
              <div className="mt-4 space-y-3 text-warm-gray/80 text-base sm:text-lg">
                <p>
                  Your child always has something new to explore — without you constantly buying and storing toys.
                </p>
                <p>
                  Every month, you receive 3 age-appropriate toys and 1 book, cleaned and ready to play.
                </p>
                <p>
                  When your child is done, simply return them and get a fresh set.
                </p>
              </div>

              {/* Benefits list: inside card on mobile only */}
              <ul className="mt-6 space-y-3 md:hidden">
                {[
                  { icon: Brain, label: "Age-based development" },
                  { icon: Home, label: "Clutter-free home" },
                  { icon: IndianRupee, label: "Smarter spending" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-warm-gray">
                    <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-terracotta/10 flex items-center justify-center text-terracotta">
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="font-outfit text-sm sm:text-base">{label}</span>
                  </li>
                ))}
              </ul>

              {/* Tagline: inside card on mobile only */}
              <p className="mt-6 font-outfit font-semibold text-warm-gray text-base sm:text-lg md:hidden">
                More learning. Less mess. Smarter spending.
              </p>
            </div>
          </div>
          {/* Desktop: benefits as separate centered block (vertical, each item its own row) */}
          <div className="hidden md:block mt-8 lg:mt-10 pt-8 lg:pt-10 border-t border-warm-gray/10">
            <ul className="flex flex-col items-center gap-4 list-none p-0 m-0 max-w-sm mx-auto">
              {[
                { icon: Brain, label: "Age-based development" },
                { icon: Home, label: "Clutter-free home" },
                { icon: IndianRupee, label: "Smarter spending" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 w-full rounded-xl bg-white/80 border border-terracotta/15 shadow-sm px-5 py-3.5">
                  <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-terracotta/10 flex items-center justify-center text-terracotta">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-outfit font-medium text-warm-gray text-base">{label}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Desktop: tagline centered below image + text */}
          <p className="hidden md:block mt-8 lg:mt-10 text-center font-outfit font-semibold text-warm-gray text-base lg:text-lg">
            More learning. Less mess. Smarter spending.
          </p>
          {/* Desktop: full-width play value strip below hero (subtle background) */}
          <div className="hidden md:block mt-8 lg:mt-10 -mx-4 sm:-mx-6 py-5 px-4 sm:px-6 lg:py-6 bg-toy-peach/20 border-y border-terracotta/10">
            <div className="max-w-5xl mx-auto flex flex-row items-center justify-center gap-8 text-center">
              <p className="font-outfit font-semibold text-warm-gray text-base lg:text-lg">
                Play value worth ₹8,000–₹14,000 delivered for a fraction of the cost.
              </p>
              <p className="text-warm-gray/70 text-sm lg:text-base">
                Return, refresh, repeat. We handle everything.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key points: icon cards, minimal text */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="font-playfair font-bold text-warm-gray text-2xl sm:text-3xl text-center mb-10">
            Why Toyflix
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {highlights.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className={`rounded-2xl border border-black/5 p-5 sm:p-6 ${item.bg} hover:shadow-lg hover:border-terracotta/15 transition-all duration-300`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-md mb-4`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-outfit font-semibold text-warm-gray text-base mb-2">
                    {item.title}
                  </h3>
                  <p className="text-warm-gray/60 text-sm leading-relaxed">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Video */}
      <section className="py-12 sm:py-16 bg-cream/50">
        <div className="container mx-auto px-4">
          <h2 className="font-playfair font-bold text-warm-gray text-2xl sm:text-3xl text-center mb-8">
            See how it works
          </h2>
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-xl border border-black/5">
            <div className="aspect-video w-full bg-black">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/0Br1a82-mk0"
                title="Toyflix - How it works"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* Download Our App */}
      <section className={`relative overflow-hidden ${isMobile ? "mt-6 -mx-4" : "mt-8 -mx-4 sm:-mx-6 lg:-mx-8"}`}>
        <div className="relative rounded-none sm:rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-terracotta via-toy-coral to-toy-sunshine/90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_80%_at_50%_-30%,rgba(255,255,255,0.2),transparent)]" />
          <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 sm:w-72 sm:h-72 rounded-full bg-white/10 blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className={`relative z-10 ${isMobile ? "py-14 px-5" : "py-20 px-8 sm:px-12"}`}>
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/50 mb-5">
                  <Smartphone className="w-8 h-8 sm:w-10 sm:h-10 text-terracotta" />
                </div>
                <h2 className="font-playfair font-bold text-white text-2xl sm:text-4xl lg:text-5xl mb-2">
                  Download our app
                </h2>
                <p className="text-white/95 text-base sm:text-lg max-w-xl">
                  Latest collections, exclusive offers, and a smoother experience—all in your pocket.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10 sm:mb-12">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
                  <Sparkles className="w-4 h-4 flex-shrink-0" />
                  New arrivals first
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
                  <Gift className="w-4 h-4 flex-shrink-0" />
                  App-only offers
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white">
                  <Zap className="w-4 h-4 flex-shrink-0" />
                  Smoother experience
                </span>
              </div>

              <div className={`flex ${isMobile ? "flex-col" : "flex-row"} justify-center items-center gap-6 sm:gap-8`}>
                <a
                  href="https://apps.apple.com/app/id1501836409"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full max-w-[240px] sm:max-w-[260px] transition-transform duration-200 hover:scale-105 active:scale-[0.98]"
                >
                  <picture>
                    <source srcSet="/app-store-badge.webp" type="image/webp" />
                    <img
                      src="/app-store-badge.png"
                      alt="Download from the App Store"
                      className="h-16 sm:h-20 w-full object-contain object-center"
                      width="716"
                      height="216"
                    />
                  </picture>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.bommalu.toyrentalapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full max-w-[240px] sm:max-w-[260px] transition-transform duration-200 hover:scale-105 active:scale-[0.98]"
                >
                  <picture>
                    <source srcSet="/google-play-badge.webp" type="image/webp" />
                    <img
                      src="/google-play-badge.png"
                      alt="Get from Google Play"
                      className="h-16 sm:h-20 w-full object-contain object-center"
                      width="706"
                      height="234"
                    />
                  </picture>
                </a>
              </div>

              <p className="flex items-center justify-center gap-2 text-white/90 text-sm sm:text-base mt-6">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                Join 50,000+ families on the app
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );

  if (isMobile) {
    return (
      <MobileLayout title="About" showHeader={true} showBottomNav={true}>
        <div className="min-h-screen flex flex-col bg-white">
          {content}
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      {content}
      <Footer />
    </div>
  );
};

export default About;
