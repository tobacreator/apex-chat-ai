import { Request, Response } from 'express';
import { createFAQ, updateFAQ } from './faqController';
import { query } from '../db';

jest.mock('../db');

describe('faqController Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = { user: { user_id: 'test_user', email: 'test@example.com' }, body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    (query as jest.Mock).mockResolvedValue({ rows: [{}] });
  });

  test('createFAQ - invalid input (empty fields)', async () => {
    mockReq.body = { question: '', answer: '' };

    await createFAQ(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Question and answer are required and cannot be empty.' }));
  });

  test('createFAQ - valid input', async () => {
    mockReq.body = { question: 'What?', answer: 'This.', category: 'General' };

    await createFAQ(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ faq: expect.any(Object) }));
  });

  test('updateFAQ - invalid input (empty question)', async () => {
    mockReq.body = { question: '' };
    mockReq.params = { id: 'test_id' };

    await updateFAQ(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Question cannot be empty if provided.' }));
  });

  test('updateFAQ - valid input', async () => {
    mockReq.body = { answer: 'Updated answer' };
    mockReq.params = { id: 'test_id' };
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test_id' }] });

    await updateFAQ(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ faq: expect.any(Object) }));
  });
}); 