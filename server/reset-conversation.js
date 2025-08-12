const { getPool } = require('./src/db/index.ts');

async function resetConversation() {
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    console.log('Resetting conversation state...');
    
    // Reset conversation to awaiting_business_name
    await client.query(
      'UPDATE conversations SET current_state = $1, business_id = NULL WHERE customer_phone = $2',
      ['awaiting_business_name', '+1234567890']
    );
    
    console.log('✅ Conversation reset to awaiting_business_name');
    
    // Check the result
    const result = await client.query('SELECT * FROM conversations WHERE customer_phone = $1', ['+1234567890']);
    console.log('Updated conversation:', result.rows[0]);
    
    client.release();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

resetConversation(); 