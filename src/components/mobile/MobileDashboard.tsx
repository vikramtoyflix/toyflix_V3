import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomAuth } from '@/hooks/useCustomAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import {
  Package,
  Crown,
  RefreshCw,
  Star,
  TrendingUp,
  RotateCcw,
  Gift,
  Truck,
  Heart,
  Phone,
  Settings,
  Home,
  History,
  User,
  CheckCircle,
  Mail,
  MapPin,
  Calendar,
  Award,
  ChevronRight,
  Clock
} from 'lucide-react';

interface MobileDashboardProps {
  dashboardData: any;
  refetch: () => void;
}

const MobileDashboard: React.FC<MobileDashboardProps> = ({ dashboardData, refetch }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const { data: userRole, isLoading: isRoleLoading } = useUserRole();
  
  // Check if user is admin
  const isAdmin = !isRoleLoading && userRole === 'admin';

  const { 
    userProfile, 
    orders, 
    totalOrders, 
    isActive, 
    plan, 
    currentOrder,
    cycleProgress,
    daysUntilNextPickup,
    nextPickupDate,
    isSelectionWindow,
    monthsActive,
    toysExperienced,
    shippingInfo,
    displayName
  } = dashboardData;

  const handleBrowseToys = () => navigate('/toys');
  const handleTrackOrder = () => navigate('/orders');
  const handleWishlist = () => navigate('/wishlist');
  const handleSupport = () => navigate('/support');

  return (
    <div className="space-y-4">
      {/* Mobile Header */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Hello, {displayName}!</h1>
              <p className="text-xs text-gray-600">{plan} Member</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "default" : "secondary"} className="px-2 py-1 text-xs">
              {isActive ? "Active" : "Inactive"}
            </Badge>
            <Button onClick={() => refetch()} variant="outline" size="sm" className="w-8 h-8 p-0">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Back to Site Button */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Site
        </Button>
      </div>

      {/* Current Cycle Card - Mobile Optimized */}
      {currentOrder && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900">Cycle #{currentOrder.cycle_number}</h3>
                <p className="text-sm text-blue-700">{currentOrder.toys_data?.length || 0} toys at home</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-blue-700">Progress</span>
                  <span className="font-medium text-blue-900">{Math.round(cycleProgress)}%</span>
                </div>
                <Progress value={cycleProgress} className="h-2" />
                <p className="text-xs text-blue-600 mt-1">
                  {daysUntilNextPickup > 0 
                    ? `${daysUntilNextPickup} days until next pickup`
                    : "Next pickup window is here!"
                  }
                </p>
              </div>

              {isSelectionWindow && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                    <Gift className="w-4 h-4" />
                    Selection Window Open!
                  </div>
                  <Button 
                    size="sm"
                    className="w-full bg-yellow-500 hover:bg-yellow-600"
                    onClick={handleBrowseToys}
                  >
                    Select Toys
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-blue-600">{currentOrder?.toys_data?.length || 0}</p>
            <p className="text-xs text-gray-600">Toys at Home</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <RotateCcw className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-green-600">{totalOrders}</p>
            <p className="text-xs text-gray-600">Total Cycles</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <Star className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-purple-600">{toysExperienced}</p>
            <p className="text-xs text-gray-600">Toys Experienced</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-2" />
            <p className="text-lg font-bold text-orange-600">{monthsActive}M</p>
            <p className="text-xs text-gray-600">Member For</p>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-14 flex-col gap-1" onClick={handleBrowseToys}>
              <Gift className="w-5 h-5" />
              <span className="text-xs">Browse Toys</span>
            </Button>
            <Button variant="outline" className="h-14 flex-col gap-1" onClick={handleTrackOrder}>
              <Truck className="w-5 h-5" />
              <span className="text-xs">Track Order</span>
            </Button>
            <Button variant="outline" className="h-14 flex-col gap-1" onClick={handleWishlist}>
              <Heart className="w-5 h-5" />
              <span className="text-xs">Wishlist</span>
            </Button>
            <Button variant="outline" className="h-14 flex-col gap-1" onClick={handleSupport}>
              <Phone className="w-5 h-5" />
              <span className="text-xs">Support</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="current" className="flex flex-col items-center gap-1 py-2">
            <Package className="w-4 h-4" />
            <span className="text-xs">Current</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex flex-col items-center gap-1 py-2">
            <History className="w-4 h-4" />
            <span className="text-xs">History</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex flex-col items-center gap-1 py-2">
            <User className="w-4 h-4" />
            <span className="text-xs">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {currentOrder ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Current Toys</CardTitle>
                <p className="text-sm text-gray-600">Cycle #{currentOrder.cycle_number}</p>
              </CardHeader>
              <CardContent>
                {currentOrder.toys_data && currentOrder.toys_data.length > 0 ? (
                  <div className="space-y-3">
                    {currentOrder.toys_data.map((toy: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{toy.name || `Toy ${index + 1}`}</h4>
                          <p className="text-xs text-gray-600">{toy.category || 'Educational'}</p>
                          <p className="text-xs text-gray-500">Age: {toy.age_range || '3-5 years'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No toys data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-6">
                <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No active cycle found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Order History</CardTitle>
              <p className="text-sm text-gray-600">{totalOrders} total cycles</p>
            </CardHeader>
            <CardContent>
              {orders.length > 0 ? (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="font-bold text-blue-600 text-xs">#{order.cycle_number}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{order.order_number}</p>
                          <p className="text-xs text-gray-600">
                            {format(new Date(order.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <History className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No order history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Name</p>
                    <p className="font-medium text-sm">
                      {shippingInfo?.name || userProfile?.first_name} {shippingInfo?.last_name || userProfile?.last_name}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Phone</p>
                    <p className="font-medium text-sm">{shippingInfo?.phone || userProfile?.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Award className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-600">Plan</p>
                    <p className="font-medium text-sm">{plan}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  Edit Profile
                </Button>
                
                {/* Admin Panel Access Button */}
                {isAdmin && (
                  <Button 
                    variant="default" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    onClick={() => navigate('/admin')}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Access Admin Panel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MobileDashboard; 