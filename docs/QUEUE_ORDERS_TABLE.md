# Queue Orders Table Documentation

## Overview

The `queue_orders` table is a dedicated table for tracking subscription modification orders (queue updates) in the ToyFlix application. This table is separate from the main `orders` table to provide better data separation and allow for queue-specific tracking and management.

## Table Structure

### Primary Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `order_number` | VARCHAR(50) | Unique order identifier (format: QU-YYYYMMDD-XXXX) |
| `user_id` | UUID | Foreign key to `auth.users` table |
| `original_subscription_id` | UUID | Foreign key to `subscriptions` table |

### Queue-Specific Fields

| Field | Type | Description |
|-------|------|-------------|
| `selected_toys` | JSONB | Array of selected toys with their details |
| `queue_cycle_number` | INTEGER | Which delivery cycle this order is for |
| `queue_order_type` | VARCHAR(50) | Type of queue operation |
| `current_plan_id` | VARCHAR(100) | User's subscription plan at time of order |
| `age_group` | VARCHAR(20) | Target age group for toy selection |

### Financial Fields

| Field | Type | Description |
|-------|------|-------------|
| `total_amount` | DECIMAL(10,2) | Final amount to be charged |
| `base_amount` | DECIMAL(10,2) | Base amount before taxes and discounts |
| `gst_amount` | DECIMAL(10,2) | GST/tax amount |
| `coupon_discount` | DECIMAL(10,2) | Discount applied from coupons |
| `applied_coupon` | VARCHAR(100) | Coupon code used |

### Payment Tracking

| Field | Type | Description |
|-------|------|-------------|
| `payment_status` | VARCHAR(50) | Current payment status |
| `payment_id` | VARCHAR(255) | Payment gateway transaction ID |
| `razorpay_order_id` | VARCHAR(255) | Razorpay order reference |

### Delivery Information

| Field | Type | Description |
|-------|------|-------------|
| `delivery_address` | JSONB | Complete delivery address object |
| `delivery_instructions` | TEXT | Special delivery instructions |
| `estimated_delivery_date` | DATE | Expected delivery date |
| `actual_delivery_date` | DATE | Actual delivery date (when fulfilled) |

### Status and Metadata

| Field | Type | Description |
|-------|------|-------------|
| `status` | VARCHAR(50) | Order processing status |
| `created_at` | TIMESTAMP | Order creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |
| `processed_at` | TIMESTAMP | When order was processed |
| `created_by` | UUID | User who created the order |
| `notes` | TEXT | Additional notes or comments |

## Enums and Constraints

### Queue Order Types
- `next_cycle` - Selection for next delivery cycle
- `modification` - Modification of existing queue
- `emergency_change` - Emergency queue change

### Payment Status
- `pending` - Payment not yet processed
- `paid` - Payment completed successfully
- `failed` - Payment failed
- `refunded` - Payment refunded
- `cancelled` - Payment cancelled

### Order Status
- `processing` - Order being processed
- `confirmed` - Order confirmed
- `preparing` - Toys being prepared
- `shipped` - Order shipped
- `delivered` - Order delivered
- `cancelled` - Order cancelled

## Database Features

### Automatic Order Number Generation
Orders automatically receive unique order numbers in the format `QU-YYYYMMDD-XXXX` where:
- `QU` = Queue order prefix
- `YYYYMMDD` = Creation date
- `XXXX` = Random 4-digit number

### Row Level Security (RLS)
The table has comprehensive RLS policies:
- Users can only access their own orders
- Admins can access all orders
- Proper insert/update/select permissions

### Indexes
Optimized indexes for performance:
- User ID lookup
- Subscription ID lookup
- Order status filtering
- Payment status filtering
- Creation date sorting
- Order number lookup

### Triggers
- Auto-generation of order numbers on insert
- Automatic `updated_at` timestamp management

## Integration with Application

### OrderService Methods

#### Creating Queue Orders
```typescript
const orderResult = await OrderService.createQueueOrder({
  userId: 'user-uuid',
  originalSubscriptionId: 'subscription-uuid',
  selectedToys: [
    { id: 'toy1', name: 'Toy Name', category: 'Building' }
  ],
  queueOrderType: 'next_cycle',
  currentPlanId: 'silver-pack',
  totalAmount: 0.00,
  baseAmount: 0.00,
  gstAmount: 0.00,
  couponDiscount: 0.00,
  appliedCoupon: 'QUEUE_BYPASS',
  deliveryInstructions: 'Leave at door',
  shippingAddress: addressObject,
  ageGroup: '3-5',
  cycleNumber: 2
});
```

#### Fetching Queue Orders
```typescript
// Get user's queue orders
const { data: queueOrders } = await supabase
  .from('queue_orders')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Get queue orders with user info (using view)
const { data: queueOrdersWithUser } = await supabase
  .from('queue_orders_with_user_info')
  .select('*')
  .eq('user_id', userId);
```

