# Supabase Security Lints – Fix Summary

Migrations `20250311000000` and `20250311000001` address the Supabase Performance/Security linter errors.

## 1. Policy Exists RLS Disabled (14 tables)

**Issue:** Tables have RLS policies but RLS is not enabled.

**Fix:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on:
- campaign_offer_assignments, offer_categories, offer_category_assignments
- offer_redemption_rules, offer_templates, offer_usage_history
- order_items, orders, promotional_campaigns, promotional_offers
- subscription_management, subscriptions, toys, user_offer_assignments

## 2. Security Definer View (33+ views)

**Issue:** Views use SECURITY DEFINER (run as owner, bypassing caller’s RLS).

**Fix:** `ALTER VIEW ... SET (security_invoker = true)` so views run with the caller’s permissions.

## 3. RLS Disabled in Public (50+ tables)

**Issue:** Public tables have no RLS, so any client can access all rows.

**Fix:** Enable RLS and add policies where needed:
- **custom_users:** Users manage own row; admins can view all (admin panel)
- **rental_orders:** Users manage own; admins manage all (existing + our policy)
- **subscriptions:** Admins can manage all (unifiedOrderService cleanup on failed create)
- **subscription_plans:** Public read
- **payment_tracking, admin_users, etc.:** RLS enabled, no policy (service_role only)

## Frontend Flow Verification

| Flow | Client | Tables | Status |
|------|--------|--------|--------|
| OTP signup/verify | supabase | custom_users | OK |
| Dashboard | supabase | custom_users, rental_orders | OK |
| Admin panel | supabase | custom_users, rental_orders, toys, orders | OK |
| Admin create order | supabase | rental_orders, subscriptions, subscription_management | OK |
| Toy CRUD (admin) | supabaseAdmin | toys | OK (service_role bypasses) |
| Pause/resume | supabaseAdmin | subscription_pause_resume | OK (service_role bypasses) |
| Payment flow | Edge Functions | custom_users, rental_orders | OK (service_role bypasses) |

## Deployment

```bash
supabase db push
# or
supabase migration up
```

## Notes

- **Service role** bypasses RLS; Edge Functions using service_role are unaffected.
- **Anon/authenticated** clients are restricted by these policies.
- If the app breaks after applying, review policies and adjust as needed.
