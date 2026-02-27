import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QueueStatus } from '@/services/nextCycleService';
import { Edit2, Trash2, Package, Star } from 'lucide-react';

interface QueuedToysDisplayProps {
  queuedToys: QueueStatus;
  canModify: boolean;
  onEdit: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}

export const QueuedToysDisplay = ({
  queuedToys,
  canModify,
  onEdit,
  onRemove,
  isRemoving
}: QueuedToysDisplayProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Keep pricing calculations for backend compatibility (don't display)
  const totalValue = queuedToys.toys.reduce((sum, toy) => sum + toy.total_price, 0);

  // Get category distribution for subscription insights
  const categoryCount = queuedToys.toys.reduce((acc, toy) => {
    acc[toy.category] = (acc[toy.category] || 0) + toy.quantity;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Queued Toys ({queuedToys.toyCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Queued {formatDate(queuedToys.queuedAt)}
              </Badge>
              {canModify && (
                <div className="flex gap-1">
                  <Button
                    onClick={onEdit}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={onRemove}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={isRemoving}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Toys List */}
          <div className="space-y-2">
            {queuedToys.toys.map((toy, index) => (
              <div
                key={toy.toy_id || index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {toy.image_url ? (
                    <img
                      src={toy.image_url}
                      alt={toy.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <p className="font-medium text-sm">{toy.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {toy.category}
                      </Badge>
                      {toy.quantity > 1 && (
                        <Badge variant="outline" className="text-xs px-1">
                          Qty: {toy.quantity}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Queued</span>
                </div>
              </div>
            ))}
          </div>

          {/* Category Summary - Replace pricing with category insights */}
          {Object.keys(categoryCount).length > 1 && (
            <div className="pt-2 border-t">
              <div className="text-sm font-medium mb-2">Category Mix</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(categoryCount).map(([category, count]) => (
                  <Badge key={category} variant="outline" className="text-xs">
                    {category}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Status Messages */}
          {!canModify && (
            <div className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded">
              ⚠️ Queue is being prepared for processing. Changes are no longer allowed.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 