import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Mail,
  Phone,
  MapPin,
  Shield,
  Award,
  Clock,
  Users,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Send,
} from "lucide-react";

const Footer = () => {
  const isMobile = useIsMobile();

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com/toyflix", label: "Facebook" },
    { icon: Instagram, href: "https://instagram.com/toyflix", label: "Instagram" },
    { icon: Twitter, href: "https://twitter.com/toyflix", label: "Twitter" },
    { icon: Youtube, href: "https://youtube.com/toyflix", label: "YouTube" },
  ];

  const quickLinks = [
    { label: "About Us", href: "/about" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contact Us", href: "#contact" },
    { label: "FAQs", href: "#faqs" },
    { label: "Blog", href: "#blog" },
  ];

  const legalLinks = [
    { label: "Terms and Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Return Policy", href: "#returns" },
    { label: "Safety Guidelines", href: "#safety" },
    { label: "Shipping Info", href: "#shipping" },
  ];

  const trust = [
    { icon: Shield, text: "100% Safe" },
    { icon: Award, text: "Premium Quality" },
    { icon: Clock, text: "24/7 Support" },
    { icon: Users, text: "50K+ Families" },
  ];

  return (
    <footer className="bg-cream/80 border-t border-black/5 relative">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Newsletter Section */}
        <div className={`${isMobile ? "py-8" : "py-16"} border-b border-black/5`}>
          <Card className="bg-gradient-to-r from-toy-coral/10 via-toy-sunshine/10 to-toy-mint/10 border-0">
            <CardContent className={isMobile ? "p-4" : "p-8"}>
              <div className={`${isMobile ? "text-center" : "flex items-center justify-between"}`}>
                <div className={isMobile ? "mb-4" : ""}>
                  <h3 className={`font-bold text-warm-gray mb-2 ${isMobile ? "text-lg" : "text-2xl"}`}>
                    Stay Updated with Toyflix
                  </h3>
                  <p className="text-warm-gray/60 text-sm">
                    Get the latest updates on new toys, parenting tips, and exclusive offers
                  </p>
                </div>
                <div className={`${isMobile ? "w-full space-y-3" : "flex gap-3 w-96"}`}>
                  <Input
                    placeholder="Enter your email"
                    className={`${isMobile ? "w-full text-sm h-10" : "flex-1"} bg-white/80 backdrop-blur-sm`}
                  />
                  <Button className={`${isMobile ? "w-full h-10 text-sm" : ""} bg-gradient-to-r from-toy-coral to-toy-sunshine hover:from-toy-coral/90 hover:to-toy-sunshine/90 text-white`}>
                    <Send className={`${isMobile ? "w-3 h-3" : "w-4 h-4"} mr-2`} />
                    Subscribe
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main footer - crisp grid */}
        <div className="py-10 sm:py-12">
          <div className={`grid gap-8 ${isMobile ? "grid-cols-1 text-center" : "grid-cols-2 lg:grid-cols-12"}`}>
            {/* Brand - logo only (no duplicate "Toyflix" text) */}
            <div className={isMobile ? "" : "lg:col-span-4"}>
              <Link to="/" className={`inline-block ${isMobile ? "mx-auto" : ""}`}>
                <picture>
                  <source srcSet="/toyflix-logo.webp" type="image/webp" />
                  <img
                    src="/toyflix-logo.png"
                    alt="Toyflix"
                    className={`w-auto ${isMobile ? "h-9" : "h-10"}`}
                    width="936"
                    height="216"
                  />
                </picture>
              </Link>
              <p className="text-warm-gray/60 text-sm mt-3 max-w-sm leading-relaxed">
                India's premier toy subscription service—curated premium toys for joy and learning.
              </p>
              <div className={`flex flex-wrap gap-x-4 gap-y-1 mt-4 ${isMobile ? "justify-center" : ""}`}>
                {trust.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 text-xs text-warm-gray/70">
                      <Icon className="w-3.5 h-3.5 text-terracotta" />
                      {t.text}
                    </span>
                  );
                })}
              </div>
              <div className={`flex gap-2 mt-4 ${isMobile ? "justify-center" : ""}`}>
                {socialLinks.map((s) => {
                  const Icon = s.icon;
                  return (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-warm-gray/70 hover:bg-terracotta/10 hover:text-terracotta hover:border-terracotta/20 transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Quick Links + Legal & Policies side by side */}
            <div className={`flex flex-col sm:flex-row gap-8 sm:gap-12 ${isMobile ? "" : "lg:col-span-4"}`}>
              <div className="min-w-0">
                <h4 className="font-outfit font-semibold text-warm-gray text-sm uppercase tracking-wider mb-4">
                  Quick Links
                </h4>
                <ul className="space-y-2">
                  {quickLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href}
                        className="text-sm text-warm-gray/70 hover:text-terracotta transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <h4 className="font-outfit font-semibold text-warm-gray text-sm uppercase tracking-wider mb-4">
                  Legal & Policies
                </h4>
                <ul className="space-y-2">
                  {legalLinks.map((policy) => (
                    <li key={policy.label}>
                      <Link
                        to={policy.href}
                        className="text-sm text-warm-gray/70 hover:text-terracotta transition-colors"
                      >
                        {policy.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Contact + App - one column */}
            <div className={isMobile ? "" : "lg:col-span-4"}>
              <h4 className="font-outfit font-semibold text-warm-gray text-sm uppercase tracking-wider mb-4">
                Get in Touch
              </h4>
              <div className="space-y-3 text-sm text-warm-gray/70">
                <div className="flex gap-3">
                  <MapPin className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    B2/3, GEF block, Rajajinagar Industrial town, Bangalore 560010
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <Phone className="w-4 h-4 text-terracotta shrink-0" />
                  <a href="tel:+919108734535" className="hover:text-terracotta transition-colors">
                    +91 9108734535
                  </a>
                </div>
                <div className="flex gap-3 items-center">
                  <Mail className="w-4 h-4 text-terracotta shrink-0" />
                  <a href="mailto:customersupport@toyflix.in" className="hover:text-terracotta transition-colors break-all">
                    customersupport@toyflix.in
                  </a>
                </div>
              </div>

              <h5 className="font-outfit font-semibold text-warm-gray text-sm uppercase tracking-wider mt-6 mb-3">
                Download Our App
              </h5>
              <div className="flex flex-wrap gap-3">
                <a
                  href="https://apps.apple.com/app/id1501836409"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-12 w-[140px] sm:w-[160px] hover:opacity-90 transition-opacity"
                >
                  <picture>
                    <source srcSet="/app-store-badge.webp" type="image/webp" />
                    <img
                      src="/app-store-badge.png"
                      alt="Download from the App Store"
                      className="h-full w-full object-contain object-left"
                      width="716"
                      height="216"
                    />
                  </picture>
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.bommalu.toyrentalapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-12 w-[140px] sm:w-[160px] hover:opacity-90 transition-opacity"
                >
                  <picture>
                    <source srcSet="/google-play-badge.webp" type="image/webp" />
                    <img
                      src="/google-play-badge.png"
                      alt="Get from Google Play"
                      className="h-full w-full object-contain object-left"
                      width="706"
                      height="234"
                    />
                  </picture>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-5 border-t border-black/5">
          <div className="text-center sm:text-left text-sm text-warm-gray/60">
            © 2024 Sublet Solutions Private Limited. All rights reserved.
          </div>
          <div className="mt-4 pt-4 border-t border-black/5 text-center text-xs text-warm-gray/50">
            Sublet Solutions Private Limited has been accepted into the EquityPilot program of{" "}
            <a href="https://www.fastercapital.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-terracotta">
              FasterCapital
            </a>{" "}
            and is seeking capital of $1M.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
