import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  Database,
  FileText,
  Zap,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const InventoryAutomationManager: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [installationStatus, setInstallationStatus] = useState<'checking' | 'installed' | 'not_installed' | 'error'>('checking');

  const checkInstallationStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if the trigger function exists
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT 
            EXISTS(
              SELECT 1 FROM pg_proc 
              WHERE proname = 'handle_rental_order_inventory_automation'
            ) as function_exists,
            EXISTS(
              SELECT 1 FROM pg_trigger 
              WHERE tgname = 'trigger_rental_order_inventory_automation'
            ) as trigger_exists
        `
      });

      if (error) throw error;

      const result = data?.[0];
      if (result?.function_exists && result?.trigger_exists) {
        setInstallationStatus('installed');
        toast.success('Inventory automation is already installed and active');
      } else {
        setInstallationStatus('not_installed');
        toast.info('Inventory automation needs to be installed');
      }
    } catch (error: any) {
      console.error('Error checking installation status:', error);
      setInstallationStatus('error');
      toast.error(`Error checking status: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const installInventoryAutomation = async () => {
    try {
      setIsLoading(true);
      
      toast.info('Installing inventory automation system...');

      // Read and execute the SQL script
      const response = await fetch('/RENTAL_ORDERS_INVENTORY_AUTOMATION.sql');
      if (!response.ok) {
        throw new Error('Failed to load SQL script');
      }
      
      const sqlScript = await response.text();
      
      // Execute the SQL script
      const { error } = await supabase.rpc('exec_sql', {
        sql: sqlScript
      });

      if (error) {
        throw error;
      }

      setInstallationStatus('installed');
      toast.success('✅ Inventory automation installed successfully!');
      
    } catch (error: any) {
      console.error('Error installing inventory automation:', error);
      toast.error(`Installation failed: ${error.message}`);
      setInstallationStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const testInventorySystem = async () => {
    try {
      setIsLoading(true);
      
      // Run audit to check system health
      const { data, error } = await supabase.rpc('audit_rental_order_inventory');
      
      if (error) throw error;
      
      const discrepancies = data?.filter((item: any) => item.discrepancy_detected) || [];
      
      if (discrepancies.length === 0) {
        toast.success(`✅ Inventory system is healthy! Checked ${data?.length || 0} recent orders.`);
      } else {
        toast.warning(`⚠️ Found ${discrepancies.length} discrepancies in ${data?.length || 0} recent orders.`);
      }
      
    } catch (error: any) {
      console.error('Error testing inventory system:', error);
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    checkInstallationStatus();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Automation Manager</h1>
          <p className="text-muted-foreground">
            Manage automatic inventory deduction when orders are placed
          </p>
        </div>
        <Badge variant={installationStatus === 'installed' ? 'default' : 'secondary'}>
          {installationStatus === 'installed' ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              {installationStatus === 'installed' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              )}
              <div>
                <div className="font-medium">
                  {installationStatus === 'installed' ? 'Installed' : 'Not Installed'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Automation System
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Database className="h-8 w-8 text-blue-500" />
              <div>
                <div className="font-medium">Real-time Triggers</div>
                <div className="text-sm text-muted-foreground">
                  Order → Inventory
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <div className="font-medium">Audit Trail</div>
                <div className="text-sm text-muted-foreground">
                  Full movement tracking
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Automatic Deduction
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• When new orders are created</li>
                <li>• When orders are confirmed</li>
                <li>• Real-time inventory updates</li>
                <li>• Prevents overselling</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-blue-500" />
                Automatic Return
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• When orders are cancelled</li>
                <li>• When toys are returned</li>
                <li>• Restores inventory levels</li>
                <li>• Maintains accuracy</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>System Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={checkInstallationStatus}
              disabled={isLoading}
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Check Status
            </Button>

            {installationStatus === 'not_installed' && (
              <Button
                onClick={installInventoryAutomation}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-2" />
                Install Automation
              </Button>
            )}

            {installationStatus === 'installed' && (
              <Button
                onClick={testInventorySystem}
                disabled={isLoading}
                variant="outline"
              >
                <Database className="h-4 w-4 mr-2" />
                Test System
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">What happens when you install:</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Creates automatic triggers on rental_orders table</li>
                <li>• Inventory will be deducted when orders are placed/confirmed</li>
                <li>• Inventory will be returned when orders are cancelled/returned</li>
                <li>• All movements are logged for audit trail</li>
              </ul>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Safety features:</h4>
              <ul className="space-y-1 text-yellow-700">
                <li>• System prevents negative inventory</li>
                <li>• Warnings for insufficient stock</li>
                <li>• Manual correction functions available</li>
                <li>• Full audit and diagnostic tools</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryAutomationManager; 