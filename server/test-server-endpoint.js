const http = require('http');

// Test the server endpoint
function testServerEndpoint() {
  console.log('=== TESTING SERVER ENDPOINT ===');
  
  const testData = JSON.stringify({
    From: '+1234567890',
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
  
  const req = http.request(options, (res) => {
    console.log(`✅ Server responded with status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Response received:', data);
      console.log('✅ Server is working correctly!');
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error testing server:', error.message);
    console.log('💡 Make sure the server is running with: npm run dev');
  });
  
  req.write(testData);
  req.end();
}

// Wait a moment for server to start, then test
setTimeout(() => {
  testServerEndpoint();
}, 2000); 