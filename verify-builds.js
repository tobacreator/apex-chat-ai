#!/usr/bin/env node

/**
 * Build Verification Script
 * This script helps verify that builds are working correctly locally
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Verifying Build Outputs...\n');

// Test client build
console.log('1. Testing Client Build...');
try {
  // Clean previous build
  if (fs.existsSync('client/.next')) {
    console.log('   🧹 Cleaning previous client build...');
    fs.rmSync('client/.next', { recursive: true, force: true });
  }

  // Run client build
  console.log('   🏗️ Building client...');
  execSync('npm run build', { cwd: 'client', stdio: 'inherit' });

  // Verify build output
  if (fs.existsSync('client/.next')) {
    console.log('   ✅ Client build successful');
    const stats = fs.statSync('client/.next');
    console.log(`   📁 Build directory size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // List build contents
    const files = fs.readdirSync('client/.next');
    console.log(`   📄 Build files: ${files.join(', ')}`);
  } else {
    console.log('   ❌ Client build failed - .next directory not found');
    process.exit(1);
  }
} catch (error) {
  console.log(`   ❌ Client build error: ${error.message}`);
  process.exit(1);
}

// Test server build
console.log('\n2. Testing Server Build...');
try {
  // Clean previous build
  if (fs.existsSync('server/dist')) {
    console.log('   🧹 Cleaning previous server build...');
    fs.rmSync('server/dist', { recursive: true, force: true });
  }

  // Run server build
  console.log('   🏗️ Building server...');
  execSync('npm run build', { cwd: 'server', stdio: 'inherit' });

  // Verify build output
  if (fs.existsSync('server/dist')) {
    console.log('   ✅ Server build successful');
    const stats = fs.statSync('server/dist');
    console.log(`   📁 Build directory size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // List build contents
    const files = fs.readdirSync('server/dist');
    console.log(`   📄 Build files: ${files.join(', ')}`);
  } else {
    console.log('   ❌ Server build failed - dist directory not found');
    process.exit(1);
  }
} catch (error) {
  console.log(`   ❌ Server build error: ${error.message}`);
  process.exit(1);
}

console.log('\n🎉 All builds verified successfully!');
console.log('✅ Your CI/CD pipeline should now work correctly.');
console.log('\nNext steps:');
console.log('1. Commit and push these changes');
console.log('2. Monitor the CI/CD pipeline');
console.log('3. Verify artifacts are created and uploaded');
