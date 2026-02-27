import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionToys } from '@/hooks/useSubscriptionToys';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { CycleManagementService } from '@/services/cycleManagementService';
import { matchesAgeRange } from '@/utils/ageRangeUtils';
import ToyGrid from './ToyGrid';
import CatalogFilters from './CatalogFilters';
import CycleStatusIndicator from './CycleStatusIndicator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Toy } from '@/hooks/useToys';
import { Package, Crown, Sparkles } from 'lucide-react';

interface SubscriptionCatalogViewProps {
  onAddToCart: (toy: Toy, e: React.MouseEvent) => void;
  onAddToWishlist: (toyId: string, e: React.MouseEvent) => void;
  onViewProduct: (toyId: string) => void;
}

const SubscriptionCatalogView = ({
  onAddToCart,
  onAddToWishlist,
  onViewProduct
}: SubscriptionCatalogViewProps) => {
  const [selectedAge, setSelectedAge] = useState("1-2");
  
  const navigate = useNavigate();
  const { data: cycleStatus } = useCycleStatus();
  const { data: toys, isLoading } = useSubscriptionToys();

  const filteredToys = toys?.filter((toy) => {
    // Exclude ride-on toys from regular subscription catalog - they have separate subscription flow
    if (toy.category === 'ride_on_toys') {
      return false;
    }
    
    return matchesAgeRange(toy.age_range, selectedAge);
  }) || [];

  const showManageQueue = CycleManagementService.shouldShowManageQueue(cycleStatus);

  return (
    <div className="space-y-6">
      <CycleStatusIndicator />
      
      {/* Highlighted Toy Count Display for Subscribers */}
      <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-full">
                  <Crown className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-700">
                    {isLoading ? "..." : filteredToys.length}
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    {isLoading ? "Loading your toys..." : `Premium Toys Available`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1">
                  <Package className="w-3 h-3 mr-1" />
                  Age: {selectedAge} years
                </Badge>
                <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {cycleStatus?.plan_id} Plan
                </Badge>
              </div>
            </div>
            {showManageQueue && (
              <Button 
                onClick={() => navigate('/subscription-flow')}
                className="bg-green-600 hover:bg-green-700"
              >
                Manage Queue for Next Month
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Benefits Banner */}
      <div className="bg-gradient-to-r from-fun-blue/10 to-fun-pink/10 rounded-lg p-4 border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Your Subscription Benefits</h3>
            <p className="text-muted-foreground">
              All toys shown below are included in your {cycleStatus?.plan_id} plan
            </p>
          </div>
        </div>
      </div>

      {/* Selection Window Alert */}
      {cycleStatus?.selection_window_active && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="text-green-800">
                🎯 <strong>Selection Window Open:</strong> You can now select toys for next month's delivery!
              </span>
              <Button 
                size="sm" 
                onClick={() => navigate('/subscription-flow')}
                className="bg-green-600 hover:bg-green-700 ml-4"
              >
                Select Toys
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <CatalogFilters
        selectedAge={selectedAge}
        setSelectedAge={setSelectedAge}
      />

      <ToyGrid
        toys={filteredToys}
        isLoading={isLoading}
        onToyAction={onAddToCart}
        onAddToWishlist={onAddToWishlist}
        onViewProduct={onViewProduct}
        isSubscriptionView={true}
        showOutOfStock={true}
      />
    </div>
  );
};

export default SubscriptionCatalogView;
