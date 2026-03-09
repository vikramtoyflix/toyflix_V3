import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;

// Load environment variables
dotenv.config();

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class ProductToyMapper {
  constructor() {
    this.client = null;
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
      console.log('👋 Disconnected from database');
    }
  }

  async autoMapProducts() {
    console.log('🔄 Starting auto-mapping of products to toys...');

    // Get current mapping status
    const beforeStats = await this.client.query(`
      SELECT 
        CASE WHEN final_toy_id IS NULL THEN 'unmapped' ELSE 'mapped' END as status,
        COUNT(*) as count
      FROM migration_staging.product_toy_mapping 
      GROUP BY CASE WHEN final_toy_id IS NULL THEN 'unmapped' ELSE 'mapped' END
    `);

    console.log('\n📊 Before Auto-Mapping:');
    beforeStats.rows.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}`);
    });

    // Auto-map products to toys based on exact name matches
    const autoMapQuery = `
      UPDATE migration_staging.product_toy_mapping 
      SET final_toy_id = toys.id, 
          suggested_toy_id = toys.id,
          suggested_toy_name = toys.name,
          mapping_confidence = 'high',
          mapping_method = 'exact_name_match',
          mapping_status = 'auto_mapped',
          updated_at = NOW()
      FROM toys 
      WHERE TRIM(LOWER(migration_staging.product_toy_mapping.wp_product_name)) = TRIM(LOWER(toys.name))
        AND migration_staging.product_toy_mapping.final_toy_id IS NULL
    `;

    const result = await this.client.query(autoMapQuery);
    console.log(`\n✅ Successfully auto-mapped ${result.rowCount} products to toys!`);

    // Get updated mapping status
    const afterStats = await this.client.query(`
      SELECT 
        mapping_status,
        COUNT(*) as count
      FROM migration_staging.product_toy_mapping 
      GROUP BY mapping_status
      ORDER BY count DESC
    `);

    console.log('\n📊 After Auto-Mapping:');
    afterStats.rows.forEach(stat => {
      console.log(`  ${stat.mapping_status || 'unmapped'}: ${stat.count}`);
    });

    // Show sample successful mappings
    const sampleMappings = await this.client.query(`
      SELECT pm.wp_product_name, t.name as toy_name, pm.final_toy_id
      FROM migration_staging.product_toy_mapping pm
      JOIN toys t ON pm.final_toy_id = t.id
      WHERE pm.mapping_status = 'auto_mapped'
      LIMIT 5
    `);

    if (sampleMappings.rows.length > 0) {
      console.log('\n✅ Sample Successful Mappings:');
      sampleMappings.rows.forEach((mapping, index) => {
        console.log(`  ${index + 1}. ${mapping.wp_product_name} → ${mapping.toy_name}`);
      });
    }

    // Show unmapped products that need manual review
    const unmappedProducts = await this.client.query(`
      SELECT wp_product_name, wp_product_id
      FROM migration_staging.product_toy_mapping 
      WHERE final_toy_id IS NULL
      ORDER BY wp_product_name
      LIMIT 10
    `);

    if (unmappedProducts.rows.length > 0) {
      console.log('\n⚠️  Products Still Needing Manual Mapping:');
      unmappedProducts.rows.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.wp_product_name} (WP ID: ${product.wp_product_id})`);
      });
    }

    return result.rowCount;
  }

  async suggestMappings() {
    console.log('\n🔍 Suggesting possible mappings for unmapped products...');

    const suggestions = await this.client.query(`
      SELECT 
        pm.wp_product_name,
        t.name as suggested_toy_name,
        t.id as suggested_toy_id,
        similarity(LOWER(pm.wp_product_name), LOWER(t.name)) as similarity_score
      FROM migration_staging.product_toy_mapping pm
      CROSS JOIN toys t
      WHERE pm.final_toy_id IS NULL
        AND similarity(LOWER(pm.wp_product_name), LOWER(t.name)) > 0.3
      ORDER BY pm.wp_product_name, similarity_score DESC
      LIMIT 20
    `);

    if (suggestions.rows.length > 0) {
      console.log('💡 Suggested Mappings (similarity > 30%):');
      suggestions.rows.forEach((suggestion, index) => {
        const score = Math.round(suggestion.similarity_score * 100);
        console.log(`  ${index + 1}. "${suggestion.wp_product_name}" → "${suggestion.suggested_toy_name}" (${score}%)`);
      });
    } else {
      console.log('ℹ️  No similarity-based suggestions found.');
    }
  }

  async run() {
    try {
      await this.connect();
      const mappedCount = await this.autoMapProducts();
      await this.suggestMappings();
      
      console.log('\n🎉 Product-to-Toy mapping completed!');
      console.log(`   ${mappedCount} products automatically mapped`);
      
    } catch (error) {
      console.error('❌ Error during product mapping:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const mapper = new ProductToyMapper();
  await mapper.run();
}

main().catch(console.error); 