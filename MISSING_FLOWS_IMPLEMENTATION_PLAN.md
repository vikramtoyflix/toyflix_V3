# 🚀 Missing Flows Implementation Plan

## 🎯 **Implementation Priority Matrix**

| Priority | Component | Issue | Impact | Effort |
|----------|-----------|-------|---------|---------|
| **P0** | SubscriptionPlans.tsx | Missing renewal button | High | Low |
| **P0** | PaymentFlow.tsx | No renewal flow handling | High | Medium |
| **P0** | SubscriptionFlowContent.tsx | Missing isRenewal parameter | High | Low |
| **P1** | useSubscriptionStatus hook | No status detection | Medium | Medium |
| **P1** | Button text logic | Generic messaging | Medium | Low |
| **P2** | Cycle integration | Renewal doesn't advance cycles | Medium | High |

---

## 🔧 **Implementation Steps**

### **Step 1: Add Renewal UI Flow (P0)**

#### **File: `src/components/SubscriptionPlans.tsx`**

```typescript
// Add renewal detection logic
const isCurrentPlanRenewal = (planId: string) => {
  return hasActiveSubscription && currentPlanId === planId && planId === 'discovery-delight';
};

// Update button text logic
const getButtonText = (planId: string) => {
  if (!isAuthenticated) {
    return "Get Started";
  }
  if (hasActiveSubscription) {
    if (currentPlanId === planId) {
      // ENHANCED: Add renewal option for Discovery Delight
      if (planId === 'discovery-delight') {
        return "Renew for Next Month";
      }
      return canManageQueue ? "Manage Your Toys" : "View Current Plan";
    } else {
      return "Switch to This Plan";
    }
  }
  return onPlanSelected ? "Start Creating Memories" : "Begin This Journey";
};

// Update button action logic
const getButtonAction = useCallback((plan: typeof plans[0]) => {
  // ... existing logic ...
  
  if (hasActiveSubscription) {
    if (currentPlanId === plan.id) {
      // ENHANCED: Handle renewal for Discovery Delight
      if (plan.id === 'discovery-delight') {
        return () => {
          fbqTrack('Subscribe', {
            content_name: `${plan.name} Renewal`,
            value: plan.price,
            currency: 'INR',
            content_category: 'subscription_renewal',
            subscription_plan: plan.id,
            user_status: 'renewing'
          });
          
          navigate(`/subscription-flow?planId=${plan.id}&isRenewal=true`);
        };
      }
      
      // Current plan management (non-Discovery Delight)
      return () => {
        // ... existing logic ...
      };
    }
    // ... rest of existing logic ...
  }
}, [/* dependencies */]);
```

### **Step 2: Add Renewal Parameter Handling (P0)**

#### **File: `src/components/subscription/SubscriptionFlowContent.tsx`**

```typescript
// Add renewal flow detection
const isRenewalFlow = useMemo(() => {
  return searchParams.get('isRenewal') === 'true';
}, [searchParams]);

// Update flow initialization logic
useEffect(() => {
  console.log('🎯 SubscriptionFlow initialization:', {
    planIdFromUrl,
    selectedPlan,
    rideOnToyId,
    isCycleCompletionFlow,
    isEarlyAccessFlow,
    isUpgradeFlow,
    isRenewalFlow, // NEW
    existingAgeGroup,
    hasValidSubscriptionHistory
  });

  if (planIdFromUrl) {
    setSelectedPlan(planIdFromUrl);
    
    if (rideOnToyId) {
      // ... existing ride-on logic ...
    } else if (isRenewalFlow) {
      // NEW: Handle renewal flow
      console.log('🔄 Renewal flow detected, skipping to payment');
      if (hasValidSubscriptionHistory && existingAgeGroup) {
        setValidatedAgeGroup(existingAgeGroup);
        setStep(4); // Skip directly to payment
      } else {
        // Fallback for renewal without age group
        setValidatedAgeGroup('3-4');
        setStep(4);
      }
    } else if (isUpgradeFlow) {
      // ... existing upgrade logic ...
    }
    // ... rest of existing logic ...
  }
}, [
  planIdFromUrl, 
  selectedPlan, 
  navigate, 
  rideOnToyId, 
  restoreStateFromUrl, 
  isCycleCompletionFlow, 
  isEarlyAccessFlow,
  isUpgradeFlow,
  isRenewalFlow, // NEW
  existingAgeGroup, 
  shouldSkipAgeSelection, 
  isGoldPack,
  hasValidSubscriptionHistory,
  suggestedPlan
]);
```

