import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExitIntentAdminService, type ExitIntentConfig, type ExitIntentAnalytics } from '@/services/exitIntentAdminService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  MousePointer, 
  Smartphone, 
  TrendingUp, 
  Users, 
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  Target,
  Clock,
  Percent,
  Gift,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Calendar,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

// ================================================================================================
// TYPESCRIPT INTERFACES
// ================================================================================================

interface ExitIntentAnalytics {
  total_popup_shows: number;
  total_claims: number;
  total_conversions: number;
  claim_rate: number;
  conversion_rate: number;
  total_discount_given: number;
  revenue_generated: number;
  avg_discount_per_user: number;
  top_pages: Array<{
    page: string;
    shows: number;
    claims: number;
    conversions: number;
    claim_rate: number;
  }>;
  device_breakdown: Array<{
    device: string;
    shows: number;
    claims: number;
    claim_rate: number;
  }>;
  time_series: Array<{
    date: string;
    shows: number;
    claims: number;
    conversions: number;
  }>;
}

interface ExitIntentConfig {
  id: string;
  is_enabled: boolean;
  sensitivity: number;
  delay_ms: number;
  cookie_expiry_hours: number;
  show_on_mobile: boolean;
  aggressive_mode: boolean;
  min_time_on_page: number;
  max_shows_per_session: number;
  enabled_pages: string[];
  disabled_pages: string[];
  user_type_restrictions: string[];
  discount_codes: string[];
  updated_at: string;
}

interface PopupPerformance {
  page: string;
  total_views: number;
  popup_shows: number;
  claims: number;
  conversions: number;
  show_rate: number;
  claim_rate: number;
  conversion_rate: number;
  revenue_impact: number;
}

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

const ExitIntentManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [dateRange, setDateRange] = useState('7'); // days
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string>('all');

  // Configuration state
  const [config, setConfig] = useState<Partial<ExitIntentConfig>>({
    is_enabled: true,
    sensitivity: 20,
    delay_ms: 100,
    cookie_expiry_hours: 24,
    show_on_mobile: true,
    aggressive_mode: false,
    min_time_on_page: 30,
    max_shows_per_session: 1,
    enabled_pages: ['/', '/pricing', '/subscription-flow', '/select-toys', '/about'],
    disabled_pages: ['/auth', '/dashboard', '/admin', '/confirmation-success'],
    user_type_restrictions: ['guest', 'authenticated'],
    discount_codes: ['SAVE20EXIT', 'MOBILE20', 'WELCOME20']
  });

  // ================================================================================================
  // DATA FETCHING
  // ================================================================================================

  // Fetch exit-intent analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['exit-intent-analytics', dateRange],
    queryFn: async (): Promise<ExitIntentAnalytics> => {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();
      
      return await ExitIntentAdminService.getAnalytics(startDate, endDate);
    }
  });

  // Fetch page performance data
  const { data: pagePerformance, isLoading: pageLoading } = useQuery({
    queryKey: ['exit-intent-page-performance', dateRange],
    queryFn: async (): Promise<PopupPerformance[]> => {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      // This would need to be implemented based on your page view tracking
      // For now, return mock data
      return [
        {
          page: '/',
          total_views: 1500,
          popup_shows: 150,
          claims: 45,
          conversions: 12,
          show_rate: 10,
          claim_rate: 30,
          conversion_rate: 26.7,
          revenue_impact: 15600
        },
        {
          page: '/pricing',
          total_views: 800,
          popup_shows: 120,
          claims: 38,
          conversions: 15,
          show_rate: 15,
          claim_rate: 31.7,
          conversion_rate: 39.5,
          revenue_impact: 19500
        },
        {
          page: '/subscription-flow',
          total_views: 600,
          popup_shows: 90,
          claims: 35,
          conversions: 18,
          show_rate: 15,
          claim_rate: 38.9,
          conversion_rate: 51.4,
          revenue_impact: 23400
        }
      ];
    }
  });

  // ================================================================================================
  // MUTATIONS
  // ================================================================================================

  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig: Partial<ExitIntentConfig>) => {
      const success = await ExitIntentAdminService.updateConfiguration(newConfig);
      if (!success) {
        throw new Error('Failed to update configuration');
      }
      return newConfig;
    },
    onSuccess: () => {
      toast.success('Exit-intent configuration updated successfully');
      setShowConfigDialog(false);
      queryClient.invalidateQueries({ queryKey: ['exit-intent-analytics'] });
    },
    onError: (error) => {
      console.error('Error updating configuration:', error);
      toast.error('Failed to update configuration');
    }
  });

  // ================================================================================================
  // HANDLERS
  // ================================================================================================

  const handleConfigSave = () => {
    updateConfigMutation.mutate(config);
  };

  const handleResetAnalytics = async () => {
    try {
      const success = await ExitIntentAdminService.clearAnalyticsData();
      if (success) {
        toast.success('Analytics data reset successfully');
        queryClient.invalidateQueries({ queryKey: ['exit-intent-analytics'] });
      } else {
        toast.error('Failed to reset analytics data');
      }
    } catch (error) {
      console.error('Error resetting analytics:', error);
      toast.error('Failed to reset analytics data');
    }
  };

  const exportAnalytics = () => {
    if (!analytics) return;

    const csvContent = ExitIntentAdminService.exportAnalyticsToCSV(analytics);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exit-intent-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ================================================================================================
  // RENDER
  // ================================================================================================

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Promo Header Banner Manager</h2>
          <p className="text-muted-foreground">
            Monitor and control promo header banner performance and settings (Simplified Exit-Intent)
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Simplified Approach Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <AlertCircle className="h-5 w-5" />
            Simplified Exit-Intent System
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <p className="mb-2">
            <strong>New Approach:</strong> Instead of a complex popup, we now show a simple promo banner in the header.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Global Coverage:</strong> Works on ALL pages (homepage, pricing, auth, etc.)</li>
            <li><strong>Desktop:</strong> Banner appears when mouse moves toward top of page (exit-intent)</li>
            <li><strong>Mobile:</strong> Banner appears after 20 seconds of inactivity</li>
            <li><strong>User Targeting:</strong> Only shows to new users (not signed in)</li>
            <li><strong>User Experience:</strong> Users copy the promo code and paste it during checkout</li>
            <li><strong>Performance:</strong> Much lighter and faster than popup system</li>
          </ul>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Banner Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  config.is_enabled ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="font-medium">
                  {config.is_enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <Badge variant="outline">
                {config.discount_codes?.length || 0} Active Codes
              </Badge>
              <Badge variant="outline">
                {config.enabled_pages?.length || 0} Target Pages
              </Badge>
            </div>
            <Switch
              checked={config.is_enabled}
              onCheckedChange={(enabled) => setConfig(prev => ({ ...prev, is_enabled: enabled }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="performance">Page Performance</TabsTrigger>
          <TabsTrigger value="devices">Device Breakdown</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Popup Shows</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.total_popup_shows || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total exit-intent triggers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Claims</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.total_claims || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.claim_rate.toFixed(1) || 0}% claim rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.total_conversions || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.conversion_rate.toFixed(1) || 0}% conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Impact</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{analytics?.revenue_generated.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  ₹{analytics?.total_discount_given.toLocaleString() || 0} in discounts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
              <CardDescription>Pages with highest exit-intent popup engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.top_pages.map((page, index) => (
                  <div key={page.page} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{page.page}</div>
                        <div className="text-sm text-muted-foreground">
                          {page.shows} shows • {page.claims} claims
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{page.claim_rate.toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">claim rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Page Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Performance Analysis</CardTitle>
              <CardDescription>Detailed performance metrics by page</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pagePerformance?.map((page) => (
                  <div key={page.page} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{page.page}</h4>
                      <Badge variant="outline">₹{page.revenue_impact.toLocaleString()}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Views</div>
                        <div className="font-medium">{page.total_views.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Show Rate</div>
                        <div className="font-medium">{page.show_rate}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Claim Rate</div>
                        <div className="font-medium">{page.claim_rate}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Conversion Rate</div>
                        <div className="font-medium">{page.conversion_rate}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Breakdown Tab */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Performance</CardTitle>
              <CardDescription>Exit-intent popup performance by device type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.device_breakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ device, claim_rate }) => `${device}: ${claim_rate.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="shows"
                    >
                      {analytics?.device_breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 120}, 70%, 50%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Timeline</CardTitle>
              <CardDescription>Exit-intent popup performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics?.time_series}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="shows" stroke="#8884d8" name="Shows" />
                    <Line type="monotone" dataKey="claims" stroke="#82ca9d" name="Claims" />
                    <Line type="monotone" dataKey="conversions" stroke="#ffc658" name="Conversions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exit-Intent Configuration</DialogTitle>
            <DialogDescription>
              Configure exit-intent popup behavior and targeting settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Basic Settings</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sensitivity">Sensitivity (px)</Label>
                  <Input
                    id="sensitivity"
                    type="number"
                    value={config.sensitivity}
                    onChange={(e) => setConfig(prev => ({ ...prev, sensitivity: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="delay">Delay (ms)</Label>
                  <Input
                    id="delay"
                    type="number"
                    value={config.delay_ms}
                    onChange={(e) => setConfig(prev => ({ ...prev, delay_ms: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minTime">Min Time on Page (seconds)</Label>
                  <Input
                    id="minTime"
                    type="number"
                    value={config.min_time_on_page}
                    onChange={(e) => setConfig(prev => ({ ...prev, min_time_on_page: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label htmlFor="cookieExpiry">Cookie Expiry (hours)</Label>
                  <Input
                    id="cookieExpiry"
                    type="number"
                    value={config.cookie_expiry_hours}
                    onChange={(e) => setConfig(prev => ({ ...prev, cookie_expiry_hours: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="mobile"
                    checked={config.show_on_mobile}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, show_on_mobile: checked }))}
                  />
                  <Label htmlFor="mobile">Show on Mobile</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="aggressive"
                    checked={config.aggressive_mode}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aggressive_mode: checked }))}
                  />
                  <Label htmlFor="aggressive">Aggressive Mode</Label>
                </div>
              </div>
            </div>

            {/* Page Targeting */}
            <div className="space-y-4">
              <h4 className="font-medium">Page Targeting</h4>
              
              <div>
                <Label>Enabled Pages (one per line)</Label>
                <textarea
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={4}
                  value={config.enabled_pages?.join('\n') || ''}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    enabled_pages: e.target.value.split('\n').filter(Boolean) 
                  }))}
                />
              </div>

              <div>
                <Label>Disabled Pages (one per line)</Label>
                <textarea
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={3}
                  value={config.disabled_pages?.join('\n') || ''}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    disabled_pages: e.target.value.split('\n').filter(Boolean) 
                  }))}
                />
              </div>
            </div>

            {/* Discount Codes */}
            <div className="space-y-4">
              <h4 className="font-medium">Active Discount Codes</h4>
              <div>
                <Label>Discount Codes (one per line)</Label>
                <textarea
                  className="w-full mt-1 p-2 border rounded-md"
                  rows={3}
                  value={config.discount_codes?.join('\n') || ''}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    discount_codes: e.target.value.split('\n').filter(Boolean) 
                  }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfigSave} disabled={updateConfigMutation.isPending}>
              {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Analytics Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="text-red-600 hover:text-red-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Analytics
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Analytics Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all exit-intent popup analytics data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAnalytics} className="bg-red-600 hover:bg-red-700">
              Reset Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExitIntentManager;
