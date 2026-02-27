import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Bell, 
  BellOff, 
  CheckCircle, 
  Clock, 
  Mail, 
  MessageSquare, 
  Package, 
  RefreshCw,
  Settings,
  Smartphone,
  X,
  XCircle
} from 'lucide-react';
import { 
  useInventoryDashboard,
  useLowStockToys,
  useRecordInventoryMovement,
  InventoryAlert 
} from '@/hooks/useInventoryManagement';
import { toast } from 'sonner';
import { formatDistance } from 'date-fns';

interface AlertSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;
  lowStockThreshold: number;
  outOfStockAlerts: boolean;
  weeklyReports: boolean;
  dailyDigest: boolean;
}

interface InventoryNotification {
  id: string;
  type: 'low_stock' | 'out_of_stock' | 'high_demand' | 'restock_needed' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  toyId?: string;
  toyName?: string;
  category?: string;
  currentStock?: number;
  threshold?: number;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  expiresAt?: string;
  actionRequired: boolean;
  actionType?: 'restock' | 'adjust' | 'review';
}

const InventoryAlerts: React.FC = () => {
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    emailNotifications: true,
    smsNotifications: false,
    inAppNotifications: true,
    lowStockThreshold: 3,
    outOfStockAlerts: true,
    weeklyReports: true,
    dailyDigest: false,
  });

  const [notifications, setNotifications] = useState<InventoryNotification[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Hooks
  const { inventoryAlerts, inventorySummary } = useInventoryDashboard();
  const { data: lowStockToys } = useLowStockToys(alertSettings.lowStockThreshold);
  const recordMovement = useRecordInventoryMovement();

  // Generate notifications from inventory data
  useEffect(() => {
    if (!inventoryAlerts || !lowStockToys) return;

    const newNotifications: InventoryNotification[] = [];

    // Out of stock alerts
    const outOfStockToys = inventoryAlerts.filter(toy => toy.available_quantity === 0);
    outOfStockToys.forEach(toy => {
      newNotifications.push({
        id: `out_of_stock_${toy.id}`,
        type: 'out_of_stock',
        severity: 'critical',
        title: 'Out of Stock Alert',
        message: `${toy.name} is completely out of stock and unavailable for rental.`,
        toyId: toy.id,
        toyName: toy.name,
        category: toy.category,
        currentStock: 0,
        threshold: 0,
        isRead: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        actionRequired: true,
        actionType: 'restock',
      });
    });

    // Low stock alerts
    const criticallyLowStock = lowStockToys.filter(toy => toy.available_quantity === 1);
    criticallyLowStock.forEach(toy => {
      newNotifications.push({
        id: `low_stock_${toy.id}`,
        type: 'low_stock',
        severity: 'high',
        title: 'Critical Low Stock',
        message: `${toy.name} has only ${toy.available_quantity} unit remaining.`,
        toyId: toy.id,
        toyName: toy.name,
        category: toy.category,
        currentStock: toy.available_quantity,
        threshold: alertSettings.lowStockThreshold,
        isRead: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        actionRequired: true,
        actionType: 'restock',
      });
    });

    // Restock needed alerts
    const restockNeeded = inventoryAlerts.filter(toy => toy.needs_restocking && toy.available_quantity > 0);
    restockNeeded.forEach(toy => {
      newNotifications.push({
        id: `restock_${toy.id}`,
        type: 'restock_needed',
        severity: 'medium',
        title: 'Restocking Recommended',
        message: `${toy.name} inventory is below the recommended threshold and should be restocked soon.`,
        toyId: toy.id,
        toyName: toy.name,
        category: toy.category,
        currentStock: toy.available_quantity,
        threshold: alertSettings.lowStockThreshold,
        isRead: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
        actionRequired: false,
        actionType: 'review',
      });
    });

    // System alerts
    if (inventorySummary) {
      if (inventorySummary.out_of_stock_toys > 5) {
        newNotifications.push({
          id: 'system_multiple_out_of_stock',
          type: 'system',
          severity: 'critical',
          title: 'Multiple Toys Out of Stock',
          message: `${inventorySummary.out_of_stock_toys} toys are currently out of stock. This may impact customer experience.`,
          isRead: false,
          isArchived: false,
          createdAt: new Date().toISOString(),
          actionRequired: true,
          actionType: 'review',
        });
      }

      if (inventorySummary.low_stock_toys > 10) {
        newNotifications.push({
          id: 'system_many_low_stock',
          type: 'system',
          severity: 'high',
          title: 'High Number of Low Stock Items',
          message: `${inventorySummary.low_stock_toys} toys are running low on inventory. Consider bulk restocking.`,
          isRead: false,
          isArchived: false,
          createdAt: new Date().toISOString(),
          actionRequired: false,
          actionType: 'review',
        });
      }
    }

    setNotifications(newNotifications);
  }, [inventoryAlerts, lowStockToys, inventorySummary, alertSettings.lowStockThreshold]);

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (showUnreadOnly && notification.isRead) return false;
    if (filterSeverity !== 'all' && notification.severity !== filterSeverity) return false;
    if (filterType !== 'all' && notification.type !== filterType) return false;
    if (notification.isArchived) return false;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Clock className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  };

  const markAsArchived = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isArchived: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
  };

  const handleQuickRestock = async (toyId: string, quantity: number) => {
    try {
      await recordMovement.mutateAsync({
        toyId,
        movementType: 'ADJUSTMENT',
        quantityChange: quantity,
        movementReason: 'Quick restock from alert',
        notes: `Added ${quantity} units via inventory alert quick action`
      });
      toast.success(`Added ${quantity} units to inventory`);
      
      // Mark related notifications as read
      setNotifications(prev => 
        prev.map(n => 
          n.toyId === toyId ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error('Error restocking inventory:', error);
      toast.error('Failed to restock inventory');
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length;
  const criticalCount = notifications.filter(n => n.severity === 'critical' && !n.isRead && !n.isArchived).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6" />
          <div>
            <h2 className="text-2xl font-bold">Inventory Alerts</h2>
            <p className="text-muted-foreground">
              Real-time notifications for inventory management
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark All Read
          </Button>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Alert Settings</DialogTitle>
                <DialogDescription>
                  Configure your inventory alert preferences
                </DialogDescription>
              </DialogHeader>
              <AlertSettingsForm 
                settings={alertSettings} 
                onSettingsChange={setAlertSettings}
                onClose={() => setSettingsOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalCount > 0 && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Critical Inventory Issues</AlertTitle>
          <AlertDescription className="text-red-700">
            {criticalCount} critical alert{criticalCount > 1 ? 's' : ''} require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="unread-only"
                checked={showUnreadOnly}
                onCheckedChange={setShowUnreadOnly}
              />
              <label htmlFor="unread-only" className="text-sm">Show unread only</label>
            </div>
            
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="restock_needed">Restock Needed</SelectItem>
                <SelectItem value="system">System Alerts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <Card key={notification.id} className={`${!notification.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      {getSeverityIcon(notification.severity)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <Badge variant={getSeverityColor(notification.severity)}>
                          {notification.severity.toUpperCase()}
                        </Badge>
                        {notification.type !== 'system' && notification.category && (
                          <Badge variant="outline">
                            {notification.category.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      
                      {notification.toyName && notification.currentStock !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          <strong>{notification.toyName}</strong> - Current Stock: {notification.currentStock}
                          {notification.threshold && ` (Threshold: ${notification.threshold})`}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistance(new Date(notification.createdAt), new Date(), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {notification.actionRequired && notification.toyId && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickRestock(notification.toyId!, 5)}
                        >
                          +5
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickRestock(notification.toyId!, 10)}
                        >
                          +10
                        </Button>
                      </div>
                    )}
                    
                    {!notification.isRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsArchived(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
              <p className="text-muted-foreground">
                {showUnreadOnly 
                  ? "No unread notifications." 
                  : "No active inventory alerts. Your inventory levels look good!"
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Alert Settings Form Component
const AlertSettingsForm: React.FC<{
  settings: AlertSettings;
  onSettingsChange: (settings: AlertSettings) => void;
  onClose: () => void;
}> = ({ settings, onSettingsChange, onClose }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSettingsChange(localSettings);
    toast.success('Alert settings updated');
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h4 className="font-medium">Notification Channels</h4>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="email"
            checked={localSettings.emailNotifications}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, emailNotifications: !!checked }))
            }
          />
          <Mail className="h-4 w-4" />
          <label htmlFor="email" className="text-sm">Email notifications</label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="sms"
            checked={localSettings.smsNotifications}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, smsNotifications: !!checked }))
            }
          />
          <Smartphone className="h-4 w-4" />
          <label htmlFor="sms" className="text-sm">SMS notifications</label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="in-app"
            checked={localSettings.inAppNotifications}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, inAppNotifications: !!checked }))
            }
          />
          <Bell className="h-4 w-4" />
          <label htmlFor="in-app" className="text-sm">In-app notifications</label>
        </div>
      </div>
      
      <div className="space-y-3">
        <h4 className="font-medium">Alert Thresholds</h4>
        
        <div className="space-y-2">
          <label className="text-sm">Low stock threshold</label>
          <Input
            type="number"
            min="1"
            max="10"
            value={localSettings.lowStockThreshold}
            onChange={(e) => 
              setLocalSettings(prev => ({ 
                ...prev, 
                lowStockThreshold: parseInt(e.target.value) || 3 
              }))
            }
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="out-of-stock"
            checked={localSettings.outOfStockAlerts}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, outOfStockAlerts: !!checked }))
            }
          />
          <label htmlFor="out-of-stock" className="text-sm">Out of stock alerts</label>
        </div>
      </div>
      
      <div className="space-y-3">
        <h4 className="font-medium">Reports</h4>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="weekly"
            checked={localSettings.weeklyReports}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, weeklyReports: !!checked }))
            }
          />
          <label htmlFor="weekly" className="text-sm">Weekly inventory reports</label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="daily"
            checked={localSettings.dailyDigest}
            onCheckedChange={(checked) => 
              setLocalSettings(prev => ({ ...prev, dailyDigest: !!checked }))
            }
          />
          <label htmlFor="daily" className="text-sm">Daily inventory digest</label>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default InventoryAlerts; 