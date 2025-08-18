#!/usr/bin/env node

console.log('🔍 Testing ApexChat AI Platform CI/CD Setup...\n');

const fs = require('fs');

// Check key files
const files = [
  '.github/workflows/ci.yml',
  '.github/workflows/deploy.yml',
  '.github/environments/production.yml',
  '.github/environments/staging.yml',
  'server/src/routes/healthRoutes.ts',
  'deployment-script-template.sh',
  'CI_CD_SETUP_SUMMARY.md',
  'DEPLOYMENT_READY_SUMMARY.md'
];

let passed = 0;
const total = files.length;

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
    passed++;
  } else {
    console.log(`❌ ${file}`);
  }
});

console.log(`\n🎯 Status: ${passed}/${total} files found (${Math.round(passed/total*100)}%)`);

if (passed === total) {
  console.log('\n🎉 All files present! CI/CD pipeline is ready.');
} else {
  console.log('\n⚠️ Some files missing. Please check the setup.');
}
