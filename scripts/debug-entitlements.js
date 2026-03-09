import { createClient } from '@supabase/supabase-js';

class EntitlementsDebugger {
  constructor() {
    this.supabaseUrl = 'https://wucwpyitzqjukcphczhr.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjemhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTMyNDI5NiwiZXhwIjoyMDY0OTAwMjk2fQ.aBnxAxxD4WiiDQS7m4j1JiluHa8BdCak9y334RILiKc';
    
    this.client = createClient(this.supabaseUrl, this.supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async debugUserEntitlements(phone) {
    this.log(`🔍 Debugging entitlements for phone: ${phone}`);

    try {
      // Get user
      const { data: users, error: userError } = await this.client
        .from('custom_users')
        .select('*')
        .eq('phone', phone);

      if (userError || !users || users.length === 0) {
        this.log(`User ${phone} not found`, 'error');
        return;
      }

      const user = users[0];
      this.log(`User ID: ${user.id}`);
      this.log(`User: ${user.first_name} ${user.last_name} (${user.email})`);

      // Get subscriptions
      const { data: subscriptions, error: subError } = await this.client
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (subError) {
        this.log(`Error fetching subscriptions: ${subError.message}`, 'error');
        return;
      }

      this.log(`Subscriptions found: ${subscriptions?.length || 0}`);
      
      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          this.log(`Subscription ${sub.id}:`);
          this.log(`  Plan: ${sub.plan_id}, Status: ${sub.status}`);
          this.log(`  User ID: ${sub.user_id}`);

          // Check entitlements by subscription_id
          const { data: entitlementsBySub, error: entBySubError } = await this.client
            .from('user_entitlements')
            .select('*')
            .eq('subscription_id', sub.id);

          if (entBySubError) {
            this.log(`  Error fetching entitlements by subscription: ${entBySubError.message}`, 'error');
          } else {
            this.log(`  Entitlements by subscription_id: ${entitlementsBySub?.length || 0}`);
            if (entitlementsBySub && entitlementsBySub.length > 0) {
              entitlementsBySub.forEach((ent, index) => {
                this.log(`    Entitlement ${index + 1}:`);
                this.log(`      ID: ${ent.id}`);
                this.log(`      User ID: ${ent.user_id}`);
                this.log(`      Subscription ID: ${ent.subscription_id}`);
                this.log(`      Standard Toys: ${ent.standard_toys_remaining}`);
                this.log(`      Big Toys: ${ent.big_toys_remaining}`);
                this.log(`      Books: ${ent.books_remaining}`);
                this.log(`      Value Cap: ₹${ent.value_cap_remaining}`);
              });
            }
          }
        }
      }

      // Check entitlements by user_id directly
      const { data: entitlementsByUser, error: entByUserError } = await this.client
        .from('user_entitlements')
        .select('*')
        .eq('user_id', user.id);

      if (entByUserError) {
        this.log(`Error fetching entitlements by user: ${entByUserError.message}`, 'error');
      } else {
        this.log(`Entitlements by user_id: ${entitlementsByUser?.length || 0}`);
        if (entitlementsByUser && entitlementsByUser.length > 0) {
          entitlementsByUser.forEach((ent, index) => {
            this.log(`  Entitlement ${index + 1}:`);
            this.log(`    ID: ${ent.id}`);
            this.log(`    User ID: ${ent.user_id}`);
            this.log(`    Subscription ID: ${ent.subscription_id}`);
            this.log(`    Standard Toys: ${ent.standard_toys_remaining}`);
            this.log(`    Big Toys: ${ent.big_toys_remaining}`);
            this.log(`    Books: ${ent.books_remaining}`);
            this.log(`    Value Cap: ₹${ent.value_cap_remaining}`);
          });
        }
      }

      // Check if there are any entitlements that might be orphaned
      if (subscriptions && subscriptions.length > 0) {
        for (const sub of subscriptions) {
          this.log(`Checking for orphaned entitlements for subscription ${sub.id}...`);
          
          const { data: allEntitlements, error: allEntError } = await this.client
            .from('user_entitlements')
            .select('*')
            .eq('subscription_id', sub.id);

          if (allEntError) {
            this.log(`Error checking all entitlements: ${allEntError.message}`, 'error');
          } else {
            this.log(`All entitlements for subscription ${sub.id}: ${allEntitlements?.length || 0}`);
            
            if (allEntitlements && allEntitlements.length > 0) {
              allEntitlements.forEach((ent, index) => {
                const userMatch = ent.user_id === user.id;
                this.log(`  Entitlement ${index + 1}: User ID ${ent.user_id} ${userMatch ? '✅' : '❌'} (Expected: ${user.id})`);
                
                if (!userMatch) {
                  this.log(`    ⚠️ User ID mismatch! Fixing...`);
                  // Fix the user_id mismatch
                  this.fixEntitlementUserMismatch(ent.id, user.id);
                }
              });
            }
          }
        }
      }

    } catch (error) {
      this.log(`Error debugging entitlements: ${error.message}`, 'error');
    }
  }

  async fixEntitlementUserMismatch(entitlementId, correctUserId) {
    try {
      const { error } = await this.client
        .from('user_entitlements')
        .update({ user_id: correctUserId })
        .eq('id', entitlementId);

      if (error) {
        this.log(`Error fixing entitlement ${entitlementId}: ${error.message}`, 'error');
      } else {
        this.log(`✅ Fixed entitlement ${entitlementId} user_id`, 'success');
      }
    } catch (error) {
      this.log(`Error fixing entitlement: ${error.message}`, 'error');
    }
  }

  async run() {
    this.log('🔍 Debugging Entitlements for Dashboard');
    this.log('============================================================');

    // Debug Mythili's entitlements
    await this.debugUserEntitlements('9980111432');

    this.log('============================================================');
    this.log('🎉 Entitlements debugging completed!');
  }
}

// Run the debugger
const entitlementsDebugger = new EntitlementsDebugger();
entitlementsDebugger.run().catch(console.error); 