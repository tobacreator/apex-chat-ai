import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import businessRoutes from './routes/businessRoutes';
import faqRoutes from './routes/faqRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import uploadRoutes from './routes/uploadRoutes';
import aiRoutes from './routes/aiRoutes';
import googleSheetsRoutes from './routes/googleSheetsRoutes';
import healthRoutes from './routes/healthRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import mockWhatsappRoutes from './routes/mock-whatsapp';
import { setDefaultResultOrder } from 'dns';
import rateLimit from 'express-rate-limit';

// ✅ Debug: Log environment variables to confirm loading
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD?.length || 'undefined/null');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

const PORT = process.env.PORT || 5000;

const app = express();

// Add rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// --- BEGIN CORS Configuration ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*', // Allow all origins for development. For production, specify your frontend domain(s)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true, // Allow cookies and authorization headers (if you ever use them)
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
// This line is crucial for handling OPTIONS preflight requests:
// app.options('*', cors()); // Enable pre-flight across all routes
// --- END CORS Configuration ---

// --- Mount ALL Routers (EACH EXACTLY ONCE) ---
console.log('Mounting router: /api/auth');
app.use('/api/auth', businessRoutes);
console.log('Mounting router: /api/faqs');
app.use('/api/faqs', faqRoutes);
console.log('Mounting router: /api/products');
app.use('/api/products', productRoutes);
console.log('Mounting router: /api/orders');
app.use('/api/orders', orderRoutes);
console.log('Mounting router: /api/upload');
app.use('/api/upload', uploadRoutes);
console.log('Mounting router: /api/ai');
app.use('/api/ai', aiRoutes);
console.log('Mounting router: /api/integrations/google-sheets');
app.use('/api/integrations/google-sheets', googleSheetsRoutes);
console.log('Mounting router: /api (health routes)');
app.use('/api', healthRoutes);
console.log('Mounting router: /api/whatsapp');
app.use('/api/whatsapp', whatsappRoutes);

if (process.env.USE_WHATSAPP_MOCK === 'true') {
  app.use('/mock-whatsapp', mockWhatsappRoutes);
  console.log('Mock WhatsApp routes mounted at /mock-whatsapp');
}

// --- END Mounting Routers ---

const startServer = async () => {
  try {
    // Set DNS result order for better performance
    setDefaultResultOrder('ipv4first');
    
    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, () => {
      console.log(`ApexChat AI backend server is running on port ${PORT}`);
    }).on('error', (err: any) => {
      console.error('Server failed to start:', err.message, err);
      process.exit(1);
    });
    
  } catch (error: any) {
    console.error('Failed to initialize server:', error.message, error);
    process.exit(1);
  }
};

// --- Crucial: Invoke startServer and handle its promise ---
// This ensures the async function is called and errors are caught
startServer().catch(error => {
  console.error('Failed to initialize or start Express app:', error.message, error);
  process.exit(1); // Exit if the server setup itself fails
});