### **Step 3: Update Payment Flow (P0)**

#### **File: `src/components/subscription/PaymentFlow.tsx`**

```typescript
// Add renewal flow prop
interface PaymentFlowProps {
  selectedPlan: string;
  selectedToys: any[];
  ageGroup?: string;
  rideOnToyId?: string;
  onBack?: () => void;
  isCycleCompletionFlow?: boolean;
  completionReason?: string;
  isQueueOrder?: boolean;
  isUpgradeFlow?: boolean;
  isRenewalFlow?: boolean; // NEW
  onOrderComplete?: (orderData: any) => void;
}

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  selectedPlan,
  selectedToys,
  ageGroup,
  rideOnToyId,
  onBack,
  isCycleCompletionFlow = false,
  completionReason = '',
  isQueueOrder = false,
  isUpgradeFlow = false,
  isRenewalFlow = false, // NEW
  onOrderComplete
}) => {
  // ... existing code ...

  const handlePayment = async () => {
    // ... existing validation ...

    // Handle subscription renewals - NEW
    if (isRenewalFlow) {
      try {
        setIsCreatingFreeOrder(true);
        toast.info('Processing subscription renewal...');
        
        const { SubscriptionLifecycle } = await import('@/services/subscription/subscriptionLifecycle');
        const renewalResult = await SubscriptionLifecycle.renewSubscription(user.id);
        
        if (renewalResult.success) {
          toast.success(renewalResult.message || 'Subscription renewed successfully!');
          onOrderComplete?.({
            type: 'renewal',
            planId: selectedPlan,
            message: renewalResult.message
          });
          return;
        } else {
          throw new Error(renewalResult.message || 'Renewal failed');
        }
      } catch (error: any) {
        console.error('Error processing subscription renewal:', error);
        toast.error(`Failed to process renewal: ${error.message}`);
      } finally {
        setIsCreatingFreeOrder(false);
      }
      return;
    }
    
    // Handle subscription upgrades
    else if (isUpgradeFlow) {
      // ... existing upgrade logic ...
    }

    // ... rest of existing payment logic ...
  };
};
```

### **Step 4: Pass Renewal Flow to Payment (P0)**

#### **File: `src/components/subscription/SubscriptionFlowContent.tsx`**

```typescript
// Update PaymentFlow component call
{step === 4 && (
  <PaymentFlow
    selectedPlan={selectedPlan!}
    selectedToys={selectedToys}
    ageGroup={selectedAgeGroup}
    rideOnToyId={rideOnToyId}
    onBack={handleBack}
    isCycleCompletionFlow={isCycleCompletionFlow}
    completionReason={completionReason}
    isQueueOrder={isQueueOrder}
    isUpgradeFlow={isUpgradeFlow}
    isRenewalFlow={isRenewalFlow} // NEW
    onOrderComplete={handleOrderComplete}
  />
)}
```

### **Step 5: Create Subscription Status Hook (P1)**

#### **File: `src/hooks/useSubscriptionStatus.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useCustomAuth } from './useCustomAuth';
import { SubscriptionCore } from '@/services/subscription/subscriptionCore';

export type SubscriptionStatus = 'none' | 'active' | 'paused' | 'expired' | 'cancelled';

