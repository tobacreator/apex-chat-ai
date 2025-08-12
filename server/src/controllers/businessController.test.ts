import { Request, Response } from 'express';
import { createBusiness, updateBusiness } from './businessController';
import { query } from '../db';

jest.mock('../db');

describe('businessController Validation', () => {
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

  test('createBusiness - invalid input (short name)', async () => {
    mockReq.body = { name: 'ab', description: 'Desc' };

    await createBusiness(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Business name is required and must be at least 3 characters long.' }));
  });

  test('createBusiness - valid input', async () => {
    mockReq.body = { name: 'Test Business', description: 'Desc' };

    await createBusiness(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ business: expect.any(Object) }));
  });

  test('updateBusiness - invalid input (short name)', async () => {
    mockReq.body = { name: 'ab' };
    mockReq.params = { id: 'test_id' };

    await updateBusiness(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Business name must be at least 3 characters long if provided.' }));
  });

  test('updateBusiness - valid input', async () => {
    mockReq.body = { name: 'Updated Business' };
    mockReq.params = { id: 'test_id' };
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test_id' }] });

    await updateBusiness(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ business: expect.any(Object) }));
  });
}); 