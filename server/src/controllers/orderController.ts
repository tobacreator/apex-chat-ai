import { Request, Response } from 'express';
import { query } from '../db';
import validator from 'validator';
import { v4 as uuidv4 } from 'uuid';

export const getOrders = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { order_status, customer_whatsapp_id } = req.query;
    let selectQuery = `SELECT * FROM orders WHERE business_id = $1`;
    const params: any[] = [user.user_id];
    if (order_status) {
      selectQuery += ' AND order_status = $2';
      params.push(order_status);
    }
    if (customer_whatsapp_id) {
      selectQuery += params.length === 1 ? ' AND customer_whatsapp_id = $2' : ' AND customer_whatsapp_id = $3';
      params.push(customer_whatsapp_id);
    }
    const result = await query(selectQuery, params);
    return res.status(200).json({ orders: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const selectQuery = `SELECT * FROM orders WHERE id = $1 AND business_id = $2`;
    const result = await query(selectQuery, [id, user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(200).json({ order: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getOrderByOrderNumber = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { order_number } = req.query;
    if (!order_number) {
      return res.status(400).json({ error: 'Missing order_number parameter' });
    }
    const selectQuery = `SELECT * FROM orders WHERE order_number = $1 AND business_id = $2`;
    const result = await query(selectQuery, [order_number, user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(200).json({ order: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { customer_name, shipping_address, total_amount, items } = req.body;

    // Validation and sanitization
    if (!customer_name || !shipping_address || isNaN(total_amount) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid required fields: customer_name, shipping_address, total_amount (positive number), and items (non-empty array).' });
    }
    const sanitizedCustomerName = validator.escape(customer_name);
    const sanitizedShippingAddress = validator.escape(shipping_address);
    const parsedTotalAmount = parseFloat(total_amount);
    if (parsedTotalAmount <= 0) {
      return res.status(400).json({ error: 'Total amount must be positive.' });
    }
    // Validate items array (each item should have product_id and quantity)
    for (const item of items) {
      if (!item.product_id || isNaN(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ error: 'Each item must have a valid product_id and positive integer quantity.' });
      }
    }

    const id = uuidv4();
    const insertQuery = `INSERT INTO orders (id, business_id, customer_name, shipping_address, total_amount, items) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const result = await query(insertQuery, [id, user.user_id, sanitizedCustomerName, sanitizedShippingAddress, parsedTotalAmount, items]);
    return res.status(201).json({ order: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

// For updateOrder (if exists, or add similarly)
export const updateOrder = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { customer_name, shipping_address, total_amount, items } = req.body;

    // Validation and sanitization (partial updates)
    const updates: any = {};
    if (customer_name) {
      if (customer_name.trim() === '') return res.status(400).json({ error: 'Customer name cannot be empty if provided.' });
      updates.customer_name = validator.escape(customer_name);
    }
    if (shipping_address) {
      if (shipping_address.trim() === '') return res.status(400).json({ error: 'Shipping address cannot be empty if provided.' });
      updates.shipping_address = validator.escape(shipping_address);
    }
    if (total_amount !== undefined) {
      const parsedTotal = parseFloat(total_amount);
      if (isNaN(parsedTotal) || parsedTotal <= 0) return res.status(400).json({ error: 'Total amount must be a positive number if provided.' });
      updates.total_amount = parsedTotal;
    }
    if (items) {
      if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Items must be a non-empty array if provided.' });
      for (const item of items) {
        if (!item.product_id || isNaN(item.quantity) || item.quantity <= 0) {
          return res.status(400).json({ error: 'Each item must have a valid product_id and positive integer quantity.' });
        }
      }
      updates.items = items;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 3}`).join(', ');
    const updateQuery = `UPDATE orders SET ${updateFields}, updated_at = NOW() WHERE id = $1 AND business_id = $2 RETURNING *`;
    const result = await query(updateQuery, [id, user.user_id, ...Object.values(updates)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(200).json({ order: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 