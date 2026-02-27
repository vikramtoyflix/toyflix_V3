import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRazorpaySettings() {
  try {
    console.log('🔍 Checking Razorpay settings in admin_settings table...');
    
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['razorpay_key_id', 'razorpay_key_secret']);
    
    if (error) {
      console.error('❌ Error fetching settings:', error);
      return;
    }
    
    console.log('📋 Current settings:', settings);
    
    const keyId = settings?.find(s => s.setting_key === 'razorpay_key_id')?.setting_value;
    const keySecret = settings?.find(s => s.setting_key === 'razorpay_key_secret')?.setting_value;
    
    if (!keyId || !keySecret) {
      console.log('❌ Razorpay credentials are missing!');
      console.log('🔧 To fix this, you need to:');
      console.log('1. Get your Razorpay API keys from the Razorpay dashboard');
      console.log('2. Insert them into the admin_settings table:');
      console.log('');
      console.log('INSERT INTO admin_settings (setting_key, setting_value) VALUES');
      console.log("('razorpay_key_id', 'your_razorpay_key_id'),");
      console.log("('razorpay_key_secret', 'your_razorpay_key_secret');");
      console.log('');
      console.log('⚠️  Make sure to replace with your actual Razorpay credentials!');
    } else {
      console.log('✅ Razorpay credentials are configured!');
      console.log('🔑 Key ID:', keyId ? '***' + keyId.slice(-4) : 'Not set');
      console.log('🔐 Key Secret:', keySecret ? '***' + keySecret.slice(-4) : 'Not set');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkRazorpaySettings(); 