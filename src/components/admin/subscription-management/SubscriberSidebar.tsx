import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Filter,
  Users,
  User,
  Phone,
  Calendar,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Crown,
  Package,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

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

interface SubscriberSidebarProps {
  subscribers: UserSubscriptionData[];
  selectedSubscriberId: string | null;
  onSelectSubscriber: (subscriberId: string) => void;
  bulkSelection: Set<string>;
  onBulkSelectionChange: (selection: Set<string>) => void;
  isLoading?: boolean;
}

export const SubscriberSidebar: React.FC<SubscriberSidebarProps> = ({
  subscribers,
  selectedSubscriberId,
  onSelectSubscriber,
  bulkSelection,
  onBulkSelectionChange,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('lastActivity');

  // Get status icon and color
  const getStatusConfig = (status: 'active' | 'inactive' | 'mixed') => {
    switch (status) {
      case 'active':
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          label: 'Active'
        };
      case 'inactive':
        return {
          icon: <XCircle className="w-3 h-3" />,
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          label: 'Inactive'
        };
      case 'mixed':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          color: 'bg-amber-100 text-amber-700 border-amber-200',
          label: 'Mixed'
        };
      default:
        return {
          icon: <Clock className="w-3 h-3" />,
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          label: 'Unknown'
        };
    }
  };

  // Get plan icon
  const getPlanIcon = (plan: string) => {
    if (plan?.toLowerCase().includes('gold')) {
      return <Crown className="w-4 h-4 text-yellow-500" />;
    }
    return <Package className="w-4 h-4 text-blue-500" />;
  };

  // Filter and sort subscribers
  const filteredAndSortedSubscribers = useMemo(() => {
    let filtered = subscribers.filter(subscriber => {
      const matchesSearch = 
        subscriber.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscriber.user.phone.includes(searchTerm) ||
        subscriber.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        subscriber.activeSubscription?.order_number.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || subscriber.subscriptionStatus === statusFilter;
      
      const matchesPlan = planFilter === 'all' || subscriber.activeSubscription?.subscription_plan === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });

    // Sort subscribers
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.user.full_name.localeCompare(b.user.full_name);
        case 'totalSpent':
          return b.totalSpent - a.totalSpent;
        case 'subscriptionStatus':
          return a.subscriptionStatus.localeCompare(b.subscriptionStatus);
        case 'lastActivity':
        default:
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      }
    });

    return filtered;
  }, [subscribers, searchTerm, statusFilter, planFilter, sortBy]);

  // Handle bulk selection
  const handleBulkSelect = (subscriberId: string, checked: boolean) => {
    const newSelection = new Set(bulkSelection);
    if (checked) {
      newSelection.add(subscriberId);
    } else {
      newSelection.delete(subscriberId);
    }
    onBulkSelectionChange(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredAndSortedSubscribers.map(s => s.user.id));
      onBulkSelectionChange(allIds);
    } else {
      onBulkSelectionChange(new Set());
    }
  };

  // Get unique plans for filter
  const uniquePlans = [...new Set(subscribers
    .map(s => s.activeSubscription?.subscription_plan)
    .filter(Boolean)
  )];

  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-semibold">Subscribers</span>
            <Badge variant="secondary" className="ml-2">
              {filteredAndSortedSubscribers.length}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search subscribers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {uniquePlans.map(plan => (
                  <SelectItem key={plan} value={plan}>
                    {plan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lastActivity">Last Activity</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="totalSpent">Total Spent</SelectItem>
              <SelectItem value="subscriptionStatus">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Selection */}
        {bulkSelection.size > 0 && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <Checkbox
              checked={bulkSelection.size === filteredAndSortedSubscribers.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-xs text-blue-700">
              {bulkSelection.size} selected
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full w-full">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Loading subscribers...</div>
          ) : filteredAndSortedSubscribers.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No subscribers found</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredAndSortedSubscribers.map((subscriber) => {
                const statusConfig = getStatusConfig(subscriber.subscriptionStatus);
                const isSelected = selectedSubscriberId === subscriber.user.id;
                const isBulkSelected = bulkSelection.has(subscriber.user.id);

                return (
                  <div
                    key={subscriber.user.id}
                    className={`
                      group cursor-pointer rounded-lg border p-3 transition-all duration-200
                      ${isSelected 
                        ? 'bg-blue-50 border-blue-200 shadow-sm' 
                        : 'hover:bg-gray-50 hover:border-gray-300 border-gray-200'
                      }
                    `}
                    onClick={() => onSelectSubscriber(subscriber.user.id)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Bulk Selection Checkbox */}
                      <Checkbox
                        checked={isBulkSelected}
                        onCheckedChange={(checked) => handleBulkSelect(subscriber.user.id, checked as boolean)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />

                      {/* Avatar */}
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                        ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}
                      `}>
                        {subscriber.user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {subscriber.user.full_name}
                          </h4>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <Phone className="w-3 h-3" />
                            <span className="truncate">{subscriber.user.phone}</span>
                          </div>

                          {subscriber.activeSubscription && (
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              {getPlanIcon(subscriber.activeSubscription.subscription_plan)}
                              <span className="truncate">{subscriber.activeSubscription.subscription_plan}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <Badge className={`${statusConfig.color} text-xs px-2 py-0.5`}>
                              {statusConfig.icon}
                              <span className="ml-1">{statusConfig.label}</span>
                            </Badge>
                            
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <CreditCard className="w-3 h-3" />
                              <span>₹{subscriber.totalSpent.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {format(new Date(subscriber.lastActivity), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}; 