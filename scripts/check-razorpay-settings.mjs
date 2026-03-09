import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wucwpyitzqjukcphczhr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1Y3dweWl0enFqdWtjcGhjenIiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzA1Njg1NjkwLCJleHAiOjIwMjEyNjE2OTB9.vHrPvh_-jNLDd_dWNcgUjGqnhBWh5WEZZ_TP_B_jxVw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkRazorpaySettings() {
  console.log('🔍 Checking Razorpay settings...');

  const { data: settings, error } = await supabase
    .from('admin_settings')
    .select('*');

  if (error) {
    console.error('❌ Error fetching settings:', error);
    return;
  }

  console.log('📦 Current settings:', settings);

  const keyId = settings?.find(s => s.setting_key === 'razorpay_key_id')?.setting_value;
  const keySecret = settings?.find(s => s.setting_key === 'razorpay_key_secret')?.setting_value;

  console.log('Key ID exists:', !!keyId);
  console.log('Key Secret exists:', !!keySecret);

  if (!keyId || !keySecret) {
    console.log('⚠️ Missing Razorpay settings, updating...');

    const { error: updateError } = await supabase
      .from('admin_settings')
      .upsert([
        {
          setting_key: 'razorpay_key_id',
          setting_value: 'rzp_test_your_key_id'
        },
        {
          setting_key: 'razorpay_key_secret',
          setting_value: 'your_key_secret'
        }
      ]);

    if (updateError) {
      console.error('❌ Error updating settings:', updateError);
    } else {
      console.log('✅ Settings updated successfully');
    }
  } else {
    console.log('✅ Razorpay settings are properly configured');
  }
}

checkRazorpaySettings().catch(console.error); 