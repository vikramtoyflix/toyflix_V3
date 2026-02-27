#!/usr/bin/env node

/**
 * ToyFlix Favicon Setup Verification Script
 * Verifies all favicon assets are properly created and accessible
 */

const fs = require('fs');
const path = require('path');

console.log('🎯 ToyFlix Favicon Setup Verification\n');

// Required favicon files
const requiredFiles = [
  'public/favicon.ico',
  'public/favicon-16x16.png', 
  'public/favicon-32x32.png',
  'public/apple-touch-icon.png',
  'public/android-chrome-192x192.png',
  'public/android-chrome-512x512.png',
  'public/site.webmanifest'
];

// Check if all files exist
console.log('📋 Checking required favicon files...\n');

let allFilesExist = true;
const fileStatus = [];

requiredFiles.forEach(filePath => {
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  const size = exists ? `${Math.round(fs.statSync(filePath).size / 1024)}KB` : 'Missing';
  
  console.log(`${status} ${filePath} (${size})`);
  fileStatus.push({ file: filePath, exists, size });
  
  if (!exists) {
    allFilesExist = false;
  }
});

console.log('\n📊 Summary:');
console.log(`✅ Files created: ${fileStatus.filter(f => f.exists).length}/${requiredFiles.length}`);
console.log(`❌ Missing files: ${fileStatus.filter(f => !f.exists).length}`);

if (allFilesExist) {
  console.log('\n🎉 SUCCESS: All favicon files created successfully!');
  console.log('\n📱 Testing Instructions:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Open http://localhost:8080 in browser');
  console.log('3. Check browser tab for ToyFlix icon');
  console.log('4. Test on mobile: Add to home screen');
  console.log('5. Verify icon appears correctly');
} else {
  console.log('\n⚠️  Some files are missing. Please create the missing files.');
}

// Check index.html favicon references
console.log('\n🔍 Checking index.html favicon references...');

try {
  const indexContent = fs.readFileSync('index.html', 'utf8');
  
  const expectedReferences = [
    'href="/favicon.ico"',
    'href="/favicon-16x16.png"',
    'href="/favicon-32x32.png"', 
    'href="/apple-touch-icon.png"',
    'href="/android-chrome-192x192.png"',
    'href="/android-chrome-512x512.png"',
    'href="/site.webmanifest"'
  ];
  
  expectedReferences.forEach(ref => {
    const exists = indexContent.includes(ref);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${ref}`);
  });
  
  const allReferencesExist = expectedReferences.every(ref => indexContent.includes(ref));
  
  if (allReferencesExist) {
    console.log('\n✅ All favicon references found in index.html');
  } else {
    console.log('\n⚠️  Some favicon references missing in index.html');
  }
  
} catch (error) {
  console.log('❌ Could not read index.html');
}

console.log('\n🎯 ToyFlix favicon setup verification complete!');
