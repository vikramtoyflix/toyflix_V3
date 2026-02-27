
import React, { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
  className?: string;
}

const MobileLayout = ({ 
  children, 
  title,
  showHeader = true,
  showBottomNav = true,
  className = ""
}: MobileLayoutProps) => {
  const isMobile = useIsMobile();

  // Scroll to top when component mounts (mobile layout)
  useEffect(() => {
    if (isMobile) {
      window.scrollTo(0, 0);
    }
  }, [isMobile]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && <MobileHeader title={title} />}
      
      <main 
        className={`
          ${showBottomNav ? 'pb-16' : 'pb-0'} 
          ${className}
        `}
        style={{
          paddingTop: showHeader ? 'var(--mobile-header-offset, 56px)' : '0px'
        }}
      >
        {children}
      </main>
      
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
};

export default MobileLayout;
