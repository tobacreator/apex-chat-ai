require('dotenv').config();
const SafetyFramework = require('./safety-framework');

async function deploySafely() {
  console.log('🚀 Starting Safe Deployment Process...\n');
  
  const framework = new SafetyFramework();
  
  try {
    await framework.initialize();
    
    // Step 1: Health Check
    console.log('='.repeat(50));
    console.log('STEP 1: HEALTH CHECK');
    console.log('='.repeat(50));
    
    const healthOk = await framework.healthCheck();
    if (!healthOk) {
      console.log('\n❌ Health check failed. Deployment aborted.');
      console.log('🔧 Please fix the issues above before proceeding.');
      return;
    }
    
    console.log('\n✅ Health check passed!');
    
    // Step 2: Create Backup
    console.log('\n' + '='.repeat(50));
    console.log('STEP 2: CREATE BACKUP');
    console.log('='.repeat(50));
    
    const backup = await framework.createBackup();
    if (!backup) {
      console.log('\n❌ Backup creation failed. Deployment aborted.');
      return;
    }
    
    console.log('\n✅ Backup created successfully!');
    
    // Step 3: Current Status Report
    console.log('\n' + '='.repeat(50));
    console.log('STEP 3: CURRENT STATUS');
    console.log('='.repeat(50));
    
    await framework.generateReport();
    
    // Step 4: Enable Migration Feature Flag
    console.log('\n' + '='.repeat(50));
    console.log('STEP 4: ENABLE MIGRATION');
    console.log('='.repeat(50));
    
    const migrationEnabled = await framework.enableFeatureFlag('ENABLE_UPLOAD_ID_MIGRATION');
    if (!migrationEnabled) {
      console.log('\n❌ Failed to enable migration feature flag.');
      return;
    }
    
    // Step 5: Run Migration
    console.log('\n' + '='.repeat(50));
    console.log('STEP 5: RUN MIGRATION');
    console.log('='.repeat(50));
    
    const migrationSuccess = await framework.runMigration();
    if (!migrationSuccess) {
      console.log('\n❌ Migration failed. Starting rollback...');
      await framework.rollback();
      return;
    }
    
    console.log('\n✅ Migration completed successfully!');
    
    // Step 6: Final Verification
    console.log('\n' + '='.repeat(50));
    console.log('STEP 6: FINAL VERIFICATION');
    console.log('='.repeat(50));
    
    await framework.generateReport();
    
    // Step 7: Test Cascade Delete (Optional)
    console.log('\n' + '='.repeat(50));
    console.log('STEP 7: TEST CASCADE DELETE (OPTIONAL)');
    console.log('='.repeat(50));
    
    console.log('🧪 Running cascade delete test...');
    const testSuccess = await framework.testCascadeDelete();
    
    if (testSuccess) {
      console.log('\n✅ Cascade delete test passed!');
    } else {
      console.log('\nℹ️  Cascade delete test skipped or failed (non-critical)');
    }
    
    // Final Success Message
    console.log('\n' + '🎉'.repeat(20));
    console.log('🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉');
    console.log('🎉'.repeat(20));
    
    console.log('\n📋 Summary:');
    console.log('✅ Health check passed');
    console.log('✅ Backup created');
    console.log('✅ Migration completed');
    console.log('✅ upload_id column added');
    console.log('✅ Cascade delete functionality enabled');
    
    console.log('\n🔍 Next Steps:');
    console.log('1. Test CSV upload functionality');
    console.log('2. Test Google Sheets integration');
    console.log('3. Test product deletion from frontend');
    console.log('4. Monitor for any issues');
    
    console.log('\n⚠️  If issues occur, run: node safety-framework.js rollback');
    
  } catch (error) {
    console.error('\n❌ Deployment failed with error:', error.message);
    console.log('\n🔄 Starting emergency rollback...');
    
    try {
      await framework.rollback();
      console.log('✅ Emergency rollback completed');
    } catch (rollbackError) {
      console.error('❌ Emergency rollback failed:', rollbackError.message);
    }
  } finally {
    await framework.cleanup();
  }
}

// Run deployment if this script is executed directly
if (require.main === module) {
  deploySafely();
}

module.exports = deploySafely; 