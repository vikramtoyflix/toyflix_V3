import pkg from 'pg';
import dotenv from 'dotenv';

const { Client } = pkg;

// Load environment variables
dotenv.config();

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

class FinalIntegration {
  constructor() {
    this.client = null;
    this.integrationLog = [];
    this.batchName = `integration_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type, message };
    this.integrationLog.push(logEntry);
    
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} ${message}`);
  }

  async connect() {
    this.client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await this.client.connect();
    this.log('Connected to database', 'success');
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.log('Disconnected from database');
    }
  }

  async validateStagingData() {
    this.log('🔍 Validating staging data before integration...');

    const userCount = await this.client.query('SELECT COUNT(*) FROM migration_staging.users_staging WHERE migration_status = \'pending\'');
    
    this.log(`📊 Staging Data Summary:`);
    this.log(`   Users ready for integration: ${userCount.rows[0].count}`);

    return {
      users: parseInt(userCount.rows[0].count)
    };
  }

  async integrateUsers(dryRun = false) {
    this.log('👥 Integrating users from staging to live tables...');

    const stagingUsers = await this.client.query(`
      SELECT * FROM migration_staging.users_staging 
      WHERE migration_status = 'pending'
      ORDER BY wp_created_at
    `);

    let successCount = 0;
    let errorCount = 0;

    for (const user of stagingUsers.rows) {
      try {
        if (!dryRun) {
          // Check if user already exists (by phone)
          const existingUser = await this.client.query(
            'SELECT id FROM custom_users WHERE phone = $1',
            [user.phone]
          );

          if (existingUser.rows.length > 0) {
            this.log(`⚠️ User with phone ${user.phone} already exists, skipping`, 'warning');
            continue;
          }

          // Split name into first and last name
          const nameParts = user.name ? user.name.trim().split(' ') : ['Customer'];
          const firstName = nameParts[0] || 'Customer';
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

          // Insert user into live table with correct schema
          await this.client.query(`
            INSERT INTO custom_users (
              id, first_name, last_name, phone, email, address_line1, address_line2, 
              city, state, zip_code, subscription_active, subscription_plan,
              created_at, updated_at, is_active, role
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            )
          `, [
            user.id, 
            firstName,
            lastName,
            user.phone, 
            user.email, 
            user.address_line_1,
            user.address_line_2,
            user.city, 
            user.state, 
            user.postal_code,
            user.subscription_status === 'active',
            user.subscription_status === 'active' ? 'basic' : null,
            user.wp_created_at, 
            user.wp_updated_at, 
            true,
            'user'
          ]);

          // Mark as integrated in staging
          await this.client.query(
            'UPDATE migration_staging.users_staging SET migration_status = \'integrated\', updated_at = NOW() WHERE id = $1',
            [user.id]
          );

          this.log(`✅ Integrated user: ${firstName} ${lastName} (${user.phone})`);
        }

        successCount++;
      } catch (error) {
        this.log(`❌ Failed to integrate user ${user.phone}: ${error.message}`, 'error');
        errorCount++;
      }
    }

    this.log(`Users integration: ${successCount} successful, ${errorCount} failed`, successCount > 0 ? 'success' : 'warning');
    return { successCount, errorCount };
  }

  async run(options = {}) {
    const { dryRun = false } = options;

    try {
      await this.connect();

      this.log(`🚀 Starting final integration${dryRun ? ' (DRY RUN)' : ''}...`);
      
      // Validate staging data
      const validation = await this.validateStagingData();
      
      if (validation.users === 0) {
        this.log('⚠️ No users ready for integration. Please check staging data.', 'warning');
        return false;
      }

      // Start with users integration
      const userResults = await this.integrateUsers(dryRun);

      this.log('🎉 Final integration completed successfully!', 'success');
      this.log(`   Users: ${userResults.successCount} integrated, ${userResults.errorCount} failed`);

      return true;

    } catch (error) {
      this.log(`❌ Integration failed: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const integration = new FinalIntegration();
  const success = await integration.run({ dryRun });

  process.exit(success ? 0 : 1);
}

main().catch(console.error); 