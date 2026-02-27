# Subscription Cycle Service Documentation

## Overview

The Subscription Cycle Service provides comprehensive subscription-based cycle management for the ToyFlix application. It replaces order-based cycle calculations with subscription-date-based calculations for more accurate timing and better user experience.

## Features

### 🎯 **Core Functionality**
- **Subscription Data Fetching**: Retrieves user subscription information from multiple table sources
- **Cycle Calculations**: Calculates cycle numbers, progress, and timing based on subscription dates
- **Selection Window Management**: Determines when users can select toys for their next cycle
- **Multi-Plan Support**: Handles different subscription plans with varying configurations
- **Error Handling**: Comprehensive error handling for missing or invalid subscription data

### 📊 **Calculation Logic**
- **Cycle Number**: `Math.floor(daysSinceSubscription / 30) + 1`
- **Cycle Progress**: `(daysIntoCurrentCycle / 30) * 100`
- **Selection Window**: Opens on day 24-30 of each cycle + grace periods
- **Next Cycle Date**: Calculated from subscription start date + (cycle number * 30 days)

## File Structure

```
src/
├── services/
│   └── subscriptionCycleService.ts    # Core service logic
├── hooks/
│   └── useSubscriptionCycle.ts        # React hooks
└── components/
    └── subscription/
        └── SubscriptionCycleDisplay.tsx # Example component
```

## Core Service (`subscriptionCycleService.ts`)

### Types

```typescript
interface SubscriptionData {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  subscription_start_date: string;
  current_period_start: string;
  current_period_end: string;
  billing_cycle: string;
  created_at: string;
  updated_at: string;
}

interface CycleInfo {
  currentCycleNumber: number;
  daysElapsedInCycle: number;
  daysRemainingInCycle: number;
  cycleProgressPercentage: number;
  nextCycleStartDate: Date;
  currentCycleStartDate: Date;
  currentCycleEndDate: Date;
  totalCycleDays: number;
}

interface SelectionWindowInfo {
  isSelectionWindowOpen: boolean;
  selectionWindowOpenDay: number;
  selectionWindowCloseDay: number;
  selectionWindowOpenDate: Date | null;
  selectionWindowCloseDate: Date | null;
  daysUntilSelectionOpens: number;
  daysUntilSelectionCloses: number;
}
```

### Main Functions

#### `getSubscriptionCycleInfo(userId: string)`
Primary function that returns comprehensive subscription cycle information.

```typescript
const result = await getSubscriptionCycleInfo(userId);
// Returns SubscriptionCycleResult with all cycle data
```

#### `canUserSelectToys(result: SubscriptionCycleResult)`
Quick check if user can currently select toys.

```typescript
const canSelect = canUserSelectToys(result);
// Returns boolean
```

#### `getFormattedCycleStatus(result: SubscriptionCycleResult)`
Get formatted display strings for UI components.

```typescript
const formatted = getFormattedCycleStatus(result);
// Returns { title, description, progressText, selectionStatus }
```

## React Hooks (`useSubscriptionCycle.ts`)

### Primary Hook

```typescript
const {
  formattedStatus,
  nextImportantDate,
  selectionWindowInfo,
  cycleProgress,
  planInfo,
  canSelectToys,
  isLoading,
  error,
  refetch,
  debug
} = useSubscriptionCycle(userId, {
  enableDebugLogging: false,
  refetchInterval: 1000 * 60 * 5 // 5 minutes
});
```

### Specialized Hooks

#### `useCanSelectToys(userId)`
Lightweight hook for checking selection eligibility:

```typescript
const { canSelectToys, isLoading } = useCanSelectToys(userId);
```

#### `useNextImportantDate(userId)`
Get next important date for user:

```typescript
const { nextDate, isLoading } = useNextImportantDate(userId);
```

#### `useSubscriptionCycleOnce(userId)`
One-time fetch without automatic refetching:

```typescript
const { 
  result, 
  formattedStatus, 
  canSelectToys, 
  loading, 
  error, 
  fetchCycleInfo 
} = useSubscriptionCycleOnce(userId);
```

## Plan Configurations

The service supports multiple subscription plans with different configurations:

```typescript
const PLAN_CONFIGURATIONS = {
  'discovery-delight': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 3
  },
  'silver-pack': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 5
  },
  'gold-pack': {
    cycleDays: 30,
    selectionWindowStart: 24,
    selectionWindowEnd: 30,
    gracePeriod: 7
  }
  // ... more plans
};
```

## Usage Examples

### Basic Integration

```typescript
import { useSubscriptionCycle } from '@/hooks/useSubscriptionCycle';

function MyComponent({ userId }) {
  const { 
    cycleProgress, 
    canSelectToys, 
    formattedStatus,
    isLoading 
  } = useSubscriptionCycle(userId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h3>{formattedStatus?.title}</h3>
      <p>Progress: {formattedStatus?.progressText}</p>
      
      {canSelectToys && (
        <button onClick={handleSelectToys}>
          Select Toys for Next Cycle
        </button>
      )}
    </div>
  );
}
```

