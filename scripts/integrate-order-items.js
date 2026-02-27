import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class OrderItemsIntegration {
  constructor() {
    this.client = null;
    this.toyMapping = new Map(); // wp_product_id -> toy_id
  }

  async connect() {
    this.client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await this.client.connect();
    console.log('✅ Connected to database');
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    }[type] || 'ℹ️';
    console.log(`${prefix} ${message}`);
  }

  async buildToyMapping() {
    this.log('Building toy mapping from WordPress products to toys...');
    
    const mappingResult = await this.client.query(`
      SELECT 
        ptm.wp_product_id,
        ptm.final_toy_id as toy_id
      FROM migration_staging.product_toy_mapping ptm
      WHERE ptm.final_toy_id IS NOT NULL
      AND ptm.mapping_status IN ('auto_mapped', 'smart_mapped', 'manually_mapped')
    `);

    mappingResult.rows.forEach(row => {
      this.toyMapping.set(row.wp_product_id, row.toy_id);
    });

    this.log(`Toy mapping built: ${this.toyMapping.size} WordPress products mapped to toys`, 'success');
    return this.toyMapping.size;
  }

  async integrateOrderItems() {
    this.log('Starting order items integration...');

    // Get order items that need integration
    const orderItemsResult = await this.client.query(`
      SELECT 
        ois.*,
        os.integrated_order_id as live_order_id
      FROM migration_staging.order_items_staging ois
      JOIN migration_staging.orders_staging os ON ois.staged_order_id = os.id
      WHERE ois.migration_status = 'pending'
      AND os.migration_status = 'completed'
      AND os.integrated_order_id IS NOT NULL
      ORDER BY ois.created_at DESC
      LIMIT 50
    `);

    this.log(`Found ${orderItemsResult.rows.length} order items ready for integration`);

    if (orderItemsResult.rows.length === 0) {
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const stagingOrderItem of orderItemsResult.rows) {
      try {
        const liveOrderId = stagingOrderItem.live_order_id;
        
        // Get the toy ID from product mapping
        const toyId = this.toyMapping.get(stagingOrderItem.wp_product_id);
        if (!toyId) {
          this.log(`Order item ${stagingOrderItem.id}: No toy mapping found for product ${stagingOrderItem.wp_product_id}`, 'warning');
          failedCount++;
          continue;
        }

        // Check if order item already exists
        const existingResult = await this.client.query(
          'SELECT id FROM order_items WHERE id = $1',
          [stagingOrderItem.id]
        );

        if (existingResult.rows.length > 0) {
          this.log(`Order item ${stagingOrderItem.id}: Already exists, skipping`, 'warning');
          continue;
        }

        // Insert order item
        await this.client.query(`
          INSERT INTO order_items (
            id,
            order_id,
            toy_id,
            quantity,
            rental_price,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          stagingOrderItem.id,
          liveOrderId,
          toyId,
          stagingOrderItem.quantity || 1,
          stagingOrderItem.unit_price || 0,
          stagingOrderItem.wp_created_at || stagingOrderItem.created_at
        ]);

        // Mark as completed in staging
        await this.client.query(
          'UPDATE migration_staging.order_items_staging SET migration_status = $1 WHERE id = $2',
          ['completed', stagingOrderItem.id]
        );

        successCount++;
        this.log(`Order item integrated: ${stagingOrderItem.wp_product_name} - Qty: ${stagingOrderItem.quantity}`);

      } catch (error) {
        this.log(`Failed to integrate order item ${stagingOrderItem.id}: ${error.message}`, 'error');
        failedCount++;
      }
    }

    this.log(`Order items integration completed: ${successCount} success, ${failedCount} failed`, 'success');
    return { success: successCount, failed: failedCount };
  }

  async run() {
    try {
      await this.connect();

      const toyMappings = await this.buildToyMapping();
      if (toyMappings === 0) {
        this.log('No toy mappings found. Cannot proceed with integration.', 'error');
        return;
      }

      const orderItemResults = await this.integrateOrderItems();

      // Check final counts
      const finalCounts = await this.client.query(`
        SELECT 
          (SELECT COUNT(*) FROM order_items) as live_order_items,
          (SELECT COUNT(*) FROM migration_staging.order_items_staging WHERE migration_status = 'pending') as pending_order_items
      `);

      const counts = finalCounts.rows[0];
      this.log(`📈 Final state: Live order items: ${counts.live_order_items}, Pending: ${counts.pending_order_items}`);

    } catch (error) {
      this.log(`Integration failed: ${error.message}`, 'error');
    } finally {
      await this.disconnect();
    }
  }
}

const integration = new OrderItemsIntegration();
integration.run().catch(console.error); 