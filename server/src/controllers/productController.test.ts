import { Request, Response } from 'express';
import { createProduct, updateProduct } from './productController';
import { query } from '../db';

jest.mock('../db');

describe('productController Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = { user: { user_id: 'test_user', email: 'test@example.com' }, body: {} }; // Added email to match type
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    (query as jest.Mock).mockResolvedValue({ rows: [{}] });
  });

  test('createProduct - invalid input (missing fields)', async () => {
    mockReq.body = { sku: '123', product_name: 'Test', price: 10, stock_quantity: 5 }; // Missing nothing, but test invalid
    mockReq.body = { sku: '', product_name: '', price: 'invalid', stock_quantity: 'invalid' };

    await createProduct(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  test('createProduct - invalid input (negative values)', async () => {
    mockReq.body = { sku: '123', product_name: 'Test', price: -5, stock_quantity: -1 };

    await createProduct(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Price must be positive and stock_quantity non-negative.' }));
  });

  test('createProduct - valid input', async () => {
    mockReq.body = { sku: '123', product_name: 'Test Product', description: 'Desc', price: 10.5, stock_quantity: 5, category: 'Cat' };

    await createProduct(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ product: expect.any(Object) }));
    expect(query).toHaveBeenCalled();
  });

  test('updateProduct - invalid input (no fields)', async () => {
    mockReq.body = {};
    mockReq.params = { id: 'test_id' };

    await updateProduct(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'No valid fields provided for update.' }));
  });

  test('updateProduct - invalid input (negative price)', async () => {
    mockReq.body = { price: -10 };
    mockReq.params = { id: 'test_id' };

    await updateProduct(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid price: must be a positive number.' }));
  });

  test('updateProduct - valid input', async () => {
    mockReq.body = { product_name: 'Updated Name', price: 15.0 };
    mockReq.params = { id: 'test_id' };
    (query as jest.Mock).mockResolvedValue({ rows: [{ id: 'test_id' }] });

    await updateProduct(mockReq as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ product: expect.any(Object) }));
  });
}); 