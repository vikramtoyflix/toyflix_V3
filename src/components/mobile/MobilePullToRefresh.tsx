import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  pullDistance?: number;
  refreshThreshold?: number;
}

const MobilePullToRefresh: React.FC<MobilePullToRefreshProps> = ({
  children,
  onRefresh,
  pullDistance = 80,
  refreshThreshold = 60,
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    try {
      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;
      
      // Safety check: ensure touches array exists and has elements
      if (e.touches && e.touches.length > 0) {
        setTouchStartY(e.touches[0].clientY);
      }
    } catch (error) {
      console.warn('Touch start error:', error);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    try {
      const container = containerRef.current;
      if (!container || container.scrollTop > 0 || isRefreshing) return;

      // Safety check: ensure touches array exists and has elements
      if (e.touches && e.touches.length > 0) {
        const touchY = e.touches[0].clientY;
        const pullDiff = touchY - touchStartY;

        if (pullDiff > 0) {
          e.preventDefault();
          const offset = Math.min(pullDiff * 0.5, pullDistance);
          setPullOffset(offset);
          setIsPulling(offset > refreshThreshold);
        }
      }
    } catch (error) {
      console.warn('Touch move error:', error);
    }
  };

  const handleTouchEnd = async () => {
    try {
      if (pullOffset > refreshThreshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullOffset(pullDistance);
        
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setPullOffset(0);
          setIsPulling(false);
        }
      } else {
        setPullOffset(0);
        setIsPulling(false);
      }
    } catch (error) {
      console.warn('Touch end error:', error);
    }
  };

  const progress = refreshThreshold > 0 ? Math.min((pullOffset / refreshThreshold) * 100, 100) : 0;
  const rotation = pullOffset * 2;

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        className={`fixed top-14 left-0 right-0 z-30 flex items-center justify-center transition-all duration-300 ${
          pullOffset > 0 ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
        style={{ 
          height: `${Math.min(pullOffset, pullDistance)}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="relative">
            <RefreshCw 
              className={`w-6 h-6 text-blue-600 transition-transform duration-300 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{ transform: `rotate(${rotation}deg)` }}
            />
            {/* Progress circle */}
            <svg className="absolute inset-0 w-6 h-6 -rotate-90" viewBox="0 0 24 24">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 10}`}
                strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                className="transition-all duration-300"
              />
            </svg>
          </div>
          
          <div className="text-center">
            <p className="text-xs font-medium text-blue-600">
              {isRefreshing 
                ? 'Refreshing...' 
                : isPulling 
                  ? 'Release to refresh' 
                  : 'Pull to refresh'
              }
            </p>
            {!isRefreshing && (
              <div className="w-12 h-1 bg-gray-200 rounded-full mt-1">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-300"
        style={{ transform: `translateY(${pullOffset}px)` }}
      >
        {children}
      </div>
    </div>
  );
};

export default MobilePullToRefresh;
