<?php
/**
 * Plugin Name: Toyflix Migration API
 * Description: Exposes REST API endpoints for migrating WooCommerce data to Supabase
 * Version: 1.0.0
 * Author: Toyflix Team
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class ToyflixMigrationAPI {
    
    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }
    
    public function register_routes() {
        register_rest_route('migration/v1', '/users', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_users'),
            'permission_callback' => array($this, 'check_permission'),
            'args' => array(
                'page' => array(
                    'default' => 1,
                    'sanitize_callback' => 'absint',
                ),
                'per_page' => array(
                    'default' => 50,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));
        
        register_rest_route('migration/v1', '/orders', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_orders'),
            'permission_callback' => array($this, 'check_permission'),
            'args' => array(
                'page' => array(
                    'default' => 1,
                    'sanitize_callback' => 'absint',
                ),
                'per_page' => array(
                    'default' => 50,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));
        
        register_rest_route('migration/v1', '/orders/(?P<id>\d+)/items', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_order_items'),
            'permission_callback' => array($this, 'check_permission'),
            'args' => array(
                'id' => array(
                    'required' => true,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));
        
        register_rest_route('migration/v1', '/subscriptions', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_subscriptions'),
            'permission_callback' => array($this, 'check_permission'),
            'args' => array(
                'page' => array(
                    'default' => 1,
                    'sanitize_callback' => 'absint',
                ),
                'per_page' => array(
                    'default' => 50,
                    'sanitize_callback' => 'absint',
                ),
            ),
        ));
    }
    
    public function check_permission() {
        // Only allow administrators to access migration endpoints
        return current_user_can('administrator');
    }
    
    public function get_users($request) {
        global $wpdb;
        
        $page = $request->get_param('page');
        $per_page = min($request->get_param('per_page'), 100); // Max 100 per page
        $offset = ($page - 1) * $per_page;
        
        // Get total count
        $total_query = "
            SELECT COUNT(DISTINCT u.ID) 
            FROM {$wpdb->users} u
            LEFT JOIN {$wpdb->usermeta} um ON u.ID = um.user_id
        ";
        $total = $wpdb->get_var($total_query);
        $total_pages = ceil($total / $per_page);
        
        // Get users with billing information
        $users_query = "
            SELECT DISTINCT
                u.ID,
                u.user_login,
                u.user_email,
                u.user_registered,
                u.display_name,
                MAX(CASE WHEN um.meta_key = 'first_name' THEN um.meta_value END) as first_name,
                MAX(CASE WHEN um.meta_key = 'last_name' THEN um.meta_value END) as last_name,
                MAX(CASE WHEN um.meta_key = 'billing_first_name' THEN um.meta_value END) as billing_first_name,
                MAX(CASE WHEN um.meta_key = 'billing_last_name' THEN um.meta_value END) as billing_last_name,
                MAX(CASE WHEN um.meta_key = 'billing_email' THEN um.meta_value END) as billing_email,
                MAX(CASE WHEN um.meta_key = 'billing_phone' THEN um.meta_value END) as billing_phone,
                MAX(CASE WHEN um.meta_key = 'billing_address_1' THEN um.meta_value END) as billing_address_1,
                MAX(CASE WHEN um.meta_key = 'billing_address_2' THEN um.meta_value END) as billing_address_2,
                MAX(CASE WHEN um.meta_key = 'billing_city' THEN um.meta_value END) as billing_city,
                MAX(CASE WHEN um.meta_key = 'billing_state' THEN um.meta_value END) as billing_state,
                MAX(CASE WHEN um.meta_key = 'billing_postcode' THEN um.meta_value END) as billing_postcode,
                MAX(CASE WHEN um.meta_key = 'billing_country' THEN um.meta_value END) as billing_country
            FROM {$wpdb->users} u
            LEFT JOIN {$wpdb->usermeta} um ON u.ID = um.user_id
            WHERE um.meta_key IN (
                'first_name', 'last_name', 'billing_first_name', 'billing_last_name',
                'billing_email', 'billing_phone', 'billing_address_1', 'billing_address_2',
                'billing_city', 'billing_state', 'billing_postcode', 'billing_country'
            )
            GROUP BY u.ID
            ORDER BY u.ID
            LIMIT %d OFFSET %d
        ";
        
        $users = $wpdb->get_results($wpdb->prepare($users_query, $per_page, $offset), ARRAY_A);
        
        // Convert numeric strings to integers where appropriate
        foreach ($users as &$user) {
            $user['ID'] = (int) $user['ID'];
        }
        
        return array(
            'users' => $users,
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => (int) $total,
                'total_pages' => $total_pages,
            ),
            'total' => (int) $total,
            'total_pages' => $total_pages,
        );
    }
    
    public function get_orders($request) {
        global $wpdb;
        
        $page = $request->get_param('page');
        $per_page = min($request->get_param('per_page'), 100); // Max 100 per page
        $offset = ($page - 1) * $per_page;
        
        // Get total count of orders
        $total_query = "
            SELECT COUNT(*) 
            FROM {$wpdb->posts} p
            WHERE p.post_type = 'shop_order'
        ";
        $total = $wpdb->get_var($total_query);
        $total_pages = ceil($total / $per_page);
        
        // Get orders with billing information
        $orders_query = "
            SELECT 
                p.ID,
                p.post_date,
                p.post_modified,
                p.post_status,
                MAX(CASE WHEN pm.meta_key = '_customer_user' THEN pm.meta_value END) as customer_id,
                MAX(CASE WHEN pm.meta_key = '_order_total' THEN pm.meta_value END) as total,
                MAX(CASE WHEN pm.meta_key = '_order_currency' THEN pm.meta_value END) as currency,
                MAX(CASE WHEN pm.meta_key = '_billing_first_name' THEN pm.meta_value END) as billing_first_name,
                MAX(CASE WHEN pm.meta_key = '_billing_last_name' THEN pm.meta_value END) as billing_last_name,
                MAX(CASE WHEN pm.meta_key = '_billing_email' THEN pm.meta_value END) as billing_email,
                MAX(CASE WHEN pm.meta_key = '_billing_phone' THEN pm.meta_value END) as billing_phone,
                MAX(CASE WHEN pm.meta_key = '_billing_address_1' THEN pm.meta_value END) as billing_address_1,
                MAX(CASE WHEN pm.meta_key = '_billing_address_2' THEN pm.meta_value END) as billing_address_2,
                MAX(CASE WHEN pm.meta_key = '_billing_city' THEN pm.meta_value END) as billing_city,
                MAX(CASE WHEN pm.meta_key = '_billing_state' THEN pm.meta_value END) as billing_state,
                MAX(CASE WHEN pm.meta_key = '_billing_postcode' THEN pm.meta_value END) as billing_postcode,
                MAX(CASE WHEN pm.meta_key = '_billing_country' THEN pm.meta_value END) as billing_country
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
            WHERE p.post_type = 'shop_order'
            AND pm.meta_key IN (
                '_customer_user', '_order_total', '_order_currency',
                '_billing_first_name', '_billing_last_name', '_billing_email', '_billing_phone',
                '_billing_address_1', '_billing_address_2', '_billing_city', '_billing_state',
                '_billing_postcode', '_billing_country'
            )
            GROUP BY p.ID
            ORDER BY p.ID DESC
            LIMIT %d OFFSET %d
        ";
        
        $orders = $wpdb->get_results($wpdb->prepare($orders_query, $per_page, $offset), ARRAY_A);
        
        // Convert numeric strings to appropriate types
        foreach ($orders as &$order) {
            $order['ID'] = (int) $order['ID'];
            $order['customer_id'] = $order['customer_id'] ? (int) $order['customer_id'] : null;
            $order['total'] = $order['total'] ? (float) $order['total'] : 0;
        }
        
        return array(
            'orders' => $orders,
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => (int) $total,
                'total_pages' => $total_pages,
            ),
            'total' => (int) $total,
            'total_pages' => $total_pages,
        );
    }
    
    public function get_order_items($request) {
        global $wpdb;
        
        $order_id = $request->get_param('id');
        
        // Get order items
        $items_query = "
            SELECT 
                oi.order_item_id,
                oi.order_item_name,
                oi.order_item_type,
                MAX(CASE WHEN oim.meta_key = '_product_id' THEN oim.meta_value END) as product_id,
                MAX(CASE WHEN oim.meta_key = '_qty' THEN oim.meta_value END) as quantity,
                MAX(CASE WHEN oim.meta_key = '_line_total' THEN oim.meta_value END) as total,
                MAX(CASE WHEN oim.meta_key = '_line_subtotal' THEN oim.meta_value END) as subtotal
            FROM {$wpdb->prefix}woocommerce_order_items oi
            LEFT JOIN {$wpdb->prefix}woocommerce_order_itemmeta oim ON oi.order_item_id = oim.order_item_id
            WHERE oi.order_id = %d
            AND oi.order_item_type = 'line_item'
            AND oim.meta_key IN ('_product_id', '_qty', '_line_total', '_line_subtotal')
            GROUP BY oi.order_item_id
        ";
        
        $items = $wpdb->get_results($wpdb->prepare($items_query, $order_id), ARRAY_A);
        
        // Convert numeric strings to appropriate types
        foreach ($items as &$item) {
            $item['order_item_id'] = (int) $item['order_item_id'];
            $item['product_id'] = $item['product_id'] ? (int) $item['product_id'] : null;
            $item['quantity'] = $item['quantity'] ? (int) $item['quantity'] : 1;
            $item['total'] = $item['total'] ? (float) $item['total'] : 0;
            $item['subtotal'] = $item['subtotal'] ? (float) $item['subtotal'] : 0;
        }
        
        return $items;
    }
    
    public function get_subscriptions($request) {
        global $wpdb;
        
        $page = $request->get_param('page');
        $per_page = min($request->get_param('per_page'), 100); // Max 100 per page
        $offset = ($page - 1) * $per_page;
        
        // Check if WooCommerce Subscriptions plugin is active
        if (!class_exists('WC_Subscriptions')) {
            // Fallback: try to get subscriptions from posts table
            return $this->get_subscriptions_from_posts($page, $per_page, $offset);
        }
        
        // Get total count of subscriptions
        $total_query = "
            SELECT COUNT(*) 
            FROM {$wpdb->posts} p
            WHERE p.post_type = 'shop_subscription'
        ";
        $total = $wpdb->get_var($total_query);
        $total_pages = ceil($total / $per_page);
        
        // Get subscriptions with metadata
        $subscriptions_query = "
            SELECT 
                p.ID,
                p.post_date,
                p.post_modified,
                p.post_status,
                MAX(CASE WHEN pm.meta_key = '_customer_user' THEN pm.meta_value END) as customer_id,
                MAX(CASE WHEN pm.meta_key = '_order_total' THEN pm.meta_value END) as total,
                MAX(CASE WHEN pm.meta_key = '_recurring_amount' THEN pm.meta_value END) as recurring_amount,
                MAX(CASE WHEN pm.meta_key = '_order_currency' THEN pm.meta_value END) as currency,
                MAX(CASE WHEN pm.meta_key = '_billing_period' THEN pm.meta_value END) as billing_period,
                MAX(CASE WHEN pm.meta_key = '_billing_interval' THEN pm.meta_value END) as billing_interval,
                MAX(CASE WHEN pm.meta_key = '_schedule_start' THEN pm.meta_value END) as start_date,
                MAX(CASE WHEN pm.meta_key = '_schedule_end' THEN pm.meta_value END) as end_date,
                MAX(CASE WHEN pm.meta_key = '_schedule_next_payment' THEN pm.meta_value END) as next_payment_date,
                MAX(CASE WHEN pm.meta_key = '_subscription_renewal_order_ids_cache' THEN pm.meta_value END) as renewal_orders,
                MAX(CASE WHEN pm.meta_key = '_billing_first_name' THEN pm.meta_value END) as billing_first_name,
                MAX(CASE WHEN pm.meta_key = '_billing_last_name' THEN pm.meta_value END) as billing_last_name,
                MAX(CASE WHEN pm.meta_key = '_billing_email' THEN pm.meta_value END) as billing_email,
                MAX(CASE WHEN pm.meta_key = '_billing_phone' THEN pm.meta_value END) as billing_phone
            FROM {$wpdb->posts} p
            LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
            WHERE p.post_type = 'shop_subscription'
            AND pm.meta_key IN (
                '_customer_user', '_order_total', '_recurring_amount', '_order_currency',
                '_billing_period', '_billing_interval', '_schedule_start', '_schedule_end',
                '_schedule_next_payment', '_subscription_renewal_order_ids_cache',
                '_billing_first_name', '_billing_last_name', '_billing_email', '_billing_phone'
            )
            GROUP BY p.ID
            ORDER BY p.ID DESC
            LIMIT %d OFFSET %d
        ";
        
        $subscriptions = $wpdb->get_results($wpdb->prepare($subscriptions_query, $per_page, $offset), ARRAY_A);
        
        // Convert numeric strings to appropriate types and format dates
        foreach ($subscriptions as &$subscription) {
            $subscription['ID'] = (int) $subscription['ID'];
            $subscription['customer_id'] = $subscription['customer_id'] ? (int) $subscription['customer_id'] : null;
            $subscription['total'] = $subscription['total'] ? (float) $subscription['total'] : 0;
            $subscription['recurring_amount'] = $subscription['recurring_amount'] ? (float) $subscription['recurring_amount'] : 0;
            $subscription['billing_interval'] = $subscription['billing_interval'] ? (int) $subscription['billing_interval'] : 1;
            
            // Format dates
            if ($subscription['start_date']) {
                $subscription['start_date'] = date('Y-m-d H:i:s', $subscription['start_date']);
            }
            if ($subscription['end_date']) {
                $subscription['end_date'] = date('Y-m-d H:i:s', $subscription['end_date']);
            }
            if ($subscription['next_payment_date']) {
                $subscription['next_payment_date'] = date('Y-m-d H:i:s', $subscription['next_payment_date']);
            }
            
            // Create subscription name for plan detection
            $subscription['subscription_name'] = sprintf(
                '%s %s subscription',
                $subscription['billing_interval'] . ' ' . $subscription['billing_period'],
                $subscription['currency']
            );
        }
        
        return array(
            'subscriptions' => $subscriptions,
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => (int) $total,
                'total_pages' => $total_pages,
            ),
            'total' => (int) $total,
            'total_pages' => $total_pages,
        );
    }
    
    private function get_subscriptions_from_posts($page, $per_page, $offset) {
        global $wpdb;
        
        // Fallback method if WooCommerce Subscriptions is not available
        // Look for subscription-like orders or custom post types
        $total_query = "
            SELECT COUNT(*) 
            FROM {$wpdb->posts} p
            WHERE p.post_type IN ('shop_subscription', 'subscription')
            OR p.post_title LIKE '%subscription%'
        ";
        $total = $wpdb->get_var($total_query);
        $total_pages = ceil($total / $per_page);
        
        $subscriptions_query = "
            SELECT 
                p.ID,
                p.post_date,
                p.post_modified,
                p.post_status,
                p.post_title as subscription_name
            FROM {$wpdb->posts} p
            WHERE p.post_type IN ('shop_subscription', 'subscription')
            OR p.post_title LIKE '%subscription%'
            ORDER BY p.ID DESC
            LIMIT %d OFFSET %d
        ";
        
        $subscriptions = $wpdb->get_results($wpdb->prepare($subscriptions_query, $per_page, $offset), ARRAY_A);
        
        // Convert and add default values
        foreach ($subscriptions as &$subscription) {
            $subscription['ID'] = (int) $subscription['ID'];
            $subscription['customer_id'] = null;
            $subscription['total'] = 0;
            $subscription['recurring_amount'] = 0;
            $subscription['currency'] = 'INR';
            $subscription['billing_period'] = 'month';
            $subscription['billing_interval'] = 1;
            $subscription['start_date'] = $subscription['post_date'];
            $subscription['end_date'] = null;
            $subscription['next_payment_date'] = null;
        }
        
        return array(
            'subscriptions' => $subscriptions,
            'pagination' => array(
                'page' => $page,
                'per_page' => $per_page,
                'total' => (int) $total,
                'total_pages' => $total_pages,
            ),
            'total' => (int) $total,
            'total_pages' => $total_pages,
            'note' => 'Fallback method used - WooCommerce Subscriptions plugin not detected'
        );
    }
}

// Initialize the plugin
new ToyflixMigrationAPI();

// Add admin notice for installation instructions
add_action('admin_notices', function() {
    if (!get_option('toyflix_migration_api_notice_dismissed')) {
        echo '<div class="notice notice-info is-dismissible">';
        echo '<p><strong>Toyflix Migration API</strong> is now active. ';
        echo 'API endpoints are available at: <br>';
        echo '• <code>' . home_url('/wp-json/migration/v1/users') . '</code><br>';
        echo '• <code>' . home_url('/wp-json/migration/v1/orders') . '</code><br>';
        echo '• <code>' . home_url('/wp-json/migration/v1/orders/{id}/items') . '</code><br>';
        echo '<em>Note: Only administrators can access these endpoints.</em>';
        echo '</p>';
        echo '</div>';
    }
});

// Add settings page
add_action('admin_menu', function() {
    add_options_page(
        'Toyflix Migration API',
        'Migration API',
        'manage_options',
        'toyflix-migration-api',
        'toyflix_migration_api_settings_page'
    );
});

function toyflix_migration_api_settings_page() {
    ?>
    <div class="wrap">
        <h1>Toyflix Migration API</h1>
        
        <div class="card">
            <h2>API Endpoints</h2>
            <p>The following REST API endpoints are available for data migration:</p>
            
            <h3>Users Endpoint</h3>
            <p><code>GET <?php echo home_url('/wp-json/migration/v1/users'); ?></code></p>
            <p>Parameters:</p>
            <ul>
                <li><code>page</code> - Page number (default: 1)</li>
                <li><code>per_page</code> - Items per page (default: 50, max: 100)</li>
            </ul>
            
            <h3>Orders Endpoint</h3>
            <p><code>GET <?php echo home_url('/wp-json/migration/v1/orders'); ?></code></p>
            <p>Parameters:</p>
            <ul>
                <li><code>page</code> - Page number (default: 1)</li>
                <li><code>per_page</code> - Items per page (default: 50, max: 100)</li>
            </ul>
            
            <h3>Order Items Endpoint</h3>
            <p><code>GET <?php echo home_url('/wp-json/migration/v1/orders/{order_id}/items'); ?></code></p>
            
            <h3>Authentication</h3>
            <p>These endpoints require administrator authentication. You can:</p>
            <ul>
                <li>Use WordPress cookies (when logged in as admin)</li>
                <li>Use Application Passwords (recommended for API access)</li>
                <li>Use basic authentication with admin credentials</li>
            </ul>
        </div>
        
        <div class="card">
            <h2>Test Endpoints</h2>
            <p>You can test the endpoints by clicking the links below (you must be logged in as an administrator):</p>
            <ul>
                <li><a href="<?php echo home_url('/wp-json/migration/v1/users?per_page=5'); ?>" target="_blank">Test Users API (5 users)</a></li>
                <li><a href="<?php echo home_url('/wp-json/migration/v1/orders?per_page=5'); ?>" target="_blank">Test Orders API (5 orders)</a></li>
            </ul>
        </div>
        
        <div class="card">
            <h2>Migration Script</h2>
            <p>Use the Node.js migration script to import data into your Supabase database:</p>
            <pre><code># Install dependencies
npm install axios @supabase/supabase-js uuid

# Set environment variable
export SUPABASE_SERVICE_KEY="your_service_key_here"

# Run migration (dry run first)
node woocommerce-migration.js --dry-run

# Run actual migration
node woocommerce-migration.js</code></pre>
        </div>
    </div>
    <?php
}
?> 