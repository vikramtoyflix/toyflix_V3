
-- Clear all user-related data in the correct order to avoid foreign key constraint issues

-- Clear user_entitlements table
DELETE FROM public.user_entitlements;

-- Clear subscription-related tables
DELETE FROM public.subscription_toy_selections;
DELETE FROM public.perk_assignments;
DELETE FROM public.pause_records;
DELETE FROM public.billing_records;
DELETE FROM public.subscriptions;

-- Clear order-related tables
DELETE FROM public.order_items;
DELETE FROM public.orders;

-- Clear other user-related tables
DELETE FROM public.reviews;
DELETE FROM public.wishlist;
DELETE FROM public.payment_orders;
DELETE FROM public.admin_requests;
DELETE FROM public.otp_verifications;
DELETE FROM public.subscribers;

-- Clear profiles table
DELETE FROM public.profiles;

-- Finally, clear auth.users (this will cascade delete any remaining auth-related data)
DELETE FROM auth.users;
