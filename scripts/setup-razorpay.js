import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import readline from 'readline';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.log('Please set the following environment variables:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function setupRazorpay() {
  try {
    console.log('🔧 Setting up Razorpay credentials...\n');
    
    // Get Razorpay credentials from user
    const keyId = await new Promise(resolve => {
      rl.question('Enter your Razorpay Key ID: ', resolve);
    });
    
    const keySecret = await new Promise(resolve => {
      rl.question('Enter your Razorpay Key Secret: ', resolve);
    });
    
    if (!keyId || !keySecret) {
      console.error('❌ Both Key ID and Key Secret are required!');
      return;
    }

    // Update admin_settings table
    console.log('\n🔄 Updating Razorpay settings...');
    
    const { error: updateError } = await supabase
      .from('admin_settings')
      .upsert([
        { setting_key: 'razorpay_key_id', setting_value: keyId },
        { setting_key: 'razorpay_key_secret', setting_value: keySecret }
      ]);
    
    if (updateError) {
      console.error('❌ Error updating settings:', updateError);
      return;
    }
    
    console.log('✅ Razorpay settings updated successfully!');
    
    // Update .env file
    console.log('\n🔄 Updating .env file...');
    
    const envPath = join(projectRoot, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      
      // Update existing values
      envContent = envContent
        .replace(/^VITE_RAZORPAY_KEY_ID=.*/m, `VITE_RAZORPAY_KEY_ID=${keyId}`)
        .replace(/^VITE_RAZORPAY_KEY_SECRET=.*/m, `VITE_RAZORPAY_KEY_SECRET=${keySecret}`);
      
      // Add values if they don't exist
      if (!envContent.includes('VITE_RAZORPAY_KEY_ID=')) {
        envContent += `\nVITE_RAZORPAY_KEY_ID=${keyId}`;
      }
      if (!envContent.includes('VITE_RAZORPAY_KEY_SECRET=')) {
        envContent += `\nVITE_RAZORPAY_KEY_SECRET=${keySecret}`;
      }
    } else {
      envContent = `VITE_RAZORPAY_KEY_ID=${keyId}\nVITE_RAZORPAY_KEY_SECRET=${keySecret}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated successfully!');
    
    // Test the credentials
    console.log('\n🔄 Testing Razorpay credentials...');
    
    const auth = btoa(`${keyId}:${keySecret}`);
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100,
        currency: 'INR',
        receipt: 'test_receipt',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Razorpay credentials are working!');
      
      // Clean up test order
      await fetch(`https://api.razorpay.com/v1/orders/${data.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });
    } else {
      console.error('❌ Razorpay credentials test failed:', data.error?.description || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  } finally {
    rl.close();
  }
}

setupRazorpay(); 