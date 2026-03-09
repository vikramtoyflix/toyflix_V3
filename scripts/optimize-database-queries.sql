-- Database Optimization Script for Order Management Performance
-- This script creates indexes and optimizes queries for better performance

-- ============================================
-- INDEX OPTIMIZATION FOR RENTAL_ORDERS TABLE
-- ============================================

-- 1. Primary filtering indexes
CREATE INDEX IF NOT EXISTS idx_rental_orders_created_at 
ON rental_orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rental_orders_status 
ON rental_orders(status);

CREATE INDEX IF NOT EXISTS idx_rental_orders_payment_status 
ON rental_orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_rental_orders_user_id 
ON rental_orders(user_id);

-- 2. Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_rental_orders_status_created_at 
ON rental_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rental_orders_payment_status_created_at 
ON rental_orders(payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rental_orders_user_id_created_at 
ON rental_orders(user_id, created_at DESC);

-- 3. Search optimization indexes
CREATE INDEX IF NOT EXISTS idx_rental_orders_order_number 
ON rental_orders(order_number);

CREATE INDEX IF NOT EXISTS idx_rental_orders_user_phone 
ON rental_orders(user_phone);

CREATE INDEX IF NOT EXISTS idx_rental_orders_subscription_plan 
ON rental_orders(subscription_plan);

CREATE INDEX IF NOT EXISTS idx_rental_orders_order_type 
ON rental_orders(order_type);

-- 4. Date range query optimization
CREATE INDEX IF NOT EXISTS idx_rental_orders_date_range 
ON rental_orders(created_at, status, payment_status);

-- 5. Full-text search optimization (if using PostgreSQL)
-- Uncomment if using PostgreSQL with full-text search
-- CREATE INDEX IF NOT EXISTS idx_rental_orders_fulltext 
-- ON rental_orders USING gin(to_tsvector('english', 
--   coalesce(order_number, '') || ' ' || 
--   coalesce(user_phone, '') || ' ' || 
--   coalesce(status, '')
-- ));

-- ============================================
-- INDEX OPTIMIZATION FOR CUSTOM_USERS TABLE
-- ============================================

-- 1. Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_custom_users_email 
ON custom_users(email);

CREATE INDEX IF NOT EXISTS idx_custom_users_phone 
ON custom_users(phone);

CREATE INDEX IF NOT EXISTS idx_custom_users_subscription_plan 
ON custom_users(subscription_plan);

-- 2. Name search optimization
CREATE INDEX IF NOT EXISTS idx_custom_users_name_search 
ON custom_users(first_name, last_name);

-- 3. Combined search index
CREATE INDEX IF NOT EXISTS idx_custom_users_search_fields 
ON custom_users(email, phone, first_name, last_name);

-- ============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================

-- Create a materialized view for order statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS order_stats_daily AS
SELECT 
    date_trunc('day', created_at) as order_date,
    status,
    payment_status,
    subscription_plan,
    COUNT(*) as order_count,
    SUM(total_amount) as total_revenue,
    AVG(total_amount) as avg_order_value,
    COUNT(DISTINCT user_id) as unique_customers
FROM rental_orders
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY date_trunc('day', created_at), status, payment_status, subscription_plan;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_order_stats_daily_date 
ON order_stats_daily(order_date DESC);

-- ============================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================

-- Function to get optimized order counts by status
CREATE OR REPLACE FUNCTION get_order_status_counts(
    p_user_id UUID DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
    status TEXT,
    count BIGINT,
    total_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.status,
        COUNT(*)::BIGINT,
        COALESCE(SUM(ro.total_amount), 0)
    FROM rental_orders ro
    WHERE 
        (p_user_id IS NULL OR ro.user_id = p_user_id)
        AND (p_date_from IS NULL OR ro.created_at >= p_date_from)
        AND (p_date_to IS NULL OR ro.created_at <= p_date_to + INTERVAL '1 day')
    GROUP BY ro.status;
END;
$$ LANGUAGE plpgsql;

-- Function for optimized order search
CREATE OR REPLACE FUNCTION search_orders_optimized(
    p_search_text TEXT DEFAULT NULL,
    p_status TEXT[] DEFAULT NULL,
    p_payment_status TEXT[] DEFAULT NULL,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    order_number TEXT,
    user_id UUID,
    status TEXT,
    payment_status TEXT,
    total_amount NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE,
    rental_start_date DATE,
    rental_end_date DATE,
    user_phone TEXT,
    subscription_plan TEXT,
    order_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ro.id,
        ro.order_number,
        ro.user_id,
        ro.status,
        ro.payment_status,
        ro.total_amount,
        ro.created_at,
        ro.rental_start_date,
        ro.rental_end_date,
        ro.user_phone,
        ro.subscription_plan,
        ro.order_type
    FROM rental_orders ro
    WHERE 
        (p_search_text IS NULL OR 
         ro.order_number ILIKE '%' || p_search_text || '%' OR
         ro.user_phone ILIKE '%' || p_search_text || '%')
        AND (p_status IS NULL OR ro.status = ANY(p_status))
        AND (p_payment_status IS NULL OR ro.payment_status = ANY(p_payment_status))
        AND (p_date_from IS NULL OR ro.created_at >= p_date_from)
        AND (p_date_to IS NULL OR ro.created_at <= p_date_to + INTERVAL '1 day')
    ORDER BY ro.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================

-- Query to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Never used'
        WHEN idx_scan < 100 THEN 'Low usage'
        WHEN idx_scan < 1000 THEN 'Medium usage'
        ELSE 'High usage'
    END AS usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Query to find slow queries
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE calls > 100
ORDER BY mean_time DESC
LIMIT 20;

-- ============================================
-- MAINTENANCE PROCEDURES
-- ============================================

-- Procedure to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_order_stats()
RETURNS VOID AS $$
BEGIN
    -- Refresh materialized view concurrently to avoid blocking
    REFRESH MATERIALIZED VIEW CONCURRENTLY order_stats_daily;
    
    -- Update statistics for better query planning
    ANALYZE rental_orders;
    ANALYZE custom_users;
    
    -- Log the refresh
    INSERT INTO system_logs (event, message, created_at)
    VALUES ('materialized_view_refresh', 'Order stats refreshed successfully', NOW());
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error
        INSERT INTO system_logs (event, message, created_at)
        VALUES ('materialized_view_refresh_error', SQLERRM, NOW());
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- Schedule the refresh (run this manually or set up a cron job)
-- SELECT cron.schedule('refresh-order-stats', '0 */6 * * *', 'SELECT refresh_order_stats();');

-- ============================================
-- CLEANUP PROCEDURES
-- ============================================

-- Procedure to cleanup old data and optimize performance
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- Archive orders older than 2 years
    INSERT INTO archived_orders 
    SELECT * FROM rental_orders 
    WHERE created_at < CURRENT_DATE - INTERVAL '2 years';
    
    -- Delete archived orders from main table
    DELETE FROM rental_orders 
    WHERE created_at < CURRENT_DATE - INTERVAL '2 years';
    
    -- Vacuum and analyze tables
    VACUUM ANALYZE rental_orders;
    VACUUM ANALYZE custom_users;
    
    -- Log cleanup
    INSERT INTO system_logs (event, message, created_at)
    VALUES ('data_cleanup', 'Old data cleanup completed', NOW());
    
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================

-- Function to get database performance metrics
CREATE OR REPLACE FUNCTION get_db_performance_metrics()
RETURNS TABLE(
    metric_name TEXT,
    metric_value NUMERIC,
    metric_unit TEXT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'Active Connections'::TEXT,
        COUNT(*)::NUMERIC,
        'connections'::TEXT,
        CASE 
            WHEN COUNT(*) > 80 THEN 'High'
            WHEN COUNT(*) > 50 THEN 'Medium' 
            ELSE 'Normal'
        END::TEXT
    FROM pg_stat_activity
    WHERE state = 'active'
    
    UNION ALL
    
    SELECT 
        'Cache Hit Ratio'::TEXT,
        ROUND(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2)::NUMERIC,
        'percent'::TEXT,
        CASE 
            WHEN ROUND(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) > 95 THEN 'Excellent'
            WHEN ROUND(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) > 90 THEN 'Good'
            ELSE 'Needs Improvement'
        END::TEXT
    FROM pg_stat_database
    WHERE datname = current_database()
    
    UNION ALL
    
    SELECT 
        'Total Orders'::TEXT,
        COUNT(*)::NUMERIC,
        'orders'::TEXT,
        'Info'::TEXT
    FROM rental_orders
    
    UNION ALL
    
    SELECT 
        'Orders Today'::TEXT,
        COUNT(*)::NUMERIC,
        'orders'::TEXT,
        'Info'::TEXT
    FROM rental_orders
    WHERE created_at >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================

/*
To use this optimization script:

1. Run the entire script on your database to create indexes and functions
2. Monitor performance using: SELECT * FROM get_db_performance_metrics();
3. Check index usage: SELECT * FROM index_usage_stats;
4. Monitor slow queries: SELECT * FROM slow_queries;
5. Refresh stats regularly: SELECT refresh_order_stats();
6. Clean up old data: SELECT cleanup_old_data();

Performance Tips:
- Run ANALYZE after bulk data changes
- Monitor and drop unused indexes
- Use the optimized functions for common queries
- Set up regular maintenance schedules
- Monitor connection limits and query performance
*/ 