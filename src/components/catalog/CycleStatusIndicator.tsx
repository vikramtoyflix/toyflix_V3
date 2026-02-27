
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useCycleStatus } from '@/hooks/useCycleStatus';
import { CycleManagementService } from '@/services/cycleManagementService';
import { Calendar, Package, RotateCcw, CheckCircle } from 'lucide-react';

const CycleStatusIndicator = () => {
  const { data: cycleStatus } = useCycleStatus();

  if (!cycleStatus?.has_active_subscription) {
    return null;
  }

  const getStatusInfo = () => {
    switch (cycleStatus.cycle_status) {
      case 'selection':
        return {
          icon: Calendar,
          label: 'Selection Period',
          description: 'Choose your toys for this cycle',
          color: 'bg-blue-500',
          progress: Math.min((cycleStatus.days_in_current_cycle / 7) * 100, 100)
        };
      case 'delivery_pending':
        return {
          icon: Package,
          label: 'Delivery Pending',
          description: 'Your toys are being prepared for delivery',
          color: 'bg-yellow-500',
          progress: Math.min(((cycleStatus.days_in_current_cycle - 7) / 3) * 100, 100)
        };
      case 'toys_in_possession':
        return {
          icon: CheckCircle,
          label: 'Toys in Your Possession',
          description: 'Enjoy your toys! Return by due date.',
          color: 'bg-green-500',
          progress: Math.min(((cycleStatus.days_in_current_cycle - 10) / 20) * 100, 100)
        };
      case 'return_pending':
        return {
          icon: RotateCcw,
          label: 'Return Pending',
          description: 'Please return your toys to continue',
          color: 'bg-orange-500',
          progress: 100
        };
      default:
        return {
          icon: Calendar,
          label: 'Cycle Complete',
          description: 'Ready for next cycle',
          color: 'bg-gray-500',
          progress: 100
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;
  const showManageQueue = CycleManagementService.shouldShowManageQueue(cycleStatus);

  return (
    <div className="bg-card rounded-lg p-4 border mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${statusInfo.color} text-white`}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold">{statusInfo.label}</h3>
            <p className="text-sm text-muted-foreground">{statusInfo.description}</p>
          </div>
        </div>
        
        {showManageQueue && (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Selection Window Open
          </Badge>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Cycle Progress</span>
          <span>Day {cycleStatus.days_in_current_cycle} of 30</span>
        </div>
        <Progress value={statusInfo.progress} className="h-2" />
      </div>
      
      {cycleStatus.selection_window_active && (
        <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
          <p className="text-sm text-green-800 font-medium">
            🎯 Selection window is now open! You can select toys for next month.
          </p>
        </div>
      )}
    </div>
  );
};

export default CycleStatusIndicator;
