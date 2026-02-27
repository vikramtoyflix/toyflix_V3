import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Download,
  RefreshCw,
  MoreHorizontal,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { BulkEditingPanel } from '@/components/admin/bulk-editing';
import { AuditTrailViewer } from '@/components/admin/audit-trail';

interface User {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  created_at: string;
}

interface RentalOrder {
  id: string;
  order_number: string;
  subscription_plan: string;
  subscription_status: string;
  cycle_number: number;
  rental_start_date: string;
  rental_end_date: string;
  status: string;
  total_amount: number;
  created_at: string;
  age_group: string;
  subscription_category: string;
}

interface UserSubscriptionData {
  user: User;
  activeSubscription: RentalOrder | null;
  allSubscriptions: RentalOrder[];
  totalSubscriptions: number;
  lastActivity: string;
  totalSpent: number;
  subscriptionStatus: 'active' | 'inactive' | 'mixed';
}

interface SubscriptionTopBarProps {
  subscribers: UserSubscriptionData[];
  bulkSelection: Set<string>;
  onBulkAction: (action: string) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const SubscriptionTopBar: React.FC<SubscriptionTopBarProps> = ({
  subscribers,
  bulkSelection,
  onBulkAction,
  onRefresh,
  isLoading = false
}) => {
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  // Calculate statistics
  const stats = {
    total: subscribers.length,
    active: subscribers.filter(s => s.subscriptionStatus === 'active').length,
    inactive: subscribers.filter(s => s.subscriptionStatus === 'inactive').length,
    mixed: subscribers.filter(s => s.subscriptionStatus === 'mixed').length,
    totalRevenue: subscribers.reduce((sum, s) => sum + s.totalSpent, 0)
  };

  const handleBulkUpdateComplete = () => {
    setShowBulkEdit(false);
    onRefresh();
  };

  const selectedSubscriptionIds = Array.from(bulkSelection).map(userId => {
    const subscriber = subscribers.find(s => s.user.id === userId);
    return subscriber?.activeSubscription?.id;
  }).filter(Boolean) as string[];

  if (showBulkEdit) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <BulkEditingPanel
          selectedSubscriptions={selectedSubscriptionIds}
          onUpdateComplete={handleBulkUpdateComplete}
          onClose={() => setShowBulkEdit(false)}
        />
      </div>
    );
  }

  if (showAuditTrail) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Audit Trail</h2>
            <Button variant="ghost" onClick={() => setShowAuditTrail(false)}>
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-full overflow-auto">
            <AuditTrailViewer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Statistics */}
          <div className="flex items-center gap-6">
            {/* Title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Subscription Management</h1>
                <p className="text-sm text-gray-600">Manage all subscriber data and subscriptions</p>
              </div>
            </div>

            {/* Statistics */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Total:</span>
                <Badge variant="secondary" className="font-medium">
                  {stats.total.toLocaleString()}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-gray-600">Active:</span>
                <Badge className="bg-emerald-100 text-emerald-700 font-medium">
                  {stats.active.toLocaleString()}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Inactive:</span>
                <Badge variant="secondary" className="font-medium">
                  {stats.inactive.toLocaleString()}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">Revenue:</span>
                <Badge className="bg-blue-100 text-blue-700 font-medium">
                  ₹{(stats.totalRevenue / 100000).toFixed(1)}L
                </Badge>
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Bulk Actions - Show when items are selected */}
            {bulkSelection.size > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm text-blue-700 font-medium">
                  {bulkSelection.size} selected
                </span>
                
                <Button
                  size="sm"
                  onClick={() => setShowBulkEdit(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Bulk Edit
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Zap className="w-4 h-4 mr-1" />
                      Quick Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onBulkAction('activate')}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Activate All
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkAction('deactivate')}>
                      <XCircle className="w-4 h-4 mr-2" />
                      Deactivate All
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkAction('pause')}>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Pause All
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onBulkAction('export')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Regular Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuditTrail(true)}
              className="flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Audit Trail
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onBulkAction('export-all')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export All Data
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onBulkAction('sync')}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync with Database
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAuditTrail(true)}>
                  <Package className="w-4 h-4 mr-2" />
                  View Full Audit Trail
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Progress indicator when loading */}
        {isLoading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div className="bg-blue-600 h-1 rounded-full animate-pulse w-1/3"></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 