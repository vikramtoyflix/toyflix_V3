import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';

// Supabase configuration
const SUPABASE_URL = "https://wucwpyitzqjukcphczhr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMjQyOTYsImV4cCI6MjA2NDkwMDI5Nn0.ci_NkSeC7Klk34egMhLw4HnQ5x08w3PHofDUMtu2DwY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Starting Fixed Subscription Count & Excel Matching Analysis...');

// Load Excel data
function loadExcelData() {
    console.log('Loading Excel data...');
    const workbook = XLSX.readFile('Backend- Dispatch details.xlsx');
    const sheetName = '6 months subscription';
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Loaded ${jsonData.length} customers from Excel`);
    
    return jsonData.map((row, index) => ({
        excelRowIndex: index + 1,
        name: row['Names'] || '',
        primaryNumber: String(row['Number'] || '').replace(/[^\d]/g, ''),
        subscriptionDate: parseExcelDate(row['Date of Subscription']),
        lastDeliveredDate: parseExcelDate(row['Last delivered Date']),
        plan: row['Plans'] || '',
        months: row['Months'] || '',
        pendingMonths: row['Pending Months'] || '',
        areaPinCode: row['Area Pin code'] || ''
    }));
}

// Parse Excel dates
function parseExcelDate(excelDate) {
    if (!excelDate) return null;
    
    if (excelDate instanceof Date) {
        return excelDate.toISOString().split('T')[0];
    }
    
    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
    }
    
    if (typeof excelDate === 'string') {
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    }
    
    return null;
}

// Normalize phone numbers for matching
function normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    // Remove Indian country code if present
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
        return digitsOnly.substring(2);
    }
    return digitsOnly;
}

// Fetch users from custom_users table
async function fetchUsers() {
    console.log('Fetching users from custom_users table...');
    
    try {
        const { data, error } = await supabase
            .from('custom_users')
            .select(`
                id,
                full_name,
                email,
                phone_number,
                created_at,
                updated_at
            `);
        
        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }
        
        console.log(`Fetched ${data.length} users from custom_users table`);
        return data;
    } catch (error) {
        console.error('Error in fetchUsers:', error);
        return [];
    }
}

// Fetch subscription data from different possible tables
async function fetchSubscriptionData() {
    console.log('Fetching subscription data...');
    
    const subscriptionData = {
        subscriptions: [],
        user_subscriptions: [],
        rental_orders: []
    };
    
    // Try subscriptions table
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*');
        
        if (!error && data) {
            subscriptionData.subscriptions = data;
            console.log(`Found ${data.length} records in subscriptions table`);
        } else {
            console.log('subscriptions table not accessible:', error?.message);
        }
    } catch (error) {
        console.log('subscriptions table not found');
    }
    
    // Try user_subscriptions table
    try {
        const { data, error } = await supabase
            .from('user_subscriptions')
            .select('*');
        
        if (!error && data) {
            subscriptionData.user_subscriptions = data;
            console.log(`Found ${data.length} records in user_subscriptions table`);
        } else {
            console.log('user_subscriptions table not accessible:', error?.message);
        }
    } catch (error) {
        console.log('user_subscriptions table not found');
    }
    
    // Fetch rental orders (we know this exists)
    try {
        const { data, error } = await supabase
            .from('rental_orders')
            .select(`
                id,
                user_id,
                subscription_id,
                subscription_plan,
                status,
                user_phone,
                rental_start_date,
                rental_end_date,
                total_amount,
                created_at
            `);
        
        if (!error && data) {
            subscriptionData.rental_orders = data;
            console.log(`Found ${data.length} records in rental_orders table`);
        } else {
            console.error('Error fetching rental_orders:', error);
        }
    } catch (error) {
        console.error('Error accessing rental_orders:', error);
    }
    
    return subscriptionData;
}

// Count subscriptions per user from different sources
function countUserSubscriptions(users, subscriptionData) {
    console.log('Counting subscriptions per user...');
    
    const userSubscriptionCounts = users.map(user => {
        // Count from subscriptions table
        const subscriptionsCount = subscriptionData.subscriptions.filter(sub => 
            sub.user_id === user.id
        ).length;
        
        // Count from user_subscriptions table
        const userSubscriptionsCount = subscriptionData.user_subscriptions.filter(sub => 
            sub.user_id === user.id
        ).length;
        
        // Count from rental_orders (unique subscription_ids)
        const rentalOrdersSubscriptions = new Set(
            subscriptionData.rental_orders
                .filter(order => order.user_id === user.id && order.subscription_id)
                .map(order => order.subscription_id)
        );
        const rentalOrdersSubscriptionsCount = rentalOrdersSubscriptions.size;
        
        // Count total rental orders
        const totalRentalOrders = subscriptionData.rental_orders.filter(order => 
            order.user_id === user.id
        ).length;
        
        // Get rental order details
        const userRentalOrders = subscriptionData.rental_orders.filter(order => 
            order.user_id === user.id
        );
        
        // Get subscription plans from rental orders
        const planTypes = [...new Set(userRentalOrders.map(order => order.subscription_plan).filter(Boolean))];
        
        // Get latest activity
        const latestRentalOrder = userRentalOrders
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        
        return {
            user_id: user.id,
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number,
            user_created_at: user.created_at,
            
            // Subscription counts from different sources
            subscriptions_count: subscriptionsCount,
            user_subscriptions_count: userSubscriptionsCount,
            rental_orders_subscriptions_count: rentalOrdersSubscriptionsCount,
            total_rental_orders_count: totalRentalOrders,
            
            // Details
            plan_types: planTypes,
            latest_rental_order_date: latestRentalOrder?.created_at || null,
            latest_rental_start_date: latestRentalOrder?.rental_start_date || null,
            total_amount_spent: userRentalOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
            
            // All rental orders for this user
            rental_orders: userRentalOrders
        };
    });
    
    return userSubscriptionCounts;
}

// Match Excel data with database users using both phone and rental orders
function matchExcelWithDatabase(excelData, userSubscriptionCounts, subscriptionData) {
    console.log('Matching Excel data with database users...');
    
    const matchedData = [];
    
    // Create lookup maps
    const phoneNumberMap = {};
    const rentalOrderPhoneMap = {};
    
    // Create phone number lookup for database users
    userSubscriptionCounts.forEach(user => {
        const phone = normalizePhoneNumber(user.phone_number);
        if (phone) {
            if (!phoneNumberMap[phone]) {
                phoneNumberMap[phone] = [];
            }
            phoneNumberMap[phone].push(user);
        }
    });
    
    // Create phone number lookup for rental orders
    subscriptionData.rental_orders.forEach(order => {
        const phone = normalizePhoneNumber(order.user_phone);
        if (phone) {
            if (!rentalOrderPhoneMap[phone]) {
                rentalOrderPhoneMap[phone] = [];
            }
            rentalOrderPhoneMap[phone].push(order);
        }
    });
    
    // Match each Excel customer
    excelData.forEach(excelCustomer => {
        const phone = normalizePhoneNumber(excelCustomer.primaryNumber);
        
        // Find matches in users table
        const matchingUsers = phoneNumberMap[phone] || [];
        
        // Find matches in rental orders
        const matchingRentalOrders = rentalOrderPhoneMap[phone] || [];
        
        // Get user info from rental orders if not found in users table
        let userFromRental = null;
        if (matchingUsers.length === 0 && matchingRentalOrders.length > 0) {
            userFromRental = {
                user_id: matchingRentalOrders[0].user_id,
                found_via: 'rental_orders',
                rental_orders_count: matchingRentalOrders.length,
                total_amount: matchingRentalOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
            };
        }
        
        const result = {
            // Excel data
            excel_row: excelCustomer.excelRowIndex,
            excel_name: excelCustomer.name,
            excel_phone: excelCustomer.primaryNumber,
            excel_subscription_date: excelCustomer.subscriptionDate,
            excel_last_delivered_date: excelCustomer.lastDeliveredDate,
            excel_plan: excelCustomer.plan,
            excel_months: excelCustomer.months,
            excel_pending_months: excelCustomer.pendingMonths,
            excel_area_pin_code: excelCustomer.areaPinCode,
            
            // Matching results
            match_status: (matchingUsers.length > 0 || userFromRental) ? 'FOUND' : 'NOT_FOUND',
            match_source: matchingUsers.length > 0 ? 'users_table' : userFromRental ? 'rental_orders' : 'none',
            matching_users_count: matchingUsers.length,
            matching_rental_orders_count: matchingRentalOrders.length,
            
            // Database user info (first match if multiple)
            db_user_id: matchingUsers.length > 0 ? matchingUsers[0].user_id : userFromRental?.user_id,
            db_full_name: matchingUsers.length > 0 ? matchingUsers[0].full_name : null,
            db_email: matchingUsers.length > 0 ? matchingUsers[0].email : null,
            db_phone: matchingUsers.length > 0 ? matchingUsers[0].phone_number : null,
            db_user_created_at: matchingUsers.length > 0 ? matchingUsers[0].user_created_at : null,
            
            // Subscription counts
            subscriptions_count: matchingUsers.length > 0 ? matchingUsers[0].subscriptions_count : 0,
            user_subscriptions_count: matchingUsers.length > 0 ? matchingUsers[0].user_subscriptions_count : 0,
            rental_orders_subscriptions_count: matchingUsers.length > 0 ? matchingUsers[0].rental_orders_subscriptions_count : 0,
            total_rental_orders_count: matchingUsers.length > 0 ? matchingUsers[0].total_rental_orders_count : matchingRentalOrders.length,
            
            // Financial data
            total_amount_spent: matchingUsers.length > 0 ? matchingUsers[0].total_amount_spent : userFromRental?.total_amount || 0,
            
            // Plan information
            db_plan_types: matchingUsers.length > 0 ? matchingUsers[0].plan_types.join(', ') : '',
            latest_rental_order_date: matchingUsers.length > 0 ? matchingUsers[0].latest_rental_order_date : null,
            latest_rental_start_date: matchingUsers.length > 0 ? matchingUsers[0].latest_rental_start_date : null,
            
            // Raw data for analysis
            all_matching_users: matchingUsers,
            all_matching_rental_orders: matchingRentalOrders
        };
        
        matchedData.push(result);
    });
    
    return matchedData;
}

// Generate database update statements for matched customers only
function generateDatabaseUpdates(matchedData) {
    console.log('Generating database update statements for matched customers...');
    
    const updates = [];
    const matched = matchedData.filter(item => item.match_status === 'FOUND' && item.db_user_id);
    
    console.log(`Generating updates for ${matched.length} matched customers`);
    
    matched.forEach(item => {
        // Check if we need to update the user record
        const needsUpdate = 
            (item.excel_name && item.excel_name !== item.db_full_name) ||
            item.excel_subscription_date ||
            item.excel_plan ||
            item.excel_months ||
            item.excel_pending_months ||
            item.excel_area_pin_code ||
            item.excel_last_delivered_date;
        
        if (needsUpdate) {
            const updateUser = {
                table: 'custom_users',
                user_id: item.db_user_id,
                excel_row: item.excel_row,
                excel_name: item.excel_name,
                current_db_name: item.db_full_name,
                updates: {
                    // Only update name if it's different and not empty
                    ...(item.excel_name && item.excel_name !== item.db_full_name && {
                        full_name: item.excel_name
                    }),
                    // Add Excel metadata for all matched customers
                    excel_subscription_date: item.excel_subscription_date,
                    excel_plan: item.excel_plan,
                    excel_months: item.excel_months,
                    excel_pending_months: item.excel_pending_months,
                    excel_area_pin_code: item.excel_area_pin_code,
                    excel_last_delivered_date: item.excel_last_delivered_date,
                    excel_sync_date: new Date().toISOString().split('T')[0]
                }
            };
            
            updates.push(updateUser);
        }
    });
    
    return updates;
}

// Save results to Excel with comprehensive analysis
function saveToExcel(matchedData, summary, updates) {
    console.log('Saving comprehensive results to Excel...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `subscription_count_analysis_fixed_${timestamp}.xlsx`;
    
    const wb = XLSX.utils.book_new();
    
    // Main analysis sheet
    const analysisSheet = XLSX.utils.json_to_sheet(matchedData.map(row => ({
        'Excel Row': row.excel_row,
        'Excel Name': row.excel_name,
        'Excel Phone': row.excel_phone,
        'Excel Subscription Date': row.excel_subscription_date,
        'Excel Plan': row.excel_plan,
        'Excel Months': row.excel_months,
        'Excel Pending Months': row.excel_pending_months,
        'Excel Area Pin Code': row.excel_area_pin_code,
        'Match Status': row.match_status,
        'Match Source': row.match_source,
        'DB User ID': row.db_user_id,
        'DB Full Name': row.db_full_name,
        'DB Email': row.db_email,
        'DB Phone': row.db_phone,
        'Subscriptions Count': row.subscriptions_count,
        'User Subscriptions Count': row.user_subscriptions_count,
        'Rental Orders Subscriptions': row.rental_orders_subscriptions_count,
        'Total Rental Orders': row.total_rental_orders_count,
        'Total Amount Spent': row.total_amount_spent,
        'DB Plan Types': row.db_plan_types,
        'Latest Rental Date': row.latest_rental_order_date,
        'Latest Rental Start': row.latest_rental_start_date,
        'Matching Users Count': row.matching_users_count,
        'Matching Rental Orders': row.matching_rental_orders_count
    })));
    XLSX.utils.book_append_sheet(wb, analysisSheet, 'Full Analysis');
    
    // Summary sheet
    const summarySheet = XLSX.utils.json_to_sheet([
        { Metric: 'Excel Customers Total', Value: summary.excel_customers_total },
        { Metric: 'Excel Customers Matched', Value: summary.excel_customers_matched },
        { Metric: 'Excel Customers Not Matched', Value: summary.excel_customers_not_matched },
        { Metric: 'Match Percentage', Value: `${summary.match_percentage.toFixed(2)}%` },
        { Metric: 'Matched via Users Table', Value: summary.matched_via_users },
        { Metric: 'Matched via Rental Orders', Value: summary.matched_via_rental },
        { Metric: 'Database Users Total', Value: summary.database_users_total },
        { Metric: 'Users with Rental Orders', Value: summary.users_with_rental_orders },
        { Metric: 'Total Rental Orders in DB', Value: summary.total_rental_orders },
        { Metric: 'Customers Needing Updates', Value: summary.customers_needing_updates },
        { Metric: 'Updates Generated', Value: updates.length }
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
    
    // Matched customers for update
    const matchedForUpdateSheet = XLSX.utils.json_to_sheet(
        matchedData.filter(item => item.match_status === 'FOUND')
    );
    XLSX.utils.book_append_sheet(wb, matchedForUpdateSheet, 'Matched for Update');
    
    // Not matched customers
    const notMatchedSheet = XLSX.utils.json_to_sheet(
        matchedData.filter(item => item.match_status === 'NOT_FOUND')
    );
    XLSX.utils.book_append_sheet(wb, notMatchedSheet, 'Not Matched');
    
    // Database updates
    const updatesSheet = XLSX.utils.json_to_sheet(updates);
    XLSX.utils.book_append_sheet(wb, updatesSheet, 'Database Updates');
    
    XLSX.writeFile(wb, filename);
    console.log(`Results saved to: ${filename}`);
    
    return filename;
}

// Create SQL update script for matched customers only
function createSQLUpdateScript(updates, matchedData) {
    console.log('Creating SQL update script for matched customers...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database_update_script_matched_only_${timestamp}.sql`;
    
    let sql = `-- Database Update Script for Excel Data Sync (Matched Customers Only)
-- Generated on: ${new Date().toISOString()}
-- Total Excel customers: ${matchedData.length}
-- Matched customers: ${matchedData.filter(item => item.match_status === 'FOUND').length}
-- Updates to apply: ${updates.length}

-- WARNING: This script will update database records. Please review before executing.
-- Recommended: Run in a transaction and test on staging first.

BEGIN;

-- Add Excel sync columns to custom_users table if they don't exist
ALTER TABLE custom_users 
ADD COLUMN IF NOT EXISTS excel_subscription_date DATE,
ADD COLUMN IF NOT EXISTS excel_plan TEXT,
ADD COLUMN IF NOT EXISTS excel_months TEXT,
ADD COLUMN IF NOT EXISTS excel_pending_months TEXT,
ADD COLUMN IF NOT EXISTS excel_area_pin_code TEXT,
ADD COLUMN IF NOT EXISTS excel_last_delivered_date DATE,
ADD COLUMN IF NOT EXISTS excel_sync_date DATE;

-- Update user profiles with Excel data (matched customers only)
`;
    
    updates.forEach(update => {
        sql += `-- Excel Row ${update.excel_row}: ${update.excel_name}
-- Current DB name: ${update.current_db_name}
`;
        
        const updateFields = Object.entries(update.updates)
            .map(([key, value]) => {
                if (value === null || value === undefined) return `${key} = NULL`;
                if (typeof value === 'string') return `${key} = '${value.replace(/'/g, "''")}'`;
                return `${key} = '${value}'`;
            })
            .join(',\n    ');
        
        sql += `UPDATE custom_users 
SET ${updateFields}
WHERE id = '${update.user_id}';

`;
    });
    
    sql += `COMMIT;

-- Verification queries:
-- Check updated records:
SELECT 
    id, 
    full_name, 
    phone_number, 
    excel_plan, 
    excel_subscription_date, 
    excel_sync_date 
FROM custom_users 
WHERE excel_sync_date = CURRENT_DATE;

-- Summary:
-- Total matched customers: ${matchedData.filter(item => item.match_status === 'FOUND').length}
-- User profile updates: ${updates.length}
-- Customers updated with Excel data: ${updates.length}
`;
    
    fs.writeFileSync(filename, sql);
    console.log(`SQL update script saved to: ${filename}`);
    
    return filename;
}

