import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Gamepad2, CreditCard, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomAuth } from '@/hooks/useCustomAuth';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCustomAuth();

  const navItems = [
    {
      icon: Home,
      label: 'Home',
      path: '/',
      gradient: 'from-emerald-400 to-cyan-400',
      color: 'text-emerald-500'
    },
    {
      icon: Gamepad2,
      label: 'Toys',
      path: '/toys',
      gradient: 'from-orange-400 to-amber-400',
      color: 'text-orange-500'
    },
    {
      icon: CreditCard,
      label: 'Pricing',
      path: '/pricing',
      gradient: 'from-sky-400 to-violet-400',
      color: 'text-sky-500'
    },
    {
      icon: User,
      label: user ? 'Account' : 'Sign In',
      path: user ? '/dashboard' : '/auth',
      gradient: 'from-rose-500 to-orange-400',
      color: 'text-rose-500'
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/dashboard') return location.pathname.startsWith('/dashboard');
    if (path === '/auth') return location.pathname.startsWith('/auth');
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-cream/95 backdrop-blur-md border-t border-warm-gray/10 shadow-lg md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 h-20 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center space-y-1 transition-all duration-300 ease-out group rounded-xl mx-1 my-2",
                active
                  ? `bg-gradient-to-br ${item.gradient} text-white shadow-xl shadow-black/10 transform scale-105`
                  : "text-gray-700 hover:text-white hover:scale-105"
              )}
            >
              {/* Background gradient for hover */}
              {!active && (
                <div className={`
                  absolute inset-0 bg-gradient-to-br ${item.gradient} opacity-0 
                  group-hover:opacity-100 transition-opacity duration-300 rounded-xl
                `} />
              )}

              {/* Sparkle effect for active item */}
              {active && (
                <Sparkles className="absolute top-1 right-1 w-2.5 h-2.5 text-white/70 animate-pulse" />
              )}

              {/* Content */}
              <div className="relative flex flex-col items-center space-y-1">
                <Icon className={cn(
                  "w-6 h-6 transition-transform duration-300",
                  active
                    ? "text-white animate-bounce"
                    : `${item.color} group-hover:text-white group-hover:scale-110`
                )} />
                <span className={cn(
                  "text-xs font-semibold tracking-wide transition-colors duration-300",
                  active
                    ? "text-white"
                    : `${item.color} group-hover:text-white`
                )}>
                  {item.label}
                </span>
              </div>

              {/* Active indicator */}
              {active && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-sm animate-pulse" />
              )}

              {/* Ripple effect */}
              <div className={cn(
                "absolute inset-0 rounded-xl transition-all duration-300",
                active
                  ? "ring-2 ring-white/30 ring-offset-2 ring-offset-transparent"
                  : "group-hover:ring-2 group-hover:ring-gray-300/50"
              )} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;
