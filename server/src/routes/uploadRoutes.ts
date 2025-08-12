import { Router, Request, Response } from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import { query } from '../db';
import { verifyToken } from '../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';
import type { Express } from 'express';

// Feature flag for template download
const ENABLE_TEMPLATE_DOWNLOAD = process.env.ENABLE_TEMPLATE_DOWNLOAD === 'true';

const router = Router();
// Enhanced multer configuration with security limits
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only allow 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    // Validate file type
    if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    
    // Validate file name (prevent path traversal)
    if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
      return cb(new Error('Invalid filename'));
    }
    
    cb(null, true);
  }
});

// Error handling middleware for multer
const handleMulterError = (err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Only one file allowed.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Multi-data type CSV upload endpoint
console.log('Registering route: /csv');
router.post('/csv', verifyToken, upload.single('file'), handleMulterError, async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    console.log('CSV Upload: Request received');
    console.log('CSV Upload: File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
    console.log('CSV Upload: User:', req.user ? req.user.user_id : 'No user');
    console.log('CSV Upload: Data Type:', req.body.dataType || 'products');
    
    if (!req.file || !req.file.buffer) {
      console.log('CSV Upload: No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!req.user || !req.user.user_id) {
      console.log('CSV Upload: Unauthorized - no user');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const business_id = req.user.user_id;
    const dataType = req.body.dataType || 'products';
    
    console.log('CSV Upload: Processing for business_id:', business_id, 'dataType:', dataType);
    
    // Get data type configuration
    const { getDataTypeConfig } = require('../config/dataTypes');
    const dataTypeConfig = getDataTypeConfig(dataType);
    
    if (!dataTypeConfig) {
      console.log('CSV Upload: Invalid data type:', dataType);
      return res.status(400).json({ error: 'Invalid data type' });
    }
    
    // Check for duplicate file upload
    const existingFile = await query(
      `SELECT id FROM file_uploads 
       WHERE business_id = $1 AND filename = $2`,
      [business_id, req.file.originalname]
    );
    
    if (existingFile.rows.length > 0) {
      console.log('CSV Upload: Duplicate file detected:', req.file.originalname);
      return res.status(409).json({ 
        error: 'File with this name has already been uploaded. Please use a different filename or delete the existing upload first.' 
      });
    }
    
    console.log('CSV Upload: No duplicate found, proceeding with upload');
    
    // Parse CSV from buffer
    const results: any[] = [];
    const stream = req.file.buffer;
    
    console.log('CSV Upload: Starting CSV parsing...');
    
    await new Promise<void>((resolve, reject) => {
      const rows: any[] = [];
      let isFirstRow = true;
      let detectedHeaders: string[] = [];
      
      const parser = csvParser({ 
        headers: true, 
        skipLines: 0,
        strict: false,
        mapHeaders: ({ header }) => {
          const trimmed = header.trim();
          detectedHeaders.push(trimmed);
          return trimmed;
        }
      });
      
      parser.on('headers', (headers: string[]) => {
        console.log('CSV Upload: Detected headers:', headers);
      });
      
      parser.on('data', (row: any) => {
        // Skip the first row if it contains header-like data
        if (isFirstRow) {
          isFirstRow = false;
          // Check if this row looks like headers (all values match expected header names)
          const rowValues = Object.values(row).map(val => typeof val === 'string' ? val.trim().toLowerCase() : '');
          const expectedHeaders = dataTypeConfig.requiredFields.map((field: string) => field.toLowerCase());
          
          const isHeaderRow = rowValues.every((value, index) => 
            expectedHeaders.includes(value) || value === ''
          );
          
          if (isHeaderRow) {
            console.log('CSV Upload: Skipping header row detected in data');
            return;
          }
        }
        
        // Trim all values
        Object.keys(row).forEach(key => {
          if (typeof row[key] === 'string') {
            row[key] = row[key].trim();
          }
        });
        
        console.log('CSV Upload: Raw row data:', row);
        
        // Only push non-empty rows (at least one value is non-empty/non-whitespace)
        if (Object.values(row).some((value) => typeof value === 'string' && value.trim() !== '')) {
          rows.push(row);
        }
      });
      
      parser.on('end', () => {
        console.log('CSV Upload: CSV parsing completed. Found', rows.length, 'non-empty rows');
        console.log('CSV Upload: Sample row data:', rows.length > 0 ? rows[0] : 'No rows found');
        results.push(...rows);
        resolve();
      });
      
      parser.on('error', (err: Error) => {
        console.error('CSV Upload: CSV parsing error:', err);
        reject(err);
      });
      
      // Convert buffer to stream
      const { Readable } = require('stream');
      Readable.from(stream).pipe(parser);
    });
    
    console.log('CSV Upload: Starting validation and insertion of', results.length, 'rows...');
    
    // Use the new validation system
    const { validateBulkData } = require('../utils/csvValidator');
    const validationErrors = validateBulkData(results, dataTypeConfig);
    
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed. Please fix the errors and try again.',
        errors: validationErrors
      });
    }
    
    // Create upload record FIRST so we have the upload_id for products
    const uploadId = uuidv4();
    console.log('CSV Upload: Created upload ID:', uploadId);
    
    // Create file_uploads record FIRST before inserting data
    console.log('CSV Upload: Creating file_uploads record first...');
    await query(
      `INSERT INTO file_uploads (id, business_id, filename, file_type, status, uploaded_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uploadId, business_id, req.file.originalname, 'csv', 'processing']
    );
    console.log('CSV Upload: File uploads record created successfully');
    
    // Use the new data insertion system
    const { insertData } = require('../utils/dataInserter');
    const insertResult = await insertData(results, dataTypeConfig, business_id, uploadId);
    
    if (!insertResult.success) {
      console.log('CSV Upload: Data insertion failed:', insertResult.errors);
      return res.status(500).json({
        message: 'Failed to insert data',
        errors: insertResult.errors
      });
    }
    
    console.log('CSV Upload: Processing completed. Successfully inserted:', insertResult.insertedCount, 'rows');
    
    // Update upload record status
    const status = 'completed';
    console.log('CSV Upload: Updating upload record status to:', status);
    
    await query(
      `UPDATE file_uploads SET status = $1 WHERE id = $2`,
      [status, uploadId]
    );

    console.log('CSV Upload: Upload record status updated successfully');
    console.log('CSV Upload: Sending response');

    return res.status(201).json({ 
      message: `CSV uploaded and ${dataTypeConfig.name.toLowerCase()} imported successfully`,
      uploadId,
      filename: req.file.originalname,
      status: 'completed',
      insertedCount: insertResult.insertedCount
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Legacy products-only endpoint (for backward compatibility)
console.log('Registering route: /products-csv');
router.post('/products-csv', verifyToken, upload.single('file'), handleMulterError, async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  try {
    console.log('CSV Upload: Request received');
    console.log('CSV Upload: File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');
    console.log('CSV Upload: User:', req.user ? req.user.user_id : 'No user');
    
    if (!req.file || !req.file.buffer) {
      console.log('CSV Upload: No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (!req.user || !req.user.user_id) {
      console.log('CSV Upload: Unauthorized - no user');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const business_id = req.user.user_id;
    console.log('CSV Upload: Processing for business_id:', business_id);
    
    // Check for duplicate file upload
    const existingFile = await query(
      `SELECT id FROM file_uploads 
       WHERE business_id = $1 AND filename = $2`,
      [business_id, req.file.originalname]
    );
    
    if (existingFile.rows.length > 0) {
      console.log('CSV Upload: Duplicate file detected:', req.file.originalname);
      return res.status(409).json({ 
        error: 'File with this name has already been uploaded. Please use a different filename or delete the existing upload first.' 
      });
    }
    
    console.log('CSV Upload: No duplicate found, proceeding with upload');
    
    // Parse CSV from buffer
    const results: any[] = [];
    const validationErrors: any[] = [];
    const stream = req.file.buffer;
    
    console.log('CSV Upload: Starting CSV parsing...');
    
    await new Promise<void>((resolve, reject) => {
      const rows: any[] = [];
      let detectedHeaders: string[] = [];
      const parser = csvParser({ 
        headers: true, 
        skipLines: 0,
        strict: false,
        mapHeaders: ({ header }) => {
          const trimmed = header.trim();
          detectedHeaders.push(trimmed);
          return trimmed;
        }
      });
      parser.on('headers', (headers: string[]) => {
        console.log('CSV Upload: Detected headers:', headers);
      });
      parser.on('data', (row: any) => {
        // Trim all values
        Object.keys(row).forEach(key => {
          if (typeof row[key] === 'string') {
            row[key] = row[key].trim();
          }
        });
        console.log('CSV Upload: Raw row data:', row);
        // Only push non-empty rows (at least one value is non-empty/non-whitespace)
        if (Object.values(row).some((value) => typeof value === 'string' && value.trim() !== '')) {
          rows.push(row);
        }
      });
      parser.on('end', () => {
        console.log('CSV Upload: CSV parsing completed. Found', rows.length, 'non-empty rows');
        console.log('CSV Upload: Sample row data:', rows.length > 0 ? rows[0] : 'No rows found');
        results.push(...rows);
        resolve();
      });
      parser.on('error', (err: Error) => {
        console.error('CSV Upload: CSV parsing error:', err);
        reject(err);
      });
      // Convert buffer to stream
      const { Readable } = require('stream');
      Readable.from(stream).pipe(parser);
    });
    console.log('CSV Upload: Starting validation and insertion of', results.length, 'rows...');
    
    // Bulk validation phase (no DB writes yet)
    results.forEach((row, i) => {
      const rowNum = i + 1;
      const sku = row.sku || row._0;
      const product_name = row.product_name || row._1;
      const price = parseFloat(row.price) || parseFloat(row._3) || 0;
      const stock_quantity = parseInt(row.stock_quantity, 10) || parseInt(row._4, 10) || 0;
      // Validate required fields
      if (!sku) validationErrors.push({ row: rowNum, field: 'sku', error: 'SKU is required' });
      if (!product_name) validationErrors.push({ row: rowNum, field: 'product_name', error: 'Product name is required' });
      if (isNaN(price)) validationErrors.push({ row: rowNum, field: 'price', error: 'Price is required and must be a number' });
      if (isNaN(stock_quantity)) validationErrors.push({ row: rowNum, field: 'stock_quantity', error: 'Stock quantity is required and must be a number' });
    });
    if (validationErrors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed. Please fix the errors and try again.',
        errors: validationErrors
      });
    }
    
    // Create upload record FIRST so we have the upload_id for products
    const uploadId = uuidv4();
    console.log('CSV Upload: Created upload ID:', uploadId);
    
    // DEBUG: Log the exact uploadId being used
    console.log('CSV Upload: DEBUG - uploadId type:', typeof uploadId);
    console.log('CSV Upload: DEBUG - uploadId value:', uploadId);
    console.log('CSV Upload: DEBUG - uploadId length:', uploadId.length);
    
    // Create file_uploads record FIRST before inserting products
    console.log('CSV Upload: Creating file_uploads record first...');
    await query(
      `INSERT INTO file_uploads (id, business_id, filename, file_type, status, uploaded_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uploadId, business_id, req.file.originalname, 'csv', 'processing']
    );
    console.log('CSV Upload: File uploads record created successfully');
    
    // Validate and insert each row
    for (const [i, row] of results.entries()) {
      console.log(`CSV Upload: Processing row ${i + 1}, available keys:`, Object.keys(row));
      
      // Map CSV columns by name instead of numeric keys
      console.log(`CSV Upload: Raw row ${i + 1} values:`, row);
      
      // Try to map by actual column names first, then fall back to numeric keys
      const sku = row.sku || row._0;
      const product_name = row.product_name || row._1;
      const description = row.description || row._2 || '';
      const price = parseFloat(row.price) || parseFloat(row._3) || 0;
      const stock_quantity = parseInt(row.stock_quantity, 10) || parseInt(row._4, 10) || 0;
      const category = row.category || row._5 || null;
      
      console.log(`CSV Upload: Extracted values for row ${i + 1}:`, { sku, product_name, price, stock_quantity, category });
      
      // Skip header row (first row with column names)
      if (i === 0 && (sku === 'sku' || product_name === 'product_name')) {
        console.log(`CSV Upload: Skipping header row ${i + 1}`);
        continue;
      }
      
      // Basic validation
      if (!sku || !product_name || isNaN(price) || isNaN(stock_quantity)) {
        const errorMsg = `Missing or invalid required fields - SKU: ${sku}, Name: ${product_name}, Price: ${price}, Stock: ${stock_quantity}`;
        console.log(`CSV Upload: Row ${i + 1} validation failed:`, errorMsg);
        // errors.push({ row: i + 1, error: errorMsg }); // This line is removed as per new_code
        continue;
      }
      
      try {
        const id = uuidv4();
        console.log(`CSV Upload: DEBUG - About to insert product with upload_id:`, uploadId);
        console.log(`CSV Upload: DEBUG - Product values:`, { id, business_id, sku, product_name, description, price, stock_quantity, category, uploadId });
        
        await query(
          `INSERT INTO products (id, business_id, sku, product_name, description, price, stock_quantity, category, upload_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, business_id, sku, product_name, description, price, stock_quantity, category, uploadId]
        );
        
        // DEBUG: Verify the product was inserted with upload_id
        const verifyProduct = await query(
          `SELECT id, upload_id FROM products WHERE id = $1`,
          [id]
        );
        console.log(`CSV Upload: DEBUG - Product inserted successfully:`, verifyProduct.rows[0]);
        
        console.log(`CSV Upload: Row ${i + 1} inserted successfully with upload_id:`, uploadId);
      } catch (err: any) {
        console.error(`CSV Upload: Row ${i + 1} insertion failed:`, err.message);
        // errors.push({ row: i + 1, error: err.message }); // This line is removed as per new_code
      }
    }
    
    console.log('CSV Upload: Processing completed. Successfully inserted:', results.length - validationErrors.length, 'rows. Errors:', validationErrors.length);
    console.log('CSV Upload: Products processed successfully');
    
    // Update upload record status (even if there were some errors)
    const status = validationErrors.length > 0 ? 'partial' : 'completed';
    console.log('CSV Upload: Updating upload record status to:', status);
    
    await query(
      `UPDATE file_uploads SET status = $1 WHERE id = $2`,
      [status, uploadId]
    );

    console.log('CSV Upload: Upload record status updated successfully');
    console.log('CSV Upload: Sending response');

    if (validationErrors.length > 0) {
      return res.status(207).json({ 
        message: 'Some rows failed to import', 
        errors: validationErrors,
        uploadId,
        filename: req.file.originalname,
        status: 'partial'
      });
    }

    return res.status(201).json({ 
      message: 'CSV uploaded and products imported successfully',
      uploadId,
      filename: req.file.originalname,
      status: 'completed'
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get upload history for a business
console.log('Registering route: /history');
router.get('/history', verifyToken, async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('CSV History: Request received');
    console.log('CSV History: User:', req.user ? req.user.user_id : 'No user');
    
    if (!req.user || !req.user.user_id) {
      console.log('CSV History: Unauthorized - no user');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const business_id = req.user.user_id;
    console.log('CSV History: Fetching history for business_id:', business_id);
    
    const result = await query(
      `SELECT id, filename, file_type, status, uploaded_at 
       FROM file_uploads 
       WHERE business_id = $1 
       ORDER BY uploaded_at DESC`,
      [business_id]
    );
    
    console.log('CSV History: Found', result.rows.length, 'uploads');
    console.log('CSV History: Sending response:', result.rows);
    
    return res.status(200).json({ uploads: result.rows });
  } catch (err: any) {
    console.error('CSV History: Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Delete upload record
console.log('Registering route: /:id');
router.delete('/:id', verifyToken, async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('CSV Delete: Request received for ID:', req.params.id);
    console.log('CSV Delete: User:', req.user ? req.user.user_id : 'No user');
    
    if (!req.user || !req.user.user_id) {
      console.log('CSV Delete: Unauthorized - no user');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const business_id = req.user.user_id;
    const upload_id = req.params.id;
    
    console.log('CSV Delete: Deleting upload', upload_id, 'for business', business_id);
    
    // First, count how many products will be deleted
    const productCount = await query(
      `SELECT COUNT(*) as count FROM products WHERE upload_id = $1 AND business_id = $2`,
      [upload_id, business_id]
    );
    
    const productsToDelete = parseInt(productCount.rows[0].count);
    console.log('CSV Delete: Will delete', productsToDelete, 'products associated with this upload');
    
    // Delete the upload record (this will cascade delete associated products)
    const result = await query(
      `DELETE FROM file_uploads 
       WHERE id = $1 AND business_id = $2`,
      [upload_id, business_id]
    );
    
    if (result.rowCount === 0) {
      console.log('CSV Delete: Upload not found or not authorized');
      return res.status(404).json({ error: 'Upload not found' });
    }
    
    console.log('CSV Delete: Upload and', productsToDelete, 'associated products deleted successfully');
    return res.status(200).json({ 
      message: `Upload deleted successfully. ${productsToDelete} products were also removed from your catalog.`,
      productsDeleted: productsToDelete
    });
  } catch (err: any) {
    console.error('CSV Delete: Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Get available data types
console.log('Registering route: /data-types');
router.get('/data-types', verifyToken, async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('Data Types: Request received');
    
    if (!req.user || !req.user.user_id) {
      console.log('Data Types: Unauthorized - no user');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { getAvailableDataTypes } = require('../config/dataTypes');
    const dataTypes = getAvailableDataTypes();
    
    console.log('Data Types: Available types:', dataTypes);
    
    return res.status(200).json({ 
      dataTypes,
      message: 'Available data types for CSV upload'
    });
    
  } catch (err: any) {
    console.error('Data Types: Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Template generation endpoint
console.log('Registering route: /template');
router.get('/template', verifyToken, async (req: Request & { user?: any }, res: Response) => {
  try {
    console.log('Template Download: Request received');
    console.log('Template Download: User:', req.user ? req.user.user_id : 'No user');
    
    // Check feature flag
    if (!ENABLE_TEMPLATE_DOWNLOAD) {
      console.log('Template Download: Feature disabled');
      return res.status(404).json({ error: 'Template download feature is not available' });
    }
    
    if (!req.user || !req.user.user_id) {
      console.log('Template Download: Unauthorized - no user');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const business_id = req.user.user_id;
    const dataType = req.query.dataType as string || 'products';
    
    console.log('Template Download: Generating template for business_id:', business_id, 'dataType:', dataType);
    
    // Get data type configuration
    const { getDataTypeConfig } = require('../config/dataTypes');
    const dataTypeConfig = getDataTypeConfig(dataType);
    
    if (!dataTypeConfig) {
      console.log('Template Download: Invalid data type:', dataType);
      return res.status(400).json({ error: 'Invalid data type' });
    }
    
    // Helper function to properly escape CSV fields
    const escapeCsvField = (field: string): string => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };
    
    // Create clean CSV content with only data (no instructions in CSV)
    const csvContent = [
      // Headers
      dataTypeConfig.templateHeaders.map(escapeCsvField).join(','),
      // Example data
      dataTypeConfig.exampleData.map(escapeCsvField).join(','),
      // Empty rows for user to add their data
      '',
      '',
      '',
      '',
      ''
    ].join('\n');
    
    console.log('Template Download: Template generated successfully for', dataType);
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${dataType}-template.csv"`);
    res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8'));
    
    // Send the CSV content
    res.send(csvContent);
    
  } catch (err: any) {
    console.error('Template Download: Error:', err.message);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router; 