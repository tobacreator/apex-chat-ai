// Test the rule-based business name detection logic
function testRuleBasedLogic() {
  console.log('Testing rule-based business name detection...');
  
  const incomingMessage = 'Ajala Ventures';
  const conversationState = 'awaiting_business_name';
  
  console.log(`Input: "${incomingMessage}" in state: ${conversationState}`);
  
  // Simulate the AI response (which is failing)
  const parsedResponse = {
    response_text: "Hello! Welcome to ApexChat AI. To get started, what is the name of your business?",
    new_state: "awaiting_business_name",
    business_name: null
  };
  
  console.log('AI Response:', parsedResponse);
  
  // Apply rule-based fallback
  let businessName = parsedResponse.business_name;
  
  if (!businessName && incomingMessage && incomingMessage.length >= 3) {
    const greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "how are you", "what's up"];
    const isGreeting = greetings.some(greeting => incomingMessage.toLowerCase().includes(greeting));
    
    if (!isGreeting) {
      businessName = incomingMessage.trim();
      console.log(`🔄 RULE-BASED: AI didn't extract business name, but "${businessName}" is not a greeting. Treating as business name.`);
      
      // Override AI response for business name detection
      const overrideResponse = {
        response_text: `Perfect! I've registered "${businessName}" as your business name. Now let's set up your products. You can either upload a CSV file with your product list or add them manually. Which option would you prefer?`,
        new_state: 'onboarding_products_prompt',
        business_name: businessName
      };
      
      // Update the parsed response
      Object.assign(parsedResponse, overrideResponse);
      console.log(`🔄 Overriding AI response with rule-based detection:`, overrideResponse);
    }
  }
  
  if (businessName && businessName.length >= 3) {
    console.log(`✅ Business name detected: "${businessName}"`);
    console.log(`✅ Should create business and advance to: ${parsedResponse.new_state}`);
  } else {
    console.log(`❌ No valid business name detected`);
  }
  
  console.log('Final response:', parsedResponse);
}

testRuleBasedLogic(); 