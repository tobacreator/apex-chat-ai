const { Pool } = require('pg');
require('dotenv').config();

async function debugTableStructures() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Checking table structures...\n');

    // Check conversations table
    console.log('=== CONVERSATIONS TABLE ===');
    const conversationsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      ORDER BY ordinal_position;
    `);
    console.log(JSON.stringify(conversationsStructure.rows, null, 2));

    // Check businesses table
    console.log('\n=== BUSINESSES TABLE ===');
    const businessesStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'businesses' 
      ORDER BY ordinal_position;
    `);
    console.log(JSON.stringify(businessesStructure.rows, null, 2));

    // Check whatsapp_messages table
    console.log('\n=== WHATSAPP_MESSAGES TABLE ===');
    const messagesStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_messages' 
      ORDER BY ordinal_position;
    `);
    console.log(JSON.stringify(messagesStructure.rows, null, 2));

    // Test a simple insert into conversations
    console.log('\n=== TESTING CONVERSATIONS INSERT ===');
    try {
      const testResult = await pool.query(
        'INSERT INTO conversations (customer_phone, current_state, business_id) VALUES ($1, $2, NULL) RETURNING id, current_state, business_id, context',
        ['test-phone-' + Date.now(), 'initial']
      );
      console.log('Test insert successful:', testResult.rows[0]);
      
      // Clean up test data
      await pool.query('DELETE FROM conversations WHERE customer_phone LIKE $1', ['test-phone-%']);
      console.log('Test data cleaned up');
    } catch (error) {
      console.error('Test insert failed:', error.message);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugTableStructures(); 