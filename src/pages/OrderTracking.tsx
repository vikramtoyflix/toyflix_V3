
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  MapPin,
  ArrowLeft
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileLayout from "@/components/mobile/MobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";

const OrderTracking = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [trackingId, setTrackingId] = useState("");
  const [orderData, setOrderData] = useState(null);

  const handleTrackOrder = () => {
    // Mock tracking data - replace with actual API call
    if (trackingId) {
      setOrderData({
        id: trackingId,
        status: "in_transit",
        estimatedDelivery: "Dec 25, 2024",
        currentLocation: "Local Delivery Hub",
        timeline: [
          { status: "ordered", time: "Dec 20, 2024 10:30 AM", completed: true },
          { status: "packed", time: "Dec 21, 2024 2:15 PM", completed: true },
          { status: "shipped", time: "Dec 22, 2024 9:00 AM", completed: true },
          { status: "in_transit", time: "Dec 23, 2024 11:45 AM", completed: true },
          { status: "delivered", time: "Estimated: Dec 25, 2024", completed: false }
        ],
        toys: [
          { name: "LEGO Classic Building Set", image: "/placeholder.svg" },
          { name: "Wooden Puzzle Game", image: "/placeholder.svg" },
          { name: "Musical Toy Piano", image: "/placeholder.svg" }
        ]
      });
    }
  };

  const getStatusIcon = (status: string, completed: boolean) => {
    const iconClass = completed ? "text-green-600" : "text-gray-400";
    
    switch (status) {
      case "ordered": return <Clock className={`w-5 h-5 ${iconClass}`} />;
      case "packed": return <Package className={`w-5 h-5 ${iconClass}`} />;
      case "shipped": return <Truck className={`w-5 h-5 ${iconClass}`} />;
      case "in_transit": return <MapPin className={`w-5 h-5 ${iconClass}`} />;
      case "delivered": return <CheckCircle className={`w-5 h-5 ${iconClass}`} />;
      default: return <Clock className={`w-5 h-5 ${iconClass}`} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ordered": return "Order Placed";
      case "packed": return "Packed";
      case "shipped": return "Shipped";
      case "in_transit": return "In Transit";
      case "delivered": return "Delivered";
      default: return status;
    }
  };

  const content = (
    <div className={`${isMobile ? 'pt-4 px-4' : 'pt-20 container mx-auto px-4'} py-8`}>
      <div className="max-w-4xl mx-auto">
        {isMobile && (
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 p-0 h-auto"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
        )}

        <div className="text-center mb-8">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-primary mb-4`}>
            Track Your Order
          </h1>
          <p className={`${isMobile ? 'text-base' : 'text-lg'} text-muted-foreground`}>
            Enter your order ID to track your toy delivery
          </p>
        </div>

        <Card className={`${isMobile ? 'border-0 shadow-lg' : 'shadow-xl'} mb-6`}>
          <CardHeader>
            <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
              Enter Tracking Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`${isMobile ? 'space-y-4' : 'flex space-x-4'}`}>
              <Input
                placeholder="Enter your order ID (e.g., TOY123456)"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className={isMobile ? 'w-full' : 'flex-1'}
              />
              <Button 
                onClick={handleTrackOrder}
                className={`${isMobile ? 'w-full' : ''} bg-primary hover:bg-primary/90`}
              >
                <Search className="w-4 h-4 mr-2" />
                Track Order
              </Button>
            </div>
          </CardContent>
        </Card>

        {orderData && (
          <div className="space-y-6">
            {/* Order Status Card */}
            <Card className={`${isMobile ? 'border-0 shadow-lg' : 'shadow-xl'}`}>
              <CardHeader>
                <div className={`${isMobile ? 'space-y-2' : 'flex justify-between items-start'}`}>
                  <div>
                    <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
                      Order #{orderData.id}
                    </CardTitle>
                    <p className="text-muted-foreground">
                      Current Status: <Badge variant="secondary">{getStatusLabel(orderData.status)}</Badge>
                    </p>
                  </div>
                  <div className={`${isMobile ? '' : 'text-right'}`}>
                    <p className="text-sm text-muted-foreground">Expected Delivery</p>
                    <p className="font-semibold">{orderData.estimatedDelivery}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`${isMobile ? 'bg-blue-50 p-4' : 'bg-blue-50 p-6'} rounded-lg`}>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Current Location</p>
                      <p className="text-blue-700">{orderData.currentLocation}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card className={`${isMobile ? 'border-0 shadow-lg' : 'shadow-xl'}`}>
              <CardHeader>
                <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
                  Delivery Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderData.timeline.map((item, index) => (
                    <div key={item.status} className="flex items-start space-x-4">
                      <div className="flex flex-col items-center">
                        {getStatusIcon(item.status, item.completed)}
                        {index < orderData.timeline.length - 1 && (
                          <div className={`w-px h-8 ${item.completed ? 'bg-green-300' : 'bg-gray-300'} mt-2`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-medium ${item.completed ? 'text-green-800' : 'text-gray-600'}`}>
                          {getStatusLabel(item.status)}
                        </h4>
                        <p className={`text-sm ${item.completed ? 'text-green-600' : 'text-gray-500'}`}>
                          {item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Toys in Order Card */}
            <Card className={`${isMobile ? 'border-0 shadow-lg' : 'shadow-xl'}`}>
              <CardHeader>
                <CardTitle className={isMobile ? 'text-lg' : 'text-xl'}>
                  Toys in this Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-3 gap-4'}`}>
                  {orderData.toys.map((toy, index) => (
                    <div key={index} className={`${isMobile ? 'flex items-center space-x-3' : 'text-center'}`}>
                      <img 
                        src={toy.image} 
                        alt={toy.name}
                        className={`${isMobile ? 'w-12 h-12' : 'w-16 h-16 mx-auto'} object-cover rounded-lg`}
                      />
                      <p className={`${isMobile ? 'text-sm flex-1' : 'text-sm mt-2'} font-medium`}>
                        {toy.name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileLayout title="Track Order" showHeader={true} showBottomNav={true}>
        <div className="min-h-screen bg-gray-50">
          {content}
        </div>
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      {content}
      <Footer />
    </div>
  );
};

export default OrderTracking;
