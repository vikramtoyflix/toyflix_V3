import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Image as ImageIcon,
  Database,
  Zap
} from 'lucide-react';

interface EgressStats {
  cachedEgress: {
    used: number;
    quota: number;
    percentage: number;
  };
  uncachedEgress: {
    used: number;
    quota: number;
    percentage: number;
  };
  estimatedCost: number;
  optimizationSavings: number;
}

interface OptimizationRecommendation {
  type: 'image' | 'query' | 'caching';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  implemented: boolean;
}

export const EgressMonitor: React.FC = () => {
  const [stats, setStats] = useState<EgressStats>({
    cachedEgress: { used: 2335.93, quota: 250, percentage: 934 },
    uncachedEgress: { used: 8.349, quota: 250, percentage: 3 },
    estimatedCost: 62.58, // (2335.93 - 250) * 0.03 + (8.349 - 0) * 0.09
    optimizationSavings: 0
  });

  const [recommendations] = useState<OptimizationRecommendation[]>([
    {
      type: 'image',
      title: 'Enable Image Transformations',
      description: 'Use Supabase image transformations to serve optimized WebP images at appropriate sizes',
      impact: 'high',
      implemented: true // We just implemented this
    },
    {
      type: 'image',
      title: 'Implement Lazy Loading',
      description: 'Load images only when they enter the viewport to reduce unnecessary requests',
      impact: 'medium',
      implemented: false
    },
    {
      type: 'caching',
      title: 'Add Browser Caching Headers',
      description: 'Configure longer cache headers for static assets to reduce repeat requests',
      impact: 'medium',
      implemented: false
    },
    {
      type: 'query',
      title: 'Optimize Database Queries',
      description: 'Reduce the number of fields returned in image-heavy queries',
      impact: 'low',
      implemented: false
    }
  ]);

  const getStatusColor = (percentage: number) => {
    if (percentage > 100) return 'destructive';
    if (percentage > 80) return 'warning';
    return 'default';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const estimatedSavingsAfterOptimization = stats.cachedEgress.used * 0.7; // 70% reduction
  const projectedCost = Math.max(0, (stats.cachedEgress.used - estimatedSavingsAfterOptimization - 250) * 0.03);

  return (
    <div className="space-y-6">
      {/* Alert for over-quota usage */}
      {stats.cachedEgress.percentage > 100 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your cached egress usage is {stats.cachedEgress.percentage}% of quota. 
            Current overage cost: <strong>${stats.estimatedCost.toFixed(2)}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cached Egress</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.cachedEgress.used.toFixed(1)} GB
            </div>
            <p className="text-xs text-muted-foreground">
              of {stats.cachedEgress.quota} GB quota
            </p>
            <Progress 
              value={Math.min(stats.cachedEgress.percentage, 100)} 
              className="mt-2"
            />
            <Badge 
              variant={getStatusColor(stats.cachedEgress.percentage)}
              className="mt-2"
            >
              {stats.cachedEgress.percentage}% used
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uncached Egress</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.uncachedEgress.used.toFixed(1)} GB
            </div>
            <p className="text-xs text-muted-foreground">
              of {stats.uncachedEgress.quota} GB quota
            </p>
            <Progress 
              value={stats.uncachedEgress.percentage} 
              className="mt-2"
            />
            <Badge variant="default" className="mt-2">
              {stats.uncachedEgress.percentage}% used
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Cost Projection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Cost Optimization Impact
          </CardTitle>
          <CardDescription>
            Projected savings from image optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                ${stats.estimatedCost.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Current overage cost</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                ${projectedCost.toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">After optimization</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${(stats.estimatedCost - projectedCost).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground">Monthly savings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimization Recommendations
          </CardTitle>
          <CardDescription>
            Actions to reduce egress usage and costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{rec.title}</h4>
                    <Badge variant={getImpactColor(rec.impact)}>
                      {rec.impact} impact
                    </Badge>
                    {rec.implemented && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Implemented
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
                {!rec.implemented && (
                  <Button variant="outline" size="sm">
                    Implement
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Immediate steps to reduce egress usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start">
              <Database className="h-4 w-4 mr-2" />
              Run Image URL Migration
            </Button>
            <Button variant="outline" className="justify-start">
              <ImageIcon className="h-4 w-4 mr-2" />
              Enable Lazy Loading
            </Button>
            <Button variant="outline" className="justify-start">
              <TrendingDown className="h-4 w-4 mr-2" />
              Analyze Top Requests
            </Button>
            <Button variant="outline" className="justify-start">
              <Zap className="h-4 w-4 mr-2" />
              Configure CDN Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
