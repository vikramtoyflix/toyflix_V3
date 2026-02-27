import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { User, Mail, Phone, MapPin, Calendar, CheckCircle } from 'lucide-react';

interface SupabaseUserProfileProps {
  userProfile: any;
  subscriptions?: any[];
  orders?: any[];
}

const SupabaseUserProfile = ({ userProfile, subscriptions = [], orders = [] }: SupabaseUserProfileProps) => {
  if (!userProfile) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No user profile data available</p>
        </CardContent>
      </Card>
    );
  }

  const hasActiveSubscription = subscriptions.some(sub => sub.status === 'active');
  const totalOrders = orders.length;
  
  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Profile
          </CardTitle>
          <CardDescription>
            Your account information and activity summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Personal Information</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">
                      {userProfile.first_name} {userProfile.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                  </div>
                </div>

                {userProfile.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{userProfile.email}</p>
                      <p className="text-xs text-muted-foreground">Email Address</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{userProfile.phone}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                      {userProfile.phone_verified && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm">
                      {format(new Date(userProfile.created_at), 'PPP')}
                    </p>
                    <p className="text-xs text-muted-foreground">Member Since</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Address & Location</h3>
              
              {userProfile.address_line1 || userProfile.city ? (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm space-y-1">
                      {userProfile.address_line1 && <p>{userProfile.address_line1}</p>}
                      {userProfile.address_line2 && <p>{userProfile.address_line2}</p>}
                      <p>
                        {userProfile.city}
                        {userProfile.state && `, ${userProfile.state}`}
                        {userProfile.zip_code && ` ${userProfile.zip_code}`}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Delivery Address</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Address not provided</strong>
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Add your delivery address to start ordering toys
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Account Activity</CardTitle>
          <CardDescription>
            Your subscription and order activity summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{subscriptions.length}</div>
              <div className="text-sm text-blue-800">Subscriptions</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">{totalOrders}</div>
              <div className="text-sm text-green-800">Total Orders</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {hasActiveSubscription ? '✓' : '−'}
              </div>
              <div className="text-sm text-purple-800">Active Plan</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">
                {userProfile.role || 'User'}
              </div>
              <div className="text-sm text-orange-800">Account Type</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>
              Your most recent toy rental orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orders.slice(0, 3).map((order, index) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), 'PPp')}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      ₹{order.total_amount}
                    </p>
                  </div>
                </div>
              ))}
              
              {orders.length > 3 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  and {orders.length - 3} more orders...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupabaseUserProfile; 