require('dotenv').config();
const { Pool } = require('pg');

async function cleanupOrphanedData() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🧹 Cleaning up orphaned data...\n');
    const client = await pool.connect();
    
    // Check current state
    console.log('📊 CURRENT STATE:');
    const uploads = await client.query(`SELECT COUNT(*) as count FROM file_uploads`);
    const products = await client.query(`SELECT COUNT(*) as count FROM products`);
    console.log(`File uploads: ${uploads.rows[0].count}`);
    console.log(`Products: ${products.rows[0].count}`);
    
    // Find orphaned file_uploads (no associated products)
    console.log('\n🔍 FINDING ORPHANED RECORDS:');
    const orphanedUploads = await client.query(`
      SELECT id, filename, business_id, status, uploaded_at 
      FROM file_uploads 
      WHERE id NOT IN (
        SELECT DISTINCT upload_id 
        FROM products 
        WHERE upload_id IS NOT NULL
      )
    `);
    
    console.log(`Found ${orphanedUploads.rows.length} orphaned file_uploads:`);
    orphanedUploads.rows.forEach(upload => {
      console.log(`  - ${upload.filename} (${upload.id}) - ${upload.status}`);
    });
    
    // Clean up orphaned file_uploads
    if (orphanedUploads.rows.length > 0) {
      console.log('\n🗑️  CLEANING UP ORPHANED FILE_UPLOADS:');
      const deleteResult = await client.query(`
        DELETE FROM file_uploads 
        WHERE id NOT IN (
          SELECT DISTINCT upload_id 
          FROM products 
          WHERE upload_id IS NOT NULL
        )
      `);
      console.log(`✅ Deleted ${deleteResult.rowCount} orphaned file_uploads`);
    } else {
      console.log('\n✅ No orphaned file_uploads found');
    }
    
    // Check final state
    console.log('\n📊 FINAL STATE:');
    const finalUploads = await client.query(`SELECT COUNT(*) as count FROM file_uploads`);
    const finalProducts = await client.query(`SELECT COUNT(*) as count FROM products`);
    console.log(`File uploads: ${finalUploads.rows[0].count}`);
    console.log(`Products: ${finalProducts.rows[0].count}`);
    
    // Show remaining data
    if (finalUploads.rows[0].count > 0) {
      console.log('\n📁 REMAINING FILE_UPLOADS:');
      const remainingUploads = await client.query(`
        SELECT id, filename, business_id, status, uploaded_at 
        FROM file_uploads 
        ORDER BY uploaded_at DESC
      `);
      console.log(remainingUploads.rows);
    }
    
    if (finalProducts.rows[0].count > 0) {
      console.log('\n📦 REMAINING PRODUCTS:');
      const remainingProducts = await client.query(`
        SELECT id, product_name, business_id, upload_id, created_at 
        FROM products 
        ORDER BY created_at DESC
        LIMIT 5
      `);
      console.log(remainingProducts.rows);
    }
    
    console.log('\n✅ Cleanup completed successfully!');
    client.release();
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

cleanupOrphanedData(); 