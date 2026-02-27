import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Package, 
  CheckCircle, 
  Clock,
  Search,
  Filter
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StockAlert } from '@/types/inventory';
import { useResolveStockAlert } from '@/hooks/useAdvancedInventory';
import { useToast } from '@/hooks/use-toast';

interface StockAlertsPanelProps {
  alerts?: StockAlert[];
  isLoading: boolean;
}

export const StockAlertsPanel: React.FC<StockAlertsPanelProps> = ({
  alerts,
  isLoading
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<StockAlert | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  
  const resolveAlert = useResolveStockAlert();

  const filteredAlerts = alerts?.filter(alert =>
    alert.toy?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.alert_type.includes(searchTerm.toLowerCase())
  ) || [];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'out_of_stock':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'low_stock':
        return <Package className="h-4 w-4 text-yellow-600" />;
      case 'reorder_needed':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'out_of_stock':
        return 'destructive';
      case 'low_stock':
        return 'secondary';
      case 'reorder_needed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleResolveAlert = (alert: StockAlert) => {
    setSelectedAlert(alert);
    setShowResolveDialog(true);
  };

  const confirmResolveAlert = async () => {
    if (!selectedAlert) return;

    try {
      await resolveAlert.mutateAsync({
        alertId: selectedAlert.id,
        notes: resolveNotes
      });
      setShowResolveDialog(false);
      setSelectedAlert(null);
      setResolveNotes('');
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stock Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stock Alerts</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Alerts</h3>
              <p className="text-muted-foreground">
                All your toys are properly stocked!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {getAlertIcon(alert.alert_type)}
                    <div>
                      <h4 className="font-medium">{alert.toy?.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Current: {alert.current_quantity}</span>
                        <span>•</span>
                        <span>Threshold: {alert.threshold_quantity}</span>
                        <span>•</span>
                        <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getAlertVariant(alert.alert_type)}>
                      {alert.alert_type.replace('_', ' ')}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveAlert(alert)}
                      disabled={resolveAlert.isPending}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Alert Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Stock Alert</DialogTitle>
            <DialogDescription>
              Mark this alert as resolved for: {selectedAlert?.toy?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Alert Details</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {selectedAlert && getAlertIcon(selectedAlert.alert_type)}
                  <Badge variant={selectedAlert ? getAlertVariant(selectedAlert.alert_type) : 'secondary'}>
                    {selectedAlert?.alert_type.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Current quantity: {selectedAlert?.current_quantity} | 
                  Threshold: {selectedAlert?.threshold_quantity}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Resolution Notes (Optional)</label>
              <Textarea
                placeholder="Describe how this alert was resolved..."
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResolveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmResolveAlert}
              disabled={resolveAlert.isPending}
            >
              {resolveAlert.isPending ? 'Resolving...' : 'Resolve Alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 