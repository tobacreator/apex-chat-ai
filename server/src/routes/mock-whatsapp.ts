import { Router } from 'express';
import { whatsappWebhookReceive } from '../controllers/whatsappController';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Mock endpoint to simulate incoming WhatsApp webhook
router.post('/receive', (req, res) => {
  const { message = 'Hello', from = '+1234567890', media = false } = req.query; // Use query for easy testing

  // Generate fake Twilio payload
  const mockPayload = {
    From: from as string,
    Body: message as string,
    MessageSid: `SM${uuidv4().split('-')[0]}`,
    To: 'whatsapp:+14155238886', // Your Twilio number
    NumMedia: media ? '1' : '0',
    MediaUrl0: media ? 'http://mock-media-url.com/test.csv' : undefined,
    MediaContentType0: media ? 'text/csv' : undefined,
  };

  // Call the existing webhook handler with mock req
  const mockReq = { body: mockPayload } as any;
  whatsappWebhookReceive(mockReq, res);
});

export default router;