const http = require('http');

// Test the complete state machine flow
function testStateMachine() {
  console.log('=== TESTING COMPLETE STATE MACHINE ===');
  
  const phoneNumber = '+5555555555';
  let step = 1;
  
  function sendMessage(message, expectedResponse) {
    console.log(`\n🧪 Step ${step}: Sending "${message}"`);
    console.log(`   Expected: ${expectedResponse}`);
    
    const testData = JSON.stringify({
      From: phoneNumber,
      Body: message
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
      console.log(`   ✅ Response Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   📥 Response: ${data}`);
        
        // Check if response matches expected
        if (data.includes(expectedResponse)) {
          console.log(`   ✅ SUCCESS: Response matches expected`);
        } else {
          console.log(`   ❌ FAILURE: Response does not match expected`);
        }
        
        step++;
        
        // Continue with next step
        if (step === 2) {
          setTimeout(() => sendMessage('Hello', 'Welcome to ApexChat AI'), 1000);
        } else if (step === 3) {
          setTimeout(() => sendMessage('Ajala Ventures', 'Perfect! I\'ve registered "Ajala Ventures"'), 1000);
        } else if (step === 4) {
          setTimeout(() => sendMessage('CSV upload', 'Perfect! You can upload your product spreadsheet'), 1000);
        } else {
          console.log('\n🎉 STATE MACHINE TEST COMPLETE!');
          console.log('✅ All steps completed');
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`   ❌ Error: ${error.message}`);
    });
    
    req.write(testData);
    req.end();
  }
  
  // Start the test sequence
  console.log('Starting state machine test...');
  sendMessage('Hello', 'Welcome to ApexChat AI');
}

// Wait for server to be ready, then test
console.log('⏳ Waiting for server to be ready...');
setTimeout(() => {
  testStateMachine();
}, 2000); 