require('dotenv').config();
const { Pool } = require('pg');

async function testVerification() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🧪 Running Test Verification...\n');
    
    const client = await pool.connect();
    
    // Check current state
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM businesses) as businesses_count,
        (SELECT COUNT(*) FROM products) as products_count,
        (SELECT COUNT(*) FROM file_uploads) as uploads_count,
        (SELECT COUNT(*) FROM faqs) as faqs_count
    `);
    
    console.log('📊 Current Database State:');
    console.log(`   - Businesses: ${counts.rows[0].businesses_count}`);
    console.log(`   - Products: ${counts.rows[0].products_count}`);
    console.log(`   - File uploads: ${counts.rows[0].uploads_count}`);
    console.log(`   - FAQs: ${counts.rows[0].faqs_count}`);
    
    // Check upload_id column status
    const uploadIdStatus = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'upload_id'
    `);
    
    if (uploadIdStatus.rows.length > 0) {
      console.log('\n✅ upload_id column status:');
      console.log(`   - Column: ${uploadIdStatus.rows[0].column_name}`);
      console.log(`   - Type: ${uploadIdStatus.rows[0].data_type}`);
      console.log(`   - Nullable: ${uploadIdStatus.rows[0].is_nullable}`);
    } else {
      console.log('\n❌ upload_id column not found!');
    }
    
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
      AND tc.table_name = 'products'
      AND kcu.column_name = 'upload_id'
    `);
    
    if (constraints.rows.length > 0) {
      console.log('\n✅ Foreign key constraint found:');
      console.log(`   - ${constraints.rows[0].table_name}.${constraints.rows[0].column_name} -> ${constraints.rows[0].foreign_table_name}.${constraints.rows[0].foreign_column_name}`);
    } else {
      console.log('\n❌ Foreign key constraint not found!');
    }
    
    // Check for products with upload_id
    const productsWithUpload = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE upload_id IS NOT NULL
    `);
    
    console.log(`\n📋 Products with upload_id: ${productsWithUpload.rows[0].count}`);
    
    // Check for orphaned products (products without upload_id)
    const orphanedProducts = await client.query(`
      SELECT COUNT(*) as count
      FROM products 
      WHERE upload_id IS NULL
    `);
    
    console.log(`📋 Products without upload_id: ${orphanedProducts.rows[0].count}`);
    
    // Show recent uploads and their products
    const recentUploads = await client.query(`
      SELECT 
        fu.id,
        fu.filename,
        COUNT(p.id) as product_count
      FROM file_uploads fu
      LEFT JOIN products p ON p.upload_id = fu.id
      GROUP BY fu.id, fu.filename
      ORDER BY fu.id DESC
      LIMIT 5
    `);
    
    if (recentUploads.rows.length > 0) {
      console.log('\n📁 Recent File Uploads:');
      recentUploads.rows.forEach(upload => {
        console.log(`   - ${upload.filename} (${upload.product_count} products)`);
      });
    } else {
      console.log('\n📁 No file uploads found');
    }
    
    client.release();
    
    console.log('\n✅ Test verification completed!');
    
  } catch (error) {
    console.error('❌ Test verification failed:', error.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  testVerification();
}

module.exports = testVerification; 