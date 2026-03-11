# Order & Inventory Flow – Implementation Summary

## 1. 24-Day Blocking (Selection Window) – Already Exists

**Logic:** Customers can only modify/order toys during **Day 24–34** of their 30-day cycle.

- **Auto-open:** Selection window opens on Day 24.
- **Auto-close:** Closes on Day 34 (or when they place an order).
- **Manual control:** Admin can open/close from admin panel (`selection_window_status`: `manual_open`, `manual_closed`).
- **Triggers:** `auto_close_selection_window_after_order` closes the window when a new order is placed.
- **Relevant files:** `subscriptionService.ts`, `CycleStatusDashboard.tsx`, `fix_selection_window_logic.sql`, `20250128000000_enhanced_selection_window_auto_close.sql`.

## 2. New Order Flow (Pending → Paid)

**When customer clicks Pay (Razorpay):**
1. `razorpay-order` creates Razorpay order.
2. `razorpay-order` creates `rental_orders` with `payment_status = 'pending'` (inventory reserved).
3. Razorpay checkout opens.

**When payment succeeds:**
1. `razorpay-verify` finds `rental_orders` by `razorpay_order_id`.
2. Updates `payment_status = 'paid'`, adds `razorpay_payment_id`.
3. Creates subscription_tracking, updates custom_users.

**When payment is abandoned (no success within 25 mins):**
1. `release-abandoned-orders` Edge Function finds `rental_orders` with `payment_status = 'pending'` and `created_at` older than 25 minutes.
2. Sets `status = 'cancelled'`.
3. `handle_inventory_return` trigger restores stock.
4. **Cron:** Call `release-abandoned-orders` every 5–10 minutes (Supabase cron, GitHub Actions, or external cron).

## 3. Payment Notification Fix (Last Night)

Changes made:
- `razorpay-order`: Ensure user in `custom_users`, correct amount (rupees), pass `userPhone`/`userEmail`.
- `razorpay-verify`: Clearer error handling.
- `PaymentFlow`: Pass `userPhone`/`userEmail` in `orderItems`.
- Amount rounding for fiverupees coupon.

**Deploy required:** `supabase functions deploy razorpay-order razorpay-verify release-abandoned-orders`
