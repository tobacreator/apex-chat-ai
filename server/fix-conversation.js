const { getPool } = require('./src/db/index.ts');

async function fixConversation() {
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    console.log('Fixing conversation state...');
    
    // Get the existing business
    const businessResult = await client.query('SELECT * FROM businesses WHERE whatsapp_phone_number = $1', ['+1234567890']);
    const business = businessResult.rows[0];
    
    if (business) {
      console.log('Found existing business:', business.name);
      
      // Update conversation to link the business and advance state
      await client.query(
        'UPDATE conversations SET business_id = $1, current_state = $2 WHERE customer_phone = $3',
        [business.id, 'onboarding_products_prompt', '+1234567890']
      );
      
      console.log('✅ Conversation updated with business ID and advanced to onboarding_products_prompt');
      
      // Check the result
      const convResult = await client.query('SELECT * FROM conversations WHERE customer_phone = $1', ['+1234567890']);
      console.log('Updated conversation:', convResult.rows[0]);
      
    } else {
      console.log('No existing business found');
    }
    
    client.release();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixConversation(); 