const { getPool } = require('./src/db/index.ts');

async function resetAndTest() {
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    console.log('=== RESETTING CONVERSATION FOR TESTING ===');
    
    // Delete existing conversation and business
    await client.query('DELETE FROM conversations WHERE customer_phone = $1', ['+1234567890']);
    await client.query('DELETE FROM businesses WHERE whatsapp_phone_number = $1', ['+1234567890']);
    
    console.log('✅ Deleted existing conversation and business');
    
    // Create fresh conversation in initial state
    await client.query(
      'INSERT INTO conversations (customer_phone, current_state) VALUES ($1, $2)',
      ['+1234567890', 'initial']
    );
    
    console.log('✅ Created fresh conversation in initial state');
    
    // Verify the reset
    const convResult = await client.query('SELECT * FROM conversations WHERE customer_phone = $1', ['+1234567890']);
    const bizResult = await client.query('SELECT * FROM businesses WHERE whatsapp_phone_number = $1', ['+1234567890']);
    
    console.log('Current conversation:', convResult.rows[0]);
    console.log('Current businesses:', bizResult.rows);
    
    client.release();
    console.log('=== READY FOR TESTING ===');
    console.log('Test sequence:');
    console.log('1. Send "Hello" → should advance to awaiting_business_name');
    console.log('2. Send "Ajala Ventures" → should create business and advance to onboarding_products_prompt');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

resetAndTest(); 