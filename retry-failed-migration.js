#!/usr/bin/env node

/**
 * Retry failed order migration with improved error handling
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';
const sql = postgres(connectionString);

async function retryFailedMigration() {
  console.log('🔄 Retrying failed order migration...\n');
  
  try {
    // Find orders that exist in orders but not in rental_orders
    const unmigrated = await sql`
      SELECT o.* 
      FROM orders o 
      LEFT JOIN rental_orders ro ON ro.legacy_order_id = o.id 
      WHERE ro.legacy_order_id IS NULL
      LIMIT 5
    `;
    
    console.log(`📦 Found ${unmigrated.length} unmigrated orders`);
    
    if (unmigrated.length === 0) {
      console.log('✅ No unmigrated orders found!');
      return;
    }
    
    // Check toys table schema first
    console.log('\n🔍 Checking toys table schema...');
    const toysColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'toys' 
      AND column_name LIKE '%age%'
    `;
    
    console.log('Age-related columns in toys table:');
    toysColumns.forEach(col => console.log(`  - ${col.column_name}`));
    
    // Migrate each unmigrated order
    for (const order of unmigrated) {
      console.log(`\n🔄 Processing order ${order.id.slice(0, 8)}...`);
      
      try {
        // Get customer data
        const customerData = await sql`
          SELECT * FROM custom_users WHERE id = ${order.user_id}
        `;
        const customer = customerData[0] || null;
        
        // Get order items with safer toy query
        const orderItems = await sql`
          SELECT 
            oi.*,
            t.name as toy_name,
            t.description as toy_description,
            t.image_url as toy_image_url,
            t.category as toy_category,
            COALESCE(t.age_range, '') as toy_age_range,
            t.retail_price as toy_retail_price,
            t.rental_price as toy_rental_price
          FROM order_items oi
          LEFT JOIN toys t ON oi.toy_id = t.id
          WHERE oi.order_id = ${order.id}
        `;
        
        console.log(`   Found ${orderItems.length} order items`);
        
        // Transform toys data
        const toysData = orderItems.map(item => ({
          toy_id: item.toy_id,
          name: item.toy_name || 'Unknown Toy',
          description: item.toy_description || '',
          image_url: item.toy_image_url || '',
          category: item.toy_category || '',
          age_group: item.toy_age_range || item.age_group || '3-5',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || item.toy_rental_price || 0,
          total_price: item.total_price || (item.unit_price * item.quantity) || 0,
          returned: false,
          subscription_category: item.subscription_category || '',
          ride_on_toy_id: item.ride_on_toy_id || null
        }));
        
        // Standardize shipping address
        const shippingAddress = order.shipping_address || {};
        const standardizedAddress = {
          first_name: shippingAddress.first_name || customer?.first_name || '',
          last_name: shippingAddress.last_name || customer?.last_name || '',
          phone: shippingAddress.phone || customer?.phone || '',
          email: shippingAddress.email || customer?.email || '',
          address_line1: shippingAddress.address_line1 || '',
          address_line2: shippingAddress.address_line2 || shippingAddress.apartment || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state || '',
          postcode: shippingAddress.postcode || shippingAddress.zip_code || '',
          country: shippingAddress.country || 'India',
          latitude: shippingAddress.latitude || null,
          longitude: shippingAddress.longitude || null,
          plus_code: shippingAddress.plus_code || '',
          delivery_instructions: order.delivery_instructions || null
        };
        
        // Insert into rental_orders
        await sql`
          INSERT INTO rental_orders (
            legacy_order_id,
            legacy_created_at,
            migrated_at,
            user_id,
            user_phone,
            status,
            order_type,
            total_amount,
            base_amount,
            gst_amount,
            discount_amount,
            coupon_code,
            payment_status,
            payment_method,
            cycle_number,
            rental_start_date,
            rental_end_date,
            toys_data,
            toys_delivered_count,
            toys_returned_count,
            shipping_address,
            age_group,
            delivery_instructions,
            admin_notes,
            internal_status,
            created_at,
            updated_at
          ) VALUES (
            ${order.id},
            ${order.created_at},
            ${new Date().toISOString()},
            ${order.user_id},
            ${customer?.phone || ''},
            ${order.status || 'pending'},
            ${order.order_type || 'subscription'},
            ${order.total_amount || 0},
            ${order.base_amount || 0},
            ${order.gst_amount || 0},
            ${order.discount_amount || 0},
            ${order.coupon_code || null},
            ${'pending'},
            ${'razorpay'},
            ${1},
            ${order.rental_start_date ? new Date(order.rental_start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]},
            ${order.rental_end_date ? new Date(order.rental_end_date).toISOString().split('T')[0] : new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]},
            ${JSON.stringify(toysData)},
            ${toysData.length},
            ${0},
            ${JSON.stringify(standardizedAddress)},
            ${toysData[0]?.age_group || '3-5'},
            ${order.delivery_instructions || null},
            ${'Migrated from legacy order ' + order.id},
            ${'migrated'},
            ${order.created_at},
            ${order.updated_at || new Date().toISOString()}
          )
        `;
        
        console.log(`   ✅ Successfully migrated order ${order.id.slice(0, 8)}`);
        
      } catch (error) {
        console.log(`   ❌ Failed to migrate order ${order.id.slice(0, 8)}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Retry migration complete!');
    console.log('Run "node verify-migration-direct.js" to check results.');
    
  } catch (error) {
    console.error('❌ Retry migration failed:', error.message);
  } finally {
    await sql.end();
  }
}

retryFailedMigration().catch(console.error); 