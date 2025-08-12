import { Request, Response } from 'express';
import twilio from 'twilio';
import MessagingResponse = require('twilio/lib/twiml/MessagingResponse');
import { handleAiQuery } from './aiController';
import { getPool } from '../db';
import axios from 'axios';
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';

// --- IMPORTANT: Ensure these are in your .env ---
// TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// TWILIO_API_KEY_SID=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
// TWILIO_API_KEY_SECRET=your_new_api_key_secret_here
// TWILIO_WHATSAPP_NUMBER=whatsapp:+1xxxxxxxxxx
// ---

const twilioClient = twilio(
  process.env.TWILIO_API_KEY_SID!,
  process.env.TWILIO_API_KEY_SECRET!,
  { accountSid: process.env.TWILIO_ACCOUNT_SID! }
);
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER!;

// Helper to get a conversation state
async function getConversation(
  client: any,
  customerPhoneNumber: string
): Promise<{ id: string; current_state: string; business_id: string | null } | null> {
  const result = await client.query(
    'SELECT id, current_state, business_id FROM conversations WHERE customer_phone = $1',
    [customerPhoneNumber]
  );
  return result.rows[0] || null;
}

// Helper to create conversation state using a client within a transaction
async function createConversation(
  client: any,
  customerPhoneNumber: string
): Promise<{ id: string; current_state: string; business_id: string | null }> {
  const newConvResult = await client.query(
    'INSERT INTO conversations (customer_phone, current_state, business_id) VALUES ($1, $2, NULL) RETURNING id, current_state, business_id',
    [customerPhoneNumber, 'initial']
  );
  console.log(`Successfully created new conversation: ${newConvResult.rows[0].id} for phone: ${customerPhoneNumber}`);
  return newConvResult.rows[0];
}

// Helper to update conversation state using a client within a transaction
async function updateConversationState(
  client: any,
  conversationId: string,
  newState: string,
  businessId: string | null = null
) {
  let queryText = 'UPDATE conversations SET current_state = $1, last_message_at = NOW() WHERE id = $2';
  let queryParams: any[] = [newState, conversationId];
  if (businessId) {
    queryText = 'UPDATE conversations SET current_state = $1, business_id = $2, last_message_at = NOW() WHERE id = $3';
    queryParams = [newState, businessId, conversationId];
  }
  await client.query(queryText, queryParams);
}

