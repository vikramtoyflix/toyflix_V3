import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingUp,
  RefreshCw,
  Database,
  UserCheck,
  Phone,
  FileText
} from 'lucide-react';
import DataValidationService from '@/services/dataValidationService';

const SignupFunnelMonitor: React.FC = () => {
  const [funnelHealth, setFunnelHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const loadFunnelHealth = async () => {
    try {
      setIsLoading(true);
      const health = await DataValidationService.getRealtimeFunnelStats();
      setFunnelHealth(health);
    } catch (error: any) {
      toast({
        title: "Failed to load funnel health",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runFixes = async () => {
    try {
      setIsFixing(true);
      const result = await DataValidationService.fixCommonIssues();
      
      if (result.success) {
        toast({
          title: "Fixes Applied Successfully! ✅",
          description: `Applied ${result.fixesApplied.length} fixes`,
          duration: 5000
        });
        
        // Reload data after fixes
        setTimeout(() => {
          loadFunnelHealth();
        }, 2000);
      } else {
        toast({
          title: "Some fixes failed",
          description: result.errors.join(', '),
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Fix operation failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  useEffect(() => {
    loadFunnelHealth();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(loadFunnelHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Signup Funnel Health...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Analyzing user data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!funnelHealth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Signup Funnel Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Failed to load funnel health data</p>
            <Button onClick={loadFunnelHealth} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthColor = (rate: number, type: 'verification' | 'completion' | 'visibility') => {
    const thresholds = {
      verification: { good: 85, warning: 70 },
      completion: { good: 75, warning: 60 },
      visibility: { good: 70, warning: 50 }
    };
    
    const threshold = thresholds[type];
    if (rate >= threshold.good) return 'text-green-600 bg-green-50';
    if (rate >= threshold.warning) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthIcon = (rate: number, type: 'verification' | 'completion' | 'visibility') => {
    const thresholds = {
      verification: { good: 85, warning: 70 },
      completion: { good: 75, warning: 60 },
      visibility: { good: 70, warning: 50 }
    };
    
    const threshold = thresholds[type];
    if (rate >= threshold.good) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (rate >= threshold.warning) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Signup Funnel Health Monitor</h2>
        <div className="flex gap-2">
          <Button 
            onClick={loadFunnelHealth} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={runFixes} 
            variant="default" 
            size="sm"
            disabled={isFixing}
          >
            <Database className={`w-4 h-4 mr-2 ${isFixing ? 'animate-spin' : ''}`} />
            {isFixing ? 'Applying Fixes...' : 'Run Fixes'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {funnelHealth.alerts && funnelHealth.alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Critical Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelHealth.alerts.map((alert: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-700">{alert}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Signups */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Signups (24h)</p>
                <p className="text-2xl font-bold text-gray-900">{funnelHealth.current.totalSignups}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Phone Verification Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Phone Verified</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{funnelHealth.current.phoneVerificationRate}%</p>
                  {getHealthIcon(funnelHealth.current.phoneVerificationRate, 'verification')}
                </div>
              </div>
              <Phone className="w-8 h-8 text-green-500" />
            </div>
            <Progress 
              value={funnelHealth.current.phoneVerificationRate} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Profile Completion Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Profile Complete</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{funnelHealth.current.profileCompletionRate}%</p>
                  {getHealthIcon(funnelHealth.current.profileCompletionRate, 'completion')}
                </div>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
            <Progress 
              value={funnelHealth.current.profileCompletionRate} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Admin Visibility Rate */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admin Visible</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-gray-900">{funnelHealth.current.adminVisibilityRate}%</p>
                  {getHealthIcon(funnelHealth.current.adminVisibilityRate, 'visibility')}
                </div>
              </div>
              <UserCheck className="w-8 h-8 text-orange-500" />
            </div>
            <Progress 
              value={funnelHealth.current.adminVisibilityRate} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Issues */}
      {funnelHealth.current.issues && funnelHealth.current.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Detected Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelHealth.current.issues.map((issue: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">{issue}</p>
                    {funnelHealth.current.recommendations[index] && (
                      <p className="text-sm text-yellow-700 mt-1">
                        Recommendation: {funnelHealth.current.recommendations[index]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Signup Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Last 24 Hours</p>
              <p className="text-xl font-bold text-blue-600">{funnelHealth.trends.last24h}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Last 7 Days</p>
              <p className="text-xl font-bold text-green-600">{funnelHealth.trends.last7d}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Last 30 Days</p>
              <p className="text-xl font-bold text-purple-600">{funnelHealth.trends.last30d}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={runFixes}
              disabled={isFixing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Database className="w-4 h-4 mr-2" />
              {isFixing ? 'Applying Fixes...' : 'Fix Verification Issues'}
            </Button>
            
            <Button 
              onClick={() => window.open('/admin', '_blank')}
              variant="outline"
            >
              <Users className="w-4 h-4 mr-2" />
              View User Management
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Recommended SQL Fixes:</h4>
            <div className="space-y-2 text-sm">
              <code className="block bg-white p-2 rounded border">
                SELECT * FROM fix_common_verification_issues();
              </code>
              <code className="block bg-white p-2 rounded border">
                SELECT * FROM check_verification_health();
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignupFunnelMonitor;
