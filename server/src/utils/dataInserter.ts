import { query } from '../db';
import { DataTypeConfig } from '../config/dataTypes';
import { v4 as uuidv4 } from 'uuid';

export interface InsertResult {
  success: boolean;
  insertedCount: number;
  errors: string[];
}

export const insertData = async (
  rows: any[], 
  dataTypeConfig: DataTypeConfig, 
  businessId: string, 
  uploadId: string
): Promise<InsertResult> => {
  const result: InsertResult = {
    success: true,
    insertedCount: 0,
    errors: []
  };

  for (const [index, row] of rows.entries()) {
    try {
      const id = uuidv4();
      
      // Build dynamic query based on data type
      const fields = Object.keys(dataTypeConfig.validationRules);
      const values = fields.map(field => row[field] || null);
      
      // Add common fields (id, business_id, upload_id)
      const allFields = ['id', 'business_id', ...fields];
      const allValues = [id, businessId, ...values];
      
      // Add upload_id if the table supports it
      if (dataTypeConfig.table === 'products') {
        allFields.push('upload_id');
        allValues.push(uploadId);
      }
      
      const placeholders = allValues.map((_, i) => `$${i + 1}`).join(', ');
      const fieldNames = allFields.join(', ');
      
      const insertQuery = `
        INSERT INTO ${dataTypeConfig.table} (${fieldNames}) 
        VALUES (${placeholders})
      `;
      
      await query(insertQuery, allValues);
      result.insertedCount++;
      
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Row ${index + 1}: ${error.message}`);
    }
  }
  
  return result;
};

// Special handling for different data types
export const insertProducts = async (
  rows: any[], 
  businessId: string, 
  uploadId: string
): Promise<InsertResult> => {
  const result: InsertResult = {
    success: true,
    insertedCount: 0,
    errors: []
  };

  for (const [index, row] of rows.entries()) {
    try {
      const id = uuidv4();
      const sku = row.sku;
      const product_name = row.product_name;
      const description = row.description || '';
      const price = parseFloat(row.price) || 0;
      const stock_quantity = parseInt(row.stock_quantity, 10) || 0;
      const category = row.category || null;
      
      await query(
        `INSERT INTO products (id, business_id, sku, product_name, description, price, stock_quantity, category, upload_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, businessId, sku, product_name, description, price, stock_quantity, category, uploadId]
      );
      
      result.insertedCount++;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Row ${index + 1}: ${error.message}`);
    }
  }
  
  return result;
};

export const insertOrders = async (
  rows: any[], 
  businessId: string, 
  uploadId: string
): Promise<InsertResult> => {
  const result: InsertResult = {
    success: true,
    insertedCount: 0,
    errors: []
  };

  for (const [index, row] of rows.entries()) {
    try {
      const id = uuidv4();
      const customer_whatsapp_id = row.customer_whatsapp_id;
      const order_number = row.order_number;
      const order_status = row.order_status;
      const total_amount = parseFloat(row.total_amount) || 0;
      
      await query(
        `INSERT INTO orders (id, business_id, customer_whatsapp_id, order_number, order_status, total_amount) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, businessId, customer_whatsapp_id, order_number, order_status, total_amount]
      );
      
      result.insertedCount++;
    } catch (error: any) {
      result.success = false;
      result.errors.push(`Row ${index + 1}: ${error.message}`);
    }
  }
  
  return result;
}; 