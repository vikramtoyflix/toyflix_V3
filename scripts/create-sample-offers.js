#!/usr/bin/env node

/**
 * Create Sample Promotional Offers
 * Populates the database with sample promotional offers for testing
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (!supabaseUrl.includes('supabase.co') || !supabaseKey.startsWith('eyJ')) {
  console.error('❌ Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSampleOffers() {
  console.log('🎁 Creating Sample Promotional Offers');
  console.log('='.repeat(50));

  try {
    // First, get an admin user to use as creator
    const { data: adminUsers, error: adminError } = await supabase
      .from('custom_users')
      .select('id, full_name, email, role')
      .eq('role', 'admin')
      .limit(1);
    
    if (adminError || adminUsers.length === 0) {
      console.error('❌ No admin user found. Please create an admin user first.');
      return false;
    }

    const adminUserId = adminUsers[0].id;
    console.log(`✅ Using admin user: ${adminUsers[0].full_name} (${adminUsers[0].email})`);

    // Sample offers to create
    // NOTE: 20% discount offers (WELCOME20) have been removed as per business decision
    const sampleOffers = [
      {
        code: 'FLAT500',
        name: 'Flat ₹500 Off',
        description: 'Flat ₹500 discount on orders above ₹2000',
        type: 'discount_amount',
        value: 500,
        min_order_value: 2000,
        target_plans: ['standard', 'premium'],
        usage_limit: 50,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
        is_active: true,
        auto_apply: false,
        stackable: true,
        first_time_users_only: false,
        created_by: adminUserId
      },
      {
        code: 'FREEMONTH',
        name: 'Free Month Extension',
        description: 'Get 1 free month added to your subscription',
        type: 'free_month',
        value: 1,
        min_order_value: 0,
        target_plans: ['basic', 'standard', 'premium'],
        usage_limit: 25,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
        is_active: true,
        auto_apply: false,
        stackable: false,
        first_time_users_only: false,
        created_by: adminUserId
      },
      {
        code: 'LOYALTY15',
        name: 'Loyalty 15% Off',
        description: 'Loyalty reward for existing customers',
        type: 'discount_percentage',
        value: 15,
        min_order_value: 1500,
        max_discount_amount: 300,
        target_plans: ['standard', 'premium'],
        usage_limit: null, // unlimited
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
        is_active: true,
        auto_apply: true, // auto-apply for eligible users
        stackable: false,
        first_time_users_only: false,
        created_by: adminUserId
      },
      {
        code: 'UPGRADE50',
        name: 'Upgrade Bonus',
        description: 'Special offer for plan upgrades',
        type: 'upgrade',
        value: 1,
        min_order_value: 0,
        target_plans: ['trial', 'basic'],
        usage_limit: 20,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        is_active: true,
        auto_apply: false,
        stackable: false,
        first_time_users_only: false,
        created_by: adminUserId
      }
    ];

    console.log(`\n📝 Creating ${sampleOffers.length} sample offers...`);

    for (const offer of sampleOffers) {
      console.log(`\n   Creating: ${offer.name} (${offer.code})`);
      
      // Check if offer already exists
      const { data: existing, error: checkError } = await supabase
        .from('promotional_offers')
        .select('id, code')
        .eq('code', offer.code)
        .limit(1);

      if (checkError) {
        console.error(`   ❌ Error checking existing offer: ${checkError.message}`);
        continue;
      }

      if (existing.length > 0) {
        console.log(`   ⚠️  Offer ${offer.code} already exists, skipping...`);
        continue;
      }

      // Create the offer
      const { data: created, error: createError } = await supabase
        .from('promotional_offers')
        .insert([offer])
        .select()
        .single();

      if (createError) {
        console.error(`   ❌ Error creating offer: ${createError.message}`);
        continue;
      }

      console.log(`   ✅ Created: ${created.name} (ID: ${created.id})`);
      console.log(`      Type: ${created.type}, Value: ${created.value}`);
      console.log(`      Valid until: ${new Date(created.end_date).toLocaleDateString()}`);
    }

    // Create sample offer templates
    console.log('\n📋 Creating sample offer templates...');

    // NOTE: 20% discount templates have been removed as per business decision
    const sampleTemplates = [
      {
        name: 'Seasonal Sale Template',
        description: 'Template for seasonal sales',
        category: 'seasonal',
        template_data: {
          type: 'discount_percentage',
          value: 25,
          min_order_value: 1500,
          duration_days: 15,
          max_discount_amount: 400
        },
        is_active: true,
        created_by: adminUserId
      }
    ];

    for (const template of sampleTemplates) {
      const { data: existingTemplate, error: templateCheckError } = await supabase
        .from('offer_templates')
        .select('id, name')
        .eq('name', template.name)
        .limit(1);

      if (templateCheckError) {
        console.error(`   ❌ Error checking existing template: ${templateCheckError.message}`);
        continue;
      }

      if (existingTemplate.length > 0) {
        console.log(`   ⚠️  Template "${template.name}" already exists, skipping...`);
        continue;
      }

      const { data: createdTemplate, error: templateCreateError } = await supabase
        .from('offer_templates')
        .insert([template])
        .select()
        .single();

      if (templateCreateError) {
        console.error(`   ❌ Error creating template: ${templateCreateError.message}`);
        continue;
      }

      console.log(`   ✅ Created template: ${createdTemplate.name}`);
    }

    console.log('\n🎯 Sample Data Creation Summary:');
    console.log('✅ Sample promotional offers created');
    console.log('✅ Sample offer templates created');
    console.log('✅ Database is ready for testing');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Access admin panel at /admin?tab=promotional-offers');
    console.log('2. View the created offers in the dashboard');
    console.log('3. Test offer assignment and usage');
    console.log('4. Validate analytics and reporting');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the script
createSampleOffers()
  .then(success => {
    if (success) {
      console.log('\n🎉 Sample Promotional Offers Created Successfully!');
      process.exit(0);
    } else {
      console.log('\n💥 Sample Data Creation Failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
