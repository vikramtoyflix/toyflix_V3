
import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Eye, ShoppingCart, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
    action: () => void;
  };
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
    action: () => void;
  };
  className?: string;
}

const MobileSwipeableCard = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className = ""
}: MobileSwipeableCardProps) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const threshold = 80; // Minimum drag distance to trigger action

  const handleTouchStart = (e: React.TouchEvent) => {
    try {
      // Safety check: ensure touches array exists and has elements
      if (e.touches && e.touches.length > 0) {
        setStartX(e.touches[0].clientX);
        setIsDragging(true);
      }
    } catch (error) {
      console.warn('Touch start error:', error);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    try {
      if (!isDragging) return;
      
      // Safety check: ensure touches array exists and has elements
      if (e.touches && e.touches.length > 0) {
        const currentX = e.touches[0].clientX;
        const offset = currentX - startX;
        
        // Limit drag distance
        const maxOffset = 120;
        const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, offset));
        setDragOffset(limitedOffset);
      }
    } catch (error) {
      console.warn('Touch move error:', error);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && rightAction) {
        rightAction.action();
      } else if (dragOffset < 0 && leftAction) {
        leftAction.action();
      }
    }
    
    // Reset position
    setDragOffset(0);
  };

  const getBackgroundColor = () => {
    if (dragOffset > threshold && rightAction) {
      return rightAction.color;
    } else if (dragOffset < -threshold && leftAction) {
      return leftAction.color;
    }
    return 'transparent';
  };

  const getActionIcon = () => {
    if (dragOffset > threshold && rightAction) {
      return rightAction.icon;
    } else if (dragOffset < -threshold && leftAction) {
      return leftAction.icon;
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background action indicator */}
      <div 
        className="absolute inset-0 flex items-center justify-center transition-all duration-200"
        style={{ 
          backgroundColor: getBackgroundColor(),
          opacity: Math.abs(dragOffset) > threshold ? 0.1 : 0
        }}
      >
        {getActionIcon() && (
          <div className="text-white">
            {getActionIcon()}
          </div>
        )}
      </div>

      {/* Swipeable card */}
      <div
        ref={cardRef}
        className={cn(
          "relative transition-transform duration-200 touch-pan-y",
          isDragging ? "transition-none" : "",
          className
        )}
        style={{
          transform: `translateX(${dragOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>

      {/* Swipe hint indicator */}
      {!isDragging && dragOffset === 0 && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-30">
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );
};

export default MobileSwipeableCard;
