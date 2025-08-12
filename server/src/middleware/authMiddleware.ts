import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Request interface to include the 'user' property
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string; // This is the ID we expect our controllers to use
        email: string;
        // Add other properties from JWT payload you might need, e.g., role: string;
        [key: string]: any; // Allow other properties from the JWT payload
      };
    }
  }
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  // Log the received Authorization header
  console.log('Auth Middleware: Received Authorization Header:', req.headers.authorization);
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  // Log the token and secret length before verification
  console.log('Auth Middleware: Token extracted for verification:', token);
  console.log('Auth Middleware: Using JWT_SECRET length:', process.env.JWT_SECRET?.length);
  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
    if (err) {
      console.error('Auth Middleware: JWT Verification FAILED:', err.message, err);
      return res.status(401).json({ message: 'Unauthorized: Invalid token.', error: err.message });
    } else {
      console.log('Auth Middleware: JWT Verification SUCCESS. Decoded payload:', decoded);
      // Cast decoded to an expected type to access properties like 'sub'
      const decodedPayload = decoded as { sub: string; email: string; [key: string]: any };

      // --- CRUCIAL FIX HERE: Assign correct properties ---
      req.user = {
        user_id: decodedPayload.sub, // Supabase user ID is in 'sub' property of JWT
        email: decodedPayload.email,
        // You can spread other decoded properties if needed:
        // ...decodedPayload
      };
      // --- END CRUCIAL FIX ---

      console.log('Auth Middleware: req.user set:', req.user); // New debug log
      next(); // Proceed to the next middleware/route handler
    }
  });
}; 