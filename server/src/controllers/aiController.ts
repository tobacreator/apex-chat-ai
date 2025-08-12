import { Request, Response } from 'express';
import { query } from '../db';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Gemini import
import NodeCache from 'node-cache';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Initialize cache with 1-hour TTL
const aiCache = new NodeCache({ stdTTL: 3600 });

export const handleAiQuery = async (req: Request, res: Response) => {
  try {
    const { query_text } = req.body;
    if (!query_text || typeof query_text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid query_text' });
    }
    const userQuery = query_text.trim().toLowerCase();
    
    // --- FIX: Use the actual user_id from the authenticated user ---
    const userId = (req.user as any)?.user_id;
    
    // Check if this is an onboarding request (no valid business ID yet)
    const isOnboardingRequest = !userId || userId === 'whatsapp_onboarding_user' || userId === null;
    
    if (isOnboardingRequest) {
      console.log('AI Query: Onboarding request detected, skipping database queries and using Gemini directly');
      // Skip database queries for onboarding and go straight to Gemini
    } else {
      console.log('AI Query: Using business-specific data for user_id:', userId);
    }

    // Fetch all FAQs (only if not onboarding)
    const faqsResult = !isOnboardingRequest
      ? await query('SELECT question, answer FROM public.faqs WHERE business_id = $1', [userId])
      : { rows: [] };
    const faqs = faqsResult.rows || [];

    // Fetch all Products (only if not onboarding)
    const productsResult = !isOnboardingRequest
      ? await query('SELECT product_name, price, stock_quantity FROM public.products WHERE business_id = $1', [userId])
      : { rows: [] };
    const products = productsResult.rows || [];

    // Skip FAQ and product matching for onboarding requests
    if (!isOnboardingRequest) {
      // 1. Exact FAQ Match
      for (const faq of faqs) {
        if (userQuery === faq.question.trim().toLowerCase()) {
          return res.json({ response: faq.answer, confidence: 99, matchedData: faq.question });
        }
      }

      // 2. Keyword FAQ Match
      const keywords = ['shipping', 'return', 'hours', 'refund', 'delivery', 'support', 'contact', 'policy'];
      for (const faq of faqs) {
        for (const keyword of keywords) {
          if (
            faq.question.toLowerCase().includes(keyword) ||
            faq.answer.toLowerCase().includes(keyword)
          ) {
            if (userQuery.includes(keyword)) {
              return res.json({ response: faq.answer, confidence: 90, matchedData: faq.question });
            }
          }
        }
      }

      // 3. Product Inquiry Match
      for (const product of products) {
        if (userQuery.includes(product.product_name.toLowerCase())) {
          const response = `The ${product.product_name} is $${product.price} and we have ${product.stock_quantity} in stock.`;
          return res.json({ response, confidence: 95, matchedData: product.product_name });
        }
      }
    }

    // 4. Gemini Fallback
    console.log('No direct match, calling Gemini for generative fallback...');

    // Check cache first
    const prompt = `You are an AI assistant for a small business. Provide a helpful and concise response to the following customer query. If you cannot answer based on common business knowledge, politely state you are still learning or need more information.\nCustomer Query: "${query_text}"`;
    const cachedResponse = aiCache.get(prompt);
    if (cachedResponse) {
      console.log('Gemini Fallback: Serving from cache');
      return res.status(200).json({
        response: cachedResponse,
        confidence: 80, // Slightly lower for cached
        matchedData: "Cached Generative AI Response"
      });
    }

    try {
      console.log('Gemini Fallback: Sending prompt to Gemini:', prompt);
      const result = await model.generateContent(prompt);
      const geminiResponse = await result.response;
      console.log('Gemini Fallback: Raw Gemini response object:', geminiResponse);
      const geminiText = geminiResponse.text();
      console.log('Gemini Fallback: Extracted generative text:', geminiText);

      // Cache the response
      aiCache.set(prompt, geminiText);

      return res.status(200).json({
        response: geminiText,
        confidence: Math.floor(Math.random() * 10) + 75, // 75-85%
        matchedData: "Generative AI Response"
      });
    } catch (geminiError: any) {
      console.error('Gemini API Error:', geminiError.message);
      console.error('Gemini API Error details:', geminiError);
      // Fallback to static message if Gemini fails
      const fallbackResponse = "This is an intelligent response from ApexChat AI based on your business's data. I'm still learning, but I'm here to help you scale!";
      return res.status(200).json({
        response: fallbackResponse,
        confidence: 75,
        matchedData: "Fallback Response"
      });
    }
  } catch (err: any) {
    console.error('AI Query Error: Failed to generate content from Gemini:', err.message);
    console.error('Error details:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}; 