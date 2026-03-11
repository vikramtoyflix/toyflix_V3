-- Enable RLS on public tables that lack it (rls_disabled_in_public lint)
-- Service role bypasses RLS. Tables with no policy = anon/authenticated get no rows.
-- Add policies only where frontend needs access.

-- Critical tables: enable RLS with minimal policies for app access
-- Toys: RLS enabled in 20250311000000 (has existing policies)

-- Custom users: authenticated see own
ALTER TABLE IF EXISTS public.custom_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_profile" ON public.custom_users;
CREATE POLICY "users_own_profile" ON public.custom_users FOR ALL USING (auth.uid() = id);

-- Rental orders: users see own (service_role bypasses for Edge Functions)
ALTER TABLE IF EXISTS public.rental_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_rental_orders" ON public.rental_orders;
CREATE POLICY "users_own_rental_orders" ON public.rental_orders FOR ALL USING (auth.uid() = user_id);

-- Payment tracking: backend only (no policy = anon/authenticated blocked)
ALTER TABLE IF EXISTS public.payment_tracking ENABLE ROW LEVEL SECURITY;

-- Subscription plans: public read
ALTER TABLE IF EXISTS public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_public_read_plans" ON public.subscription_plans;
CREATE POLICY "allow_public_read_plans" ON public.subscription_plans FOR SELECT USING (true);

-- Admin users: restrict (service role only via Edge Functions)
ALTER TABLE IF EXISTS public.admin_users ENABLE ROW LEVEL SECURITY;

-- Subscriptions: add admin manage policy (unifiedOrderService cleanup on failed create)
DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.custom_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Custom users: add admin read-all for admin panel (preserve existing permissive SELECT)
DROP POLICY IF EXISTS "Admins can view all users" ON public.custom_users;
CREATE POLICY "Admins can view all users" ON public.custom_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.custom_users cu WHERE cu.id = auth.uid() AND cu.role = 'admin')
  );

-- Other tables: enable RLS, no policy (service_role bypasses; anon/authenticated get no rows)
ALTER TABLE IF EXISTS public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dispatch_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dispatch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.dispatch_pickup_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_subscription_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toy_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.exchange_capacity ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_pause_resume ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meta_catalog_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.migration_customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.migration_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.migration_customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.migration_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.migration_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.migration_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_uuid_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drop_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.drop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toys_1_2_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toys_2_3_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toys_3_4_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toys_4_6_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toys_6_8_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.phone_format_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custom_users_phone_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rental_orders_phone_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.custom_users_phone_backup_2025_07_05_02_08_38 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rental_orders_phone_backup_2025_07_05_02_08_38 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rental_orders_address_backup ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.queue_orders_address_backup ENABLE ROW LEVEL SECURITY;
