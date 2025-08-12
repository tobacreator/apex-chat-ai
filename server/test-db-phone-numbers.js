require('dotenv').config();
const { query } = require('./src/db');

async function checkPhoneNumbers() {
    try {
        console.log('Checking businesses table...');
        const result = await query('SELECT business_name, whatsapp_phone FROM businesses LIMIT 5');
        
        console.log('Businesses in database:');
        if (result.rows.length === 0) {
            console.log('No businesses found in database');
        } else {
            result.rows.forEach((row, index) => {
                console.log(`${index + 1}. Business: "${row.business_name}", Phone: ${row.whatsapp_phone}`);
            });
        }
        
        console.log('\nEnvironment variables:');
        console.log('TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkPhoneNumbers(); 