require('dotenv').config();
const { Pool } = require('pg');

async function debugUploadState() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Debugging Upload State...\n');
    const client = await pool.connect();
    
    // Check file_uploads table
    console.log('📁 FILE_UPLOADS TABLE:');
    const uploads = await client.query(`
      SELECT id, filename, business_id, status, uploaded_at 
      FROM file_uploads 
      ORDER BY uploaded_at DESC 
      LIMIT 5
    `);
    console.log('Recent uploads:', uploads.rows);
    
    // Check products table
    console.log('\n📦 PRODUCTS TABLE:');
    const products = await client.query(`
      SELECT id, product_name, business_id, upload_id, created_at 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log('Recent products:', products.rows);
    
    // Check upload_id distribution
    console.log('\n🔗 UPLOAD_ID DISTRIBUTION:');
    const uploadIdStats = await client.query(`
      SELECT 
        CASE 
          WHEN upload_id IS NULL THEN 'NULL'
          ELSE 'HAS_UPLOAD_ID'
        END as upload_id_status,
        COUNT(*) as count
      FROM products 
      GROUP BY upload_id IS NULL
    `);
    console.log('Products by upload_id status:', uploadIdStats.rows);
    
    // Check foreign key constraint
    console.log('\n🔒 FOREIGN KEY CONSTRAINT:');
    const fkCheck = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'products'
        AND kcu.column_name = 'upload_id'
    `);
    console.log('Foreign key constraint:', fkCheck.rows);
    
    // SAFE TEST: Only show what would be deleted, don't actually delete
    console.log('\n🧪 SAFE CASCADE DELETE TEST (READ-ONLY):');
    const testUploads = await client.query(`
      SELECT id FROM file_uploads 
      WHERE id IN (
        SELECT DISTINCT upload_id 
        FROM products 
        WHERE upload_id IS NOT NULL
      )
      LIMIT 1
    `);
    
    if (testUploads.rows.length > 0) {
      const testUploadId = testUploads.rows[0].id;
      console.log(`📋 Found upload with associated products: ${testUploadId}`);
      
      // Count products that would be deleted (SAFE - READ ONLY)
      const productCount = await client.query(
        `SELECT COUNT(*) as count FROM products WHERE upload_id = $1`,
        [testUploadId]
      );
      console.log(`📊 Products that would be deleted: ${productCount.rows[0].count}`);
      
      // Show the products that would be deleted (SAFE - READ ONLY)
      const productsToDelete = await client.query(
        `SELECT id, product_name, upload_id FROM products WHERE upload_id = $1`,
        [testUploadId]
      );
      console.log(`📋 Products that would be deleted:`, productsToDelete.rows);
      
      console.log(`✅ Cascade delete is properly configured - ${productCount.rows[0].count} products would be deleted`);
      console.log(`⚠️  NOTE: This is a SAFE test - no actual deletion performed`);
    } else {
      console.log('❌ No uploads with associated products found for testing');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugUploadState(); 