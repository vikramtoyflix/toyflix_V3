import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, Pause, Play } from 'lucide-react';
import { imageService } from '@/services/imageService';

// Mobile-optimized status badge component
export const MobileStatusBadge: React.FC<{ status: string; isActive: boolean }> = ({ 
  status, 
  isActive 
}) => {
  const getStatusConfig = (status: string, isActive: boolean) => {
    if (!isActive) {
      return {
        variant: 'secondary' as const,
        icon: Pause,
        text: 'Inactive',
        color: 'text-gray-500'
      };
    }

    switch (status?.toLowerCase()) {
      case 'active':
      case 'delivered':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          text: 'Active',
          color: 'text-green-600'
        };
      case 'selection_open':
        return {
          variant: 'default' as const,
          icon: Clock,
          text: 'Selection Open',
          color: 'text-yellow-600'
        };
      case 'paused':
        return {
          variant: 'secondary' as const,
          icon: Pause,
          text: 'Paused',
          color: 'text-gray-500'
        };
      default:
        return {
          variant: 'outline' as const,
          icon: Play,
          text: status || 'Unknown',
          color: 'text-blue-600'
        };
    }
  };

  const config = getStatusConfig(status, isActive);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
};

// Mobile-optimized progress indicator
export const MobileProgressIndicator: React.FC<{ 
  current: number; 
  total: number; 
  label: string;
  color?: string;
}> = ({ current, total, label, color = 'bg-blue-500' }) => {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-medium text-gray-900">
          {current}/{total}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`${color} h-1.5 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Mobile-optimized metric card
export const MobileMetricCard: React.FC<{
  icon: React.ElementType;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
}> = ({ icon: Icon, value, label, color, bgColor }) => {
  return (
    <div className={`${bgColor} rounded-lg p-3 text-center`}>
      <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
};

// Mobile-optimized toy item display
export const MobileToyItem: React.FC<{
  toy: any;
  index: number;
  showDetails?: boolean;
}> = ({ toy, index, showDetails = true }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Enhanced image URL handling using imageService
  const getImageUrl = (toy: any) => {
    // Debug: Log toy data structure for troubleshooting
    if (process.env.NODE_ENV === 'development' && index === 0) {
      console.log('🖼️ MobileToyItem - Toy data structure:', {
        toy,
        hasImageUrl: !!toy.image_url,
        hasImage: !!toy.image,
        hasToyImageUrl: !!toy.toy_image_url,
        imageUrlValue: toy.image_url,
        imageValue: toy.image,
        toyImageUrlValue: toy.toy_image_url,
        allFields: Object.keys(toy)
      });
    }
    
    // Priority 1: Use image_url field (most common)
    if (toy.image_url) {
      const processedUrl = imageService.getImageUrl(toy.image_url, 'toy');
      console.log('🔗 Using image_url:', toy.image_url, '→', processedUrl);
      return processedUrl;
    }
    
    // Priority 2: Check for nested image data  
    if (toy.image) {
      const processedUrl = imageService.getImageUrl(toy.image, 'toy');
      console.log('🔗 Using image field:', toy.image, '→', processedUrl);
      return processedUrl;
    }
    
    // Priority 3: Check for toy_image_url (alternative field name)
    if (toy.toy_image_url) {
      const processedUrl = imageService.getImageUrl(toy.toy_image_url, 'toy');
      console.log('🔗 Using toy_image_url:', toy.toy_image_url, '→', processedUrl);
      return processedUrl;
    }
    
    // Return null if no image found - will show fallback icon
    console.log('❌ No image URL found for toy:', toy.name);
    return null;
  };

  const imageUrl = getImageUrl(toy);

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  // Enhanced fallback with better icon
  const renderFallbackIcon = () => (
    <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex items-center justify-center">
      <span className="text-lg">🧸</span>
    </div>
  );

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border flex-shrink-0 relative">
        {imageUrl && !imageError ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
            )}
            <img 
              src={imageUrl} 
              alt={toy.name || `Toy ${index + 1}`} 
              className={`w-8 h-8 object-cover rounded transition-opacity duration-200 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
            />
          </>
        ) : (
          renderFallbackIcon()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">
          {toy.toy_name || toy.name || toy.product_name || `Toy ${index + 1}`}
        </h4>
        {showDetails && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>{toy.category || 'Educational'}</span>
            <span>•</span>
            <span>{toy.age_range || '3-5 years'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Mobile-optimized order history item
export const MobileOrderItem: React.FC<{
  order: any;
  onClick?: () => void;
}> = ({ order, onClick }) => {
  return (
    <div 
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="font-bold text-blue-600 text-xs">#{order.cycle_number}</span>
        </div>
        <div>
          <p className="font-medium text-sm">{order.order_number}</p>
          <p className="text-xs text-gray-600">
            {new Date(order.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>
      <div className="text-right">
        <MobileStatusBadge status={order.status} isActive={true} />
        {order.toys_data && (
          <p className="text-xs text-gray-500 mt-1">
            {order.toys_data.length} toys
          </p>
        )}
      </div>
    </div>
  );
};

// Mobile-optimized section header with collapse toggle
export const MobileSectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  isCollapsed: boolean;
  onToggle: () => void;
  rightElement?: React.ReactNode;
}> = ({ title, subtitle, icon: Icon, isCollapsed, onToggle, rightElement }) => {
  return (
    <div 
      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-gray-600" />
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-600">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {rightElement}
        {isCollapsed ? (
          <div className="w-4 h-4 text-gray-400">▼</div>
        ) : (
          <div className="w-4 h-4 text-gray-400">▲</div>
        )}
      </div>
    </div>
  );
};

// Mobile-optimized empty state
export const MobileEmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="text-center py-8">
      <Icon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
      <h3 className="text-sm font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-600 mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default {
  MobileStatusBadge,
  MobileProgressIndicator,
  MobileMetricCard,
  MobileToyItem,
  MobileOrderItem,
  MobileSectionHeader,
  MobileEmptyState
};
