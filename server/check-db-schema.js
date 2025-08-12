const { getPool } = require('./src/db/index.ts');

async function checkSchema() {
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    console.log('Checking businesses table schema...');
    
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'businesses' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Businesses table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSchema(); 