import { Request, Response } from 'express';
import { createOrder, updateOrder } from './orderController';
import { query } from '../db';

jest.mock('../db');

describe('orderController Validation', () => {
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

  test('createOrder - invalid input (missing fields)', async () => {
    mockReq.body = { customer_name: '', shipping_address: '', total_amount: 'invalid', items: [] };

    await createOrder(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  test('createOrder - invalid input (negative total)', async () => {
    mockReq.body = { customer_name: 'Test', shipping_address: 'Addr', total_amount: -10, items: [{ product_id: 'p1', quantity: 1 }] };

    await createOrder(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Total amount must be positive.' }));
  });

  test('createOrder - invalid items', async () => {
    mockReq.body = { customer_name: 'Test', shipping_address: 'Addr', total_amount: 10, items: [{ product_id: 'p1', quantity: -1 }] };

    await createOrder(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Each item must have a valid product_id and positive integer quantity.' }));
  });

  test('createOrder - valid input', async () => {
    mockReq.body = { customer_name: 'Test', shipping_address: 'Addr', total_amount: 10, items: [{ product_id: 'p1', quantity: 1 }] };

    await createOrder(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ order: expect.any(Object) }));
  });

  test('updateOrder - invalid input (negative total)', async () => {
    mockReq.body = { total_amount: -5 };
    mockReq.params = { id: 'test_id' };

    await updateOrder(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Total amount must be a positive number if provided.' }));
  });

  test('updateOrder - valid input', async () => {
    mockReq.body = { shipping_address: 'Updated Addr' };
    mockReq.params = { id: 'test_id' };
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test_id' }] });

    await updateOrder(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ order: expect.any(Object) }));
  });
}); 