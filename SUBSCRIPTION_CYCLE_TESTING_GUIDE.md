# Subscription Cycle Testing Guide

## Overview

This guide provides comprehensive testing for the subscription-based cycle tracking system in ToyFlix. The testing suite covers all aspects mentioned in the original prompt including cycle calculations, different subscription scenarios, edge cases, and user experience validation.

## Test Categories

### 1. Cycle Calculations Tests
- **Cycle Number Verification**: Ensures cycle numbers are correctly calculated from subscription start date
- **Progress Calculations**: Validates cycle progress percentages are accurate and within 0-100%
- **Selection Window Timing**: Verifies selection windows open/close at correct times
- **Next Cycle Predictions**: Confirms next cycle dates are calculated correctly

### 2. Subscription Scenarios Tests
- **New Subscriptions**: Tests first cycle behavior for new subscribers
- **Long-term Subscriptions**: Validates behavior after many cycles (12+ cycles)
- **Paused/Resumed Subscriptions**: Tests subscription state changes
- **Plan Changes**: Validates mid-cycle plan modifications

### 3. Edge Cases Tests
- **Month-end Subscriptions**: Tests subscriptions starting on month boundaries (e.g., Jan 31)
- **Leap Year Handling**: Validates Feb 29 subscription dates
- **Timezone Differences**: Ensures consistent date handling across timezones
- **DST Transitions**: Tests behavior during daylight saving time changes

### 4. User Experience Validation
- **Selection Window Status**: Verifies correct status messages (open/closed/upcoming)
- **Progress Display**: Ensures progress bars and percentages display accurately
- **Date Accuracy**: Validates next cycle dates are correct
- **Status Messages**: Confirms appropriate user-facing messages

## Test Structure

```
├── supabase/migrations/
│   └── test_subscription_cycle_comprehensive.sql    # Database/SQL tests
├── src/services/__tests__/
│   └── subscriptionCycleService.test.ts            # Service layer tests
├── src/components/__tests__/
│   └── SubscriptionCycleProgress.test.tsx          # React component tests
├── scripts/
│   └── run-subscription-cycle-tests.js             # Test runner script
└── test-reports/                                   # Generated test reports
```

## Setup Instructions

### Prerequisites

1. **Node.js 18.20.8** or higher
2. **Supabase CLI** installed and configured
3. **PostgreSQL** database running (via Supabase)
4. **Environment variables** configured

### Installation

```bash
# Install dependencies
npm install

# Install testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitest/coverage-v8 jsdom

# Ensure Supabase is running
supabase start
```

### Environment Variables

Create a `.env.test` file with:

```env
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-test-anon-key
NODE_ENV=test
```

## Running Tests

### Full Test Suite

```bash
# Run all subscription cycle tests
npm run test:subscription-cycle
```

### Individual Test Categories

```bash
# Run SQL/Database tests only
npm run test:subscription-cycle:sql

# Run TypeScript service tests
npm run test:services

# Run React component tests
npm run test:components

# Run all tests with coverage
npm run test:coverage
```

### Development Testing

```bash
# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest src/services/__tests__/subscriptionCycleService.test.ts

# Run tests with specific pattern
npx vitest --run subscription
```

## Test Report Generation

The test runner automatically generates comprehensive reports:

### JSON Report
- Location: `test-reports/subscription-cycle-test-report.json`
- Contains: Raw test data, timings, pass/fail statistics

### HTML Report
- Location: `test-reports/subscription-cycle-test-report.html`
- Contains: Visual test results with charts and detailed breakdowns

### Coverage Report
- Location: `coverage/index.html`
- Contains: Code coverage metrics and uncovered lines

## Test Scenarios Covered

### 1. Cycle Calculations

#### Basic Cycle Progression
```typescript
// Test: 45 days after start = Cycle 2
const subscriptionStart = '2024-10-19';
const currentDate = '2024-12-03';
const expectedCycle = 2;
```

#### Progress Calculation
```typescript
// Test: 15 days into 30-day cycle = 50% progress
const cycleProgress = (daysInCycle / totalCycleDays) * 100;
expect(cycleProgress).toBe(50.0);
```

#### Selection Window Timing
```typescript
// Test: Selection window opens 7 days before cycle end
const selectionStart = cycleEnd - 7;
expect(selectionWindowStatus).toBe('open');
```

### 2. Subscription Scenarios

#### New Subscription
```sql
-- Test: New subscription starts with cycle 1
INSERT INTO subscriptions (subscription_start_date) VALUES (CURRENT_DATE);
SELECT current_cycle_number FROM subscription_current_cycle;
-- Expected: 1
```

#### Long-term Subscription
```sql
-- Test: 365 days = ~12 cycles
INSERT INTO subscriptions (subscription_start_date) VALUES (CURRENT_DATE - INTERVAL '365 days');
SELECT current_cycle_number FROM subscription_current_cycle;
-- Expected: 12 or 13
```

