// Test the AI response parsing logic
function testAIParsing() {
  console.log('Testing AI response parsing...');
  
  // Mock AI response that should work
  const mockResponse = `\`\`\`json
{
  "response_text": "Great! I've registered 'Ajala Ventures' as your business name. Now let's set up your products. You can either upload a CSV file with your product list or add them manually. Which option would you prefer?",
  "new_state": "onboarding_products_prompt",
  "business_name": "Ajala Ventures"
}
\`\`\``;
  
  console.log('Raw AI response:', mockResponse);
  
  // Strip markdown and clean response for JSON parsing
  let response = mockResponse.replace(/```json\s*/g, '').replace(/\s*```/g, '').trim();
  console.log('Cleaned response:', response);
  
  // Parse response as JSON
  try {
    const parsedResponse = JSON.parse(response);
    console.log('Successfully parsed JSON:', parsedResponse);
    console.log('Business name extracted:', parsedResponse.business_name);
    console.log('New state:', parsedResponse.new_state);
    
    // Test business creation logic
    if (parsedResponse.business_name && parsedResponse.business_name.length >= 3) {
      console.log('✅ Business name is valid, should create business');
    } else {
      console.log('❌ Business name is invalid');
    }
    
  } catch (e) {
    console.error('Failed to parse JSON:', e);
    console.error('Response that failed to parse:', response);
    
    // Try to extract JSON from the response if it contains JSON-like content
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        console.log('Extracted JSON from response:', parsedResponse);
      } catch (extractError) {
        console.error('Failed to extract JSON:', extractError);
      }
    }
  }
}

testAIParsing(); 