### Queue Order Workflow

1. **User initiates queue modification** via Queue Management UI
2. **Toy selection** using ToySelectionWizard
3. **Payment processing** with conditional pricing:
   - Silver/Gold plans: ₹0 with `QUEUE_BYPASS` coupon
   - Discovery Delight: Normal payment required
4. **Queue order creation** in `queue_orders` table
5. **Order confirmation** with delivery details
6. **Fulfillment tracking** through status updates

## Migration and Setup

### Running the Migration

#### Option 1: Using Supabase CLI (Recommended)
```bash
./scripts/apply-queue-orders-migration.sh
```

#### Option 2: Using Node.js Script
```bash
node scripts/run-queue-orders-migration.js
```

### Post-Migration Steps

1. **Update TypeScript definitions**:
   ```bash
   supabase gen types typescript --linked > src/types/supabase.ts
   ```

2. **Update application imports** to use new types

3. **Test queue order creation** in development environment

### Sample Data

```sql
-- Sample queue order for testing
INSERT INTO queue_orders (
    user_id,
    original_subscription_id,
    selected_toys,
    total_amount,
    payment_status,
    delivery_address,
    queue_cycle_number,
    current_plan_id,
    age_group,
    queue_order_type,
    status
) VALUES (
    'user-uuid-here',
    'subscription-uuid-here',
    '[{"id": "toy1", "name": "Educational Blocks", "category": "building"}]'::jsonb,
    0.00,
    'paid',
    '{"first_name": "John", "last_name": "Doe", "address_line1": "123 Main St", "city": "Mumbai", "state": "Maharashtra", "zip_code": "400001"}'::jsonb,
    2,
    'silver-pack',
    '3-5',
    'next_cycle',
    'confirmed'
);
```

## Administrative Queries

### Common Analytics Queries

```sql
-- Queue orders summary by plan
SELECT 
    current_plan_id,
    COUNT(*) as total_orders,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value
FROM queue_orders 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY current_plan_id;

-- Queue order types distribution
SELECT 
    queue_order_type,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM queue_orders), 2) as percentage
FROM queue_orders
GROUP BY queue_order_type;

-- Monthly queue order trends
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as orders,
    SUM(total_amount) as revenue
FROM queue_orders
GROUP BY month
ORDER BY month DESC;
```

### Queue Order Management

```sql
-- Find pending queue orders
SELECT * FROM queue_orders_with_user_info 
WHERE payment_status = 'pending' 
ORDER BY created_at DESC;

-- Update order status
UPDATE queue_orders 
SET status = 'confirmed', processed_at = NOW() 
WHERE id = 'order-uuid';

-- Orders requiring attention
SELECT * FROM queue_orders 
WHERE status = 'processing' 
AND created_at < NOW() - INTERVAL '1 hour';
```

## Error Handling

### Common Issues and Solutions

1. **"Table not found" errors**:
   - Run the migration script
   - Verify table exists in database
   - Check RLS policies

2. **"Permission denied" errors**:
   - Verify user authentication
   - Check RLS policies
   - Ensure proper user roles

3. **"Order number generation failed"**:
   - Check `generate_queue_order_number()` function
   - Verify triggers are active
   - Check for database connection issues

## Security Considerations

### Data Protection
- All sensitive data encrypted in JSONB fields
- RLS policies prevent unauthorized access
- Audit trail through creation timestamps

### Access Control
- User-level access to own orders only
- Admin-level access for management
- API key protection for external integrations

### Privacy
- PII stored in encrypted JSON fields
- Delivery addresses protected by RLS
- Payment information limited to transaction IDs

## Performance Optimization

### Recommended Indexes
```sql
-- Additional indexes for heavy queries
CREATE INDEX idx_queue_orders_plan_status ON queue_orders(current_plan_id, status);
CREATE INDEX idx_queue_orders_delivery_date ON queue_orders(estimated_delivery_date);
CREATE INDEX idx_queue_orders_payment_date ON queue_orders(payment_status, created_at);
```

### Query Optimization
- Use `queue_orders_with_user_info` view for user data joins
- Limit large result sets with pagination
- Use status filters for active orders only

## Future Enhancements

### Planned Features
- [ ] Automated delivery scheduling
- [ ] Advanced analytics dashboard
- [ ] Queue order templates
- [ ] Bulk order operations
- [ ] Integration with inventory management
- [ ] Customer communication automation

### Technical Improvements
- [ ] Materialized views for analytics
- [ ] Automated archiving of old orders
- [ ] Enhanced RLS policies
- [ ] Webhook notifications
- [ ] API rate limiting
- [ ] Advanced caching strategies

## Support and Troubleshooting

For issues with queue orders:
1. Check application logs for error details
2. Verify database connectivity
3. Review RLS policy conflicts
4. Check user permissions
5. Validate input data format

Contact the development team for database-level issues or migration problems. 