import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Database, Clock, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface DatabaseHealthCheck {
  isConnected: boolean;
  tablesExist: boolean;
  adminAccess: boolean;
  lastUpdate: Date;
  errors: string[];
}

interface PerformanceMetrics {
  queryCount: number;
  averageQueryTime: number;
  lastQueryTime: number;
  cacheHitRate: number;
}

export const AdminConnectionStatus = ({ onForceRefresh }: { onForceRefresh?: () => void }) => {
  const [healthStatus, setHealthStatus] = useState<DatabaseHealthCheck>({
    isConnected: true,
    tablesExist: true,
    adminAccess: true,
    lastUpdate: new Date(),
    errors: []
  });
  const [isChecking, setIsChecking] = useState(false);
  const { user } = useCustomAuth();
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    queryCount: 0,
    averageQueryTime: 0,
    lastQueryTime: 0,
    cacheHitRate: 0
  });
  const { toast } = useToast();

  const performHealthCheck = async () => {
    setIsChecking(true);
    const errors: string[] = [];
    let isConnected = false;
    let tablesExist = false;
    let adminAccess = false;

    try {
      // Test basic connection
      const { error: connectionError } = await supabase.from('toys').select('id').limit(1);
      if (!connectionError) {
        isConnected = true;
      } else {
        errors.push(`Connection failed: ${connectionError.message}`);
      }

      // Test critical admin tables
      let allTablesExist = true;

      // Check each critical table explicitly to satisfy TypeScript
      try {
        const { error: usersError } = await supabase.from('custom_users').select('*').limit(1);
        if (usersError) {
          allTablesExist = false;
          errors.push(`Table custom_users not accessible: ${usersError.message}`);
        }
      } catch (err) {
        allTablesExist = false;
        errors.push('Table custom_users check failed');
      }

      try {
        const { error: toysError } = await supabase.from('toys').select('*').limit(1);
        if (toysError) {
          allTablesExist = false;
          errors.push(`Table toys not accessible: ${toysError.message}`);
        }
      } catch (err) {
        allTablesExist = false;
        errors.push('Table toys check failed');
      }

      try {
        const { error: settingsError } = await supabase.from('admin_settings').select('*').limit(1);
        if (settingsError) {
          allTablesExist = false;
          errors.push(`Table admin_settings not accessible: ${settingsError.message}`);
        }
      } catch (err) {
        allTablesExist = false;
        errors.push('Table admin_settings check failed');
      }

      tablesExist = allTablesExist;

      // Test admin access for current user
      if (user?.id) {
        try {
          const { data: roleData, error: roleError } = await supabase
            .rpc('get_user_role_secure', { user_id_param: user.id });
          
          if (!roleError && roleData === 'admin') {
            adminAccess = true;
          } else {
            errors.push(roleError ? `Role check failed: ${roleError.message}` : 'User is not admin');
          }
        } catch (err) {
          errors.push('Admin role verification failed');
        }
      }

      // Test admin_users_view existence
      try {
        const { error } = await supabase.from('admin_users_view').select('*').limit(1);
        if (error) {
          errors.push(`admin_users_view not accessible: ${error.message}`);
        }
      } catch (err) {
        errors.push('admin_users_view check failed');
      }

    } catch (error) {
      errors.push(`Health check failed: ${error}`);
    }

    setHealthStatus({
      isConnected,
      tablesExist,
      adminAccess,
      lastUpdate: new Date(),
      errors
    });
    setIsChecking(false);
  };

  useEffect(() => {
    // Perform initial health check
    performHealthCheck();

    // Perform health check every 30 seconds
    const interval = setInterval(performHealthCheck, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const handleForceRefresh = () => {
    performHealthCheck();
    onForceRefresh?.();
  };

  const getOverallStatus = () => {
    if (!healthStatus.isConnected) return { status: 'error', label: 'Disconnected', color: 'destructive' };
    if (!healthStatus.tablesExist) return { status: 'warning', label: 'DB Issues', color: 'destructive' };
    if (!healthStatus.adminAccess) return { status: 'warning', label: 'No Admin Access', color: 'secondary' };
    if (healthStatus.errors.length > 0) return { status: 'warning', label: 'Warnings', color: 'secondary' };
    return { status: 'healthy', label: 'Healthy', color: 'default' };
  };

  const overallStatus = getOverallStatus();

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const startTime = Date.now();
      const { data, error } = await supabase
        .from('toys')
        .select('count')
        .limit(1);
      
      const queryTime = Date.now() - startTime;
      
      if (error) {
        setHealthStatus(prev => ({
          ...prev,
          isConnected: false,
          errors: [...prev.errors, `Connection failed: ${error.message}`]
        }));
        toast({
          title: "Connection Error",
          description: "Failed to connect to database",
          variant: "destructive"
        });
      } else {
        setHealthStatus(prev => ({
          ...prev,
          isConnected: true,
          errors: prev.errors.filter(e => e !== "Connection failed: Connection failed")
        }));
        setHealthStatus(prev => ({
          ...prev,
          lastUpdate: new Date()
        }));
        
        // Update performance metrics
        setPerformanceMetrics(prev => ({
          queryCount: prev.queryCount + 1,
          averageQueryTime: (prev.averageQueryTime * prev.queryCount + queryTime) / (prev.queryCount + 1),
          lastQueryTime: queryTime,
          cacheHitRate: queryTime < 100 ? prev.cacheHitRate + 1 : prev.cacheHitRate
        }));
      }
    } catch (error) {
      setHealthStatus(prev => ({
        ...prev,
        isConnected: false,
        errors: [...prev.errors, `Connection check failed: ${error}`]
      }));
      console.error('Connection check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds instead of aggressive polling
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (healthStatus.isConnected === null) return 'bg-gray-100 text-gray-800';
    return healthStatus.isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusIcon = () => {
    if (healthStatus.isConnected === null) return <Clock className="w-4 h-4" />;
    return healthStatus.isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />;
  };

  const getPerformanceStatus = () => {
    if (performanceMetrics.averageQueryTime < 200) return 'excellent';
    if (performanceMetrics.averageQueryTime < 500) return 'good';
    if (performanceMetrics.averageQueryTime < 1000) return 'fair';
    return 'poor';
  };

  const getPerformanceColor = () => {
    const status = getPerformanceStatus();
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4" />
          System Status & Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">Database Connection</span>
          </div>
          <Badge className={getStatusColor()}>
            {healthStatus.isConnected === null ? 'Checking...' : healthStatus.isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Performance Metrics */}
        {performanceMetrics.queryCount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Query Performance</span>
              <Badge className={getPerformanceColor()}>
                {getPerformanceStatus().toUpperCase()}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Avg Query Time:</span>
                <span className="ml-1 font-medium">{performanceMetrics.averageQueryTime.toFixed(0)}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Last Query:</span>
                <span className="ml-1 font-medium">{performanceMetrics.lastQueryTime}ms</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Queries:</span>
                <span className="ml-1 font-medium">{performanceMetrics.queryCount}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cache Hit Rate:</span>
                <span className="ml-1 font-medium">
                  {performanceMetrics.queryCount > 0 
                    ? Math.round((performanceMetrics.cacheHitRate / performanceMetrics.queryCount) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Last Check Time */}
        {healthStatus.lastUpdate && (
          <div className="text-xs text-muted-foreground">
            Last checked: {healthStatus.lastUpdate.toLocaleTimeString()}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={checkConnection}
            disabled={isChecking}
            className="flex-1"
          >
            {isChecking ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Check Connection
          </Button>
          
          {onForceRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onForceRefresh}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              Force Refresh
            </Button>
          )}
        </div>

        {/* Performance Tips */}
        {performanceMetrics.averageQueryTime > 500 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Performance Notice:</strong> Query times are higher than optimal. 
              Consider reducing data load or implementing pagination.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
