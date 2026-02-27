# Age-Based Filtering Logic Documentation

## Overview
This document captures the age-based filtering logic that was implemented in the Toyflix application before migrating to table-based age band filtering. This system was designed to show age-appropriate toys to users based on their selected age groups.

## Core Components

### 1. Age Range Utility Functions (`src/utils/ageRangeUtils.ts`)

#### `parseAgeRange(ageRangeStr: string): AgeRange | null`
- Parses individual age range strings like "1-2 years", "3+ years"
- Handles various formats: "X-Y", "X+", single ages, special cases
- Returns `{ min: number, max: number }` object

#### `parseMultipleAgeRanges(ageRangesStr: string): AgeRange[]`
- Parses comma-separated age ranges
- Splits by comma, semicolon, or pipe delimiters
- Returns array of parsed age ranges

#### `matchesAgeRange(toyAgeRangesStr: string, selectedAgeStr: string): boolean`
- **Core filtering logic** - determines if a toy matches selected age group
- Uses overlap-based matching with different strictness for different age groups
- **Young children (0-4 years)**: Stricter filtering
  - Toy shouldn't start more than 0.5 years before selected range
  - Toy shouldn't extend more than 1 year beyond selected range
  - Requires at least 50% overlap of selected range
- **Older children (4+ years)**: More flexible filtering
  - Requires at least 25% overlap of selected range

### 2. Age Band Database Structure

#### Tables
- `age_bands`: Canonical age ranges using PostgreSQL int4range
- `toy_age_band`: Many-to-many bridge table linking toys to age bands
- `toys_with_age_bands`: Materialized view for performance

#### Database Functions
- `get_toys_for_age_hybrid()`: Hybrid approach using relational + legacy filtering
- `get_subscription_toys_hybrid()`: Age filtering for subscription flow
- `migrate_toy_to_relational()`: Migration helper for toy data

### 3. React Hooks Implementation

#### `useToysWithAgeBands.ts`
- `useToysWithAgeBands()`: Fetches all toys with age band support
- `useToysForAgeGroup(ageGroup)`: Filters toys for specific age group
- `useToysGroupedByAge()`: Groups toys by age bands
- `useToysWithAgeBandsByCategory(category)`: Category + age filtering

#### Age Group Conversion
```typescript
const ageGroupToMonths = (ageGroup: string): number => {
  switch (ageGroup) {
    case '0-1': return 6;   // 6 months (middle of 0-1 year)
    case '1-2': return 18;  // 18 months (middle of 1-2 years)
    case '2-3': return 30;  // 30 months (middle of 2-3 years)
    case '3-4': return 42;  // 42 months (middle of 3-4 years)
    case '4-5': return 54;  // 54 months (middle of 4-5 years)
    case '5-6': return 66;  // 66 months (middle of 5-6 years)
    case '6-7': return 78;  // 78 months (middle of 6-7 years)
    case '7-8': return 90;  // 90 months (middle of 7-8 years)
    case '8+': return 108;  // 108 months (9 years)
    default: return 36;     // 3 years as fallback
  }
};
```

### 4. Component Integration

#### `PromotionalCatalogView.tsx`
- Uses `matchesAgeRange()` to filter toys by selected age
- Default age selection: "1-2"
- Excludes ride-on toys from age filtering
- Shows toy count for selected age group

#### `SubscriptionCatalogView.tsx`
- Similar age filtering for subscription users
- Integrates with cycle management
- Shows age-appropriate toys for subscription flow

#### `AgeBandCatalogView.tsx` (Created but not used)
- Advanced age band interface with visual age group cards
- Shows developmental milestones for each age group
- Interactive age group selection
- Educational content about toy types for each age

### 5. Age Filtering Logic Flow

```
1. User selects age group (e.g., "2-3")
2. parseAgeRange() converts to { min: 2, max: 3 }
3. For each toy:
   - parseMultipleAgeRanges() gets toy's age ranges
   - matchesAgeRange() calculates overlap
   - Apply age-specific strictness rules
   - Include/exclude toy based on overlap percentage
4. Display filtered toys to user
```

### 6. Special Cases Handled

#### Ride-On Toys
- Explicitly excluded from age filtering
- Have separate subscription flow
- No age restrictions applied

#### Edge Cases
- "No age restrictions" toys: { min: 0, max: 99 }
- Invalid/missing age ranges: Excluded from results
- Multiple age ranges per toy: Any matching range includes toy

### 7. Performance Optimizations

#### Database Level
- Materialized view `toys_with_age_bands` for fast queries
- GIN indexes on age_band_ids arrays
- PostgreSQL int4range for efficient age range queries

#### React Level
- Query caching with 5-minute stale time
- Memoized filtering results
- Parallel data fetching where possible

## Migration Notes

### From String-Based to Relational
- Original system used string parsing of `age_range` field
- Migrated to relational structure with proper age band tables
- Hybrid approach maintained for backward compatibility

### Data Migration Process
1. Parse existing age_range strings
2. Map to standardized age_bands table
3. Create bridge table relationships
4. Refresh materialized views
5. Validate migration completeness

## Filtering Effectiveness

### Benefits
- Age-appropriate toy recommendations
- Safety considerations for young children
- Educational value matching developmental stages
- Reduced cognitive load for parents

### Limitations
- May hide toys that could be suitable with supervision
- Rigid boundaries don't account for individual development
- Complex logic can be hard to debug
- Performance overhead for real-time filtering

## Technical Debt Considerations

### Issues Identified
- Complex overlap calculations
- Multiple sources of truth (string vs relational)
- Inconsistent age group definitions across components
- Performance impact of client-side filtering

### Recommendations for Removal
- Simplify to table-based filtering only
- Remove complex overlap logic
- Use database-level filtering for performance
- Maintain simple category-based organization

## Code Locations

### Files with Age Filtering Logic
- `src/utils/ageRangeUtils.ts` - Core filtering utilities
- `src/hooks/useToysWithAgeBands.ts` - React hooks
- `src/components/catalog/PromotionalCatalogView.tsx` - UI integration
- `src/components/catalog/SubscriptionCatalogView.tsx` - Subscription flow
- `src/components/catalog/AgeBandCatalogView.tsx` - Advanced UI (unused)
- `supabase/migrations/20250621000001_enhance_relational_schema.sql` - Database structure

### Database Objects
- `age_bands` table
- `toy_age_band` bridge table  
- `toys_with_age_bands` materialized view
- `get_toys_for_age_hybrid()` function
- `get_subscription_toys_hybrid()` function

## Removal Strategy

1. **Phase 1**: Remove client-side age filtering logic
2. **Phase 2**: Simplify database queries to ignore age restrictions
3. **Phase 3**: Keep age band tables for future reference but don't use in filtering
4. **Phase 4**: Clean up unused code and components

This documentation preserves the knowledge of the sophisticated age-based filtering system before its removal. 