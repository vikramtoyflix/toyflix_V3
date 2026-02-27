# Toyflix Customer Order History Frontend

This React frontend demonstrates how to use the unified database views to display customer order history that seamlessly combines current and historical data.

## 🎯 What This Demonstrates

- **Unified Customer Profiles**: Shows enriched customer data combining current system + historical records
- **Historical Order Display**: Current orders first, then historical orders (chronological)
- **Smart Data Integration**: Visual indicators for data sources (current vs. historical)
- **Advanced Search & Filtering**: Search by name, email, phone with tier-based filtering
- **Real-time Statistics**: Dashboard showing combined data insights

## 🏗️ Architecture Overview

```
Frontend Components:
├── App.tsx                    # Main application with routing
├── CustomerList.tsx           # Browse/search customers
├── CustomerOrderHistory.tsx   # Detailed customer view
├── supabaseClient.ts         # Database connection
└── package.json              # Dependencies

Database Views Used:
├── enriched_customer_view           # Complete customer profiles
├── unified_order_history           # All orders (current + historical)
├── customer_business_intelligence  # Analytics data
└── order_items_detail_view        # Order line items
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Environment Setup

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Views Required

Make sure these views exist in your Supabase database:

```sql
-- Enriched Customer View (combines current + historical)
CREATE VIEW enriched_customer_view AS ...

-- Unified Order History (current orders first, then historical)
CREATE VIEW unified_order_history AS ...

-- Business Intelligence View (for analytics)
CREATE VIEW customer_business_intelligence AS ...

-- Order Items Detail View (with product names)
CREATE VIEW order_items_detail_view AS ...
```

### 4. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Visit `http://localhost:3000` to see the application.

## 📱 Features Walkthrough

### Customer Directory

The main page shows a searchable, filterable list of customers:

- **Search**: By name, email, username, or phone number
- **Filter**: By customer tier (high_value, regular, new)
- **Sort**: By lifetime value, order count, name, or recent activity
- **Visual Indicators**: 
  - 🔵 Blue dot = Current system data
  - 🟠 Orange dot = Historical data only  
  - 🟢 Green dot = Merged data (both sources)

### Customer Profile View

Click any customer to see their detailed profile:

- **Enhanced Profile**: Shows combined lifetime value and order counts
- **Historical Indicators**: Clear labels for historical vs. current data
- **Order Timeline**: Current orders listed first, then historical (newest to oldest)
- **Order Details**: Click "View Details" to see individual line items

### Smart Data Integration

The frontend automatically handles:

- **Data Source Awareness**: Knows whether to query current or historical tables
- **Visual Distinction**: Different colors/badges for data sources
- **Aggregate Statistics**: Shows combined totals with historical breakdown
- **Seamless Navigation**: No user confusion about data origins

## 🔍 Key Code Examples

### Fetching Enriched Customer Data

```typescript
// Get complete customer profile (current + historical combined)
const { data: customerData, error } = await supabase
  .from('enriched_customer_view')
  .select('*')
  .eq('id', customerId)
  .single();
```

### Fetching Unified Order History

```typescript
// Get all orders sorted correctly (current first, then historical by date)
const { data: ordersData, error } = await supabase
  .from('unified_order_history')
  .select('*')
  .eq('customer_id', customerId)
  .order('is_current', { ascending: false }) // Current first
  .order('order_date', { ascending: false }); // Then by date
```

### Smart Order Items Query

```typescript
// Query appropriate table based on order source
const { data: itemsData, error } = await supabase
  .from('order_items_detail_view')
  .select('*')
  .eq('order_id', orderId);
```

## 🎨 UI/UX Features

### Visual Data Source Indicators

- **Customer Cards**: Color-coded dots showing data source
- **Order List**: Current vs. Historical labels
- **Statistics**: Separate counters for historical data
- **Profile Headers**: Badges indicating merged data

### Advanced Filtering

```typescript
// Multiple filter criteria
const filteredCustomers = customers.filter(customer => {
  const matchesSearch = 
    customer.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone_normalized?.includes(searchTerm);
  
  const matchesTier = filterTier === 'all' || customer.customer_tier === filterTier;
  
  return matchesSearch && matchesTier;
});
```

### Responsive Design

- **Mobile-First**: Works on all screen sizes
- **Touch-Friendly**: Large tap targets for mobile
- **Progressive Enhancement**: Advanced features on larger screens

## 📊 Business Intelligence Integration

### Customer Statistics Dashboard

Shows real-time aggregate data:

```typescript
// Example dashboard stats
const stats = {
  total_customers: 1004,        // All customers
  historical_customers: 850,    // With historical data
  current_customers: 154,       // Current system only
  total_orders: 12563,         // Combined order count
  total_revenue: ₹28.5L,       // Combined revenue
  historical_revenue: ₹19.2L   // Historical contribution
};
```

### Customer Segmentation

- **High Value**: Premium customers with high lifetime value
- **Regular**: Standard customers with moderate activity
- **New**: Recently acquired customers
- **Historical**: Customers with rich historical data

## 🔐 Security Considerations

### Row Level Security (RLS)

```sql
-- Example RLS policy for customer data
CREATE POLICY "Users can view customer data" ON enriched_customer_view
  FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() IN (
    SELECT user_id FROM admin_users
  ));
```

### Data Privacy

- **Sensitive Data**: Phone numbers are normalized but not exposed in logs
- **Access Control**: Views respect existing RLS policies
- **Audit Trail**: All data access is logged through Supabase

## 🚀 Deployment

### Next.js Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

```env
# Production environment
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

## 🎯 Benefits Achieved

1. **No Data Silos**: Historical and current data unified seamlessly
2. **Enhanced Customer Service**: Complete customer history at a glance
3. **Better Analytics**: Richer insights from combined datasets
4. **Improved UX**: Clear visual distinction between data sources
5. **Future-Proof**: Easy to extend with additional data sources

## 🔧 Customization

### Adding New Data Sources

To integrate additional historical data:

1. Create migration tables for new data
2. Update unified views to include new sources
3. Add visual indicators in the frontend
4. Extend filtering/search capabilities

### Styling Customization

The components use Tailwind CSS classes. Customize by:

- Modifying the color scheme in `tailwind.config.js`
- Updating component styles in individual `.tsx` files
- Adding custom CSS for brand-specific styling

## 📈 Performance Optimizations

- **Efficient Queries**: Views are optimized for fast retrieval
- **Pagination**: Large datasets are paginated automatically
- **Caching**: Supabase handles query caching
- **Lazy Loading**: Order details loaded on demand

## 🤝 Contributing

To extend this example:

1. Add new components for additional features
2. Enhance the unified views with more data sources
3. Improve the analytics dashboard
4. Add export/reporting capabilities

---

This frontend example showcases the power of unified database views to create seamless customer experiences that bridge historical and current data without complexity for end users. 