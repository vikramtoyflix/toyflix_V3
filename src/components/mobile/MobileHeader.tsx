import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '@/hooks/useCustomAuth';

interface MobileHeaderProps {
  title?: string;
  showNotifications?: boolean;
}

const MobileHeader = ({
  title = "ToyJoy",
  showNotifications = true
}: MobileHeaderProps) => {
  const navigate = useNavigate();
  const { user } = useCustomAuth();

  return (
    <>
      <header
        className="fixed left-0 right-0 z-40 bg-white border-b border-gray-200 md:hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          top: 0
        }}
      >
        <div className="flex items-center justify-between px-4 h-14 box-content">
          <div className="flex items-center">
            <img
              src="/toyflix-logo.png"
              alt="Toyflix"
              className="h-8 w-auto cursor-pointer"
              onClick={() => navigate('/')}
              loading="eager"
            />
          </div>

          <div className="flex items-center space-x-2">
            {showNotifications && user && (
              <Button
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0 relative"
                onClick={() => navigate('/dashboard')}
              >
                <Bell className="w-4 h-4" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </Button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default MobileHeader;
