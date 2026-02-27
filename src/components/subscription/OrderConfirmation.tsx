import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, MapPin, Calendar, Eye, Home } from 'lucide-react';
import { Toy } from '@/hooks/useToys';

interface OrderConfirmationProps {
  orderDetails: {
    orderId: string;
    orderNumber?: string;
    selectedToys: Toy[];
    deliveryAddress: {
      first_name: string;
      last_name: string;
      address_line1: string;
      apartment?: string;
      city: string;
      state: string;
      zip_code: string;
      country?: string;
    };
    planName: string;
    totalAmount: number;
    estimatedDeliveryDate?: string;
    deliveryInstructions?: string;
  };
  onViewOrderDetails: () => void;
  onReturnToDashboard: () => void;
  isQueueOrder?: boolean;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  orderDetails,
  onViewOrderDetails,
  onReturnToDashboard,
  isQueueOrder = false
}) => {
  const {
    orderId,
    orderNumber,
    selectedToys,
    deliveryAddress,
    planName,
    totalAmount,
    estimatedDeliveryDate,
    deliveryInstructions
  } = orderDetails;

  // Calculate estimated delivery date if not provided
  const getEstimatedDeliveryDate = () => {
    if (estimatedDeliveryDate) return estimatedDeliveryDate;
    
    // For queue orders, estimate based on next cycle
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + (isQueueOrder ? 7 : 3)); // Queue orders in ~7 days, regular orders in ~3 days
    
    return estimatedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAddress = () => {
    const parts = [
      deliveryAddress.apartment && `${deliveryAddress.apartment},`,
      deliveryAddress.address_line1,
      deliveryAddress.city,
      deliveryAddress.state,
      deliveryAddress.zip_code
    ].filter(Boolean);
    
    return parts.join(' ');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-800">
            {isQueueOrder ? "🎉 Your Next Delivery Has Been Updated!" : "🎉 Order Confirmed!"}
          </CardTitle>
          <p className="text-green-700 mt-2">
            {isQueueOrder 
              ? "We're preparing your toys for next month's delivery."
              : "Thank you for your order! We're preparing your toys for delivery."}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-green-600">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Order #{orderNumber || orderId.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Est. Delivery: {getEstimatedDeliveryDate()}</span>
            </div>
            {totalAmount === 0 && (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                FREE
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selected Toys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {isQueueOrder ? "Updated Toy Selection" : "Your Toys"}
            </CardTitle>
            <p className="text-sm text-gray-600">
              {selectedToys.length} toy{selectedToys.length !== 1 ? 's' : ''} selected for {isQueueOrder ? 'your next delivery' : 'this order'}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {selectedToys.map((toy, index) => (
                <div key={toy.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                  <img
                    src={toy.image_url || "/placeholder.svg"}
                    alt={toy.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h5 className="font-medium text-sm">{toy.name}</h5>
                    <p className="text-xs text-gray-500">{toy.category || 'Educational'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {planName}
                      </Badge>
                      {toy.age_range && (
                        <Badge variant="outline" className="text-xs">
                          Age {toy.age_range}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Delivery Address */}
            <div>
              <h4 className="font-medium text-sm mb-2">Delivery Address:</h4>
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">{deliveryAddress.first_name} {deliveryAddress.last_name}</p>
                <p>{formatAddress()}</p>
                <p>{deliveryAddress.country || 'India'}</p>
              </div>
            </div>

            {/* Delivery Instructions */}
            {deliveryInstructions && (
              <div>
                <h4 className="font-medium text-sm mb-2">Delivery Instructions:</h4>
                <div className="p-3 bg-blue-50 rounded-lg text-sm border border-blue-200">
                  <p className="text-blue-800">{deliveryInstructions}</p>
                </div>
              </div>
            )}

            {/* Estimated Delivery */}
            <div>
              <h4 className="font-medium text-sm mb-2">Estimated Delivery:</h4>
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Calendar className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  {getEstimatedDeliveryDate()}
                </span>
              </div>
            </div>

            {/* Queue-specific messaging */}
            {isQueueOrder && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Next Steps:</strong> Your updated selection will be processed for the next delivery cycle. 
                  You'll receive a confirmation email and tracking details closer to your delivery date.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-medium">{planName}</span>
            </div>
            <div className="flex justify-between">
              <span>Toys:</span>
              <span className="font-medium">{selectedToys.length} items</span>
            </div>
            <div className="flex justify-between">
              <span>Total Amount:</span>
              <span className={`font-bold ${totalAmount === 0 ? 'text-green-600' : ''}`}>
                ₹{totalAmount} {totalAmount === 0 && '(FREE!)'}
              </span>
            </div>
          </div>
          
          {totalAmount === 0 && (
            <div className="mt-4 p-3 bg-green-100 rounded-lg">
              <p className="text-sm text-green-700 text-center">
                <strong>🎉 Great news!</strong> Your premium subscription includes this month's toy selection.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button 
          onClick={onViewOrderDetails}
          variant="outline"
          size="lg"
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          View Order Details
        </Button>
        <Button 
          onClick={onReturnToDashboard}
          size="lg"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Home className="w-4 h-4" />
          Return to Dashboard
        </Button>
      </div>

      {/* Additional Help Text */}
      <div className="text-center text-sm text-gray-600 mt-6">
        <p>
          {isQueueOrder 
            ? "Questions about your queue update? " 
            : "Questions about your order? "}
          <a href="mailto:support@toyflix.com" className="text-blue-600 hover:underline">
            Contact our support team
          </a>
        </p>
      </div>
    </div>
  );
};

export default OrderConfirmation; 