// Create summary analysis
function createSummaryAnalysis(matchedData, userSubscriptionCounts, subscriptionData) {
    console.log('Creating comprehensive summary analysis...');
    
    const matched = matchedData.filter(item => item.match_status === 'FOUND');
    const notMatched = matchedData.filter(item => item.match_status === 'NOT_FOUND');
    
    const summary = {
        excel_customers_total: matchedData.length,
        excel_customers_matched: matched.length,
        excel_customers_not_matched: notMatched.length,
        match_percentage: (matched.length / matchedData.length) * 100,
        
        matched_via_users: matched.filter(item => item.match_source === 'users_table').length,
        matched_via_rental: matched.filter(item => item.match_source === 'rental_orders').length,
        
        database_users_total: userSubscriptionCounts.length,
        users_with_rental_orders: userSubscriptionCounts.filter(user => user.total_rental_orders_count > 0).length,
        total_rental_orders: subscriptionData.rental_orders.length,
        
        // Subscription data from different tables
        subscriptions_table_count: subscriptionData.subscriptions.length,
        user_subscriptions_table_count: subscriptionData.user_subscriptions.length,
        rental_orders_count: subscriptionData.rental_orders.length,
        
        customers_needing_updates: matched.length,
        
        // Excel plan analysis
        most_common_excel_plans: getMostCommonPlans(matchedData.map(item => item.excel_plan)),
        
        // Financial analysis for matched customers
        total_amount_spent_matched: matched.reduce((sum, item) => sum + (item.total_amount_spent || 0), 0)
    };
    
    return summary;
}

