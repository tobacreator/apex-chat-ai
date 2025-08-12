require('dotenv').config();
const { Pool } = require('pg');

async function cleanupOrphanedProducts() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🧹 Cleaning up orphaned products...\n');
    
    const client = await pool.connect();
    
    // Check current state
    const beforeCount = await client.query('SELECT COUNT(*) as count FROM products');
    console.log(`📊 Products before cleanup: ${beforeCount.rows[0].count}`);
    
    // Find orphaned products (products without upload_id)
    const orphanedProducts = await client.query(`
      SELECT id, sku, product_name 
      FROM products 
      WHERE upload_id IS NULL
    `);
    
    console.log(`📋 Found ${orphanedProducts.rows.length} orphaned products:`);
    orphanedProducts.rows.forEach(product => {
      console.log(`   - ${product.sku}: ${product.product_name}`);
    });
    
    if (orphanedProducts.rows.length > 0) {
      console.log('\n🗑️  Deleting orphaned products...');
      
      // Delete orphaned products
      const deleteResult = await client.query(`
        DELETE FROM products 
        WHERE upload_id IS NULL
      `);
      
      console.log(`✅ Deleted ${deleteResult.rowCount} orphaned products`);
    } else {
      console.log('\n✅ No orphaned products found');
    }
    
    // Check final state
    const afterCount = await client.query('SELECT COUNT(*) as count FROM products');
    console.log(`📊 Products after cleanup: ${afterCount.rows[0].count}`);
    
    client.release();
    
    console.log('\n✅ Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  cleanupOrphanedProducts();
}

module.exports = cleanupOrphanedProducts; 