#### Paused Subscription
```sql
-- Test: Paused subscription maintains cycle data
UPDATE subscriptions SET status = 'paused';
SELECT * FROM subscription_current_cycle;
-- Expected: Data still accessible
```

### 3. Edge Cases

#### Month-end Start
```sql
-- Test: Subscription starting January 31
INSERT INTO subscriptions (subscription_start_date) VALUES ('2024-01-31');
SELECT current_cycle_start FROM subscription_current_cycle;
-- Expected: Handles month boundary correctly
```

#### Leap Year
```sql
-- Test: Subscription starting February 29
INSERT INTO subscriptions (subscription_start_date) VALUES ('2024-02-29');
SELECT current_cycle_start FROM subscription_current_cycle;
-- Expected: Handles leap year date
```

#### Timezone Consistency
```typescript
// Test: Date calculations are timezone-consistent
const date1 = new Date('2024-01-01T00:00:00Z');
const date2 = new Date('2024-01-01T23:59:59Z');
expect(formatDate(date1)).toBe(formatDate(date2));
```

### 4. User Experience

#### Status Messages
```typescript
// Test: Appropriate status messages
expect(getStatusMessage('open', 1)).toBe('⚠️ Selection ends soon!');
expect(getStatusMessage('upcoming', 10)).toBe('Get ready to choose!');
expect(getStatusMessage('closed', 0)).toBe('Cycle complete!');
```

#### Progress Indicators
```typescript
// Test: Progress bar accessibility
const progressBar = screen.getByRole('progressbar');
expect(progressBar).toHaveAttribute('aria-valuenow', '33');
expect(progressBar).toHaveAttribute('aria-label', 'Cycle 1 progress: 33% complete');
```

#### Visual Feedback
```typescript
// Test: Visual indicators for urgency
const urgentIndicator = screen.getByText('⚠️ Selection ends soon!');
expect(urgentIndicator).toBeInTheDocument();
```

## Test Data Management

### Test User Creation
```sql
-- Helper function creates test users
SELECT cycle_tests.create_test_user(
  '9876543210',
  'test@example.com',
  'Test User'
);
```

### Test Subscription Creation
```sql
-- Helper function creates test subscriptions
SELECT cycle_tests.create_test_subscription(
  user_id,
  'Discovery Delight',
  CURRENT_DATE - INTERVAL '30 days',
  'active'
);
```

### Test Data Cleanup
```sql
-- Clean up test data (optional)
DELETE FROM subscription_cycles WHERE user_id IN (
  SELECT id FROM custom_users WHERE email LIKE '%@example.com'
);
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check Supabase status
supabase status

# Reset database
supabase db reset

# Check connection
psql "$SUPABASE_DB_URL" -c "SELECT version();"
```

#### Test Failures

1. **Date-related test failures**
   - Check system timezone settings
   - Verify mock date configuration
   - Ensure consistent date formatting

2. **Database function errors**
   - Check migration files are applied
   - Verify PostgreSQL version compatibility
   - Review function signatures

3. **Component test failures**
   - Check React Testing Library setup
   - Verify component imports
   - Review mock configurations

#### Performance Issues

1. **Slow test execution**
   - Reduce test timeout values
   - Use parallel test execution
   - Mock external dependencies

2. **Memory issues**
   - Clear test data between runs
   - Reset mocks after each test
   - Use cleanup functions

## Best Practices

### Test Organization
- Group related tests in describe blocks
- Use descriptive test names
- Include both positive and negative cases
- Test edge conditions thoroughly

### Data Management
- Use factories for test data creation
- Clean up after tests
- Use realistic test data
- Avoid hard-coded values

### Assertion Strategy
- Test one thing per test
- Use appropriate matchers
- Include error message context
- Verify both happy and sad paths

## Coverage Requirements

### Minimum Coverage Thresholds
- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Critical Areas
- All cycle calculation functions
- Date arithmetic operations
- Status determination logic
- Error handling paths

## Continuous Integration

### GitHub Actions Setup
```yaml
name: Subscription Cycle Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:subscription-cycle
      - uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```bash
# Install pre-commit hooks
npm install --save-dev husky lint-staged

# Add to package.json
"husky": {
  "hooks": {
    "pre-commit": "lint-staged"
  }
},
"lint-staged": {
  "*.{ts,tsx}": ["npm run test:unit", "npm run lint"]
}
```

## Test Maintenance

### Regular Reviews
- Monthly test suite reviews
- Update test data as requirements change
- Add tests for new features
- Remove obsolete tests

### Performance Monitoring
- Track test execution times
- Monitor coverage metrics
- Identify slow tests
- Optimize test data setup

## Conclusion

This comprehensive testing suite ensures the subscription cycle tracking system works correctly across all scenarios. The tests provide confidence in:

- Accurate cycle calculations
- Proper handling of edge cases
- Consistent user experience
- Reliable date arithmetic
- Robust error handling

Run the tests regularly and maintain high coverage to ensure system reliability.

---

For questions or issues, refer to the test output logs and generated reports in the `test-reports/` directory. 