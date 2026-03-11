-- Fix Supabase Performance/Security Linter errors
-- Ref: https://supabase.com/docs/guides/database/database-linter

-- =============================================================================
-- 1. POLICY_EXISTS_RLS_DISABLED: Enable RLS on tables that already have policies
-- =============================================================================
ALTER TABLE IF EXISTS public.campaign_offer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offer_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offer_redemption_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.offer_usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.promotional_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscription_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_offer_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. SECURITY_DEFINER_VIEW: Change views to SECURITY INVOKER (run as caller)
-- =============================================================================
DO $$
DECLARE
  v_view text;
  v_views text[] := ARRAY[
    'customer_business_intelligence', 'order_items_detail_view', 'rental_orders_selection_status',
    'dispatch_pickup_pairs_detailed', 'subscription_current_cycle', 'admin_age_wise_toy_counts',
    'enriched_customer_view', 'notification_analytics', 'customer_order_summary',
    'subscription_selection_windows', 'simple_inventory_view', 'subscription_cycle_history',
    'dashboard_summary_metrics', 'admin_all_toys_by_age', 'subscription_management_summary',
    'admin_rental_orders_view', 'subscription_start_date_comparison', 'toy_images_optimized',
    'pincode_capacity_status', 'daily_exchange_schedule', 'subscription_status_view',
    'rental_orders_with_cycle_info', 'unified_order_history', 'unified_order_management',
    'daily_pickup_schedule', 'customer_comprehensive_dashboard', 'admin_order_details_view',
    'customer_subscription_overview', 'subscription_expiration_status', 'selection_window_dashboard',
    'admin_order_items_view', 'customer_address_view', 'pickup_performance_metrics',
    'admin_orders_summary', 'exchange_performance_metrics', 'subscription_upcoming_cycles',
    'inventory_summary', 'admin_users_view'
  ];
BEGIN
  FOREACH v_view IN ARRAY v_views
  LOOP
    BEGIN
      EXECUTE format('ALTER VIEW IF EXISTS public.%I SET (security_invoker = true)', v_view);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not alter view %: %', v_view, SQLERRM;
    END;
  END LOOP;
END $$;
