import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Gift, Tag, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { PromotionalOffersService } from '@/services/promotionalOffersService';

interface PromoOffer {
  code: string;
  name: string;
  description: string;
  discount: number;
  type: 'percentage' | 'amount';
  minOrder?: number;
  maxDiscount?: number;
  validUntil?: string;
  isLimited?: boolean;
}

interface AvailablePromoDisplayProps {
  onPromoSelect?: (code: string) => void;
  showTitle?: boolean;
  compact?: boolean;
  location?: 'homepage' | 'pricing' | 'header';
}

const AvailablePromoDisplay: React.FC<AvailablePromoDisplayProps> = ({
  onPromoSelect,
  showTitle = true,
  compact = false,
  location = 'pricing'
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 🎯 ENHANCED: Fetch promo codes from database based on location
  const { data: availablePromos = [], isLoading } = useQuery({
    queryKey: ['display-offers', location],
    queryFn: async () => {
      const offers = await PromotionalOffersService.getOffersForLocation(location);
      
      // Transform to PromoOffer format
      return offers.map(offer => ({
        code: offer.code,
        name: offer.name,
        description: offer.description || '',
        discount: offer.value,
        type: offer.type === 'discount_percentage' ? 'percentage' as const : 'amount' as const,
        minOrder: offer.min_order_value,
        maxDiscount: offer.max_discount_amount,
        validUntil: new Date(offer.end_date).toLocaleDateString(),
        isLimited: !!offer.usage_limit
      }));
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 10, // 10 minutes
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        <span className="ml-2 text-sm text-gray-600">Loading promo codes...</span>
      </div>
    );
  }

  // Don't render if no promos available
  if (!availablePromos || availablePromos.length === 0) {
    return null;
  }

  const copyPromoCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`Promo code ${code} copied to clipboard!`);
      
      // Reset copy state after 2 seconds
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy promo code');
    }
  };

  const handlePromoSelect = (code: string) => {
    if (onPromoSelect) {
      onPromoSelect(code);
      toast.success(`Promo code ${code} selected!`);
    } else {
      copyPromoCode(code);
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {availablePromos.map((promo) => (
          <div 
            key={promo.code}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Tag className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-800">{promo.name}</p>
                <p className="text-xs text-green-600">Min order: ₹{promo.minOrder}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600 text-white">
                {promo.discount}% OFF
              </Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs"
                onClick={() => handlePromoSelect(promo.code)}
              >
                {copiedCode === promo.code ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    {promo.code}
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Gift className="w-5 h-5 text-green-600" />
            Available Promo Codes
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {availablePromos.length} Active
            </Badge>
          </CardTitle>
        </CardHeader>
      )}
      
      <CardContent className="space-y-3">
        {availablePromos.map((promo) => (
          <div 
            key={promo.code}
            className="p-4 bg-white rounded-lg border border-green-200 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{promo.name}</h4>
                  <Badge className="bg-green-600 text-white">
                    {promo.discount}% OFF
                  </Badge>
                  {promo.isLimited && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      <Clock className="w-3 h-3 mr-1" />
                      Limited Time
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{promo.description}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {promo.minOrder && (
                    <span>Min order: ₹{promo.minOrder}</span>
                  )}
                  {promo.maxDiscount && (
                    <span>Max discount: ₹{promo.maxDiscount}</span>
                  )}
                  {promo.validUntil && (
                    <span>Valid for: {promo.validUntil}</span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 ml-4">
                <div className="flex items-center gap-1 bg-gray-100 rounded px-3 py-1">
                  <span className="text-sm font-mono font-bold text-gray-800">{promo.code}</span>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={() => copyPromoCode(promo.code)}
                  >
                    {copiedCode === promo.code ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  
                  {onPromoSelect && (
                    <Button
                      size="sm"
                      className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => handlePromoSelect(promo.code)}
                    >
                      Use Code
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Help text */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            💡 Copy the promo code and paste it during checkout to get your discount
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailablePromoDisplay;
