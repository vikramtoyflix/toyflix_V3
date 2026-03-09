const fs = require('fs');
const path = require('path');

class ComponentUpdater {
  constructor() {
    this.componentsToUpdate = [
      'src/components/dashboard/CurrentRentals.tsx',
      'src/components/dashboard/OrderHistory.tsx',
      // Add more components here as needed
    ];
    
    this.replacements = [
      {
        from: "import { useHybridOrders, useHybridCurrentRentals } from '@/hooks/useHybridOrders';",
        to: "import { useSupabaseOnlyOrders, useSupabaseCurrentRentals } from '@/hooks/useSupabaseOnlyOrders';"
      },
      {
        from: "import { useHybridOrders } from '@/hooks/useHybridOrders';",
        to: "import { useSupabaseOnlyOrders } from '@/hooks/useSupabaseOnlyOrders';"
      },
      {
        from: "import { useHybridCurrentRentals } from '@/hooks/useHybridOrders';",
        to: "import { useSupabaseCurrentRentals } from '@/hooks/useSupabaseOnlyOrders';"
      },
      {
        from: "const { data: orders, isLoading, error } = useHybridOrders();",
        to: "const { data: orders, isLoading, error } = useSupabaseOnlyOrders();"
      },
      {
        from: "const { data: rentals, isLoading, error } = useHybridCurrentRentals();",
        to: "const { data: rentals, isLoading, error } = useSupabaseCurrentRentals();"
      },
      {
        from: "useHybridOrders(",
        to: "useSupabaseOnlyOrders("
      },
      {
        from: "useHybridCurrentRentals(",
        to: "useSupabaseCurrentRentals("
      }
    ];
  }

  async updateComponents() {
    console.log('🔄 Starting component update to use Supabase-only hooks...\n');

    for (const componentPath of this.componentsToUpdate) {
      await this.updateComponent(componentPath);
    }

    console.log('\n✅ Component update completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the updated components');
    console.log('2. Verify data loads correctly');
    console.log('3. Remove old hybrid hooks when confident');
  }

  async updateComponent(componentPath) {
    try {
      // Check if file exists
      if (!fs.existsSync(componentPath)) {
        console.log(`⚠️ File not found: ${componentPath}`);
        return;
      }

      // Read the file
      const content = fs.readFileSync(componentPath, 'utf8');
      let updatedContent = content;
      let hasChanges = false;

      // Apply replacements
      for (const replacement of this.replacements) {
        if (updatedContent.includes(replacement.from)) {
          updatedContent = updatedContent.replace(new RegExp(replacement.from, 'g'), replacement.to);
          hasChanges = true;
          console.log(`✅ Updated: ${componentPath}`);
          console.log(`   - Replaced: ${replacement.from}`);
          console.log(`   - With: ${replacement.to}`);
        }
      }

      // Write back if changes were made
      if (hasChanges) {
        // Create backup first
        const backupPath = `${componentPath}.backup`;
        fs.copyFileSync(componentPath, backupPath);
        console.log(`📄 Backup created: ${backupPath}`);

        // Write updated content
        fs.writeFileSync(componentPath, updatedContent);
        console.log(`💾 Updated: ${componentPath}\n`);
      } else {
        console.log(`⏭️ No changes needed: ${componentPath}\n`);
      }

    } catch (error) {
      console.error(`❌ Error updating ${componentPath}:`, error.message);
    }
  }

  // Find all components that might use hybrid hooks
  async findComponentsUsingHybridHooks() {
    console.log('🔍 Searching for components using hybrid hooks...\n');

    const searchPatterns = [
      'useHybridOrders',
      'useHybridCurrentRentals',
      'useHybridSubscriptions'
    ];

    const foundFiles = [];

    // Search in src directory
    await this.searchDirectory('src', searchPatterns, foundFiles);

    console.log('📋 Components found using hybrid hooks:');
    foundFiles.forEach(file => {
      console.log(`   - ${file.path} (contains: ${file.patterns.join(', ')})`);
    });

    return foundFiles;
  }

  async searchDirectory(dirPath, patterns, foundFiles) {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and .git
          if (!['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) {
            await this.searchDirectory(fullPath, patterns, foundFiles);
          }
        } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          const foundPatterns = patterns.filter(pattern => content.includes(pattern));
          
          if (foundPatterns.length > 0) {
            foundFiles.push({
              path: fullPath,
              patterns: foundPatterns
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error searching directory ${dirPath}:`, error.message);
    }
  }

  // Create a summary of the migration
  async createMigrationSummary() {
    console.log('\n📊 MIGRATION SUMMARY\n');
    console.log('✅ Created new Supabase-only hooks:');
    console.log('   - useSupabaseOnlyOrders()');
    console.log('   - useSupabaseCurrentRentals()');
    console.log('   - useSupabaseSubscriptions()');
    console.log('   - useSupabasePayments()');
    
    console.log('\n🔄 Migration benefits:');
    console.log('   - No more WooCommerce API dependency');
    console.log('   - Faster data loading');
    console.log('   - Better error handling');
    console.log('   - Cleaner code structure');
    
    console.log('\n⚠️ Legacy hooks to remove (after testing):');
    console.log('   - src/hooks/useHybridOrders.ts');
    console.log('   - src/services/staticWebAppWooCommerceService.ts');
    
    console.log('\n🎯 Testing checklist:');
    console.log('   □ Order history displays correctly');
    console.log('   □ Current rentals show active toys');
    console.log('   □ Subscription status accurate');
    console.log('   □ Payment history accessible');
    console.log('   □ Admin panel comprehensive view works');
  }
}

// Main execution
async function main() {
  const updater = new ComponentUpdater();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'find':
      await updater.findComponentsUsingHybridHooks();
      break;
      
    case 'update':
      await updater.updateComponents();
      break;
      
    case 'summary':
      await updater.createMigrationSummary();
      break;
      
    default:
      console.log('🚀 WooCommerce to Supabase Component Updater\n');
      console.log('Usage:');
      console.log('  node scripts/update-components-to-supabase-only.cjs find    - Find components using hybrid hooks');
      console.log('  node scripts/update-components-to-supabase-only.cjs update  - Update components to use Supabase hooks');
      console.log('  node scripts/update-components-to-supabase-only.cjs summary - Show migration summary');
      console.log('\nRecommended order:');
      console.log('1. Run "find" to see what needs updating');
      console.log('2. Run "update" to apply changes');
      console.log('3. Test your app thoroughly');
      console.log('4. Run "summary" to see next steps');
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ComponentUpdater }; 