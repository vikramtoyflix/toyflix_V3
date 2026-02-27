import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  Filter, 
  X, 
  Calendar,
  DollarSign,
  Package,
  Users,
  RefreshCw
} from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface SubscriptionFiltersProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: {
    status: string;
    plan: string;
    ageGroup: string;
    category: string;
    dateRange: DateRange | undefined;
    amountRange: { min: number; max: number };
    cycleRange: { min: number; max: number };
  };
  onFiltersChange: (filters: any) => void;
  onReset: () => void;
  activeFilterCount: number;
}

const SubscriptionFilters: React.FC<SubscriptionFiltersProps> = ({
  isOpen,
  onToggle,
  filters,
  onFiltersChange,
  onReset,
  activeFilterCount
}) => {
  const handleFilterChange = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleAmountRangeChange = (type: 'min' | 'max', value: string) => {
    const numericValue = parseFloat(value) || 0;
    handleFilterChange('amountRange', {
      ...filters.amountRange,
      [type]: numericValue
    });
  };

  const handleCycleRangeChange = (type: 'min' | 'max', value: string) => {
    const numericValue = parseInt(value) || 0;
    handleFilterChange('cycleRange', {
      ...filters.cycleRange,
      [type]: numericValue
    });
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Filter className="w-4 h-4" />
        Advanced Filters
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {activeFilterCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Advanced Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={onReset} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={onToggle} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Subscription Status */}
          <div>
            <Label htmlFor="status-filter">Subscription Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscription Plan */}
          <div>
            <Label htmlFor="plan-filter">Subscription Plan</Label>
            <Select
              value={filters.plan}
              onValueChange={(value) => handleFilterChange('plan', value)}
            >
              <SelectTrigger id="plan-filter">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="Discovery Delight">Discovery Delight</SelectItem>
                <SelectItem value="Silver Pack">Silver Pack</SelectItem>
                <SelectItem value="Gold Pack PRO">Gold Pack PRO</SelectItem>
                <SelectItem value="Ride-On Monthly">Ride-On Monthly</SelectItem>
                <SelectItem value="Books Monthly">Books Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Age Group */}
          <div>
            <Label htmlFor="age-filter">Age Group</Label>
            <Select
              value={filters.ageGroup}
              onValueChange={(value) => handleFilterChange('ageGroup', value)}
            >
              <SelectTrigger id="age-filter">
                <SelectValue placeholder="All Ages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                <SelectItem value="1-2">6m-2 years</SelectItem>
                <SelectItem value="2-3">2-3 years</SelectItem>
                <SelectItem value="3-4">3-4 years</SelectItem>
                <SelectItem value="4-6">4-6 years</SelectItem>
                <SelectItem value="6-8">6-8 years</SelectItem>
                <SelectItem value="8+">8+ years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Subscription Category */}
          <div>
            <Label htmlFor="category-filter">Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => handleFilterChange('category', value)}
            >
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="books">Books</SelectItem>
                <SelectItem value="ride_on">Ride-On</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Range Filter */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4" />
            Subscription Date Range
          </Label>
          <DatePickerWithRange
            date={filters.dateRange}
            onDateChange={(dateRange) => handleFilterChange('dateRange', dateRange)}
            placeholder="Select date range"
            className="w-full"
          />
        </div>

        {/* Amount Range Filter */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4" />
            Amount Range (₹)
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min amount"
              value={filters.amountRange.min || ''}
              onChange={(e) => handleAmountRangeChange('min', e.target.value)}
              className="flex-1"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="number"
              placeholder="Max amount"
              value={filters.amountRange.max || ''}
              onChange={(e) => handleAmountRangeChange('max', e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Cycle Range Filter */}
        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4" />
            Cycle Number Range
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min cycle"
              value={filters.cycleRange.min || ''}
              onChange={(e) => handleCycleRangeChange('min', e.target.value)}
              className="flex-1"
            />
            <span className="text-gray-500">to</span>
            <Input
              type="number"
              placeholder="Max cycle"
              value={filters.cycleRange.max || ''}
              onChange={(e) => handleCycleRangeChange('max', e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div>
            <Label className="mb-2 block">Active Filters</Label>
            <div className="flex flex-wrap gap-2">
              {filters.status !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.status}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => handleFilterChange('status', 'all')}
                  />
                </Badge>
              )}
              {filters.plan !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Plan: {filters.plan}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => handleFilterChange('plan', 'all')}
                  />
                </Badge>
              )}
              {filters.ageGroup !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Age: {filters.ageGroup}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => handleFilterChange('ageGroup', 'all')}
                  />
                </Badge>
              )}
              {filters.category !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category: {filters.category}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => handleFilterChange('category', 'all')}
                  />
                </Badge>
              )}
              {filters.dateRange && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Date Range
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => handleFilterChange('dateRange', undefined)}
                  />
                </Badge>
              )}
              {(filters.amountRange.min > 0 || filters.amountRange.max > 0) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Amount: ₹{filters.amountRange.min}-{filters.amountRange.max}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => handleFilterChange('amountRange', { min: 0, max: 0 })}
                  />
                </Badge>
              )}
              {(filters.cycleRange.min > 0 || filters.cycleRange.max > 0) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Cycles: {filters.cycleRange.min}-{filters.cycleRange.max}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => handleFilterChange('cycleRange', { min: 0, max: 0 })}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Filter Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            {activeFilterCount > 0 
              ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} applied`
              : 'No filters applied'
            }
          </p>
          <div className="flex gap-2">
            <Button onClick={onReset} variant="outline" size="sm">
              Clear All
            </Button>
            <Button onClick={onToggle} size="sm">
              Apply Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionFilters; 