// Helper function to get most common plans
function getMostCommonPlans(plans) {
    const planCounts = {};
    plans.forEach(plan => {
        if (plan) {
            planCounts[plan] = (planCounts[plan] || 0) + 1;
        }
    });
    
    return Object.entries(planCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([plan, count]) => ({ plan, count }));
}

// Main function
async function main() {
    try {
        console.log('='.repeat(70));
        console.log('FIXED SUBSCRIPTION COUNT & EXCEL MATCHING ANALYSIS');
        console.log('='.repeat(70));
        
        // Load Excel data
        const excelData = loadExcelData();
        
        // Fetch database data
        const users = await fetchUsers();
        const subscriptionData = await fetchSubscriptionData();
        
        // Count subscriptions per user
        const userSubscriptionCounts = countUserSubscriptions(users, subscriptionData);
        
        // Match Excel with database
        const matchedData = matchExcelWithDatabase(excelData, userSubscriptionCounts, subscriptionData);
        
        // Create summary analysis
        const summary = createSummaryAnalysis(matchedData, userSubscriptionCounts, subscriptionData);
        
        // Generate database updates for matched customers only
        const updates = generateDatabaseUpdates(matchedData);
        
        // Print summary
        console.log('\n' + '='.repeat(70));
        console.log('ANALYSIS RESULTS');
        console.log('='.repeat(70));
        console.log(`Excel customers total: ${summary.excel_customers_total}`);
        console.log(`Excel customers matched: ${summary.excel_customers_matched}`);
        console.log(`Excel customers not matched: ${summary.excel_customers_not_matched}`);
        console.log(`Match percentage: ${summary.match_percentage.toFixed(2)}%`);
        console.log(`\nMatching breakdown:`);
        console.log(`- Matched via users table: ${summary.matched_via_users}`);
        console.log(`- Matched via rental orders: ${summary.matched_via_rental}`);
        console.log(`\nDatabase summary:`);
        console.log(`- Users in database: ${summary.database_users_total}`);
        console.log(`- Users with rental orders: ${summary.users_with_rental_orders}`);
        console.log(`- Total rental orders: ${summary.total_rental_orders}`);
        console.log(`- Subscriptions table records: ${summary.subscriptions_table_count}`);
        console.log(`- User subscriptions table records: ${summary.user_subscriptions_table_count}`);
        console.log(`\nUpdate summary:`);
        console.log(`- Customers needing database updates: ${summary.customers_needing_updates}`);
        console.log(`- Update statements generated: ${updates.length}`);
        console.log(`- Total amount spent by matched customers: $${summary.total_amount_spent_matched.toFixed(2)}`);
        
        // Save results
        const excelFilename = saveToExcel(matchedData, summary, updates);
        const sqlFilename = createSQLUpdateScript(updates, matchedData);
        
        console.log('\nFiles created:');
        console.log(`- ${excelFilename}`);
        console.log(`- ${sqlFilename}`);
        
        // Show top Excel plan types
        console.log('\nTop Excel Plan Types:');
        summary.most_common_excel_plans.slice(0, 5).forEach(plan => {
            console.log(`- ${plan.plan}: ${plan.count} customers`);
        });
        
        console.log('\n' + '='.repeat(70));
        console.log('ANALYSIS COMPLETE!');
        console.log('='.repeat(70));
        console.log('Next steps:');
        console.log('1. Review the Excel file for detailed matching results');
        console.log('2. Review the SQL script before executing database updates');
        console.log('3. Test the SQL script on staging environment first');
        console.log('4. Execute updates for matched customers only');
        
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

main(); 