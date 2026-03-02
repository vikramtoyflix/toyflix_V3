#!/usr/bin/env node
/**
 * One-time script to create an E2E admin user (email + password) in Supabase.
 * - Creates auth.users entry via Admin API (email + password).
 * - Inserts custom_users row with same id, role='admin', phone_verified=true.
 *
 * Run locally (never commit credentials):
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxx \
 *   E2E_ADMIN_EMAIL=vikram@toyflix.in E2E_ADMIN_PASSWORD='YourPassword' \
 *   node scripts/create-e2e-admin-user.js
 *
 * Password must be provided via env; do not store in repo or in this file.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'vikram@toyflix.in';
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!E2E_ADMIN_PASSWORD) {
  console.error('Missing E2E_ADMIN_PASSWORD (required for security; set in env only)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Creating E2E admin user:', E2E_ADMIN_EMAIL);

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: E2E_ADMIN_EMAIL,
    password: E2E_ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message?.includes('already been registered')) {
      console.log('Auth user already exists; ensuring custom_users row...');
      const { data: existing } = await supabase.auth.admin.listUsers();
      const user = existing?.users?.find((u) => u.email === E2E_ADMIN_EMAIL);
      if (!user) {
        console.error('Could not find existing user:', authError.message);
        process.exit(1);
        return;
      }
      await upsertCustomUser(supabase, user.id, E2E_ADMIN_EMAIL);
      console.log('Done. E2E admin custom_users row ensured.');
      return;
    }
    console.error('Auth create error:', authError.message);
    process.exit(1);
    return;
  }

  const userId = authUser.user?.id;
  if (!userId) {
    console.error('No user id returned');
    process.exit(1);
    return;
  }

  await upsertCustomUser(supabase, userId, E2E_ADMIN_EMAIL);
  console.log('Done. E2E admin user created:', userId);
}

async function upsertCustomUser(supabase, id, email) {
  const row = {
    id,
    email,
    first_name: 'E2E',
    last_name: 'Admin',
    role: 'admin',
    phone_verified: true,
    is_active: true,
    phone: '', // App CustomUser expects string
    subscription_active: false,
    subscription_plan: null,
    subscription_end_date: null,
    zip_code: null,
    address_line1: null,
    address_line2: null,
    city: null,
    state: null,
    avatar_url: null,
    last_login: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    latitude: null,
    longitude: null,
  };

  const { error } = await supabase.from('custom_users').upsert(row, {
    onConflict: 'id',
  });

  if (error) {
    console.error('custom_users upsert error:', error.message);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
