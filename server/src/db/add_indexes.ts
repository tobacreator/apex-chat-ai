import { getPool } from './index'; // Adjust if needed

async function addIndexes() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Index on products.business_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_business_id 
      ON products (business_id);
    `);
    console.log('Index added on products.business_id');

    // Index on faqs.business_id
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_faqs_business_id 
      ON faqs (business_id);
    `);
    console.log('Index added on faqs.business_id');

    await client.query('COMMIT');
    console.log('Migration committed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding indexes:', error);
  } finally {
    client.release();
  }
}

addIndexes().then(() => process.exit(0)).catch(() => process.exit(1)); 