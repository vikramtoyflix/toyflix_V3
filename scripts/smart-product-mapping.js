import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;

// Load environment variables
dotenv.config();

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class SmartProductMapper {
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

  // Clean product names for better matching
  cleanProductName(name) {
    if (!name) return name;
    
    return name
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Remove rental-specific text
      .replace(/\s*Toy Rental.*$/i, '')
      .replace(/\s*\|\s*Rent with Toyflix.*$/i, '')
      // Clean up spacing and punctuation
      .trim()
      .replace(/\s+/g, ' ');
  }

  async smartMapProducts() {
    console.log('🧠 Starting smart mapping for remaining unmapped products...');

    // Get all unmapped products
    const unmappedProducts = await this.client.query(`
      SELECT wp_product_id, wp_product_name
      FROM migration_staging.product_toy_mapping 
      WHERE final_toy_id IS NULL
        AND wp_product_name NOT ILIKE '%plan%'
        AND wp_product_name NOT ILIKE '%trial%'
      ORDER BY wp_product_name
    `);

    // Get all toys for comparison
    const toys = await this.client.query(`
      SELECT id, name FROM toys ORDER BY name
    `);

    console.log(`\n🔍 Processing ${unmappedProducts.rows.length} unmapped products...`);

    let mappedCount = 0;
    const mappings = [];

    for (const product of unmappedProducts.rows) {
      const cleanedProductName = this.cleanProductName(product.wp_product_name);
      console.log(`\nProcessing: "${product.wp_product_name}"`);
      console.log(`Cleaned: "${cleanedProductName}"`);

      // Try exact match with cleaned name
      const exactMatch = toys.rows.find(toy => 
        toy.name.toLowerCase().trim() === cleanedProductName.toLowerCase().trim()
      );

      if (exactMatch) {
        console.log(`✅ Exact match found: "${exactMatch.name}"`);
        mappings.push({
          wp_product_id: product.wp_product_id,
          toy_id: exactMatch.id,
          toy_name: exactMatch.name,
          confidence: 'high',
          method: 'cleaned_exact_match'
        });
        mappedCount++;
        continue;
      }

      // Try partial matching (contains)
      const partialMatches = toys.rows.filter(toy => {
        const toyWords = toy.name.toLowerCase().split(/\s+/);
        const productWords = cleanedProductName.toLowerCase().split(/\s+/);
        
        // Check if most significant words match
        const significantWords = productWords.filter(word => 
          word.length > 2 && !['and', 'the', 'with', 'for'].includes(word)
        );
        
        const matchingWords = significantWords.filter(word => 
          toyWords.some(toyWord => toyWord.includes(word) || word.includes(toyWord))
        );
        
        return matchingWords.length >= Math.min(2, significantWords.length * 0.6);
      });

      if (partialMatches.length === 1) {
        console.log(`🎯 Partial match found: "${partialMatches[0].name}"`);
        mappings.push({
          wp_product_id: product.wp_product_id,
          toy_id: partialMatches[0].id,
          toy_name: partialMatches[0].name,
          confidence: 'medium',
          method: 'partial_word_match'
        });
        mappedCount++;
        continue;
      }

      if (partialMatches.length > 1) {
        console.log(`⚠️  Multiple partial matches found:`);
        partialMatches.slice(0, 3).forEach((match, index) => {
          console.log(`    ${index + 1}. ${match.name}`);
        });
      } else {
        console.log(`❌ No matches found`);
      }
    }

    // Apply the mappings
    if (mappings.length > 0) {
      console.log(`\n🔄 Applying ${mappings.length} smart mappings...`);
      
      for (const mapping of mappings) {
        await this.client.query(`
          UPDATE migration_staging.product_toy_mapping 
          SET final_toy_id = $1,
              suggested_toy_id = $1,
              suggested_toy_name = $2,
              mapping_confidence = $3,
              mapping_method = $4,
              mapping_status = 'smart_mapped',
              updated_at = NOW()
          WHERE wp_product_id = $5
        `, [mapping.toy_id, mapping.toy_name, mapping.confidence, mapping.method, mapping.wp_product_id]);
      }
    }

    return mappedCount;
  }

  async markSubscriptionPlans() {
    console.log('\n📋 Marking subscription plans as non-toy products...');
    
    const result = await this.client.query(`
      UPDATE migration_staging.product_toy_mapping 
      SET mapping_status = 'subscription_plan',
          mapping_method = 'auto_detected',
          reviewer_notes = 'Subscription plan - does not require toy mapping',
          updated_at = NOW()
      WHERE final_toy_id IS NULL
        AND (wp_product_name ILIKE '%plan%' OR wp_product_name ILIKE '%trial%')
    `);

    console.log(`✅ Marked ${result.rowCount} subscription plans`);
    return result.rowCount;
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
    stats.rows.forEach(stat => {
      console.log(`  ${stat.mapping_status || 'unmapped'}: ${stat.count}`);
    });

    // Show remaining unmapped products
    const stillUnmapped = await this.client.query(`
      SELECT wp_product_name, wp_product_id
      FROM migration_staging.product_toy_mapping 
      WHERE final_toy_id IS NULL 
        AND mapping_status NOT IN ('subscription_plan')
      ORDER BY wp_product_name
    `);

    if (stillUnmapped.rows.length > 0) {
      console.log('\n⚠️  Still Need Manual Review:');
      stillUnmapped.rows.forEach((product, index) => {
        console.log(`  ${index + 1}. ${product.wp_product_name} (WP ID: ${product.wp_product_id})`);
      });
    } else {
      console.log('\n🎉 All products have been mapped or categorized!');
    }
  }

  async run() {
    try {
      await this.connect();
      
      const smartMapped = await this.smartMapProducts();
      const subscriptionPlans = await this.markSubscriptionPlans();
      
      await this.showFinalStatus();
      
      console.log('\n🎉 Smart product mapping completed!');
      console.log(`   ${smartMapped} products smart-mapped`);
      console.log(`   ${subscriptionPlans} subscription plans marked`);
      
    } catch (error) {
      console.error('❌ Error during smart mapping:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const mapper = new SmartProductMapper();
  await mapper.run();
}

main().catch(console.error); 