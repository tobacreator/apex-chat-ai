import { Request, Response } from 'express';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';
import validator from 'validator';

export const createProduct = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { sku, product_name, description, price, stock_quantity, category } = req.body;

    // Validation and sanitization
    if (!sku || !product_name || isNaN(price) || isNaN(stock_quantity)) {
      return res.status(400).json({ error: 'Missing or invalid required fields: sku, product_name, price, stock_quantity must be provided and valid.' });
    }
    const sanitizedName = validator.escape(product_name);
    const sanitizedDesc = validator.escape(description || '');
    const sanitizedCategory = validator.escape(category || '');
    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock_quantity);
    if (parsedPrice <= 0 || parsedStock < 0) {
      return res.status(400).json({ error: 'Price must be positive and stock_quantity non-negative.' });
    }

    const id = uuidv4();
    const insertQuery = `INSERT INTO products (id, business_id, sku, product_name, description, price, stock_quantity, category) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
    const result = await query(insertQuery, [id, user.user_id, sku, sanitizedName, sanitizedDesc, parsedPrice, parsedStock, sanitizedCategory]);
    return res.status(201).json({ product: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { product_name } = req.query;
    let selectQuery = `SELECT * FROM products WHERE business_id = $1`;
    const params: any[] = [user.user_id];
    if (product_name) {
      selectQuery += ' AND product_name ILIKE $2';
      params.push(`%${product_name}%`);
    }
    const result = await query(selectQuery, params);
    return res.status(200).json({ products: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const selectQuery = `SELECT * FROM products WHERE id = $1 AND business_id = $2`;
    const result = await query(selectQuery, [id, user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(200).json({ product: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const { sku, product_name, description, price, stock_quantity, category } = req.body;

    // Validation and sanitization (partial updates allowed, but validate provided fields)
    const updates: any = {};
    if (sku) updates.sku = sku;
    if (product_name) updates.product_name = validator.escape(product_name);
    if (description) updates.description = validator.escape(description);
    if (category) updates.category = validator.escape(category);
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ error: 'Invalid price: must be a positive number.' });
      }
      updates.price = parsedPrice;
    }
    if (stock_quantity !== undefined) {
      const parsedStock = parseInt(stock_quantity);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return res.status(400).json({ error: 'Invalid stock_quantity: must be a non-negative integer.' });
      }
      updates.stock_quantity = parsedStock;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update.' });
    }

    const updateFields = Object.keys(updates).map((key, index) => `${key} = $${index + 3}`).join(', ');
    const updateQuery = `UPDATE products SET ${updateFields}, updated_at = NOW() WHERE id = $1 AND business_id = $2 RETURNING *`;
    const result = await query(updateQuery, [id, user.user_id, ...Object.values(updates)]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(200).json({ product: result.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user || !user.user_id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { id } = req.params;
    const deleteQuery = `DELETE FROM products WHERE id = $1 AND business_id = $2 RETURNING *`;
    const result = await query(deleteQuery, [id, user.user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or not owned by user' });
    }
    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}; 