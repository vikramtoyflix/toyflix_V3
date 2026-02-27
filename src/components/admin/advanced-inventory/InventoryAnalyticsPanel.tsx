import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Package,
  Users
} from 'lucide-react';

export const InventoryAnalyticsPanel: React.FC = () => {
  // Mock data for demonstration
  const mockAnalytics = {
    totalInventoryValue: 125000,
    turnoverRate: 3.2,
    topPerformingToys: [
      { name: 'Building Blocks Set', rentals: 45, revenue: 13500 },
      { name: 'Musical Piano Toy', rentals: 38, revenue: 11400 },
      { name: 'Educational Puzzle', rentals: 32, revenue: 9600 },
    ],
    ageGroupPerformance: {
      '6m-2 years': { totalToys: 25, utilization: 78, revenue: 23400 },
      '2-3 years': { totalToys: 32, utilization: 85, revenue: 34200 },
      '3-4 years': { totalToys: 28, utilization: 72, revenue: 28800 },
      '4-6 years': { totalToys: 35, utilization: 68, revenue: 31500 },
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Inventory Turnover</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockAnalytics.turnoverRate}x
            </div>
            <p className="text-xs text-muted-foreground">
              Times per year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{mockAnalytics.totalInventoryValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Current inventory worth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Avg Utilization</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              76%
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all toys
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Toys */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Toys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAnalytics.topPerformingToys.map((toy, index) => (
              <div key={toy.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">#{index + 1}</Badge>
                  <div>
                    <h4 className="font-medium">{toy.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {toy.rentals} rentals this month
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">₹{toy.revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Age Group Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Age Group</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(mockAnalytics.ageGroupPerformance).map(([ageGroup, stats]) => (
              <div key={ageGroup} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{ageGroup}</h4>
                  <p className="text-sm text-muted-foreground">
                    {stats.totalToys} toys available
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-semibold">{stats.utilization}%</p>
                    <p className="text-xs text-muted-foreground">Utilization</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">₹{stats.revenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
            <p className="text-muted-foreground">
              Advanced analytics charts and insights will be available here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 