# 🎯 ToyFlix Order Lifecycle - Comprehensive Knowledge Base

## 📋 Table of Contents
1. [Order System Architecture](#order-system-architecture)
2. [Order Types and Classifications](#order-types-and-classifications)
3. [Complete Order Lifecycle](#complete-order-lifecycle)
4. [Status Management System](#status-management-system)
5. [Database Schema and Tables](#database-schema-and-tables)
6. [User Interface Components](#user-interface-components)
7. [Payment Integration](#payment-integration)
8. [Inventory Management](#inventory-management)
9. [Subscription Cycle Management](#subscription-cycle-management)
10. [Admin Management Tools](#admin-management-tools)
11. [Technical Implementation](#technical-implementation)
12. [Business Logic and Rules](#business-logic-and-rules)

---

## 🏗️ Order System Architecture

### **Multi-Table Order System**
ToyFlix employs a sophisticated multi-table order architecture designed to handle different order contexts and business scenarios:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  rental_orders  │    │  queue_orders   │    │     orders      │
│  (Main System)  │    │ (Next Cycle)    │    │   (Legacy)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  order_items    │
                    │   (Legacy)      │
                    └─────────────────┘
```

### **Unified Order Service Architecture**
The system uses a **UnifiedOrderService** that intelligently routes orders based on context:

```typescript
export class UnifiedOrderService {
  static async createOrder(orderData: UnifiedOrderData): Promise<UnifiedOrderResponse> {
    const context = await this.determineOrderContext(orderData);
    
    switch (context) {
      case 'new_subscription':
        return this.createNewSubscription(orderData);
      case 'next_cycle':
        return this.createQueueOrder(orderData);
      case 'current_cycle':
        return this.updateCurrentCycle(orderData);
    }
  }
}
```

---

## 🎯 Order Types and Classifications

### **1. Primary Order Types**

#### **Subscription Orders (`subscription`)**
- **Discovery Delight**: ₹1,299/month - 3 toys + 1 book
- **Silver Pack**: ₹5,999/6 months - 3 toys + 1 book + big toys access
- **Gold Pack PRO**: ₹7,999/6 months - Premium toys, no age restrictions
- **Recurring Cycles**: 30-day rental periods with automatic progression

#### **One-Time Orders (`one_time`)**
- Non-recurring toy rentals
- Special occasion orders
- Gift orders without subscription commitment
- Single-use toy access

#### **Trial Orders (`trial`)**
- Free or discounted trial periods
- New customer onboarding experiences
- Limited-time promotional offers
- Conversion-focused experiences

#### **Ride-On Orders (`ride_on`)**
- High-value ride-on toys (bikes, cars, scooters)
- Special pricing and handling requirements
- Extended rental periods (typically longer than standard)
- Premium logistics handling

### **2. Queue Order Types**

#### **Next Cycle (`next_cycle`)**
- Selection for upcoming delivery cycle
- Days 24-34 selection window
- Automatic processing at cycle end

#### **Modification (`modification`)**
- Changes to existing queue selections
- Mid-cycle adjustments
- Customer-initiated changes

#### **Emergency Change (`emergency_change`)**
- Urgent queue modifications
- Admin-assisted changes
- Special circumstance handling

---

## 🔄 Complete Order Lifecycle

### **Phase 1: Order Creation**

#### **1.1 User Journey Initiation**
```
Landing Page → Plan Selection → Authentication → Toy Selection → Payment
```

#### **1.2 Order Context Determination**
```typescript
interface OrderContext {
  hasActiveSubscription: boolean;
  currentCycleStatus: 'active' | 'selection_open' | 'completed';
  requestSource: 'user' | 'admin' | 'system';
}
```

#### **1.3 Order Creation Logic**
```
┌─────────────────┐
│   Order Request │
└─────────────────┘
         │
    ┌────▼────┐
    │ Context │
    │Analysis │
    └────┬────┘
         │
    ┌────▼────────────────────┐
    │ No Active Subscription? │
    └────┬────────────────┬───┘
         │ YES            │ NO
    ┌────▼────┐      ┌────▼─────┐
    │ Create  │      │ Queue or │
    │ New Sub │      │ Update   │
    └─────────┘      └──────────┘
```

### **Phase 2: Payment Processing**

#### **2.1 Payment Flow Types**
- **Paid Orders**: Razorpay integration with signature verification
- **Free Orders**: Premium plan queue orders, promotional offers
- **Upgrade Orders**: Hybrid payment approach for plan changes

#### **2.2 Payment Verification**
```typescript
// Razorpay signature verification
const body = razorpay_order_id + "|" + razorpay_payment_id;
const expectedSignature = createHmac("sha256", RAZORPAY_KEY_SECRET)
  .update(body)
  .digest("hex");
```

#### **2.3 Order Confirmation**
- Payment verification triggers order confirmation
- Inventory deduction occurs automatically
- User entitlements are created/updated
- Notification systems activated

### **Phase 3: Order Fulfillment**

#### **3.1 Inventory Management**
```sql
-- Automatic inventory deduction on order confirmation
FUNCTION handle_rental_order_inventory_automation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    PERFORM deduct_inventory_from_toys_data(NEW.toys_data);
  END IF;
END;
```

#### **3.2 Fulfillment Pipeline**
```
Confirmed → Processing → Packed → Shipped → Out for Delivery → Delivered
```

#### **3.3 Delivery Tracking**
- Real-time status updates
- Customer notifications
- Delivery partner integration
- GPS tracking (where available)

### **Phase 4: Active Rental Period**

#### **4.1 Subscription Cycles**
- **30-day rental periods**
- **Selection windows**: Days 24-34
- **Automatic progression** to next cycle

#### **4.2 Customer Experience**
- Dashboard access to current toys
- Selection interface for next cycle
- Return scheduling
- Support access

### **Phase 5: Return Processing**

#### **5.1 Return Initiation**
- Customer-initiated returns
- Scheduled pickup coordination
- Return tracking

#### **5.2 Inventory Restoration**
```sql
-- Automatic inventory restoration on return
WHEN OLD.status != NEW.status AND NEW.status = 'returned' THEN
  PERFORM restore_inventory_from_toys_data(NEW.toys_data);
```

#### **5.3 Cycle Completion**
- Quality assessment
- Damage evaluation
- Next cycle preparation

---

## 📊 Status Management System

### **Order Status Progression**

#### **Primary Order Statuses**
```
pending → confirmed → processing → packed → shipped → 
out_for_delivery → delivered → active → returned → completed
```

| Status | Description | Triggers | Next Status |
|--------|-------------|----------|-------------|
| `pending` | Order created, awaiting payment | Order creation | `confirmed` |
| `confirmed` | Payment processed successfully | Payment verification | `processing` |
| `processing` | Order being prepared for shipment | Admin action | `packed` |
| `packed` | Toys packed, ready for dispatch | Warehouse action | `shipped` |
| `shipped` | Order dispatched to customer | Logistics partner | `out_for_delivery` |
| `out_for_delivery` | Order out for final delivery | Delivery partner | `delivered` |
| `delivered` | Order successfully delivered | Delivery confirmation | `active` |
| `active` | Subscription order currently active | Automatic | `returned` |
| `returned` | Toys returned by customer | Return processing | `completed` |
| `completed` | Order lifecycle completed | System/Admin | N/A |
| `cancelled` | Order cancelled | User/Admin action | N/A |
| `refunded` | Order refunded | Admin action | N/A |

#### **Queue Order Statuses**
```
processing → confirmed → preparing → shipped → delivered
```

#### **Payment Statuses**
```
pending → processing → completed/paid
       ↘ failed/cancelled
```

#### **Return Statuses**
```
not_returned → pending → partial/complete
                      ↘ overdue/lost/damaged
```

#### **Delivery Statuses**
```
pending → assigned → picked_up → in_transit → 
out_for_delivery → delivered
                ↘ failed → returned
```

### **Status Transition Rules**

#### **Automatic Transitions**
- `pending` → `confirmed`: Payment verification
- `delivered` → `active`: Subscription orders only
- `active` → Selection window opens: Day 24 of cycle

#### **Manual Transitions**
- Admin-controlled: `confirmed` → `processing` → `packed` → `shipped`
- Customer-initiated: `active` → `returned`

#### **System Transitions**
- Inventory triggers: Status changes affect stock levels
- Notification triggers: Status changes send customer updates
- Billing triggers: Status changes affect subscription billing

---

## 🗄️ Database Schema and Tables

### **Core Order Tables**

#### **1. rental_orders (Primary Table)**
```sql
CREATE TABLE rental_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL DEFAULT generate_order_number(),
  user_id UUID NOT NULL REFERENCES custom_users(id),
  
  -- Order Classification
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  order_type VARCHAR(20) NOT NULL DEFAULT 'subscription',
  subscription_plan VARCHAR(50),
  
  -- Financial Information
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  base_amount DECIMAL(10,2) DEFAULT 0.00,
  gst_amount DECIMAL(10,2) DEFAULT 0.00,
  discount_amount DECIMAL(10,2) DEFAULT 0.00,
  
  -- Payment Tracking
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_method VARCHAR(50),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  
  -- Cycle Management
  cycle_number INTEGER NOT NULL DEFAULT 1,
  rental_start_date DATE NOT NULL,
  rental_end_date DATE NOT NULL,
  
  -- Toy Data (JSONB)
  toys_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  toys_delivered_count INTEGER DEFAULT 0,
  toys_returned_count INTEGER DEFAULT 0,
  
  -- Address Information
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivery_instructions TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  confirmed_at TIMESTAMP,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP
);
```

#### **2. queue_orders (Next Cycle Management)**
```sql
CREATE TABLE queue_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES custom_users(id),
  original_subscription_id UUID REFERENCES subscriptions(id),
  
  -- Queue Classification
  queue_order_type VARCHAR(50) DEFAULT 'next_cycle',
  status VARCHAR(50) DEFAULT 'processing',
  
  -- Selection Data
  selected_toys JSONB NOT NULL DEFAULT '[]'::jsonb,
  queue_cycle_number INTEGER DEFAULT 1,
  
  -- Financial Information
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(50) DEFAULT 'pending',
  
  -- Delivery Information
  delivery_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Cycle Alignment
  subscription_cycle_id UUID REFERENCES subscription_cycles(id),
  subscription_aligned BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);
```

#### **3. orders (Legacy Table)**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES custom_users(id),
  status order_status DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  shipping_address JSONB,
  rental_start_date TIMESTAMP WITH TIME ZONE,
  rental_end_date TIMESTAMP WITH TIME ZONE,
  -- Being migrated to rental_orders
);
```

### **Supporting Tables**

#### **Subscription Management**
```sql
CREATE TABLE subscription_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  user_id UUID NOT NULL REFERENCES custom_users(id),
  
  -- Cycle Identification
  cycle_number INTEGER NOT NULL,
  cycle_start_date DATE NOT NULL,
  cycle_end_date DATE NOT NULL,
  
  -- Selection Window Tracking
  selection_window_start DATE NOT NULL,
  selection_window_end DATE NOT NULL,
  selection_opened_at TIMESTAMP WITH TIME ZONE,
  selection_closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Cycle Data
  selected_toys JSONB DEFAULT '[]'::jsonb,
  toys_count INTEGER DEFAULT 0,
  total_toy_value DECIMAL(10,2) DEFAULT 0.00,
  
  -- Status Tracking
  cycle_status TEXT DEFAULT 'upcoming',
  delivery_status TEXT DEFAULT 'pending',
  billing_status TEXT DEFAULT 'pending'
);
```

#### **Payment Tracking**
```sql
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES custom_users(id),
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'created',
  order_type TEXT NOT NULL,
  order_items JSONB
);
```

#### **Inventory Integration**
```sql
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toy_id UUID NOT NULL REFERENCES toys(id),
  order_id UUID REFERENCES orders(id),
  transaction_type TEXT NOT NULL, -- 'reserve', 'release', 'adjust'
  quantity_change INTEGER NOT NULL,
  previous_available INTEGER NOT NULL,
  new_available INTEGER NOT NULL
);
```

---

## 🎨 User Interface Components

### **Customer-Facing Components**

#### **1. Dashboard Components**

##### **SimpleDashboard.tsx**
- **Purpose**: Main customer dashboard
- **Features**:
  - Order history display
  - Current subscription status
  - Next delivery information
  - Cycle progress tracking

##### **SupabaseOnlyDashboard.tsx**
- **Purpose**: Unified dashboard using rental_orders
- **Features**:
  - Real-time order data
  - Subscription analytics
  - Cycle management
  - Queue order integration

##### **NextDeliveryUpdates.tsx**
- **Purpose**: Next cycle management interface
- **Features**:
  - Queue order display
  - Toy selection status
  - Delivery scheduling
  - Modification options

#### **2. Subscription Flow Components**

##### **SubscriptionFlowContent.tsx**
- **Purpose**: Complete subscription creation flow
- **Steps**:
  1. Plan selection
  2. Age group selection (if required)
  3. Toy selection
  4. Cart summary
  5. Payment processing

##### **ToySelectionWizard.tsx**
- **Purpose**: Multi-step toy selection interface
- **Features**:
  - Step-by-step selection process
  - Category-based organization
  - Real-time inventory checking
  - Selection validation

##### **PaymentFlow.tsx**
- **Purpose**: Payment processing interface
- **Features**:
  - Razorpay integration
  - Free order handling
  - Upgrade flow management
  - Address collection

#### **3. Order Management Components**

##### **OrderHistory.tsx**
- **Purpose**: Customer order history
- **Features**:
  - Order timeline
  - Status tracking
  - Download options
  - Support access

##### **NextCycleToySelection.tsx**
- **Purpose**: Queue order management
- **Features**:
  - Next cycle toy selection
  - Inventory validation
  - Selection limits
  - Queue submission

### **Admin-Facing Components**

#### **1. Order Management**

##### **AdminOrders.tsx**
- **Purpose**: Comprehensive order management
- **Features**:
  - Advanced filtering and search
  - Bulk operations
  - Status management
  - Performance monitoring

##### **ComprehensiveOrderEditor.tsx**
- **Purpose**: Detailed order editing interface
- **Features**:
  - Order information management
  - Financial calculations
  - Status transitions
  - Customer information
  - Toy management

##### **ComprehensiveOrderDetails.tsx**
- **Purpose**: Detailed order view
- **Features**:
  - Complete order information
  - Customer details
  - Payment information
  - Order timeline
  - Communication history

#### **2. Specialized Management**

##### **AdminDispatch.tsx**
- **Purpose**: Order fulfillment management
- **Features**:
  - Dispatch tracking
  - Delivery coordination
  - Status updates
  - Route optimization

##### **UserLifecycleManager.tsx**
- **Purpose**: Customer lifecycle management
- **Features**:
  - Order history analysis
  - Subscription management
  - Customer communication
  - Lifecycle actions

---

## 💳 Payment Integration

### **Razorpay Integration Architecture**

#### **Payment Flow Process**
```typescript
// 1. Order Creation
const razorpayOrder = await razorpay.orders.create({
  amount: totalAmount * 100, // Convert to paise
  currency: 'INR',
  receipt: `order_${Date.now()}`
});

// 2. Payment Processing
const options = {
  key: RAZORPAY_KEY_ID,
  amount: razorpayOrder.amount,
  currency: razorpayOrder.currency,
  order_id: razorpayOrder.id,
  handler: handlePaymentSuccess
};

// 3. Payment Verification
const signature = createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(`${order_id}|${payment_id}`)
  .digest('hex');
```

#### **Payment Status Management**

##### **Payment Statuses**
- `pending`: Payment initiated but not completed
- `processing`: Payment being processed by gateway
- `completed`/`paid`: Payment successful
- `failed`: Payment failed
- `cancelled`: Payment cancelled by user
- `refunded`: Payment refunded
- `partially_refunded`: Partial refund processed

##### **Payment Verification Process**
```typescript
// supabase/functions/razorpay-verify/index.ts
export async function verifyPayment(paymentData) {
  // 1. Verify signature
  const isValid = verifySignature(paymentData);
  
  // 2. Update payment status
  await updatePaymentStatus(paymentData.order_id, 'paid');
  
  // 3. Create/update order
  await OrderService.createOrder(orderData);
  
  // 4. Update inventory
  await InventoryService.deductInventory(orderData.toys);
  
  // 5. Send notifications
  await NotificationService.sendOrderConfirmation(orderData);
}
```

### **Free Order Processing**

#### **Free Order Scenarios**
1. **Premium Plan Queue Orders**: Silver/Gold plan next cycle selections
2. **Promotional Offers**: Discount codes with 100% off
3. **Admin-Created Orders**: Manual order creation
4. **Trial Subscriptions**: Free trial periods

#### **Free Order Logic**
```typescript
// Bypass payment for specific scenarios
if (finalTotalAmount === 0 || isPremiumPlanQueueOrder) {
  await OrderService.createFreeOrder(orderData);
  return { success: true, orderId: newOrder.id };
}
```

### **Subscription Upgrade Payments**

#### **Hybrid Payment Approach**
```typescript
// Handle subscription upgrades with prorated billing
if (isUpgradeFlow) {
  const prorationAmount = calculateProration(currentPlan, newPlan);
  
  if (prorationAmount > 0) {
    // Process payment for difference
    await processUpgradePayment(prorationAmount);
  } else {
    // Handle as free upgrade
    await processUpgradeWithoutPayment();
  }
}
```

---

## 📦 Inventory Management

### **Automatic Inventory Integration**

#### **Inventory Automation System**
```sql
-- Trigger function for automatic inventory management
CREATE OR REPLACE FUNCTION handle_rental_order_inventory_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle different order status changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    CASE NEW.status
      WHEN 'confirmed' THEN
        -- Deduct inventory when order confirmed
        PERFORM deduct_inventory_from_toys_data(NEW.toys_data);
      WHEN 'cancelled' THEN
        -- Restore inventory when order cancelled
        PERFORM restore_inventory_from_toys_data(NEW.toys_data);
      WHEN 'returned' THEN
        -- Restore inventory when toys returned
        PERFORM restore_inventory_from_toys_data(NEW.toys_data);
    END CASE;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

#### **Inventory Transaction Logging**
```sql
-- Log all inventory movements
INSERT INTO inventory_movements (
  toy_id,
  movement_type,
  quantity_change,
  reference_type,
  reference_id,
  notes,
  created_at
) VALUES (
  toy_id,
  'RENTAL_OUT',
  -quantity,
  'rental_order',
  order_id,
  'Automatic deduction on order confirmation',
  now()
);
```

### **Stock Management Features**

#### **Real-Time Stock Tracking**
- **Available Quantity**: Ready for rental
- **Rented Quantity**: Currently with customers
- **Total Quantity**: Complete inventory count
- **Reorder Level**: Minimum stock threshold

#### **Overselling Prevention**
```typescript
// Validate inventory before order creation
const validateInventory = async (toys: ToyData[]) => {
  for (const toy of toys) {
    const availableStock = await getAvailableStock(toy.id);
    if (availableStock < toy.quantity) {
      throw new Error(`Insufficient stock for ${toy.name}`);
    }
  }
};
```

#### **Inventory Alerts**
- **Low Stock Alerts**: When inventory falls below reorder level
- **Out of Stock Alerts**: When inventory reaches zero
- **Damage Alerts**: When toys are reported damaged
- **Overdue Return Alerts**: When toys are not returned on time

---

## 🔄 Subscription Cycle Management

### **30-Day Cycle System**

#### **Cycle Structure**
```
Day 1-23: Toy Usage Period
Day 24-30: Selection Window (Next Cycle)
Day 31: Cycle End → New Cycle Begins
```

#### **Selection Window Management**
```sql
-- Auto-calculated selection window status
is_selection_window_active BOOLEAN GENERATED ALWAYS AS (
  CASE 
    WHEN rental_start_date IS NULL THEN false
    ELSE (
      GREATEST(1, EXTRACT(DAY FROM (CURRENT_DATE - rental_start_date)) + 1) >= 24 
      AND GREATEST(1, EXTRACT(DAY FROM (CURRENT_DATE - rental_start_date)) + 1) <= 30
      AND returned_date IS NULL
    )
  END
) STORED
```

#### **Cycle Progression Logic**
```typescript
interface CycleInfo {
  dayInCycle: number;
  isCurrentCycle: boolean;
  isSelectionWindow: boolean;
  progressPercentage: number;
  daysRemaining: number;
}

const calculateCycleInfo = (startDate: Date): CycleInfo => {
  const today = new Date();
  const dayInCycle = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const isSelectionWindow = dayInCycle >= 24 && dayInCycle <= 30;
  const progressPercentage = Math.min((dayInCycle / 30) * 100, 100);
  
  return {
    dayInCycle,
    isCurrentCycle: dayInCycle <= 30,
    isSelectionWindow,
    progressPercentage,
    daysRemaining: Math.max(30 - dayInCycle, 0)
  };
};
```

### **Queue Order Integration**

#### **Queue Order Creation**
```typescript
// Create queue order for next cycle
const createQueueOrder = async (userId: string, selectedToys: Toy[]) => {
  const queueOrder = await supabase
    .from('queue_orders')
    .insert({
      user_id: userId,
      queue_order_type: 'next_cycle',
      selected_toys: selectedToys,
      status: 'processing',
      // Align with current subscription cycle
      subscription_cycle_id: currentCycle.id,
      subscription_aligned: true
    });
};
```

#### **Cycle Transition Process**
```
Current Cycle Ends → Queue Order Activated → New Cycle Begins
```

### **Subscription Status Management**

#### **Subscription Statuses**
- `active`: Normal subscription operation
- `paused`: Temporarily suspended
- `cancelled`: Subscription terminated
- `expired`: Subscription period ended

#### **Cycle Status Tracking**
- `upcoming`: Cycle scheduled but not started
- `active`: Current active cycle
- `selection_open`: Selection window active
- `selection_closed`: Selection window closed
- `preparing`: Toys being prepared for delivery
- `shipped`: Cycle toys shipped
- `delivered`: Cycle toys delivered
- `completed`: Cycle completed successfully
- `cancelled`: Cycle cancelled

---

## 👨‍💼 Admin Management Tools

### **Order Management Dashboard**

#### **AdminOrders.tsx Features**
- **Advanced Filtering**: Search by customer, phone, email, order number, date ranges
- **Multi-Select Filters**: Status, payment status, subscription plans
- **Bulk Operations**: Status updates, exports, notifications
- **Performance Monitoring**: Real-time metrics and query optimization
- **Order Details**: Comprehensive order information display

#### **Order Creation Tools**
- **Manual Order Creation**: Admin-initiated orders
- **Customer Selection**: Choose existing customers
- **Toy Selection**: Real-time inventory checking
- **Pricing Control**: Custom pricing and discounts
- **Status Setting**: Initial order status configuration

### **Order Processing Workflow**

#### **Status Management**
```typescript
// Admin order status updates
const updateOrderStatus = async (orderId: string, newStatus: string) => {
  // Update order status
  await OrderService.updateOrderStatus(orderId, newStatus);
  
  // Trigger inventory updates
  await InventoryService.processStatusChange(orderId, newStatus);
  
  // Send customer notifications
  await NotificationService.sendStatusUpdate(orderId, newStatus);
  
  // Log admin action
  await AuditService.logStatusChange(orderId, newStatus, adminId);
};
```

#### **Bulk Operations**
- **Bulk Status Updates**: Update multiple orders simultaneously
- **Bulk Exports**: Export order data in various formats
- **Bulk Notifications**: Send notifications to multiple customers
- **Bulk Cancellations**: Cancel multiple orders with inventory restoration

### **Analytics and Reporting**

#### **Order Analytics**
- **Order Volume**: Daily, weekly, monthly order counts
- **Revenue Tracking**: Revenue by period, plan, customer
- **Status Distribution**: Order status breakdown
- **Fulfillment Metrics**: Processing time, delivery performance

#### **Customer Analytics**
- **Lifetime Value**: Customer subscription value
- **Order History**: Complete customer order timeline
- **Subscription Patterns**: Plan preferences, upgrade patterns
- **Return Behavior**: Return rates, timing patterns

### **Customer Support Tools**

#### **Order Investigation**
- **Complete Order Timeline**: Full order history with timestamps
- **Payment Tracking**: Payment status and transaction details
- **Delivery Tracking**: Real-time delivery status
- **Customer Communication**: Integrated communication history

#### **Issue Resolution**
- **Order Modifications**: Change orders post-creation
- **Refund Processing**: Handle refunds and partial refunds
- **Replacement Orders**: Create replacement orders for issues
- **Inventory Adjustments**: Manual inventory corrections

---

## ⚙️ Technical Implementation

### **Service Layer Architecture**

#### **OrderService.ts**
```typescript
export class OrderService {
  // Main order creation
  static async createOrder(orderData: CreateOrderData): Promise<CreatedOrder>
  
  // Free order processing
  static async createFreeOrder(orderData: CreateOrderData): Promise<CreatedOrder>
  
  // Status management
  static async updateOrderStatus(orderId: string, status: string): Promise<void>
  
  // Order retrieval
  static async getOrderById(orderId: string): Promise<Order>
}
```

#### **QueueOrderService.ts**
```typescript
export class QueueOrderService {
  // Queue order creation
  static async createQueueOrder(orderData: QueueOrderData): Promise<QueueOrder>
  
  // Next delivery info
  static async getNextDeliveryInfo(userId: string): Promise<NextDeliveryInfo>
  
  // Queue order management
  static async updateQueueOrderStatus(orderId: string, status: string): Promise<boolean>
}
```

#### **UnifiedOrderService.ts**
```typescript
export class UnifiedOrderService {
  // Context-aware order creation
  static async createOrder(orderData: UnifiedOrderData): Promise<UnifiedOrderResponse>
  
  // Order context determination
  private static async determineOrderContext(orderData: UnifiedOrderData): Promise<OrderContext>
  
  // New subscription creation
  private static async createNewSubscription(orderData: UnifiedOrderData): Promise<UnifiedOrderResponse>
  
  // Queue order creation
  private static async createQueueOrder(orderData: UnifiedOrderData): Promise<UnifiedOrderResponse>
}
```

### **Database Integration**

#### **Supabase Integration**
```typescript
// Real-time subscriptions for live updates
const { data, error } = await supabase
  .from('rental_orders')
  .select('*')
  .eq('user_id', userId)
  .order('cycle_number', { ascending: false });

// Row Level Security for data protection
CREATE POLICY "Users can view own orders" 
  ON rental_orders FOR SELECT 
  USING (auth.uid() = user_id);
```

#### **Trigger Functions**
```sql
-- Automatic inventory management
CREATE TRIGGER trigger_rental_order_inventory_automation
  AFTER INSERT OR UPDATE ON rental_orders
  FOR EACH ROW EXECUTE FUNCTION handle_rental_order_inventory_automation();

-- Audit logging
CREATE TRIGGER trigger_order_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON rental_orders
  FOR EACH ROW EXECUTE FUNCTION log_order_changes();
```

### **React Query Integration**

#### **Data Fetching Hooks**
```typescript
// Order dashboard data
export const useRentalOrdersDashboard = () => {
  return useQuery<DashboardData>({
    queryKey: ['rental-orders-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      // Fetch and process order data
    }
  });
};

// Real-time order updates
export const useOrderUpdates = (orderId: string) => {
  return useQuery({
    queryKey: ['order-updates', orderId],
    queryFn: () => OrderService.getOrderById(orderId),
    refetchInterval: 30000 // Refetch every 30 seconds
  });
};
```

#### **Optimistic Updates**
```typescript
// Optimistic status updates for better UX
const updateOrderOptimistically = (orderId: string, newStatus: string) => {
  queryClient.setQueryData(['orders'], (oldData) => {
    return oldData?.map(order => 
      order.id === orderId 
        ? { ...order, status: newStatus }
        : order
    );
  });
};
```

### **Error Handling and Logging**

#### **Comprehensive Error Handling**
```typescript
try {
  await OrderService.createOrder(orderData);
} catch (error) {
  console.error('Order creation failed:', error);
  
  // Log error for debugging
  await ErrorLogger.log({
    action: 'order_creation',
    error: error.message,
    context: orderData,
    userId: user.id
  });
  
  // Show user-friendly message
  toast.error('Failed to create order. Please try again.');
}
```

#### **Performance Monitoring**
```typescript
// Query performance tracking
const performanceMetrics = {
  queryTime: Date.now() - startTime,
  recordCount: data.length,
  cacheHit: fromCache
};
```

---

## 📋 Business Logic and Rules

### **Order Creation Rules**

#### **Context-Based Order Creation**
1. **New Users**: Always create new subscription in `rental_orders`
2. **Existing Users**: 
   - Active subscription + selection window open → Update current cycle
   - Active subscription + selection window closed → Create queue order
   - No active subscription → Create new subscription

#### **Payment Rules**
1. **Premium Plan Queue Orders**: Always free (Silver Pack, Gold Pack PRO)
2. **Promotional Offers**: Apply discount codes and coupons
3. **Upgrade Flows**: Calculate prorated amounts
4. **Trial Orders**: Special pricing and terms

### **Inventory Rules**

#### **Stock Reservation**
1. **Order Creation**: Reserve inventory immediately
2. **Payment Failure**: Release reserved inventory
3. **Order Cancellation**: Return inventory to available pool
4. **Toy Return**: Restore inventory after quality check

#### **Overselling Prevention**
1. **Real-time Validation**: Check stock before allowing selection
2. **Atomic Operations**: Ensure inventory changes are atomic
3. **Conflict Resolution**: Handle concurrent order attempts

### **Subscription Cycle Rules**

#### **Cycle Timing**
1. **30-Day Cycles**: Fixed 30-day rental periods
2. **Selection Window**: Days 24-34 for next cycle selection
3. **Auto-Close**: Selection window closes automatically after day 34
4. **Grace Period**: Admin can manually extend selection windows

#### **Queue Order Processing**
1. **Premium Plans**: Queue orders are free
2. **Basic Plans**: Queue orders may have charges
3. **Cycle Alignment**: Queue orders align with subscription cycles
4. **Processing Priority**: Process queue orders at cycle end

### **Customer Experience Rules**

#### **Dashboard Display**
1. **Current Orders**: Show active and recent orders
2. **Cycle Progress**: Display cycle timeline and progress
3. **Selection Status**: Show selection window status
4. **Next Delivery**: Display upcoming delivery information

#### **Notification Rules**
1. **Order Confirmation**: Immediate notification after payment
2. **Status Updates**: Notify on significant status changes
3. **Selection Reminders**: Remind during selection window
4. **Return Reminders**: Notify before cycle end

### **Admin Management Rules**

#### **Order Modification**
1. **Status Changes**: Admin can update order status
2. **Financial Adjustments**: Admin can modify amounts
3. **Inventory Corrections**: Admin can adjust inventory
4. **Customer Communication**: Admin can send notifications

#### **Audit and Compliance**
1. **Action Logging**: Log all admin actions
2. **Change Tracking**: Track all order modifications
3. **Data Retention**: Maintain order history
4. **Privacy Compliance**: Protect customer data

---

## 🎯 Key Takeaways for AI Development

### **System Complexity**
- **Multi-table Architecture**: Orders span multiple tables based on context
- **Status Management**: Complex status transitions with business rules
- **Real-time Updates**: Live data synchronization across components
- **Inventory Integration**: Automatic stock management with order lifecycle

### **Business Logic Priority**
- **Customer Experience**: Seamless subscription and toy selection flow
- **Inventory Accuracy**: Prevent overselling with real-time stock tracking
- **Payment Security**: Secure payment processing with verification
- **Subscription Cycles**: 30-day cycles with selection windows

### **Technical Patterns**
- **Service Layer**: Business logic encapsulated in service classes
- **React Query**: Data fetching and caching optimization
- **Optimistic Updates**: Better UX with immediate UI updates
- **Error Handling**: Comprehensive error logging and user feedback

### **Admin Capabilities**
- **Order Management**: Complete order lifecycle control
- **Customer Support**: Tools for issue resolution
- **Analytics**: Business intelligence and reporting
- **Bulk Operations**: Efficient mass operations

This comprehensive knowledge base provides complete context for AI agents working with the ToyFlix order lifecycle system, enabling informed decision-making and effective code modifications.
