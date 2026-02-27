import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  CheckCircle, 
  X, 
  Clock, 
  AlertCircle, 
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionStatusToggleProps {
  orderId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

const SubscriptionStatusToggle: React.FC<SubscriptionStatusToggleProps> = ({
  orderId,
  currentStatus,
  onStatusChange,
  className = ''
}) => {
  const [isChanging, setIsChanging] = useState(false);
  const queryClient = useQueryClient();

  const statusOptions = [
    { 
      value: 'active', 
      label: 'Active', 
      icon: CheckCircle, 
      color: 'bg-green-100 text-green-800 border-green-200',
      description: 'Subscription is active and visible to user'
    },
    { 
      value: 'deactivated', 
      label: 'Deactivated', 
      icon: X, 
      color: 'bg-red-100 text-red-800 border-red-200',
      description: 'Subscription is hidden from user dashboard'
    },
    { 
      value: 'paused', 
      label: 'Paused', 
      icon: Clock, 
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      description: 'Subscription is temporarily paused'
    },
    { 
      value: 'cancelled', 
      label: 'Cancelled', 
      icon: X, 
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      description: 'Subscription has been cancelled'
    },
    { 
      value: 'expired', 
      label: 'Expired', 
      icon: AlertCircle, 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      description: 'Subscription has expired'
    },
    { 
      value: 'pending', 
      label: 'Pending', 
      icon: Clock, 
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      description: 'Subscription is pending activation'
    }
  ];

  const currentStatusInfo = statusOptions.find(opt => opt.value === currentStatus) || statusOptions[0];
  const CurrentIcon = currentStatusInfo.icon;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from('rental_orders')
        .update({
          subscription_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      return newStatus;
    },
    onSuccess: (newStatus) => {
      toast.success(`Subscription status updated to ${newStatus}`);
      onStatusChange?.(newStatus);
      queryClient.invalidateQueries({ queryKey: ['subscription-management'] });
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
    },
    onError: (error) => {
      console.error('❌ Error updating subscription status:', error);
      toast.error('Failed to update subscription status');
    },
    onSettled: () => {
      setIsChanging(false);
    }
  });

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    
    setIsChanging(true);
    updateStatusMutation.mutate(newStatus);
  };

  const getQuickActions = () => {
    if (currentStatus === 'active') {
      return [
        { status: 'deactivated', label: 'Deactivate', urgent: true },
        { status: 'paused', label: 'Pause', urgent: false }
      ];
    } else if (currentStatus === 'deactivated' || currentStatus === 'paused') {
      return [
        { status: 'active', label: 'Activate', urgent: false }
      ];
    }
    return [];
  };

  const quickActions = getQuickActions();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Current Status Badge */}
      <Badge className={`${currentStatusInfo.color} flex items-center gap-1`}>
        <CurrentIcon className="w-3 h-3" />
        <span className="capitalize">{currentStatus}</span>
      </Badge>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="flex gap-1">
          {quickActions.map((action) => (
            <Button
              key={action.status}
              onClick={() => handleStatusChange(action.status)}
              disabled={isChanging}
              size="sm"
              variant={action.urgent ? "destructive" : "outline"}
              className="h-6 px-2 text-xs"
            >
              {isChanging ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                action.label
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Full Status Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isChanging}
            className="h-6 w-6 p-0"
          >
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {statusOptions.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === currentStatus;
            
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                disabled={isSelected || isChanging}
                className={`flex flex-col items-start gap-1 p-3 ${isSelected ? 'bg-gray-50' : ''}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <OptionIcon className="w-4 h-4" />
                  <span className="font-medium">{option.label}</span>
                  {isSelected && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {option.description}
                </p>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default SubscriptionStatusToggle; 