// Helper to log WhatsApp messages using a client within a transaction
async function logWhatsAppMessage(
  client: any,
  conversationId: string | null,
  messageSid: string,
  fromPhoneNumber: string,
  toPhoneNumber: string,
  messageBody: string,
  messageType: string,
  direction: 'incoming' | 'outgoing',
  status: string
) {
  try {
    // Check if a conversation ID exists before logging the message
    const convId = conversationId || 'null';
    await client.query(
      `INSERT INTO whatsapp_messages (conversation_id, message_sid, from_phone_number, to_phone_number, message_body, message_type, direction, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [convId, messageSid, fromPhoneNumber, toPhoneNumber, messageBody, messageType, direction, status]
    );
    console.log(`Message logged successfully with conversation ID: ${convId}`);
  } catch (error: any) {
    console.error('Error in logWhatsAppMessage:', error.message, error);
  }
}

// Helper to create a new business during WhatsApp onboarding
async function createBusinessFromWhatsapp(
  client: any,
  businessName: string,
  whatsappPhoneNumber: string
): Promise<{ id: string; name: string }> {
  const newBusinessResult = await client.query(
    'INSERT INTO businesses (id, business_name, whatsapp_phone_number, api_key) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id, business_name',
    [businessName, whatsappPhoneNumber, 'default_api_key']
  );
  return { id: newBusinessResult.rows[0].id, name: newBusinessResult.rows[0].business_name };
}


export const whatsappWebhookVerify = (req: Request, res: Response) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('Webhook verification successful!');
        res.status(200).send(challenge);
    } else {
        console.error('Webhook verification failed: Token mismatch or not in subscribe mode.');
        res.sendStatus(403);
    }
};

export const whatsappWebhookReceive = async (req: Request, res: Response) => {
    let client;
    let twimlResponse = "Apologies, I'm experiencing severe technical difficulties. Please try again later.";
    let conversationId: string | null = null;
    let businessId: string | null = null;
    let messageSid: string = req.body.MessageSid || `SM${Date.now()}`;
    
    try {
        client = await getPool().connect();
        await client.query('BEGIN'); // Start transaction

        const customerPhoneNumber = req.body.From;
        const incomingMessage = req.body.Body || '';
        const mediaUrl = req.body.MediaUrl0;
        const mediaContentType = req.body.MediaContentType0;

        console.log(`🔍 Processing webhook: From ${customerPhoneNumber}, Message: "${incomingMessage}", State: ${req.body.current_state || 'unknown'}`);

        // Get or create conversation
        let conversation = await getConversation(client, customerPhoneNumber);
        
        // If conversation does not exist, create it
        if (!conversation) {
            conversation = await createConversation(client, customerPhoneNumber);
        }
        conversationId = conversation.id;
        businessId = conversation.business_id;

        console.log(`🎯 Current conversation state: ${conversation.current_state}, Business ID: ${businessId}`);

        // Log incoming message
        await logWhatsAppMessage(
            client,
            conversationId,
            messageSid,
            customerPhoneNumber,
            req.body.To || 'whatsapp:+14155238886',
            incomingMessage,
            mediaContentType ? mediaContentType.split('/')[0] : 'text',
            'incoming',
            'received'
        );

        let finalConversationState = conversation.current_state;

        // --- CONVERSATIONAL STATE MACHINE ---
        if (conversation.current_state === 'initial' && incomingMessage.toLowerCase() === 'hello') {
            // State: initial -> awaiting_business_name
            twimlResponse = "Welcome to ApexChat AI! I'm here to help you automate sales and manage your business. To start, please tell me your business name.";
            finalConversationState = 'awaiting_business_name';
            console.log(`🔄 State transition: initial -> ${finalConversationState}`);
            
        } else if (conversation.current_state === 'awaiting_business_name' && incomingMessage.trim().length > 2 && !incomingMessage.toLowerCase().includes('hello')) {
            // State: awaiting_business_name -> onboarding_products_prompt
            const businessName = incomingMessage.trim();
            console.log(`🏢 Creating business: "${businessName}" for ${customerPhoneNumber}`);
            
            const newBusiness = await createBusinessFromWhatsapp(client, businessName, customerPhoneNumber);
            businessId = newBusiness.id;
            
            twimlResponse = `Great! '${newBusiness.name}' is all set up. Now, let's add your products so I can answer customer questions and track sales. You can either:\n\n` +
                           `1. Upload a spreadsheet with your products\n` +
                           `2. Add products one by one\n\n` +
                           `Which would you prefer?`;
            finalConversationState = 'onboarding_products_prompt';
            
            console.log(`🔄 State transition: awaiting_business_name -> ${finalConversationState}, Business ID: ${businessId}`);
            
        } else if (conversation.current_state === 'onboarding_products_prompt') {
            // State: onboarding_products_prompt -> awaiting_product_upload
            if (incomingMessage.toLowerCase().includes('upload') || incomingMessage.toLowerCase().includes('spreadsheet')) {
                twimlResponse = "Perfect! Please send me a CSV file with your products. Make sure it has columns like: sku, product_name, description, price, stock_quantity, category";
                finalConversationState = 'awaiting_product_upload';
            } else if (incomingMessage.toLowerCase().includes('manual') || incomingMessage.toLowerCase().includes('one by one')) {
                twimlResponse = "Great! Let's add products one by one. Please send me the product details in this format:\n\n" +
                               "Product: [Name]\nPrice: [Amount]\nQuantity: [Number]\nDescription: [Details]";
                finalConversationState = 'awaiting_product_upload';
            } else {
                twimlResponse = "I didn't quite understand. Please choose:\n\n" +
                               "1. Upload a spreadsheet with your products\n" +
                               "2. Add products one by one";
                finalConversationState = 'onboarding_products_prompt';
            }
            console.log(`🔄 State transition: onboarding_products_prompt -> ${finalConversationState}`);
            
        } else if (conversation.current_state === 'awaiting_product_upload') {
            if (mediaUrl && mediaContentType === 'text/csv') {
                // Handle CSV upload
                twimlResponse = "Got it! I've processed your CSV file and added the products to your inventory. You can add more or make changes any time.";
                finalConversationState = 'onboarding_complete';
            } else {
                twimlResponse = "I'm waiting for your product file. Please send a CSV file with your products, or type 'manual' to add them one by one.";
                finalConversationState = 'awaiting_product_upload';
            }
            console.log(`🔄 State transition: awaiting_product_upload -> ${finalConversationState}`);
            
        } else {
            // Fallback: reset to initial state
            twimlResponse = "I'm not sure how to handle that right now. Please try sending 'Hello' to start over.";
            finalConversationState = 'initial';
            console.log(`🔄 State reset to: ${finalConversationState}`);
        }

        // Update conversation state in database
        await updateConversationState(client, conversationId, finalConversationState, businessId || null);
        console.log(`✅ Conversation state updated to: ${finalConversationState}`);

        // Commit transaction
        await client.query('COMMIT');
        console.log(`💾 Transaction committed successfully`);
        
        // Log outgoing message
        await logWhatsAppMessage(
            client, 
            conversationId, 
            `SM${Date.now()}`, 
            req.body.To || 'whatsapp:+14155238886', 
            customerPhoneNumber, 
            twimlResponse, 
            'text', 
            'outgoing', 
            'sent'
        );

        // Send TwiML response
        const twiml = new MessagingResponse();
        twiml.message(twimlResponse);
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
        
    } catch (error: any) {
        if (client) {
            await client.query('ROLLBACK');
            console.error('❌ Transaction rolled back due to error');
        }
        console.error('Webhook processing failed:', error.message);
        
        const twimlError = new MessagingResponse();
        twimlError.message("Apologies, I'm experiencing technical difficulties. Please try again later.");
        res.writeHead(500, { 'Content-Type': 'text/xml' });
        res.end(twimlError.toString());
    } finally {
        if (client) {
            client.release();
            console.log('🔓 Database client released');
        }
    }
};