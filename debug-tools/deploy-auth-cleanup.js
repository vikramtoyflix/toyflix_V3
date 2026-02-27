#!/usr/bin/env node

/**
 * Deploy Auth Cleanup Function
 * 
 * This script deploys the new auth-delete-account edge function
 * required for the optimized OTP-first authentication flow.
 * 
 * Usage: node scripts/deploy-auth-cleanup.js
 */

import { execSync } from 'child_process';

console.log('🚀 Deploying Auth Cleanup Functionality...\n');

try {
  console.log('📦 Deploying auth-delete-account edge function...');
  
  // Deploy the new function
  execSync('supabase functions deploy auth-delete-account --project-ref wucwpyitzqjukcphczhr', {
    stdio: 'inherit'
  });
  
  console.log('\n✅ Deployment Complete!\n');
  
  console.log('🎯 Testing the Complete Flow:');
  console.log('1. Go to: http://localhost:8082/test-db-connection');
  console.log('2. Verify you\'re connected to PRODUCTION database');
  console.log('3. Go to: http://localhost:8082/test-otp-flow');
  console.log('4. Test with unregistered phone number first');
  console.log('5. Test with registered phone number (8595968253)');
  console.log('6. Check console logs for detailed debugging info');
  
  console.log('\n📱 Key Features Now Active:');
  console.log('• Smart OTP-first authentication');
  console.log('• Automatic new/existing user detection');
  console.log('• Real-time Bangalore pincode validation');
  console.log('• User cleanup for non-serviceable areas');
  console.log('• Seamless redirect back to subscription flows');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
} 