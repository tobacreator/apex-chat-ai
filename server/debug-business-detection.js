// Debug the business name detection logic
function debugBusinessDetection() {
  console.log('=== DEBUGGING BUSINESS NAME DETECTION ===');
  
  const testMessages = [
    'Hello',
    'Ajala Ventures',
    'Hi',
    'My Store',
    'ABC Company'
  ];
  
  const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "how are you", "what's up"];
  
  testMessages.forEach((message, index) => {
    console.log(`\n🔍 Testing message ${index + 1}: "${message}"`);
    
    // Apply the same logic as in the controller
    let result = 'unknown';
    let isBusinessName = false;
    let businessName = null;
    
    // Rule 1: Check if message is a greeting (check this FIRST)
    const isGreeting = greetings.some(greeting => message.toLowerCase().includes(greeting));
    console.log(`  - Is greeting check: ${isGreeting} (greetings: ${greetings.join(', ')})`);
    
    if (isGreeting) {
      result = 'greeting';
      console.log(`  - Result: ${result}`);
    } else if (!message || message.trim().length < 3) {
      // Rule 2: Check if message is too short (after greeting check)
      result = 'too_short';
      console.log(`  - Length check: ${message.length} characters`);
      console.log(`  - Result: ${result}`);
    } else {
      // Rule 3: If not greeting and length >= 3, it's a business name
      result = 'business_name';
      isBusinessName = true;
      businessName = message.trim();
      console.log(`  - Length check: ${message.length} characters (>= 3)`);
      console.log(`  - Result: ${result}`);
      console.log(`  - Business name: "${businessName}"`);
    }
    
    console.log(`  ✅ Final result: "${message}" → ${result}`);
  });
  
  console.log('\n=== DEBUG SUMMARY ===');
  console.log('If the logic above looks correct, the issue might be in the server implementation.');
  console.log('Check the server logs to see what the actual detection logic is doing.');
}

debugBusinessDetection(); 