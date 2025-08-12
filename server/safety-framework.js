require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

class SafetyFramework {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    this.backupPath = path.join(__dirname, 'backups');
    this.featureFlags = {
      ENABLE_GOOGLE_SHEETS: true,
      ENABLE_CSV_UPLOAD: true,
      ENABLE_CASCADE_DELETE: true,
      ENABLE_UPLOAD_ID_MIGRATION: false // Start disabled for safety
    };
  }

  async initialize() {
    console.log('🔒 Initializing Safety Framework...');
    
    // Create backup directory if it doesn't exist
    try {
      await fs.mkdir(this.backupPath, { recursive: true });
      console.log('✅ Backup directory ready');
    } catch (error) {
      console.log('ℹ️  Backup directory already exists');
    }
  }

  async healthCheck() {
    console.log('\n🏥 Running Health Check...');
    
    try {
      const client = await this.pool.connect();
      
      // Check database connectivity
      await client.query('SELECT 1');
      console.log('✅ Database connectivity: OK');
      
      // Check critical tables exist
      const tables = ['businesses', 'products', 'file_uploads', 'faqs'];
      for (const table of tables) {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )
        `, [table]);
        
        if (result.rows[0].exists) {
          console.log(`✅ Table ${table}: EXISTS`);
        } else {
          console.log(`❌ Table ${table}: MISSING`);
          return false;
        }
      }
      
      // Check table structures
      const productsStructure = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'products'
        ORDER BY ordinal_position
      `);
      
      console.log('✅ Products table structure:');
      productsStructure.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Check foreign key constraints
      const constraints = await client.query(`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('products', 'file_uploads')
      `);
      
      console.log('✅ Foreign key constraints:');
      constraints.rows.forEach(constraint => {
        console.log(`   - ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      });
      
      client.release();
      return true;
      
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return false;
    }
  }

  async createBackup() {
    console.log('\n💾 Creating Database Backup...');
    
    try {
      const client = await this.pool.connect();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupPath, `backup-${timestamp}.sql`);
      
      // Get current data counts
      const counts = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM businesses) as businesses_count,
          (SELECT COUNT(*) FROM products) as products_count,
          (SELECT COUNT(*) FROM file_uploads) as uploads_count,
          (SELECT COUNT(*) FROM faqs) as faqs_count
      `);
      
      console.log('📊 Current data counts:');
      console.log(`   - Businesses: ${counts.rows[0].businesses_count}`);
      console.log(`   - Products: ${counts.rows[0].products_count}`);
      console.log(`   - File uploads: ${counts.rows[0].uploads_count}`);
      console.log(`   - FAQs: ${counts.rows[0].faqs_count}`);
      
      // Create backup metadata
      const backupMetadata = {
        timestamp: new Date().toISOString(),
        dataCounts: counts.rows[0],
        featureFlags: this.featureFlags,
        version: '1.0.0'
      };
      
      const metadataFile = path.join(this.backupPath, `backup-${timestamp}-metadata.json`);
      await fs.writeFile(metadataFile, JSON.stringify(backupMetadata, null, 2));
      
      console.log(`✅ Backup metadata saved to: ${metadataFile}`);
      console.log('⚠️  Note: Full database backup requires pg_dump (manual step)');
      
      client.release();
      return { backupFile, metadataFile, dataCounts: counts.rows[0] };
      
    } catch (error) {
      console.error('❌ Backup creation failed:', error.message);
      return null;
    }
  }

  async enableFeatureFlag(flagName) {
    console.log(`\n🚀 Enabling feature flag: ${flagName}`);
    
    if (this.featureFlags.hasOwnProperty(flagName)) {
      this.featureFlags[flagName] = true;
      console.log(`✅ Feature flag ${flagName} enabled`);
      return true;
    } else {
      console.log(`❌ Unknown feature flag: ${flagName}`);
      return false;
    }
  }

  async disableFeatureFlag(flagName) {
    console.log(`\n🛑 Disabling feature flag: ${flagName}`);
    
    if (this.featureFlags.hasOwnProperty(flagName)) {
      this.featureFlags[flagName] = false;
      console.log(`✅ Feature flag ${flagName} disabled`);
      return true;
    } else {
      console.log(`❌ Unknown feature flag: ${flagName}`);
      return false;
    }
  }

  async runMigration() {
    console.log('\n🔧 Running Migration...');
    
    if (!this.featureFlags.ENABLE_UPLOAD_ID_MIGRATION) {
      console.log('❌ Migration disabled by feature flag');
      return false;
    }
    
    try {
      const client = await this.pool.connect();
      
      // Check if migration is needed
      const columnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'upload_id'
      `);
      
      if (columnExists.rows.length > 0) {
        console.log('✅ upload_id column already exists - no migration needed');
        client.release();
        return true;
      }
      
      console.log('🔄 Adding upload_id column...');
      
      // Add upload_id column
      await client.query(`
        ALTER TABLE products 
        ADD COLUMN upload_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE
      `);
      
      console.log('✅ upload_id column added successfully');
      
      // Verify the migration
      const result = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'upload_id'
      `);
      
      if (result.rows.length > 0) {
        console.log('✅ Migration verification successful');
        console.log(`   - Column: ${result.rows[0].column_name}`);
        console.log(`   - Type: ${result.rows[0].data_type}`);
        console.log(`   - Nullable: ${result.rows[0].is_nullable}`);
      }
      
      client.release();
      return true;
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      return false;
    }
  }

  async testCascadeDelete() {
    console.log('\n🧪 Testing Cascade Delete...');
    
    if (!this.featureFlags.ENABLE_CASCADE_DELETE) {
      console.log('❌ Cascade delete disabled by feature flag');
      return false;
    }
    
    try {
      const client = await this.pool.connect();
      
      // Get current counts
      const beforeCounts = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM file_uploads) as uploads_count,
          (SELECT COUNT(*) FROM products) as products_count
      `);
      
      console.log('📊 Before test:');
      console.log(`   - File uploads: ${beforeCounts.rows[0].uploads_count}`);
      console.log(`   - Products: ${beforeCounts.rows[0].products_count}`);
      
      // Find a test upload (one with products)
      const testUpload = await client.query(`
        SELECT fu.id, fu.filename, COUNT(p.id) as product_count
        FROM file_uploads fu
        LEFT JOIN products p ON p.upload_id = fu.id
        GROUP BY fu.id, fu.filename
        HAVING COUNT(p.id) > 0
        LIMIT 1
      `);
      
      if (testUpload.rows.length === 0) {
        console.log('ℹ️  No uploads with products found for testing');
        client.release();
        return true;
      }
      
      const uploadId = testUpload.rows[0].id;
      const productCount = testUpload.rows[0].product_count;
      
      console.log(`🧪 Testing cascade delete for upload: ${testUpload.rows[0].filename} (${productCount} products)`);
      
      // Delete the upload (should cascade to products)
      await client.query('DELETE FROM file_uploads WHERE id = $1', [uploadId]);
      
      // Check counts after deletion
      const afterCounts = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM file_uploads) as uploads_count,
          (SELECT COUNT(*) FROM products) as products_count
      `);
      
      console.log('📊 After test:');
      console.log(`   - File uploads: ${afterCounts.rows[0].uploads_count}`);
      console.log(`   - Products: ${afterCounts.rows[0].products_count}`);
      
      const uploadsDeleted = beforeCounts.rows[0].uploads_count - afterCounts.rows[0].uploads_count;
      const productsDeleted = beforeCounts.rows[0].products_count - afterCounts.rows[0].products_count;
      
      if (uploadsDeleted === 1 && productsDeleted === productCount) {
        console.log('✅ Cascade delete test PASSED');
        console.log(`   - Deleted 1 upload and ${productCount} associated products`);
      } else {
        console.log('❌ Cascade delete test FAILED');
        console.log(`   - Expected: 1 upload, ${productCount} products`);
        console.log(`   - Actual: ${uploadsDeleted} uploads, ${productsDeleted} products`);
      }
      
      client.release();
      return uploadsDeleted === 1 && productsDeleted === productCount;
      
    } catch (error) {
      console.error('❌ Cascade delete test failed:', error.message);
      return false;
    }
  }

  async rollback() {
    console.log('\n🔄 Rollback Procedure...');
    
    try {
      const client = await this.pool.connect();
      
      // Check if upload_id column exists
      const columnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'upload_id'
      `);
      
      if (columnExists.rows.length === 0) {
        console.log('ℹ️  upload_id column does not exist - nothing to rollback');
        client.release();
        return true;
      }
      
      console.log('⚠️  WARNING: This will remove the upload_id column and all cascade delete functionality');
      console.log('⚠️  This action cannot be undone without a backup');
      
      // For safety, we'll just disable the feature flag instead of actually removing the column
      await this.disableFeatureFlag('ENABLE_UPLOAD_ID_MIGRATION');
      await this.disableFeatureFlag('ENABLE_CASCADE_DELETE');
      
      console.log('✅ Rollback completed (feature flags disabled)');
      console.log('ℹ️  To completely rollback, manually run: ALTER TABLE products DROP COLUMN upload_id');
      
      client.release();
      return true;
      
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      return false;
    }
  }

  async generateReport() {
    console.log('\n📋 Safety Framework Report');
    console.log('========================');
    
    console.log('\n🔧 Feature Flags:');
    Object.entries(this.featureFlags).forEach(([flag, enabled]) => {
      console.log(`   - ${flag}: ${enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    });
    
    console.log('\n📊 Database Status:');
    try {
      const client = await this.pool.connect();
      
      const counts = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM businesses) as businesses_count,
          (SELECT COUNT(*) FROM products) as products_count,
          (SELECT COUNT(*) FROM file_uploads) as uploads_count,
          (SELECT COUNT(*) FROM faqs) as faqs_count
      `);
      
      console.log(`   - Businesses: ${counts.rows[0].businesses_count}`);
      console.log(`   - Products: ${counts.rows[0].products_count}`);
      console.log(`   - File uploads: ${counts.rows[0].uploads_count}`);
      console.log(`   - FAQs: ${counts.rows[0].faqs_count}`);
      
      // Check upload_id column status
      const uploadIdExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'upload_id'
      `);
      
      console.log(`   - upload_id column: ${uploadIdExists.rows.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
      
      client.release();
      
    } catch (error) {
      console.log(`   - Database status: ❌ ERROR - ${error.message}`);
    }
    
    console.log('\n🎯 Recommendations:');
    if (!this.featureFlags.ENABLE_UPLOAD_ID_MIGRATION) {
      console.log('   - Run migration to add upload_id column');
    }
    if (!this.featureFlags.ENABLE_CASCADE_DELETE) {
      console.log('   - Enable cascade delete functionality');
    }
  }

  async cleanup() {
    await this.pool.end();
    console.log('\n🧹 Safety Framework cleanup completed');
  }
}

// CLI interface
async function main() {
  const framework = new SafetyFramework();
  
  try {
    await framework.initialize();
    
    const command = process.argv[2] || 'report';
    
    switch (command) {
      case 'health':
        await framework.healthCheck();
        break;
        
      case 'backup':
        await framework.createBackup();
        break;
        
      case 'migrate':
        await framework.runMigration();
        break;
        
      case 'test':
        await framework.testCascadeDelete();
        break;
        
      case 'enable':
        const flag = process.argv[3];
        if (flag) {
          await framework.enableFeatureFlag(flag);
        } else {
          console.log('Usage: node safety-framework.js enable <FLAG_NAME>');
        }
        break;
        
      case 'disable':
        const flagToDisable = process.argv[3];
        if (flagToDisable) {
          await framework.disableFeatureFlag(flagToDisable);
        } else {
          console.log('Usage: node safety-framework.js disable <FLAG_NAME>');
        }
        break;
        
      case 'rollback':
        await framework.rollback();
        break;
        
      case 'report':
      default:
        await framework.generateReport();
        break;
    }
    
  } catch (error) {
    console.error('❌ Safety Framework error:', error);
  } finally {
    await framework.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = SafetyFramework; 