export const useSubscriptionStatus = () => {
  const { user } = useCustomAuth();

  return useQuery({
    queryKey: ['subscription-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'none';

      // Check for active subscription first
      const activeSubscription = await SubscriptionCore.getActiveSubscription(user.id);
      if (activeSubscription) {
        return activeSubscription.status as SubscriptionStatus;
      }

      // Check for expired/cancelled subscription
      const anySubscription = await SubscriptionCore.getSubscriptionForUpgrade(user.id);
      if (anySubscription) {
        return anySubscription.status as SubscriptionStatus;
      }

      return 'none';
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const getStatusDisplayText = (status: SubscriptionStatus, planId: string, isCurrentPlan: boolean): string => {
  if (!isCurrentPlan) {
    switch (status) {
      case 'expired': return 'Reactivate Subscription';
      case 'cancelled': return 'Restart Subscription';
      case 'active':
      case 'paused': return 'Switch to This Plan';
      default: return 'Get Started';
    }
  }

  // Current plan actions
  switch (status) {
    case 'active':
      return planId === 'discovery-delight' ? 'Renew for Next Month' : 'Manage Your Toys';
    case 'paused': return 'Resume Subscription';
    case 'expired': return 'Reactivate Plan';
    case 'cancelled': return 'Restart Plan';
    default: return 'Get Started';
  }
};
```

### **Step 6: Update SubscriptionPlans with Status Hook (P1)**

#### **File: `src/components/SubscriptionPlans.tsx`**

```typescript
import { useSubscriptionStatus, getStatusDisplayText } from '@/hooks/useSubscriptionStatus';

const SubscriptionPlans = ({ onPlanSelected }: SubscriptionPlansProps) => {
  // ... existing code ...
  const { data: subscriptionStatus } = useSubscriptionStatus();

  // Enhanced button text with status awareness
  const getButtonText = useCallback((planId: string) => {
    if (!isAuthenticated) {
      return "Get Started";
    }
    
    return getStatusDisplayText(
      subscriptionStatus || 'none',
      planId,
      currentPlanId === planId
    );
  }, [isAuthenticated, subscriptionStatus, currentPlanId]);

  // ... rest of component ...
};
```

---

## 🧪 **Testing Checklist**

### **Renewal Flow Testing**
- [ ] Discovery Delight user sees "Renew for Next Month" button
- [ ] Clicking renewal button navigates to `/subscription-flow?planId=discovery-delight&isRenewal=true`
- [ ] Renewal flow skips age selection and toy selection
- [ ] Payment flow calls `SubscriptionLifecycle.renewSubscription()`
- [ ] Successful renewal advances cycle number
- [ ] Entitlements reset for new cycle

### **Status Detection Testing**
- [ ] Active users see appropriate button text
- [ ] Expired users see "Reactivate Subscription"
- [ ] Cancelled users see "Restart Subscription"
- [ ] New users see "Get Started"

### **Integration Testing**
- [ ] Renewal integrates with cycle management
- [ ] Selection windows open after renewal
- [ ] Analytics track renewal events
- [ ] Error handling for failed renewals

---

## 📊 **Success Metrics**

### **User Experience Metrics**
- Reduced confusion for Discovery Delight users
- Clear action buttons for all user states
- Smooth renewal process completion rate

### **Technical Metrics**
- Proper service routing (renewal vs upgrade)
- Correct cycle progression
- Accurate entitlement resets

### **Business Metrics**
- Increased Discovery Delight renewal rate
- Reduced customer support tickets
- Improved user retention

---

## 🎯 **Implementation Timeline**

| Phase | Tasks | Duration | Dependencies |
|-------|-------|----------|--------------|
| **Phase 1** | P0 fixes (Steps 1-4) | 1-2 days | None |
| **Phase 2** | P1 enhancements (Steps 5-6) | 1 day | Phase 1 complete |
| **Phase 3** | Testing & refinement | 1 day | Phase 2 complete |
| **Phase 4** | Cycle integration (P2) | 2-3 days | All phases |

**Total Estimated Time: 5-7 days**

This implementation plan addresses all the critical missing flows identified in the impact analysis and provides a clear path to complete the Discovery Delight subscription system.
