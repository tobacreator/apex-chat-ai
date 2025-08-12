const axios = require('axios');

async function testWhatsAppWebhook() {
  try {
    console.log('Testing WhatsApp webhook...');
    
    const testData = {
      From: 'whatsapp:+2347066468505',
      Body: 'Hello',
      MessageSid: 'SM' + Date.now(),
      To: 'whatsapp:+14155238886'
    };
    
    console.log('Sending test data:', testData);
    
    const response = await axios.post('http://localhost:5000/api/whatsapp/webhook', testData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
    
  } catch (error) {
    console.error('Error testing webhook:', error.response?.data || error.message);
  }
}

testWhatsAppWebhook(); 