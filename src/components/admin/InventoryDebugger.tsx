import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useInventoryDashboard } from '@/hooks/useInventoryManagement';

const InventoryDebugger: React.FC = () => {
  const { 
    data: dashboardData, 
    isLoading, 
    error,
    refetch
  } = useInventoryDashboard();

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Inventory System Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Loading State */}
          <div className="flex items-center space-x-2">
            <span>Loading State:</span>
            {isLoading ? (
              <div className="flex items-center space-x-1">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Loaded</span>
              </div>
            )}
          </div>

          {/* Error State */}
          <div className="flex items-center space-x-2">
            <span>Error State:</span>
            {error ? (
              <div className="flex items-center space-x-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Error: {error.message}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No Errors</span>
              </div>
            )}
          </div>

          {/* Data State */}
          <div className="space-y-2">
            <span>Data State:</span>
            {dashboardData ? (
              <div className="bg-gray-50 p-3 rounded-md">
                <div>✅ Dashboard Data Available</div>
                <div>📊 Inventory Items: {dashboardData.inventoryStatus?.length || 0}</div>
                <div>🚨 Alerts: {dashboardData.inventoryAlerts?.length || 0}</div>
                <div>📝 Recent Movements: {dashboardData.recentMovements?.length || 0}</div>
                <div>📈 Summary: {JSON.stringify(dashboardData.inventorySummary)}</div>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>No Data Available</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          {/* Raw Data Display */}
          {dashboardData && (
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Raw Data (Click to expand)</summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded-md text-xs overflow-auto max-h-96">
                {JSON.stringify(dashboardData, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryDebugger; 