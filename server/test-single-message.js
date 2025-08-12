const http = require('http');

// Test a single message to see the server response clearly
function testSingleMessage() {
  console.log('=== TESTING SINGLE MESSAGE ===');
  
  const testData = JSON.stringify({
    From: '+9999999999',
    Body: 'Ajala Ventures'
  });
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/mock-whatsapp/receive',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testData)
    }
  };
  
  console.log('🧪 Sending "Ajala Ventures" from +9999999999...');
  console.log('📤 Request payload:', testData);
  
  const req = http.request(options, (res) => {
    console.log(`✅ Response Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📥 Response body:', data);
      
      // Check if the response indicates business name detection
      if (data.includes('Perfect! I\'ve registered "Ajala Ventures"')) {
        console.log('✅ SUCCESS: Business name detected correctly!');
      } else if (data.includes('I need a business name to continue')) {
        console.log('❌ FAILURE: Business name not detected - still asking for business name');
      } else {
        console.log('❓ UNKNOWN: Unexpected response');
      }
      
      console.log('\n💡 Check the server logs to see the detailed processing.');
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });
  
  req.write(testData);
  req.end();
}

console.log('⏳ Testing single message...');
setTimeout(() => {
  testSingleMessage();
}, 1000); 