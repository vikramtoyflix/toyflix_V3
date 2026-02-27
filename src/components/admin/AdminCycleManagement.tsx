import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CycleIntegrationService, type CycleInfo } from '@/services/cycleIntegrationService';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, Settings, Clock, Package, CheckCircle } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  subscription_plan?: string;
}

interface CycleStatus {
  user: UserProfile | null;
  cycle: CycleInfo | null;
  canUpdate: boolean;
  reason?: string;
  isLoading: boolean;
}

const AdminCycleManagement = () => {
  const { toast } = useToast();
  const [searchEmail, setSearchEmail] = useState('');
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>({
    user: null,
    cycle: null,
    canUpdate: false,
    isLoading: false
  });
  const [isSearching, setIsSearching] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  const searchUser = async () => {
    if (!searchEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a user email to search",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    setCycleStatus(prev => ({ ...prev, isLoading: true }));

    try {
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('custom_users')
        .select('id, email, first_name, last_name, subscription_plan')
        .eq('email', searchEmail.trim().toLowerCase())
        .single();

      if (userError || !user) {
        throw new Error(`User not found: ${userError?.message || 'Invalid email'}`);
      }

      // Get cycle status
      const cycleData = await CycleIntegrationService.canUserUpdateCycle(user.id);

      setCycleStatus({
        user: user as UserProfile,
        cycle: cycleData.currentCycle,
        canUpdate: cycleData.canUpdate,
        reason: cycleData.reason,
        isLoading: false
      });

      toast({
        title: "User Found",
        description: `Found ${user.first_name || user.email}`,
      });

    } catch (error: any) {
      console.error('Error searching user:', error);
      setCycleStatus({
        user: null,
        cycle: null,
        canUpdate: false,
        reason: error.message,
        isLoading: false
      });
      
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const enableCycleUpdate = async () => {
    if (!cycleStatus.cycle || !cycleStatus.user) {
      toast({
        title: "No Cycle Found",
        description: "Please search for a user first",
        variant: "destructive"
      });
      return;
    }

    setIsEnabling(true);
    try {
      await CycleIntegrationService.enableCycleUpdate(
        cycleStatus.cycle.cycle_id,
        'admin-user',
        'Manual admin override for cycle update'
      );

      // Refresh cycle status
      const refreshedData = await CycleIntegrationService.canUserUpdateCycle(cycleStatus.user.id);
      
      setCycleStatus(prev => ({
        ...prev,
        cycle: refreshedData.currentCycle,
        canUpdate: refreshedData.canUpdate,
        reason: refreshedData.reason
      }));

      toast({
        title: "Cycle Update Enabled",
        description: "User can now update their cycle toys",
      });

    } catch (error: any) {
      console.error('Error enabling cycle update:', error);
      toast({
        title: "Failed to Enable Update",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsEnabling(false);
    }
  };

  const refreshCycleStatus = async () => {
    if (!cycleStatus.user) return;

    setCycleStatus(prev => ({ ...prev, isLoading: true }));
    
    try {
      const refreshedData = await CycleIntegrationService.canUserUpdateCycle(cycleStatus.user.id);
      
      setCycleStatus(prev => ({
        ...prev,
        cycle: refreshedData.currentCycle,
        canUpdate: refreshedData.canUpdate,
        reason: refreshedData.reason,
        isLoading: false
      }));

    } catch (error: any) {
      console.error('Error refreshing cycle status:', error);
      setCycleStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Cycle Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User Search */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Search User by Email</label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              />
              <Button 
                onClick={searchUser} 
                disabled={isSearching}
                className="px-6"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* User Information */}
          {cycleStatus.user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-900">
                    {cycleStatus.user.first_name || cycleStatus.user.last_name 
                      ? `${cycleStatus.user.first_name || ''} ${cycleStatus.user.last_name || ''}`.trim()
                      : cycleStatus.user.email}
                  </h3>
                  <p className="text-sm text-blue-700">{cycleStatus.user.email}</p>
                  {cycleStatus.user.subscription_plan && (
                    <Badge variant="outline" className="mt-1">
                      {cycleStatus.user.subscription_plan}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cycle Status */}
          {cycleStatus.user && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Current Cycle Status
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={refreshCycleStatus}
                    disabled={cycleStatus.isLoading}
                  >
                    {cycleStatus.isLoading ? (
                      <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Refresh'
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cycleStatus.cycle ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Cycle ID</label>
                        <p className="text-sm font-mono break-all">{cycleStatus.cycle.cycle_id}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Cycle Number</label>
                        <p className="text-sm">#{cycleStatus.cycle.cycle_number}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Plan</label>
                        <p className="text-sm">{cycleStatus.cycle.plan_name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Toys Selected</label>
                        <p className="text-sm">{cycleStatus.cycle.toys_count} toys</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600">Cycle Status</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={cycleStatus.cycle.cycle_status === 'active' ? 'default' : 'secondary'}
                        >
                          {cycleStatus.cycle.cycle_status}
                        </Badge>
                        {cycleStatus.cycle.is_simulation && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Simulation Mode
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600">Can Update Toys</label>
                      <div className="flex items-center gap-2 mt-1">
                        {cycleStatus.canUpdate ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="w-3 h-3 mr-1" />
                            No
                          </Badge>
                        )}
                        {cycleStatus.reason && (
                          <span className="text-xs text-gray-600">({cycleStatus.reason})</span>
                        )}
                      </div>
                    </div>

                    {/* Admin Actions */}
                    <div className="pt-3 border-t">
                      <label className="text-xs font-medium text-gray-600 mb-2 block">Admin Actions</label>
                      <div className="flex gap-2">
                        {!cycleStatus.canUpdate && (
                          <Button 
                            onClick={enableCycleUpdate}
                            disabled={isEnabling}
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            {isEnabling ? 'Enabling...' : 'Enable Cycle Update'}
                          </Button>
                        )}
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/dashboard?user=${cycleStatus.user?.id}`, '_blank')}
                        >
                          View User Dashboard
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No active cycle found</p>
                    {cycleStatus.reason && (
                      <p className="text-sm text-gray-500 mt-1">{cycleStatus.reason}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">How to Use</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Enter a user's email address and click Search</li>
              <li>View their current cycle status and toy selection eligibility</li>
              <li>If needed, enable cycle updates to allow toy selection</li>
              <li>User can then select toys in their dashboard</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCycleManagement; 