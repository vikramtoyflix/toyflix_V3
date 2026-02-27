import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReorderRecommendation } from '@/types/inventory';

interface ReorderRecommendationsPanelProps {
  recommendations?: ReorderRecommendation[];
  isLoading: boolean;
}

export const ReorderRecommendationsPanel: React.FC<ReorderRecommendationsPanelProps> = ({
  recommendations,
  isLoading
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reorder Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading recommendations...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reorder Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations && recommendations.length > 0 ? (
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.toyId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{rec.toyName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Current: {rec.currentStock} • Recommended: {rec.recommendedOrderQuantity}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{rec.reasoning}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={rec.urgency === 'high' ? 'destructive' : 'secondary'}>
                    {rec.urgency}
                  </Badge>
                  <Button size="sm" variant="outline">
                    Order
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No reorder recommendations at this time.</p>
        )}
      </CardContent>
    </Card>
  );
}; 