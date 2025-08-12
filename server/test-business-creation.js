const { getPool } = require('./src/db/index.ts');

async function testBusinessCreation() {
  try {
    const pool = getPool();
    const client = await pool.connect();
    
    console.log('Testing business creation directly...');
    
    // Test the business creation function
    const businessName = 'Ajala Ventures';
    const phoneNumber = '+1234567890';
    
    console.log(`Creating business: "${businessName}" for phone: ${phoneNumber}`);
    
    const result = await client.query(
      'INSERT INTO businesses (id, name, whatsapp_phone_number, api_key) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id, name, whatsapp_phone_number',
      [businessName, phoneNumber, 'default_api_key']
    );
    
    const business = result.rows[0];
    console.log('✅ Business created successfully:', business);
    
    // Update conversation with business ID
    await client.query(
      'UPDATE conversations SET business_id = $1, current_state = $2 WHERE customer_phone = $3',
      [business.id, 'onboarding_products_prompt', phoneNumber]
    );
    
    console.log('✅ Conversation updated with business ID and new state');
    
    // Check the results
    const convResult = await client.query('SELECT * FROM conversations WHERE customer_phone = $1', [phoneNumber]);
    const bizResult = await client.query('SELECT * FROM businesses WHERE whatsapp_phone_number = $1', [phoneNumber]);
    
    console.log('Updated conversation:', convResult.rows[0]);
    console.log('Created business:', bizResult.rows[0]);
    
    client.release();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testBusinessCreation(); 