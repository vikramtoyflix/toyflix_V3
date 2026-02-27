import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = 'postgresql://postgres:Toyflix@123$@db.wucwpyitzqjukcphczhr.supabase.co:5432/postgres';

async function monitorIntegration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const currentUsers = await client.query('SELECT COUNT(*) FROM custom_users');
  const integratedUsers = await client.query(`SELECT COUNT(*) FROM migration_staging.users_staging WHERE migration_status = 'integrated'`);
  const pendingUsers = await client.query(`SELECT COUNT(*) FROM migration_staging.users_staging WHERE migration_status = 'pending'`);
  const totalStaging = await client.query('SELECT COUNT(*) FROM migration_staging.users_staging');

  const progress = Math.round((parseInt(integratedUsers.rows[0].count) / parseInt(totalStaging.rows[0].count)) * 100);

  console.log('📊 MIGRATION PROGRESS REPORT');
  console.log('============================');
  console.log(`🎯 Progress: ${progress}% (${integratedUsers.rows[0].count}/${totalStaging.rows[0].count})`);
  console.log(`📈 Live Database: ${currentUsers.rows[0].count} total users`);
  console.log(`✅ Integrated: ${integratedUsers.rows[0].count} users`);
  console.log(`⏳ Remaining: ${pendingUsers.rows[0].count} users`);

  if (pendingUsers.rows[0].count === '0') {
    console.log('\n🎉 🎉 🎉 MIGRATION COMPLETE! 🎉 🎉 🎉');
    console.log(`Successfully migrated all ${integratedUsers.rows[0].count} users from WordPress to Supabase!`);
  } else {
    const estimatedTime = Math.ceil(parseInt(pendingUsers.rows[0].count) / 10); // Rough estimate at 10 users/second
    console.log(`⏱️  Estimated time remaining: ~${estimatedTime} seconds`);
  }

  await client.end();
}

monitorIntegration().catch(console.error); 