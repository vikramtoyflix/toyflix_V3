import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Edit, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Filter,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { RealTimeSubscriptionService } from '@/services/admin/realTimeSubscriptionService';
import { 
  SUBSCRIPTION_STATUS_OPTIONS, 
  SUBSCRIPTION_PLAN_OPTIONS, 
  AGE_GROUP_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  RETURN_STATUS_OPTIONS
} from '@/components/admin/inline-editing/fieldConfigurations';

interface BulkEditingPanelProps {
  selectedSubscriptions: string[];
  onUpdateComplete: () => void;
  onClose: () => void;
}

interface BulkEditOperation {
  field: string;
  value: any;
  enabled: boolean;
}

export const BulkEditingPanel: React.FC<BulkEditingPanelProps> = ({
  selectedSubscriptions,
  onUpdateComplete,
  onClose
}) => {
  const [bulkOperations, setBulkOperations] = useState<BulkEditOperation[]>([
    { field: 'subscription_status', value: '', enabled: false },
    { field: 'subscription_plan', value: '', enabled: false },
    { field: 'age_group', value: '', enabled: false },
    { field: 'status', value: '', enabled: false },
    { field: 'payment_status', value: '', enabled: false },
    { field: 'return_status', value: '', enabled: false },
    { field: 'admin_notes', value: '', enabled: false }
  ]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const handleOperationToggle = (field: string, enabled: boolean) => {
    setBulkOperations(prev => prev.map(op => 
      op.field === field ? { ...op, enabled } : op
    ));
  };

  const handleOperationValueChange = (field: string, value: any) => {
    setBulkOperations(prev => prev.map(op => 
      op.field === field ? { ...op, value } : op
    ));
  };

  const getFieldOptions = (field: string) => {
    switch (field) {
      case 'subscription_status':
        return SUBSCRIPTION_STATUS_OPTIONS;
      case 'subscription_plan':
        return SUBSCRIPTION_PLAN_OPTIONS;
      case 'age_group':
        return AGE_GROUP_OPTIONS;
      case 'status':
        return ORDER_STATUS_OPTIONS;
      case 'payment_status':
        return PAYMENT_STATUS_OPTIONS;
      case 'return_status':
        return RETURN_STATUS_OPTIONS;
      default:
        return [];
    }
  };

  const processBulkEdit = async () => {
    setIsProcessing(true);
    setProcessedCount(0);
    setErrors([]);

    const enabledOperations = bulkOperations.filter(op => op.enabled && op.value);
    
    if (enabledOperations.length === 0) {
      toast.error('Please select at least one field to update');
      setIsProcessing(false);
      return;
    }

    try {
      for (let i = 0; i < selectedSubscriptions.length; i++) {
        const subscriptionId = selectedSubscriptions[i];
        
        try {
          // Process each enabled operation for this subscription
          for (const operation of enabledOperations) {
            await RealTimeSubscriptionService.updateSubscriptionField(
              subscriptionId,
              operation.field,
              operation.value
            );
          }
          
          setProcessedCount(prev => prev + 1);
          
          // Small delay to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          const errorMsg = `Failed to update subscription ${subscriptionId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          setErrors(prev => [...prev, errorMsg]);
          console.error(errorMsg);
        }
      }

      const successCount = selectedSubscriptions.length - errors.length;
      
      if (successCount > 0) {
        toast.success(`Successfully updated ${successCount} subscriptions`);
        onUpdateComplete();
      }
      
      if (errors.length > 0) {
        toast.error(`${errors.length} updates failed. Check the error list below.`);
      }
      
    } catch (error) {
      toast.error('Bulk edit operation failed');
      console.error('Bulk edit error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportResults = () => {
    const results = selectedSubscriptions.map((id, index) => ({
      subscription_id: id,
      status: index < processedCount ? 'Success' : 'Pending',
      operations: bulkOperations.filter(op => op.enabled).map(op => `${op.field}: ${op.value}`).join(', ')
    }));
    
    const csvContent = [
      ['Subscription ID', 'Status', 'Operations'],
      ...results.map(r => [r.subscription_id, r.status, r.operations])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk-edit-results-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Bulk Edit Subscriptions
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{selectedSubscriptions.length} subscriptions selected</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Bulk Operations */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">Select Fields to Update</Label>
          
          {bulkOperations.map((operation) => (
            <div key={operation.field} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Checkbox
                checked={operation.enabled}
                onCheckedChange={(checked) => handleOperationToggle(operation.field, checked as boolean)}
              />
              
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-medium capitalize">
                  {operation.field.replace('_', ' ')}
                </Label>
                
                {operation.field === 'admin_notes' ? (
                  <Textarea
                    value={operation.value}
                    onChange={(e) => handleOperationValueChange(operation.field, e.target.value)}
                    placeholder="Enter admin notes..."
                    disabled={!operation.enabled}
                    rows={2}
                  />
                ) : (
                  <Select
                    value={operation.value}
                    onValueChange={(value) => handleOperationValueChange(operation.field, value)}
                    disabled={!operation.enabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${operation.field.replace('_', ' ')}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getFieldOptions(operation.field).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Display */}
        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Processing bulk updates...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(processedCount / selectedSubscriptions.length) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-600">
              {processedCount} of {selectedSubscriptions.length} completed
            </div>
          </div>
        )}

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Errors ({errors.length})</span>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {errors.map((error, index) => (
                <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={exportResults}
            disabled={processedCount === 0}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Results
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={processBulkEdit}
              disabled={isProcessing || bulkOperations.filter(op => op.enabled).length === 0}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Apply Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 