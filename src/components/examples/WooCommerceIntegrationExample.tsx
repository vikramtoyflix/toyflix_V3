import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

/**
 * DISABLED: Legacy WooCommerce integration component
 * This component has been disabled to prevent API calls to old WooCommerce system
 */
export const WooCommerceIntegrationExample = () => {
  return (
    <Card className="w-full max-w-2xl mx-auto border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          Legacy WooCommerce Component
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            DISABLED
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <p className="text-yellow-800 font-medium mb-2">
            🔄 WooCommerce Integration Disabled
          </p>
          <p className="text-yellow-700 text-sm">
            This component has been disabled as part of the migration to the new custom OTP system. 
            All user data is now managed through Supabase instead of WooCommerce.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WooCommerceIntegrationExample; 