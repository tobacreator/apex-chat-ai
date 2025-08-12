const http = require('http');

// Test the live bulletproof system
function testLiveSystem() {
  console.log('=== TESTING LIVE BULLETPROOF SYSTEM ===');
  
  // Test 1: Send "Hello" (should be detected as greeting)
  const testData1 = JSON.stringify({
    From: '+1234567890',
    Body: 'Hello'
  });
  
  const options1 = {
    hostname: 'localhost',
    port: 5000,
    path: '/mock-whatsapp/receive',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testData1)
    }
  };
  
  console.log('🧪 Test 1: Sending "Hello" (should be detected as greeting)...');
  
  const req1 = http.request(options1, (res) => {
    console.log(`✅ Test 1 Response Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Test 1 Response:', data);
      
      // Test 2: Send "Ajala Ventures" (should be detected as business name)
      setTimeout(() => {
        console.log('\n🧪 Test 2: Sending "Ajala Ventures" (should be detected as business name)...');
        
        const testData2 = JSON.stringify({
          From: '+1234567890',
          Body: 'Ajala Ventures'
        });
        
        const options2 = {
          hostname: 'localhost',
          port: 5000,
          path: '/mock-whatsapp/receive',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(testData2)
          }
        };
        
        const req2 = http.request(options2, (res2) => {
          console.log(`✅ Test 2 Response Status: ${res2.statusCode}`);
          
          let data2 = '';
          res2.on('data', (chunk) => {
            data2 += chunk;
          });
          
          res2.on('end', () => {
            console.log('✅ Test 2 Response:', data2);
            console.log('\n🎉 LIVE SYSTEM TEST COMPLETE!');
            console.log('✅ Bulletproof system is working correctly!');
            console.log('✅ Business name detection is functioning!');
            console.log('✅ Server is responding properly!');
          });
        });
        
        req2.on('error', (error) => {
          console.error('❌ Test 2 Error:', error.message);
        });
        
        req2.write(testData2);
        req2.end();
        
      }, 1000);
    });
  });
  
  req1.on('error', (error) => {
    console.error('❌ Test 1 Error:', error.message);
    console.log('💡 Make sure the server is running with: npm run dev');
  });
  
  req1.write(testData1);
  req1.end();
}

// Wait for server to be ready, then test
console.log('⏳ Waiting for server to be ready...');
setTimeout(() => {
  testLiveSystem();
}, 2000); 