### Dashboard Integration

```typescript
import { useSubscriptionCycle } from '@/hooks/useSubscriptionCycle';

function Dashboard({ user }) {
  const {
    cycleProgress,
    selectionWindowInfo,
    nextImportantDate,
    planInfo
  } = useSubscriptionCycle(user.id, {
    enableDebugLogging: process.env.NODE_ENV === 'development'
  });

  return (
    <div>
      {/* Cycle Progress */}
      <div>
        <h3>Cycle #{cycleProgress.currentCycle}</h3>
        <progress value={cycleProgress.percentage} max={100} />
        <p>{cycleProgress.daysElapsed}/{cycleProgress.totalDays} days</p>
      </div>

      {/* Selection Window */}
      <div>
        <h4>Selection Window</h4>
        <p>Status: {selectionWindowInfo.status}</p>
        {selectionWindowInfo.isOpen && (
          <p>Closes in {selectionWindowInfo.closesIn} days</p>
        )}
      </div>

      {/* Next Important Date */}
      {nextImportantDate?.date && (
        <div>
          <h4>Next: {nextImportantDate.description}</h4>
          <p>{format(nextImportantDate.date, 'MMM dd, yyyy')}</p>
        </div>
      )}
    </div>
  );
}
```

### Selection Logic Integration

```typescript
import { useCanSelectToys } from '@/hooks/useSubscriptionCycle';

function ToySelectionButton({ userId }) {
  const { canSelectToys, isLoading } = useCanSelectToys(userId);
  
  if (isLoading) return <button disabled>Checking...</button>;
  
  return (
    <button 
      disabled={!canSelectToys}
      onClick={canSelectToys ? handleSelectToys : undefined}
    >
      {canSelectToys ? 'Select Toys' : 'Selection Closed'}
    </button>
  );
}
```

## Database Compatibility

The service works with multiple database table structures:

### Primary: `user_subscriptions` table
- `plan_type` → mapped to `plan_id`
- `current_period_start` → used as subscription start
- `current_period_end` → used for billing cycles

### Fallback: `subscriptions` table
- `plan_id` → used directly
- `created_at` → used as subscription start
- `current_cycle_start/end` → used if available

## Error Handling

The service includes comprehensive error handling:

```typescript
const result = await getSubscriptionCycleInfo(userId);

if (result.error) {
  console.error('Subscription cycle error:', result.error);
  // Handle error (show fallback UI, retry, etc.)
}

if (!result.isActive) {
  // Handle inactive subscription
}
```

Common error scenarios:
- No subscription found
- Invalid subscription data
- Database connection issues
- Paused subscriptions

## Debugging

### Development Logging
```typescript
const { debug } = useSubscriptionCycle(userId, {
  enableDebugLogging: true
});

// Manual debug trigger
debug();
```

### Debug Output Example
```
🔄 Subscription Cycle Debug - User: 123
📋 Subscription Info: {
  id: "sub_123",
  plan: "silver-pack", 
  status: "active",
  startDate: "Jan 15, 2024"
}
🎯 Cycle Info: {
  cycleNumber: 3,
  daysElapsed: 28,
  daysRemaining: 2,
  progress: "93%"
}
🎨 Selection Window: {
  isOpen: true,
  window: "Day 24-30",
  daysUntilCloses: 2
}
```

## Migration from Order-Based System

To migrate from order-based to subscription-based cycles:

1. **Replace service calls**:
   ```typescript
   // Old order-based
   const cycleInfo = calculateOrderCycle(order);
   
   // New subscription-based
   const cycleInfo = await getSubscriptionCycleInfo(userId);
   ```

2. **Update component logic**:
   ```typescript
   // Old
   const cycleNumber = order.cycle_number;
   
   // New
   const cycleNumber = cycleInfo.currentCycleNumber;
   ```

3. **Selection window updates**:
   ```typescript
   // Old
   const canSelect = daysPassed >= 24 && daysPassed <= 30;
   
   // New
   const canSelect = canUserSelectToys(cycleResult);
   ```

## Performance Considerations

- **Caching**: Results are cached for 2 minutes by default
- **Refetch Interval**: 5 minutes default, configurable
- **Lightweight Hooks**: Use specialized hooks for simple checks
- **One-time Fetches**: Use `useSubscriptionCycleOnce` for manual triggers

## Testing

```typescript
// Test with mock data
const mockResult = {
  subscription: { /* mock subscription */ },
  cycleInfo: { /* mock cycle */ },
  selectionWindowInfo: { /* mock window */ },
  error: null,
  isActive: true
};

const formatted = getFormattedCycleStatus(mockResult);
expect(formatted.title).toBe('Cycle #1');
```

## Future Enhancements

- Support for different cycle lengths (quarterly, bi-monthly)
- Multiple selection windows per cycle
- Holiday and special event handling
- Timezone-aware calculations
- Advanced grace period logic 