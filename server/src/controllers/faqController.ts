import { Request, Response } from 'express';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';

export const createFAQ = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { question, answer, category } = req.body;

    // Validation and sanitization
    if (!question || !answer || question.trim() === '' || answer.trim() === '') {
      return res.status(400).json({ error: 'Question and answer are required and cannot be empty.' });
    }
    const sanitizedQuestion = validator.escape(question);
    const sanitizedAnswer = validator.escape(answer);
    const sanitizedCategory = validator.escape(category || '');

    const id = uuidv4();
    const insertQuery = `INSERT INTO faqs (id, business_id, question, answer, category) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await query(insertQuery, [id, user.user_id, sanitizedQuestion, sanitizedAnswer, sanitizedCategory]);
    return res.status(201).json({ faq: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getFAQs = async (req: Request, res: Response) => {
  console.log('getFAQs: Controller started. User object from JWT:', req.user);
  const userId = (req.user as any)?.user_id; // Explicitly get user_id

  if (!userId) {
      console.error('getFAQs: CRITICAL - User ID missing after token verification!');
      return res.status(401).json({ message: 'Unauthorized: User ID not found in token payload.' });
  }
  console.log('getFAQs: User ID extracted:', userId);

  // Locate your database query for fetching FAQs
  // Ensure the query uses this `userId` to filter results (multi-tenancy).
  try {
      const result = await query('SELECT id, question, answer, category FROM faqs WHERE business_id = $1', [userId]); // Ensure business_id = $1
      console.log('getFAQs: DB query result count:', result.rows.length);
      console.log('getFAQs: Sending successful response with', result.rows.length, 'FAQs.');
      console.log('getFAQs: Actual data being sent in JSON response:', result.rows);
      return res.status(200).json(result.rows);
  } catch (error: any) {
      console.error('getFAQs: Error fetching FAQs from DB:', error.message, error);
      return res.status(500).json({ message: 'Server error fetching FAQs.' });
  }
};

export const getFAQById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const selectQuery = `SELECT * FROM faqs WHERE id = $1 AND business_id = $2`;
    const result = await query(selectQuery, [id, user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    return res.status(200).json({ faq: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const updateFAQ = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { question, answer, category } = req.body;

    // Validation and sanitization (partial updates allowed)
    const updates: any = {};
    if (question) {
      if (question.trim() === '') return res.status(400).json({ error: 'Question cannot be empty if provided.' });
      updates.question = validator.escape(question);
    }
    if (answer) {
      if (answer.trim() === '') return res.status(400).json({ error: 'Answer cannot be empty if provided.' });
      updates.answer = validator.escape(answer);
    }
    if (category) updates.category = validator.escape(category);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 3}`).join(', ');
    const updateQuery = `UPDATE faqs SET ${updateFields} WHERE id = $1 AND business_id = $2 RETURNING *`;
    const result = await query(updateQuery, [id, user.user_id, ...Object.values(updates)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'FAQ not found' });
    }
    return res.status(200).json({ faq: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const deleteFAQ = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const deleteQuery = `DELETE FROM faqs WHERE id = $1 AND business_id = $2 RETURNING *`;
    const result = await query(deleteQuery, [id, user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'FAQ not found or not owned by user' });
    }
    return res.status(200).json({ message: 'FAQ deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 