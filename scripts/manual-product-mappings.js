import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;

// Load environment variables
dotenv.config();

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class ManualProductMapper {
  constructor() {
    this.client = null;
    
    // Manual mappings based on analysis
    this.manualMappings = [
      {
        wp_product_id: 7839, // "Animal Variety Stacking Red Toy Rental | Rent with Toyflix for Kids"
        toy_id: '1596985a-32fa-465e-95fe-4997746dcd44', // "Animal inside stacking"
        confidence: 'high',
        reason: 'Clear match - both are animal stacking toys'
      },
      {
        wp_product_id: 8235, // "Funskool Toddle n Ride Toy Rental | Rent with Toyflix for Kids"
        toy_id: '872ddb94-48cf-4ac6-99d0-87fb0c7e7777', // "Baybee Push Ride on Baby Jeep for Kids"
        confidence: 'medium',
        reason: 'Both are ride-on toys for toddlers'
      },
      {
        wp_product_id: 7950, // "HAPE Rainbow Xylophone"
        toy_id: '0d58b2a5-87db-4c24-a006-df7aa3b7cbab', // "2in1 Baby Piano Xylophone Toy for Kids"
        confidence: 'high',
        reason: 'Both are xylophone musical instruments'
      },
      {
        wp_product_id: 28085, // "Magnetic Number Train"
        toy_id: 'd485cbbb-639f-4921-af98-c2a51fe54bc7', // "Alphabet Train"
        confidence: 'medium',
        reason: 'Both are educational trains (numbers vs alphabet)'
      },
      {
        wp_product_id: 9225, // "OK Play Push & Pull Stick Wheel"
        toy_id: '872ddb94-48cf-4ac6-99d0-87fb0c7e7777', // "Baybee Push Ride on Baby Jeep for Kids"
        confidence: 'low',
        reason: 'Both involve push/pull mechanics - needs review'
      }
    ];

    // Products that need new toy entries (no good matches found)
    this.newToyProducts = [
      {
        wp_product_id: 28134, // "ABC artificial intelligence board book"
        reason: 'New AI-themed educational book - no existing match'
      },
      {
        wp_product_id: 8227, // "Interactive Frog Clock with Calendar & seasons"
        reason: 'Unique educational clock toy - no existing match'
      }
    ];
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

  async applyManualMappings() {
    console.log('🔧 Applying manual mappings for remaining products...');
    
    let successCount = 0;

    for (const mapping of this.manualMappings) {
      try {
        // Get toy name for the mapping
        const toyResult = await this.client.query(
          'SELECT name FROM toys WHERE id = $1',
          [mapping.toy_id]
        );

        if (toyResult.rows.length === 0) {
          console.log(`❌ Toy ID ${mapping.toy_id} not found`);
          continue;
        }

        const toyName = toyResult.rows[0].name;

        // Apply the mapping
        await this.client.query(`
          UPDATE migration_staging.product_toy_mapping 
          SET final_toy_id = $1,
              suggested_toy_id = $1,
              suggested_toy_name = $2,
              mapping_confidence = $3,
              mapping_method = 'manual_review',
              mapping_status = 'manually_mapped',
              reviewer_notes = $4,
              is_reviewed = true,
              updated_at = NOW()
          WHERE wp_product_id = $5
        `, [mapping.toy_id, toyName, mapping.confidence, mapping.reason, mapping.wp_product_id]);

        console.log(`✅ Mapped product ${mapping.wp_product_id} → "${toyName}" (${mapping.confidence} confidence)`);
        console.log(`   Reason: ${mapping.reason}`);
        successCount++;

      } catch (error) {
        console.log(`❌ Failed to map product ${mapping.wp_product_id}: ${error.message}`);
      }
    }

    return successCount;
  }

  async markNewToyProducts() {
    console.log('\n📝 Marking products that need new toy entries...');
    
    let markedCount = 0;

    for (const product of this.newToyProducts) {
      try {
        await this.client.query(`
          UPDATE migration_staging.product_toy_mapping 
          SET mapping_status = 'needs_new_toy',
              mapping_method = 'manual_review',
              reviewer_notes = $1,
              is_reviewed = true,
              updated_at = NOW()
          WHERE wp_product_id = $2
        `, [product.reason, product.wp_product_id]);

        console.log(`📝 Marked product ${product.wp_product_id} as needing new toy entry`);
        console.log(`   Reason: ${product.reason}`);
        markedCount++;

      } catch (error) {
        console.log(`❌ Failed to mark product ${product.wp_product_id}: ${error.message}`);
      }
    }

    return markedCount;
  }

  async showFinalStatus() {
    const stats = await this.client.query(`
      SELECT 
        mapping_status,
        COUNT(*) as count
      FROM migration_staging.product_toy_mapping 
      GROUP BY mapping_status
      ORDER BY count DESC
    `);

    console.log('\n📊 Final Product Mapping Status:');
    console.log('================================');
    let totalMapped = 0;
    let totalProducts = 0;
    
    stats.rows.forEach(stat => {
      console.log(`  ${stat.mapping_status || 'unmapped'}: ${stat.count}`);
      totalProducts += parseInt(stat.count);
      if (['auto_mapped', 'smart_mapped', 'manually_mapped'].includes(stat.mapping_status)) {
        totalMapped += parseInt(stat.count);
      }
    });

    const mappingPercentage = Math.round((totalMapped / totalProducts) * 100);
    console.log(`\n🎯 Mapping Success Rate: ${totalMapped}/${totalProducts} (${mappingPercentage}%)`);

    // Show any remaining unmapped products
    const stillUnmapped = await this.client.query(`
      SELECT wp_product_name, wp_product_id, mapping_status
      FROM migration_staging.product_toy_mapping 
      WHERE final_toy_id IS NULL 
        AND mapping_status NOT IN ('subscription_plan', 'needs_new_toy')
      ORDER BY wp_product_name
    `);

    if (stillUnmapped.rows.length > 0) {
      console.log('\n⚠️  Still Unmapped:');
      stillUnmapped.rows.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.wp_product_name} (Status: ${product.mapping_status || 'unmapped'})`);
      });
    } else {
      console.log('\n🎉 All products have been mapped or categorized!');
    }
  }

  async run() {
    try {
      await this.connect();
      
      const mappedCount = await this.applyManualMappings();
      const markedCount = await this.markNewToyProducts();
      
      await this.showFinalStatus();
      
      console.log('\n🎉 Manual product mapping completed!');
      console.log(`   ${mappedCount} products manually mapped`);
      console.log(`   ${markedCount} products marked for new toy creation`);
      
    } catch (error) {
      console.error('❌ Error during manual mapping:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const mapper = new ManualProductMapper();
  await mapper.run();
}

main().catch(console.error); 