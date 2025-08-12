const { getPool } = require('./src/db/index.ts');

async function testDirectBusinessName() {
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    console.log('Testing direct business name validation...');
    
    const businessName = 'Ajala Ventures';
    const phoneNumber = '+1234567890';
    
    console.log(`Testing business name: "${businessName}"`);
    
    // Test the validation logic directly
    if (businessName && businessName.length >= 3) {
      console.log('✅ Business name passes validation');
      
      // Create business directly
      const result = await client.query(
        'INSERT INTO businesses (id, name, whatsapp_phone_number, api_key) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id, name',
        [businessName, phoneNumber, 'default_api_key']
      );
      
      const business = result.rows[0];
      console.log('✅ Business created:', business);
      
      // Update conversation
      await client.query(
        'UPDATE conversations SET business_id = $1, current_state = $2 WHERE customer_phone = $3',
        [business.id, 'onboarding_products_prompt', phoneNumber]
      );
      
      console.log('✅ Conversation updated');
      
    } else {
      console.log('❌ Business name fails validation');
    }
    
    client.release();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testDirectBusinessName(); 