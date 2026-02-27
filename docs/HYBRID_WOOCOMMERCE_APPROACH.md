# Hybrid WooCommerce + Supabase Approach

## 🎯 **Solution Overview**

The hybrid approach solves the user ID mismatch problem by allowing the new React website to seamlessly work with both existing WooCommerce users and new Supabase users. This eliminates the need for complex data migration while preserving all historical data.

## 🏗️ **Architecture**

```
User Authentication Flow:
├── User enters phone number
├── System checks WooCommerce database first
│   ├── ✅ Found → Authenticate as WooCommerce user
│   │   ├── Load historical data from WooCommerce
│   │   ├── Create new orders in Supabase (with WC reference)
│   │   └── Gradual migration to full Supabase
│   └── ❌ Not found → Check Supabase database
│       ├── ✅ Found → Authenticate as Supabase user
│       └── ❌ Not found → Create new Supabase user
```

## 📁 **Files Created**

### 1. **Core Services**
- `src/services/woocommerceService.ts` - WooCommerce database connection and queries
- `src/hooks/useHybridAuth.ts` - Authentication that checks both systems
- `src/hooks/useHybridOrders.ts` - Orders from both WooCommerce and Supabase

### 2. **Configuration**
- `env.hybrid.template` - Environment variables template
- `scripts/test-hybrid-approach.js` - Testing script

### 3. **Documentation**
- `docs/HYBRID_WOOCOMMERCE_APPROACH.md` - This documentation

## ⚙️ **Implementation Steps**

### Step 1: Database Configuration

1. **Copy environment template:**
   ```bash
   cp env.hybrid.template .env.local
   ```

2. **Update WooCommerce database credentials in `.env.local`:**
   ```env
   VITE_WC_DB_HOST=your_wordpress_host
   VITE_WC_DB_USER=your_db_user
   VITE_WC_DB_PASSWORD=your_db_password
   VITE_WC_DB_NAME=your_wordpress_database
   ```

### Step 2: Test Connection

```bash
node scripts/test-hybrid-approach.js
```

This will verify:
- ✅ WooCommerce database connectivity
- ✅ User lookup functionality
- ✅ Orders and subscriptions access
- ✅ Hybrid flow simulation

### Step 3: Update Authentication

Replace existing authentication with hybrid version:

```typescript
// In your login component
import { useHybridAuth } from '@/hooks/useHybridAuth';

const { sendHybridOTP, verifyHybridOTP } = useHybridAuth();

// Send OTP
const result = await sendHybridOTP(phone);

// Verify OTP
const authResult = await verifyHybridOTP(phone, otp);
if (authResult.success) {
  // User authenticated - could be from WooCommerce or Supabase
  console.log('User source:', authResult.user.source);
}
```

### Step 4: Update Dashboard Components

Replace existing data hooks with hybrid versions:

```typescript
// Replace useUserOrders with useHybridOrders
import { useHybridOrders, useHybridCurrentRentals } from '@/hooks/useHybridOrders';

const { data: orders } = useHybridOrders();
const { data: currentRentals } = useHybridCurrentRentals();
```

## 🔄 **User Experience Flow**

### For Existing WooCommerce Users:

1. **Login**: User enters existing phone number
2. **Authentication**: System finds user in WooCommerce database
3. **Dashboard**: Shows complete historical data from WooCommerce
4. **New Orders**: Created in Supabase with WooCommerce user reference
5. **Gradual Migration**: Over time, user data can be migrated to Supabase

### For New Users:

1. **Login**: User enters new phone number
2. **Authentication**: System doesn't find user in WooCommerce
3. **Registration**: Creates new user in Supabase
4. **Full Experience**: Modern React app with Supabase backend

## 🗃️ **Data Strategy**

### Historical Data (Read-Only):
- **Source**: WooCommerce database
- **Access**: Direct MySQL queries
- **Data**: Users, orders, subscriptions, payments
- **Status**: Preserved as-is for reference

### New Data (Read-Write):
- **Source**: Supabase database
- **Access**: Supabase client
- **Data**: New orders, new subscriptions, toy inventory
- **Status**: Active and growing

### Hybrid User Records:
```typescript
interface HybridUser {
  id: string;                    // "wc_123" or UUID
  source: 'woocommerce' | 'supabase';
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  wc_user_id?: string;          // Only for WooCommerce users
  address?: WooCommerceAddress; // Only for WooCommerce users
}
```

## 🛡️ **Security Considerations**

### WooCommerce Database Access:
- **Read-Only**: Connection only reads existing data
- **No Modifications**: Never updates WooCommerce database
- **Secure Connection**: Uses environment variables for credentials
- **Connection Pooling**: Reuses database connections efficiently

### Data Protection:
- **PII Handling**: Phone numbers cleaned and normalized
- **Error Handling**: Database errors don't expose sensitive information
- **Logging**: User actions logged without exposing credentials

## 🚀 **Deployment Strategy**

### Phase 1: Parallel Running
1. Deploy React app to Azure Static Web Apps
2. Keep existing WordPress site running
3. Test hybrid approach with select users
4. Verify all functionality works correctly

### Phase 2: DNS Switch
1. Update DNS to point to new React app
2. WooCommerce database remains accessible for existing users
3. New users automatically use Supabase
4. Monitor for any issues

### Phase 3: Gradual Migration
1. Existing users continue using historical data
2. New subscriptions/orders go to Supabase
3. Optional: Migrate users to Supabase over time
4. Eventually phase out WooCommerce database access

## 📊 **Benefits of Hybrid Approach**

### Immediate Benefits:
- ✅ **Zero Data Loss**: All historical data preserved
- ✅ **Zero Downtime**: Seamless transition for users
- ✅ **No User Disruption**: Existing users keep all functionality
- ✅ **Modern Experience**: New users get full React app benefits

### Long-term Benefits:
- ✅ **Flexible Migration**: Migrate users gradually or not at all
- ✅ **Risk Mitigation**: Can rollback to WordPress if needed
- ✅ **Data Integrity**: Historical accuracy maintained
- ✅ **Business Continuity**: No interruption to business operations

## 🔧 **Maintenance**

### Ongoing Requirements:
- **WooCommerce Database**: Keep accessible for historical data
- **Environment Variables**: Maintain database credentials securely
- **Monitoring**: Watch for database connection issues
- **Updates**: Keep mysql2 package updated

### Optional Cleanup:
- After successful migration, WooCommerce database can be archived
- Historical data can be migrated to Supabase if desired
- WordPress site can be decommissioned when ready

## 🧪 **Testing Checklist**

- [ ] WooCommerce database connection works
- [ ] User lookup by phone number functions
- [ ] Orders and subscriptions can be retrieved
- [ ] Hybrid authentication flow works
- [ ] Dashboard displays WooCommerce data
- [ ] New orders can be created in Supabase
- [ ] Subscription flow works for both user types
- [ ] Error handling works properly

## 🎯 **Success Metrics**

- **User Authentication**: 100% existing users can log in
- **Data Accuracy**: Historical orders/subscriptions display correctly
- **New Functionality**: New users can complete subscription flow
- **Performance**: Page load times acceptable for both user types
- **Error Rate**: Minimal database connection failures

---

**This hybrid approach provides the best of both worlds: preserving existing data while enabling modern functionality for new users.** 