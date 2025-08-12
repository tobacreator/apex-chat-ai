import { Router, Request, Response } from 'express';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { whatsappWebhookVerify, whatsappWebhookReceive } from '../controllers/whatsappController';

const router = Router();

// WhatsApp Webhook Verification (for both Meta and Twilio)
router.get('/webhook', whatsappWebhookVerify);

// WhatsApp Webhook for incoming messages (Twilio Integration)
router.post('/webhook', whatsappWebhookReceive);

// Mock WhatsApp webhook for local testing
router.post('/mock-whatsapp/receive', whatsappWebhookReceive);

// Handle incoming WhatsApp messages
async function handleIncomingMessage(message: any) {
  try {
    const phoneNumber = message.from;
    const messageText = message.text?.body || '';
    const messageType = message.type;
    
    console.log(`WhatsApp Message: From ${phoneNumber}, Type: ${messageType}, Text: ${messageText}`);
    
    // Check if user exists
    const existingUser = await query(
      `SELECT * FROM businesses WHERE whatsapp_phone = $1`,
      [phoneNumber]
    );
    
    if (existingUser.rows.length === 0) {
      // New user - start onboarding flow
      await handleNewUserOnboarding(phoneNumber, messageText);
    } else {
      // Existing user - handle normal conversation
      await handleExistingUserMessage(phoneNumber, messageText, existingUser.rows[0]);
    }
    
  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

// Handle new user onboarding
async function handleNewUserOnboarding(phoneNumber: string, messageText: string) {
  try {
    console.log(`New user onboarding: ${phoneNumber}`);
    
    // Check if this is the first message (just "Hello" or similar)
    if (isGreeting(messageText)) {
      await sendWhatsAppMessage(phoneNumber, 
        "Welcome to ApexChat AI! I'm here to help you automate sales and manage your business. To start, please tell me your business name."
      );
      return;
    }
    
    // If not a greeting, assume it's the business name
    const businessName = messageText.trim();
    
    // Create new business account
    const businessId = uuidv4();
    await query(
      `INSERT INTO businesses (id, business_name, whatsapp_phone, status, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [businessId, businessName, phoneNumber, 'active']
    );
    
    console.log(`Created new business: ${businessName} (${businessId})`);
    
    // Send next step message
    await sendWhatsAppMessage(phoneNumber,
      `Great! '${businessName}' is all set up. Now, let's add your products so I can answer customer questions and track sales. You can either:\n\n` +
      `1. Upload a spreadsheet with your products\n` +
      `2. Add products one by one\n\n` +
      `Which would you prefer?`
    );
    
  } catch (error) {
    console.error('Error in new user onboarding:', error);
    await sendWhatsAppMessage(phoneNumber, 
      "Sorry, I encountered an error setting up your account. Please try again or contact support."
    );
  }
}

// Handle existing user messages
async function handleExistingUserMessage(phoneNumber: string, messageText: string, business: any) {
  try {
    console.log(`Existing user message: ${phoneNumber} - ${messageText}`);
    
    // Check for specific commands
    if (messageText.toLowerCase().includes('upload') || messageText.toLowerCase().includes('spreadsheet')) {
      await handleSpreadsheetUpload(phoneNumber, business);
      return;
    }
    
    if (messageText.toLowerCase().includes('add product') || messageText.toLowerCase().includes('manual')) {
      await handleManualProductEntry(phoneNumber, business);
      return;
    }
    
    if (messageText.toLowerCase().startsWith('sale:')) {
      await handleInStoreSale(phoneNumber, messageText, business);
      return;
    }
    
    // Default: treat as customer inquiry
    await handleCustomerInquiry(phoneNumber, messageText, business);
    
  } catch (error) {
    console.error('Error handling existing user message:', error);
    await sendWhatsAppMessage(phoneNumber, 
      "Sorry, I encountered an error processing your message. Please try again."
    );
  }
}

// Handle spreadsheet upload request
async function handleSpreadsheetUpload(phoneNumber: string, business: any) {
  await sendWhatsAppMessage(phoneNumber,
    `Perfect! Please use this template with columns for ProductName, Price, Quantity, and Description.\n\n` +
    `📊 Template: https://your-domain.com/template/${business.id}\n\n` +
    `Once you're done, just upload the file here and I'll import all your products automatically!`
  );
}

// Handle manual product entry
async function handleManualProductEntry(phoneNumber: string, business: any) {
  await sendWhatsAppMessage(phoneNumber,
    `Great! Let's add products one by one. Please send me the product details in this format:\n\n` +
    `Product: [Name]\nPrice: [Amount]\nQuantity: [Number]\nDescription: [Details]\n\n` +
    `For example:\nProduct: Red Ankara Dress\nPrice: 18500\nQuantity: 10\nDescription: Beautiful red ankara dress, perfect for special occasions`
  );
}

// Handle in-store sale logging
async function handleInStoreSale(phoneNumber: string, messageText: string, business: any) {
  try {
    // Parse sale message: "Sale: 1 blue adire boubou. Total 22000. Paid cash."
    const saleMatch = messageText.match(/sale:\s*(\d+)\s+(.+?)\.\s*Total\s+(\d+)\.\s*Paid\s+(.+)/i);
    
    if (saleMatch) {
      const quantity = parseInt(saleMatch[1]);
      const productName = saleMatch[2].trim();
      const total = parseFloat(saleMatch[3]);
      const paymentMethod = saleMatch[4].trim();
      
      // Create sale record
      const saleId = uuidv4();
      await query(
        `INSERT INTO sales_ledger (id, business_id, product_name, quantity, total_amount, payment_method, sale_type, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [saleId, business.id, productName, quantity, total, paymentMethod, 'in-store']
      );
      
      await sendWhatsAppMessage(phoneNumber,
        `✅ In-store sale logged!\n\n` +
        `Product: ${productName}\n` +
        `Quantity: ${quantity}\n` +
        `Total: ₦${total.toLocaleString()}\n` +
        `Payment: ${paymentMethod}\n\n` +
        `Inventory will be updated automatically.`
      );
    } else {
      await sendWhatsAppMessage(phoneNumber,
        `Please use this format for logging sales:\n\n` +
        `Sale: [quantity] [product name]. Total [amount]. Paid [payment method]\n\n` +
        `Example: Sale: 1 blue adire boubou. Total 22000. Paid cash`
      );
    }
  } catch (error) {
    console.error('Error handling in-store sale:', error);
    await sendWhatsAppMessage(phoneNumber, 
      "Sorry, I couldn't process that sale. Please check the format and try again."
    );
  }
}

// Handle customer inquiry
async function handleCustomerInquiry(phoneNumber: string, messageText: string, business: any) {
  try {
    // Check if this is a product inquiry
    const products = await query(
      `SELECT * FROM products WHERE business_id = $1 AND LOWER(product_name) LIKE $2`,
      [business.id, `%${messageText.toLowerCase()}%`]
    );
    
    if (products.rows.length > 0) {
      const product = products.rows[0];
      await sendWhatsAppMessage(phoneNumber,
        `Hello! Yes, the ${product.product_name} is available and costs ₦${product.price.toLocaleString()}. ` +
        `We have ${product.stock_quantity} in stock.\n\n` +
        `Would you like to place an order?`
      );
    } else {
      // Check FAQs
      const faqs = await query(
        `SELECT * FROM faqs WHERE business_id = $1 AND LOWER(question) LIKE $2`,
        [business.id, `%${messageText.toLowerCase()}%`]
      );
      
      if (faqs.rows.length > 0) {
        await sendWhatsAppMessage(phoneNumber, faqs.rows[0].answer);
      } else {
        await sendWhatsAppMessage(phoneNumber,
          `Thank you for your inquiry! I'm checking our inventory for "${messageText}". Please give me a moment...`
        );
        
        // Notify business owner
        await sendWhatsAppMessage(business.whatsapp_phone,
          `🔔 New customer inquiry:\n\n` +
          `From: ${phoneNumber}\n` +
          `Question: "${messageText}"\n\n` +
          `Would you like to take over this conversation?`
        );
      }
    }
  } catch (error) {
    console.error('Error handling customer inquiry:', error);
    await sendWhatsAppMessage(phoneNumber,
      "Thank you for your message! I'm currently processing your inquiry. Please give me a moment..."
    );
  }
}

// Helper function to check if message is a greeting
function isGreeting(message: string): boolean {
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
  return greetings.some(greeting => message.toLowerCase().includes(greeting));
}

// Send WhatsApp message via WhatsApp Business API
async function sendWhatsAppMessage(phoneNumber: string, message: string) {
  try {
    console.log(`Sending WhatsApp message to ${phoneNumber}: ${message}`);
    
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      console.error('WhatsApp credentials not configured');
      return;
    }
    
    // Format phone number (remove + if present)
    const formattedPhone = phoneNumber.replace('+', '');
    
    // WhatsApp Business API endpoint
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('WhatsApp message sent successfully:', result);
    } else {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
    }
    
    // Store message in database for logging
    const messageId = uuidv4();
    await query(
      `INSERT INTO whatsapp_messages (id, phone_number, message_text, direction, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [messageId, phoneNumber, message, 'outgoing']
    );
    
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

export default router; 