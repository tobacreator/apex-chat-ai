import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { standardizePhoneNumber } from '../utils/phoneUtils';
import crypto from 'crypto';
import { query } from '../db'; // Added import for query function
import validator from 'validator';
import { v4 as uuidv4 } from 'uuid';

console.log('--- Supabase Env Check in businessController.ts ---');
console.log('process.env.SUPABASE_URL:', process.env.SUPABASE_URL ? 'Loaded' : 'MISSING');
console.log('process.env.SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Loaded' : 'MISSING');
console.log('process.env.SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Loaded' : 'MISSING');
console.log('---------------------------------------------------');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, and/or SUPABASE_SERVICE_ROLE_KEY is missing in environment variables!');
}

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Using SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const signupBusiness = async (req: Request, res: Response) => {
  try {
    const { email, password, business_name, whatsapp_phone_number } = req.body;
    if (!email || !password || !business_name || !whatsapp_phone_number) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const standardizedPhone = standardizePhoneNumber(whatsapp_phone_number);
    if (!standardizedPhone) {
      return res.status(400).json({ message: 'Invalid WhatsApp phone number format. Must be E.164 (e.g., +1234567890).' });
    }

    // 1. Create auth user in Supabase (admin client)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (authError || !authData?.user?.id) {
      console.error('Supabase Auth Error:', authError);
      return res.status(400).json({ message: authError?.message || 'Signup failed' });
    }

    const newUserId = authData.user.id;

    // Explicitly confirm the user's email using an admin action
    const { error: updateConfirmError } = await supabaseAdmin.auth.admin.updateUserById(
      newUserId,
      { email_confirm: true }
    );

    if (updateConfirmError) {
      console.error('CRITICAL: Failed to auto-confirm user explicitly after creation:', updateConfirmError.message, updateConfirmError);
      // Log this error, but do not prevent the main signup from proceeding if business record insert is needed
    } else {
      console.log('User explicitly auto-confirmed successfully via admin update.');
    }

    // 2. Insert into businesses table using PostgreSQL function
    const businessId = authData.user.id;
    const apiKey = crypto.randomUUID();

    const functionCallQuery = `
      SELECT * FROM public.create_new_business_entry($1, $2, $3, $4);
    `;
    const result = await query(functionCallQuery, [
      businessId,
      business_name,
      standardizedPhone,
      apiKey
    ]);

    // Ensure the function call was successful and data is returned
    if (result.rows.length === 0) {
      console.error('Failed to insert business record via database function.');
      return res.status(500).json({ message: 'Failed to create business record via database function.' });
    }

    return res.status(201).json({ business: result.rows[0], user: authData.user });
  } catch (error: any) {
    console.error('Unhandled signup error:', error);
    return res.status(500).json({ message: error.message || 'Server error during signup' });
  }
};

export const loginBusiness = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    console.log('--- Supabase signInWithPassword Raw Response ---');
    console.log('Data:', data);
    console.log('Auth Error (if any):', authError);
    console.log('------------------------------------------------');
    
    if (authError) {
      console.error('Supabase signInWithPassword Error:', authError.message, authError);
      return res.status(401).json({ message: 'Invalid email or password. Please try again.' });
    }

    if (!data || !data.session || !data.user) {
      console.error('Supabase signInWithPassword did not return session or user data:', data);
      return res.status(500).json({ message: 'Login failed: No session data from Supabase.' });
    }

    return res.status(200).json({
      message: 'Login successful!',
      session: data.session,
      user: data.user,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getBusinessProfile = async (req: Request, res: Response) => {
  console.log('getBusinessProfile: Controller started. User object from JWT:', req.user);
  const userId = (req.user as any)?.user_id; // Explicitly get user_id

  if (!userId) {
      console.error('getBusinessProfile: CRITICAL - User ID missing after token verification!');
      return res.status(401).json({ message: 'Unauthorized: User ID not found in token payload.' });
  }
  console.log('getBusinessProfile: User ID extracted:', userId);

  // Locate your database query for fetching the business profile
  // Ensure the query uses this `userId` to filter results.
  try {
      const result = await query('SELECT id, name, whatsapp_phone_number, google_access_token, google_refresh_token FROM businesses WHERE id = $1', [userId]);
      console.log('getBusinessProfile: DB query result:', result.rows[0]);

      if (result.rows.length === 0) {
          console.error('getBusinessProfile: Business profile NOT found for ID:', userId);
          return res.status(404).json({ message: 'Business profile not found.' });
      }

      const businessData = result.rows[0];
      console.log('getBusinessProfile: READY TO SEND SUCCESS RESPONSE with businessData:', businessData); // <-- NEW LOG HERE
      return res.status(200).json({ user: businessData }); // <-- CRUCIAL LINE
  } catch (error: any) {
      console.error('getBusinessProfile: Database error fetching profile:', error.message, error);
      return res.status(500).json({ message: 'Server error fetching business profile.', error: error.message });
  }
};

export const updateBusinessProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { business_name, whatsapp_phone_number } = req.body;
    if (!business_name && !whatsapp_phone_number) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    const updates: any = {};
    if (business_name) updates.name = business_name;
    if (whatsapp_phone_number) updates.whatsapp_phone_number = whatsapp_phone_number;
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', user.user_id)
      .select()
      .single();
    if (error || !data) {
      return res.status(404).json({ error: 'Business not found or update failed' });
    }
    return res.status(200).json({ business: data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createBusiness = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { name, description } = req.body;

    // Validation and sanitization
    if (!name || name.trim() === '' || name.length < 3) {
      return res.status(400).json({ error: 'Business name is required and must be at least 3 characters long.' });
    }
    const sanitizedName = validator.escape(name);
    const sanitizedDescription = validator.escape(description || '');

    const id = uuidv4();
    const insertQuery = `INSERT INTO businesses (id, user_id, name, description) VALUES ($1, $2, $3, $4) RETURNING *`;
    const result = await query(insertQuery, [id, user.user_id, sanitizedName, sanitizedDescription]);
    return res.status(201).json({ business: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// For updateBusiness (if exists, or add similarly)
export const updateBusiness = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { name, description } = req.body;

    // Validation and sanitization (partial updates)
    const updates: any = {};
    if (name) {
      if (name.trim() === '' || name.length < 3) return res.status(400).json({ error: 'Business name must be at least 3 characters long if provided.' });
      updates.name = validator.escape(name);
    }
    if (description) updates.description = validator.escape(description);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 3}`).join(', ');
    const updateQuery = `UPDATE businesses SET ${updateFields}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`;
    const result = await query(updateQuery, [id, user.user_id, ...Object.values(updates)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    return res.status(200).json({ business: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL,
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json({ message: "Password reset email sent" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};
