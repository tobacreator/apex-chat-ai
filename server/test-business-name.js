// Test the rule-based business name detection logic
function testBusinessNameDetection() {
  console.log('=== TESTING BUSINESS NAME DETECTION ===');
  
  const testCases = [
    { message: 'Hello', expected: 'greeting' },
    { message: 'Hi there', expected: 'greeting' },
    { message: 'Ajala Ventures', expected: 'business_name' },
    { message: 'My Store', expected: 'business_name' },
    { message: 'ABC Company', expected: 'business_name' },
    { message: 'A', expected: 'too_short' }
  ];
  
  const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "how are you", "what's up"];
  
  testCases.forEach(testCase => {
    const { message, expected } = testCase;
    
    // Apply the same logic as in the controller
    let result = 'unknown';
    
    if (message.length < 3) {
      result = 'too_short';
    } else {
      const isGreeting = greetings.some(greeting => message.toLowerCase().includes(greeting));
      if (isGreeting) {
        result = 'greeting';
      } else {
        result = 'business_name';
      }
    }
    
    const passed = result === expected;
    console.log(`${passed ? '✅' : '❌'} "${message}" → ${result} (expected: ${expected})`);
  });
  
  console.log('\n=== RULE-BASED LOGIC TEST ===');
  console.log('This test verifies that the rule-based detection logic works correctly.');
  console.log('If all tests pass, the issue might be in the AI response parsing or state management.');
}

testBusinessNameDetection(); 