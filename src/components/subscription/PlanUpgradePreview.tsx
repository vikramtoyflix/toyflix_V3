import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CreditCard, Gift, Calculator } from 'lucide-react';

interface PlanUpgradePreviewProps {
  currentPlan: any;
  newPlan: any;
  proration: {
    daysRemaining: number;
    creditAmount: number;
    newPlanProration: number;
    refundDue: number;
    additionalChargeRequired: number;
    requiresPayment: boolean;
  };
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const PlanUpgradePreview: React.FC<PlanUpgradePreviewProps> = ({
  currentPlan,
  newPlan,
  proration,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const isUpgrade = proration.additionalChargeRequired > 0;
  const isDowngrade = proration.refundDue > 0;
  const additionalChargeWithGST = proration.additionalChargeRequired * 1.18;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Plan Change Preview
        </CardTitle>
        <CardDescription>
          Review the changes and costs for your plan upgrade
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Plan Change Visual */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="font-semibold text-gray-900">{currentPlan.name}</div>
            <div className="text-sm text-gray-500">Current Plan</div>
            <div className="text-lg font-bold text-gray-900">₹{currentPlan.price}</div>
          </div>
          
          <ArrowRight className="w-8 h-8 text-blue-500 mx-4" />
          
          <div className="text-center">
            <div className="font-semibold text-gray-900">{newPlan.name}</div>
            <div className="text-sm text-gray-500">New Plan</div>
            <div className="text-lg font-bold text-gray-900">₹{newPlan.price}</div>
          </div>
        </div>

        {/* Proration Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Billing Details</h3>
          
          <div className="bg-blue-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Days remaining in current cycle:</span>
              <span className="font-semibold">{proration.daysRemaining} days</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Credit from current plan:</span>
              <span className="font-semibold text-green-600">₹{proration.creditAmount.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span>Cost for new plan (prorated):</span>
              <span className="font-semibold">₹{proration.newPlanProration.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Summary */}
          {isUpgrade && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-orange-900">Additional Payment Required</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Base amount:</span>
                  <span>₹{proration.additionalChargeRequired.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GST (18%):</span>
                  <span>₹{(proration.additionalChargeRequired * 0.18).toFixed(2)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-semibold">
                  <span>Total to pay:</span>
                  <span className="text-orange-600">₹{additionalChargeWithGST.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {isDowngrade && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-900">Credit Applied</span>
              </div>
              <div className="text-sm">
                <span>A credit of </span>
                <span className="font-semibold text-green-600">₹{proration.refundDue.toFixed(2)}</span>
                <span> will be applied to your account</span>
              </div>
            </div>
          )}

          {!isUpgrade && !isDowngrade && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="text-sm text-blue-900">
                No additional charges or credits - the plans have equivalent prorated costs.
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          
          <Button 
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              'Processing...'
            ) : isUpgrade ? (
              `Pay ₹${additionalChargeWithGST.toFixed(2)} & Upgrade`
            ) : (
              'Confirm Plan Change'
            )}
          </Button>
        </div>

        {/* Additional Info */}
        <div className="text-xs text-gray-500 text-center">
          {isUpgrade && 'Payment will be processed securely through Razorpay'}
          {isDowngrade && 'Credit will be applied immediately after confirmation'}
          {!isUpgrade && !isDowngrade && 'Your plan will be changed immediately'}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanUpgradePreview; 