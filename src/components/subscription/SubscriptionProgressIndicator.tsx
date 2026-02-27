import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface SubscriptionProgressIndicatorProps {
  currentStep: number;
  isGoldPack?: boolean;
}

const SubscriptionProgressIndicator = ({ currentStep, isGoldPack = false }: SubscriptionProgressIndicatorProps) => {
  // Different steps for Gold pack (skip age selection)
  const steps = isGoldPack ? [
    { number: 1, label: "Select Toys" },
    { number: 2, label: "Review Selection" },
    { number: 3, label: "Payment" }
  ] : [
    { number: 1, label: "Age Group" },
    { number: 2, label: "Select Toys" },
    { number: 3, label: "Review Selection" },
    { number: 4, label: "Payment" }
  ];

  // Adjust step number for Gold pack (since we skip step 1)
  const displayStep = isGoldPack ? currentStep - 1 : currentStep;
  
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex items-center">
              <Badge 
                variant={displayStep >= step.number ? "default" : "outline"}
              >
                {step.number}
              </Badge>
              <span className="ml-2 text-sm">
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionProgressIndicator;
