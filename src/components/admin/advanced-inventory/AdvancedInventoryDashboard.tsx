import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  ShoppingCart,
  RefreshCw,
  Plus
} from 'lucide-react';
import { 
  useInventorySummary, 
  useStockAlerts, 
  usePurchaseOrders,
  useReorderRecommendations,
  useGenerateAutoPurchaseOrders
} from '@/hooks/useAdvancedInventory';
import { useToast } from '@/hooks/use-toast';
import { BulkSelectionProvider } from '@/components/admin/bulk/BulkSelectionProvider';
import { InventoryStatsCards } from './InventoryStatsCards';
import { StockAlertsPanel } from './StockAlertsPanel';
import { PurchaseOrdersPanel } from './PurchaseOrdersPanel';
import { ReorderRecommendationsPanel } from './ReorderRecommendationsPanel';
import { AdvancedToyManagementPanel } from './AdvancedToyManagementPanel';
import { InventoryAnalyticsPanel } from './InventoryAnalyticsPanel';

interface AdvancedInventoryDashboardProps {
  className?: string;
}

const AdvancedInventoryDashboardContent: React.FC<AdvancedInventoryDashboardProps> = ({
  className
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Leads UI state
  const [leadsSource, setLeadsSource] = useState<'leads' | 'meta_ads_leads'>('leads');
  type LeadsRow = Record<string, unknown>;
  const [leadsRows, setLeadsRows] = useState<LeadsRow[]>([]);
  const [leadsTotal, setLeadsTotal] = useState<number | null>(null);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsPageSize, setLeadsPageSize] = useState(50);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const leadsColumns = useMemo(() => {
    if (!leadsRows || leadsRows.length === 0) return [] as string[];
    // Prefer stable ordering: created_at first if present, then others
    const keys = Object.keys(leadsRows[0] || {});
    const preferred = ['created_at', 'id', 'name', 'email', 'phone', 'city', 'source', 'utm_source', 'utm_campaign'];
    const ordered: string[] = [];
    preferred.forEach((k) => {
      if (keys.includes(k)) ordered.push(k);
    });
    keys.forEach((k) => {
      if (!ordered.includes(k)) ordered.push(k);
    });
    // Avoid dumping huge objects by default columns (they will still render if present)
    return ordered.slice(0, 12);
  }, [leadsRows]);

  const fetchLeads = async () => {
    try {
      setLeadsLoading(true);
      setLeadsError(null);

      const params = new URLSearchParams({
        source: leadsSource,
        page: String(leadsPage),
        pageSize: String(leadsPageSize),
        q: leadsSearch.trim(),
      });

      const resp = await fetch(`/api/admin/leads?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Failed to fetch ${leadsSource}`);
      }

      const json = await resp.json();
      setLeadsRows(Array.isArray(json.data) ? json.data : []);
      setLeadsTotal(typeof json.count === 'number' ? json.count : null);
    } catch (e: unknown) {
      setLeadsRows([]);
      setLeadsTotal(null);
      const msg = e instanceof Error ? e.message : 'Failed to load leads';
      setLeadsError(msg);
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'leads') return;
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, leadsSource, leadsPage, leadsPageSize]);
  
  // Data hooks
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useInventorySummary();
  const { data: stockAlerts, isLoading: alertsLoading } = useStockAlerts();
  const { data: purchaseOrders, isLoading: ordersLoading } = usePurchaseOrders();
  const { data: reorderRecommendations, isLoading: recommendationsLoading } = useReorderRecommendations();
  
  // Mutations
  const generateAutoPO = useGenerateAutoPurchaseOrders();

  const handleRefreshAll = async () => {
    try {
      await refetchSummary();
      toast({ title: 'Success', description: 'Dashboard refreshed successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to refresh dashboard', variant: 'destructive' });
    }
  };

  const handleGenerateAutoPO = async () => {
    try {
      await generateAutoPO.mutateAsync();
    } catch (error) {
      console.error('Failed to generate auto PO:', error);
    }
  };

  const isLoading = summaryLoading || alertsLoading || ordersLoading || recommendationsLoading;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Inventory Management</h1>
          <p className="text-muted-foreground">
            Comprehensive inventory control with analytics and automation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshAll}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleGenerateAutoPO}
            disabled={generateAutoPO.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Auto Generate PO
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <InventoryStatsCards 
        summary={summary} 
        isLoading={summaryLoading}
        stockAlerts={stockAlerts?.length || 0}
        pendingOrders={purchaseOrders?.filter(po => po.status === 'pending').length || 0}
      />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="toys">Toy Management</TabsTrigger>
          <TabsTrigger value="alerts">
            <div className="flex items-center gap-2">
              Stock Alerts
              {stockAlerts && stockAlerts.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {stockAlerts.length}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Stock Alerts */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Recent Stock Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {stockAlerts && stockAlerts.length > 0 ? (
                  <div className="space-y-2">
                    {stockAlerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{alert.toy?.name}</span>
                        <Badge 
                          variant={alert.alert_type === 'out_of_stock' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {alert.alert_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                    {stockAlerts.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{stockAlerts.length - 5} more alerts
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No active stock alerts</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Purchase Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">Recent Purchase Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {purchaseOrders && purchaseOrders.length > 0 ? (
                  <div className="space-y-2">
                    {purchaseOrders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">{order.order_number}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            ₹{order.total_amount.toLocaleString()}
                          </span>
                          <Badge 
                            variant={order.status === 'pending' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {purchaseOrders.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{purchaseOrders.length - 5} more orders
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent purchase orders</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reorder Recommendations Preview */}
          {reorderRecommendations && reorderRecommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Reorder Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reorderRecommendations.slice(0, 3).map((recommendation) => (
                    <div key={recommendation.toyId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{recommendation.toyName}</p>
                        <p className="text-sm text-muted-foreground">
                          Current stock: {recommendation.currentStock} | 
                          Recommended: {recommendation.recommendedOrderQuantity}
                        </p>
                      </div>
                      <Badge variant={recommendation.urgency === 'high' ? 'destructive' : 'secondary'}>
                        {recommendation.urgency} priority
                      </Badge>
                    </div>
                  ))}
                  {reorderRecommendations.length > 3 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('recommendations')}
                      className="w-full"
                    >
                      View All {reorderRecommendations.length} Recommendations
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Advanced Toy Management Tab */}
        <TabsContent value="toys">
          <AdvancedToyManagementPanel />
        </TabsContent>

        {/* Stock Alerts Tab */}
        <TabsContent value="alerts">
          <StockAlertsPanel alerts={stockAlerts} isLoading={alertsLoading} />
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders">
          <PurchaseOrdersPanel orders={purchaseOrders} isLoading={ordersLoading} />
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <ReorderRecommendationsPanel 
            recommendations={reorderRecommendations} 
            isLoading={recommendationsLoading} 
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <InventoryAnalyticsPanel />
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-medium">Leads</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View website leads and Meta leads (admin-only)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={leadsSource === 'leads' ? 'default' : 'outline'}
                  onClick={() => {
                    setLeadsSource('leads');
                    setLeadsPage(1);
                  }}
                >
                  Website Leads
                </Button>
                <Button
                  variant={leadsSource === 'meta_ads_leads' ? 'default' : 'outline'}
                  onClick={() => {
                    setLeadsSource('meta_ads_leads');
                    setLeadsPage(1);
                  }}
                >
                  Meta Leads
                </Button>
                <Button variant="outline" onClick={fetchLeads} disabled={leadsLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${leadsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <input
                    className="h-9 w-80 max-w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    placeholder="Search (name/phone/email/city)"
                    value={leadsSearch}
                    onChange={(e) => setLeadsSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setLeadsPage(1);
                        fetchLeads();
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLeadsPage(1);
                      fetchLeads();
                    }}
                    disabled={leadsLoading}
                  >
                    Search
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {leadsTotal !== null ? `${leadsTotal.toLocaleString()} total` : ''}
                  </span>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={leadsPageSize}
                    onChange={(e) => {
                      setLeadsPageSize(parseInt(e.target.value, 10));
                      setLeadsPage(1);
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}
                    disabled={leadsLoading || leadsPage <= 1}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLeadsPage((p) => p + 1)}
                    disabled={leadsLoading || (leadsRows?.length || 0) < leadsPageSize}
                  >
                    Next
                  </Button>
                  <Badge variant="secondary" className="text-xs">Page {leadsPage}</Badge>
                </div>
              </div>

              {leadsError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <p className="font-medium text-destructive">Couldn’t load leads</p>
                  <p className="text-muted-foreground">
                    {leadsError}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This UI calls <code className="px-1">/api/admin/leads</code>. If that endpoint isn’t implemented yet, you’ll see this error.
                  </p>
                </div>
              )}

              <div className="w-full overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {leadsColumns.map((col) => (
                        <th key={col} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leadsLoading ? (
                      <tr>
                        <td className="px-3 py-4 text-muted-foreground" colSpan={Math.max(1, leadsColumns.length)}>
                          Loading…
                        </td>
                      </tr>
                    ) : leadsRows && leadsRows.length > 0 ? (
                      leadsRows.map((row, idx) => (
                        <tr key={(row['id'] as string | number | undefined) ?? idx} className="border-t">
                          {leadsColumns.map((col) => (
                            <td key={col} className="whitespace-nowrap px-3 py-2">
                          {(() => {
                            const v = row?.[col];
                            if (v === null || v === undefined) return '';
                            if (typeof v === 'object') return JSON.stringify(v);
                            return String(v);
                          })()}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-4 text-muted-foreground" colSpan={Math.max(1, leadsColumns.length)}>
                          No leads found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Main component wrapped with BulkSelectionProvider
export const AdvancedInventoryDashboard: React.FC<AdvancedInventoryDashboardProps> = (props) => {
  return (
    <BulkSelectionProvider>
      <AdvancedInventoryDashboardContent {...props} />
    </BulkSelectionProvider>
  );
}; 