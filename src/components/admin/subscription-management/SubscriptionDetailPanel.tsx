import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  ArrowLeft, 
  User,
  Crown,
  Package,
  Sparkles
} from 'lucide-react';
import UserSubscriptionCard from './UserSubscriptionCard';

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

interface SubscriptionDetailPanelProps {
  selectedSubscriber: UserSubscriptionData | null;
  onClearSelection: () => void;
  onDeleteSubscription: (subscriptionId: string) => void;
  onViewSubscription: (userId: string, userName: string) => void;
  onEditSubscription: (userId: string, userName: string) => void;
  onAddSubscription: (userId: string, userName: string) => void;
  totalSubscribers: number;
  // 🔄 ADD: Optional onRefresh prop to pass to UserSubscriptionCard
  onRefresh?: () => void;
}

export const SubscriptionDetailPanel: React.FC<SubscriptionDetailPanelProps> = ({
  selectedSubscriber,
  onClearSelection,
  onDeleteSubscription,
  onViewSubscription,
  onEditSubscription,
  onAddSubscription,
  totalSubscribers,
  onRefresh
}) => {
  if (!selectedSubscriber) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center p-8">
          <div className="max-w-md mx-auto">
            {/* Illustration */}
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-12 h-12 text-blue-600" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-yellow-600" />
              </div>
            </div>

            {/* Content */}
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Welcome to Subscription Management
            </h3>
            <p className="text-gray-600 mb-6">
              Select a subscriber from the sidebar to view and edit their subscription details. 
              You can search, filter, and perform bulk operations on multiple subscribers.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-700">{totalSubscribers}</div>
                <div className="text-sm text-blue-600">Total Subscribers</div>
              </div>
              
              <div className="bg-emerald-50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Package className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700">All Fields</div>
                <div className="text-sm text-emerald-600">Inline Editable</div>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <Crown className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-700">Real-time</div>
                <div className="text-sm text-purple-600">Updates & Audit</div>
              </div>
            </div>

            {/* Features */}
            <div className="text-left space-y-3">
              <h4 className="font-semibold text-gray-900">Key Features:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Click any field in the subscription card to edit inline</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Search and filter subscribers by name, phone, plan, or status</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Select multiple subscribers for bulk operations</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Complete audit trail for all changes and actions</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header with back button */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{selectedSubscriber.user.full_name}</h2>
              <p className="text-sm text-gray-600">{selectedSubscriber.user.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Card Content */}
      <div className="flex-1 overflow-auto p-4">
        <UserSubscriptionCard
          userSubscriptionData={selectedSubscriber as any}
          onView={() => onViewSubscription(selectedSubscriber.user.id, selectedSubscriber.user.full_name)}
          onEdit={() => onEditSubscription(selectedSubscriber.user.id, selectedSubscriber.user.full_name)}
          onAdd={() => onAddSubscription(selectedSubscriber.user.id, selectedSubscriber.user.full_name)}
          onDelete={onDeleteSubscription}
          onBulkSelect={() => {}}
          isSelected={false}
          // 🔄 ADD: Pass the onRefresh prop to UserSubscriptionCard
          onRefresh={onRefresh}
        />
      </div>
    </Card>
  );
}; 