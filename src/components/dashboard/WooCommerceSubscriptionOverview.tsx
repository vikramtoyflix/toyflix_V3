import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Package } from 'lucide-react';

/**
 * DISABLED: Legacy WooCommerce subscription overview component
 * This component has been disabled to prevent API calls to old WooCommerce/Azure system
 */
const WooCommerceSubscriptionOverview = () => {
  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          Legacy WooCommerce Data
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            DISABLED
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <Package className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <p className="text-yellow-800 font-medium mb-2">
            🔄 WooCommerce Integration Disabled
          </p>
          <p className="text-yellow-700 text-sm mb-4">
            This component has been disabled as part of the migration to the new system. 
            All subscription data is now managed through Supabase instead of WooCommerce.
          </p>
          <div className="text-xs text-yellow-600 bg-yellow-100 rounded p-2">
            <strong>For Developers:</strong> This prevents API calls to Azure Functions and WooCommerce endpoints.
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WooCommerceSubscriptionOverview; 