require('dotenv').config();
const { Pool } = require('pg');

async function addUploadIdMigration() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Adding upload_id column to products table...');
    
    // Check if upload_id column already exists
    const columnExists = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'upload_id'
    `);
    
    if (columnExists.rows.length > 0) {
      console.log('✅ upload_id column already exists');
    } else {
      // Add upload_id column
      await client.query(`
        ALTER TABLE products 
        ADD COLUMN upload_id UUID REFERENCES file_uploads(id) ON DELETE CASCADE
      `);
      console.log('✅ Added upload_id column to products table');
    }
    
    // Add comment to document the column
    try {
      await client.query(`
        COMMENT ON COLUMN products.upload_id IS 'References the file_uploads.id that imported this product. Used for cascading deletes when CSV uploads are removed.'
      `);
      console.log('✅ Added column comment');
    } catch (error) {
      console.log('ℹ️  Could not add column comment (non-critical)');
    }
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'upload_id'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Migration completed successfully!');
      console.log('✅ upload_id column verified in database');
      console.log('   - Column name:', result.rows[0].column_name);
      console.log('   - Data type:', result.rows[0].data_type);
      console.log('   - Nullable:', result.rows[0].is_nullable);
    } else {
      console.log('❌ Warning: Could not verify upload_id column was added');
    }
    
    client.release();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addUploadIdMigration(); 