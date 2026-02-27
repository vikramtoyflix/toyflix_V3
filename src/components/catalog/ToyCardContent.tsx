import { Toy } from "@/hooks/useToys";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Gift, Crown } from "lucide-react";
import { PlanService } from "@/services/planService";

interface ToyCardContentProps {
  toy: Toy;
}

const ToyCardContent = ({ toy }: ToyCardContentProps) => {
  // Map pack values to subscription plan display names with colors
  const getSubscriptionPlanInfo = (pack: string | null) => {
    if (!pack) return null;
    
    switch (pack.toLowerCase()) {
      case 'standard':
        return {
          name: 'Discovery Delight',
          color: 'bg-toy-mint/20 text-toy-mint border-toy-mint/40',
          icon: Sparkles
        };
      case 'big':
        return {
          name: 'Silver Pack',
          color: 'bg-toy-sky/20 text-toy-sky border-toy-sky/40',
          icon: Gift
        };
      case 'premium':
        return {
          name: 'Gold Pack PRO',
          color: 'bg-toy-sunshine/20 text-toy-sunshine border-toy-sunshine/40',
          icon: Gift
        };
      default:
        return {
          name: pack,
          color: 'bg-toy-coral/20 text-toy-coral border-toy-coral/40',
          icon: Sparkles
        };
    }
  };

  const subscriptionPlanInfo = getSubscriptionPlanInfo(toy.pack);
  const isPremiumToy = PlanService.isPremiumPricedToy(toy.retail_price);

  return (
    <div className="space-y-3">
      {/* Premium Toy Badge */}
      {isPremiumToy && (
        <div className="flex justify-center">
          <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 border-yellow-300 px-3 py-1 font-bold">
            <Crown className="w-3 h-3 mr-1" />
            PREMIUM TOY
          </Badge>
        </div>
      )}

      {/* Subscription Plan Badge */}
      {subscriptionPlanInfo && (
        <div className="flex justify-center">
          <Badge className={`border ${subscriptionPlanInfo.color} px-2 py-1 text-xs font-medium`}>
            <subscriptionPlanInfo.icon className="w-3 h-3 mr-1" />
            {subscriptionPlanInfo.name}
          </Badge>
        </div>
      )}

      {/* Toy Name */}
      <h3 className="font-semibold text-center text-gray-800 line-clamp-2 min-h-[2.5rem] text-sm">
        {toy.name}
      </h3>

      {/* Age Range */}
      {toy.age_range && (
        <div className="text-center">
          <Badge variant="outline" className="text-xs px-2 py-1">
            Age: {toy.age_range}
          </Badge>
        </div>
      )}

      {/* Premium Toy Pricing Info with MRP */}
      {isPremiumToy && (
        <div className="text-center p-2 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-800 font-medium">
            ⭐ Gold Pack Exclusive
          </p>
          <p className="text-xs text-yellow-700">
            MRP: ₹{toy.retail_price?.toLocaleString()}
          </p>
        </div>
      )}

      {/* Brand */}
      {toy.brand && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground">by {toy.brand}</p>
        </div>
      )}

      {/* Rating */}
      {toy.rating && (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-yellow-500">⭐</span>
            <span className="text-xs text-muted-foreground">{toy.rating.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToyCardContent;
