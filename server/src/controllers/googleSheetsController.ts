import { google, drive_v3, sheets_v4 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../db';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

// Rate limiting and retry utility for Google API calls
const makeGoogleApiCall = async (apiCall: () => Promise<any>, retries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      const isLastAttempt = attempt === retries - 1;
      
      // Handle rate limiting (429) and server errors (5xx)
      if ((error.code === 429 || (error.code >= 500 && error.code < 600)) && !isLastAttempt) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`Google API rate limited/error (attempt ${attempt + 1}/${retries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For other errors or last attempt, throw the error
      throw error;
    }
  }
};

// Add this function for OAuth callback (assuming you have a route for it)
export async function googleAuthCallback(req: Request, res: Response) {
  const code = req.query.code as string;
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    
    // --- VERBOSE LOGGING: Verify tokens received from Google ---
    console.log('Google Callback: VERIFYING TOKENS RECEIVED FROM GOOGLE:');
    console.log('Access Token:', tokens.access_token ? 'Present' : 'MISSING!');
    console.log('Refresh Token:', tokens.refresh_token ? 'Present' : 'MISSING!');
    console.log('Google Callback: Received tokens from Google:', tokens);

    if (!tokens.access_token) {
        console.error('Google Callback: Missing access_token in received tokens!');
        return res.status(400).redirect(`${process.env.GOOGLE_REDIRECT_FRONTEND_URL}/?tab=integrations&status=google-sheets-error&message=MissingAccessToken`);
    }

    // This ensures refresh_token is always handled, even if null (though it should be present for offline access)
    const refreshTokenToStore = tokens.refresh_token || null;
    if (!refreshTokenToStore) {
        console.warn('Google Callback: Refresh token was NOT provided by Google during OAuth. This may cause issues on token expiry.');
        // For debugging, you might want to force an error here if refresh token is critical.
    }

    oAuth2Client.setCredentials(tokens);
    console.log('Google Sheets OAuth tokens:', tokens);
    
    // Store tokens in DB for the authenticated business user
    try {
      console.log('Google Callback: Attempting to save tokens to DB for user ID:', (req.user as any)?.user_id);
      console.log('Google Callback: Full user object:', req.user);
      
      // Update the business record with Google Sheets tokens
      const updateResult = await query(
        'UPDATE businesses SET google_access_token = $1, google_refresh_token = $2 WHERE id = $3 RETURNING id',
        [tokens.access_token, refreshTokenToStore, (req.user as any).user_id] // Ensure (req.user as any).user_id is used
      );

      if (updateResult.rows.length === 0) {
        console.error('Google Callback: DB update failed for token storage - User ID not found:', (req.user as any).user_id);
        return res.status(500).redirect(`${process.env.GOOGLE_REDIRECT_FRONTEND_URL}/?tab=integrations&status=google-sheets-error&message=DBUpdateFailed`);
      }

      console.log('Google Callback: Successfully stored tokens in DB for user ID:', (req.user as any).user_id);
    } catch (dbErr) {
      console.error('googleAuthCallback: Error storing tokens in DB:', dbErr);
      return res.status(500).json({ error: 'Failed to store Google tokens.' });
    }
    // Redirect to frontend with success status
    res.redirect(`${process.env.GOOGLE_REDIRECT_FRONTEND_URL}/?tab=integrations&status=google-sheets-success`);
  } catch (error) {
    console.error('Google Sheets OAuth callback error:', error);
    // Redirect to frontend with error status
    res.redirect(`${process.env.GOOGLE_REDIRECT_FRONTEND_URL}/?tab=integrations&status=google-sheets-error`);
  }
}

// Helper to get and configure OAuth2 client for a user
export async function getOAuth2Client(userId: string): Promise<OAuth2Client> {
  console.log('getOAuth2Client: Retrieving tokens from DB for user ID:', userId);
  
  try {
    // Fetch tokens from DB by user ID
    let result = await query('SELECT id, google_access_token, google_refresh_token FROM businesses WHERE id = $1', [userId]);
    console.log('getOAuth2Client: DB query result rows:', result.rows.length);
    
    let dbTokens = result.rows[0];
    
    // If not found by ID, try to find by email (for debugging purposes)
    if (!dbTokens) {
      console.log('getOAuth2Client: User not found by ID, checking if this is a UUID format issue...');
      // This is just for debugging - we'll still throw an error if no tokens found
    }
    
    console.log('getOAuth2Client: DB Retrieval Result:', dbTokens ? 'Found tokens' : 'No tokens found');
    
    if (!dbTokens) {
      console.error('getOAuth2Client: CRITICAL - No user record found in DB for user ID:', userId);
      throw new Error('Google OAuth tokens missing in database. Please reconnect Google Sheets.');
    }
    
    if (!dbTokens.google_access_token || !dbTokens.google_refresh_token) {
      console.error('getOAuth2Client: CRITICAL - Google tokens incomplete in DB for user ID:', userId);
      console.error('getOAuth2Client: Access token present:', !!dbTokens.google_access_token);
      console.error('getOAuth2Client: Refresh token present:', !!dbTokens.google_refresh_token);
      throw new Error('Google OAuth tokens missing in database. Please reconnect Google Sheets.');
    }
    
    const accessToken = dbTokens.google_access_token;
    const refreshToken = dbTokens.google_refresh_token;
    console.log('getOAuth2Client: Tokens retrieved successfully. Setting OAuth2Client credentials.');

    // Verify environment variables are set
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      console.error('getOAuth2Client: CRITICAL - Missing Google OAuth environment variables!');
      console.error('getOAuth2Client: GOOGLE_CLIENT_ID:', !!process.env.GOOGLE_CLIENT_ID);
      console.error('getOAuth2Client: GOOGLE_CLIENT_SECRET:', !!process.env.GOOGLE_CLIENT_SECRET);
      console.error('getOAuth2Client: GOOGLE_REDIRECT_URI:', !!process.env.GOOGLE_REDIRECT_URI);
      throw new Error('Google OAuth configuration missing. Please check server configuration.');
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    console.log('getOAuth2Client: OAuth2Client created. Setting credentials...');
    oAuth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
    console.log('getOAuth2Client: Credentials set successfully.');

    // Listen for token refresh and update DB
    const currentUserId = userId;
    oAuth2Client.on('tokens', async (tokens) => {
      console.log('Google Token Refresh: New tokens received, attempting to update DB for user ID:', currentUserId);
      try {
        const updateRefreshResult = await query(
          'UPDATE businesses SET google_access_token = $1, google_refresh_token = $2 WHERE id = $3 RETURNING id',
          [tokens.access_token, tokens.refresh_token, currentUserId]
        );
        console.log('Google Token Refresh: DB update result:', updateRefreshResult.rows[0]);
        if (updateRefreshResult.rows.length === 0) {
          console.error('Google Token Refresh: DB update failed for token refresh, user not found:', currentUserId);
        } else {
          console.log('getOAuth2Client: Tokens refreshed and updated to DB successfully.');
        }
      } catch (refreshError) {
        console.error('Google Token Refresh: Error updating tokens in DB:', refreshError);
      }
    });

    console.log('getOAuth2Client: OAuth2Client configured successfully for user ID:', userId);
    return oAuth2Client;
  } catch (error: any) {
    console.error('getOAuth2Client: Error creating OAuth2Client:', error.message);
    throw error; // Re-throw to be handled by calling function
  }
}

// Test endpoint to check Google OAuth configuration
export async function checkGoogleConfig(req: Request, res: Response) {
  try {
    const config = {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
      hasFrontendUrl: !!process.env.GOOGLE_REDIRECT_FRONTEND_URL,
      clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
      clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
      redirectUri: process.env.GOOGLE_REDIRECT_URI,
      frontendUrl: process.env.GOOGLE_REDIRECT_FRONTEND_URL
    };
    
    return res.json({
      status: 'config_check',
      config,
      allRequired: config.hasClientId && config.hasClientSecret && config.hasRedirectUri
    });
  } catch (error: any) {
    console.error('checkGoogleConfig: Error:', error);
    return res.status(500).json({ error: 'Failed to check Google config.' });
  }
}

// Test endpoint to check user status
export async function checkUserStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: user_id missing from token.' });
    }
    
    console.log('checkUserStatus: Checking user ID:', userId);
    console.log('checkUserStatus: Full user object from JWT:', req.user);
    
    // Check if user exists in database
    const result = await query('SELECT id, name, google_access_token, google_refresh_token FROM businesses WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      // Try to find user by email as fallback
      console.log('checkUserStatus: User not found by ID, trying to find by email...');
      const emailResult = await query('SELECT id, name, google_access_token, google_refresh_token FROM businesses WHERE name = $1', [req.user?.email]);
      
      if (emailResult.rows.length > 0) {
        const user = emailResult.rows[0];
        const hasGoogleTokens = !!(user.google_access_token && user.google_refresh_token);
        
        return res.json({
          status: 'user_found_by_email',
          userId: user.id,
          businessName: user.name,
          hasGoogleTokens,
          googleAccessTokenPresent: !!user.google_access_token,
          googleRefreshTokenPresent: !!user.google_refresh_token,
          note: 'User found by email instead of ID'
        });
      }
      
      return res.json({ 
        status: 'user_not_found',
        message: 'User not found in database',
        userId,
        searchedEmail: req.user?.email
      });
    }
    
    const user = result.rows[0];
    const hasGoogleTokens = !!(user.google_access_token && user.google_refresh_token);
    
    return res.json({
      status: 'user_found',
      userId,
      businessName: user.name,
      hasGoogleTokens,
      googleAccessTokenPresent: !!user.google_access_token,
      googleRefreshTokenPresent: !!user.google_refresh_token
    });
  } catch (error: any) {
    console.error('checkUserStatus: Error:', error);
    return res.status(500).json({ error: 'Failed to check user status.' });
  }
}

// List Google Sheets spreadsheets for the user
export async function listSpreadsheets(req: Request, res: Response) {
  try {
    console.log('listSpreadsheets: Endpoint hit. User ID:', (req.user as any)?.user_id);
    console.log('listSpreadsheets: Request headers:', req.headers);
    console.log('listSpreadsheets: Request user object:', req.user);
    
    const userId = req.user?.user_id;
    if (!userId) {
      console.error('listSpreadsheets: CRITICAL - User ID missing from request!');
      console.error('listSpreadsheets: req.user object:', req.user);
      return res.status(401).json({ error: 'Unauthorized: user_id missing from token.' });
    }
    
    console.log('listSpreadsheets: User ID extracted:', userId);
    console.log('listSpreadsheets: Attempting to get OAuth2Client...');
    
    const oAuth2Client = await getOAuth2Client(userId);
    console.log('listSpreadsheets: OAuth2Client obtained successfully. Making Google Drive API call...');
    
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    console.log('listSpreadsheets: Google Drive API client created. Calling files.list...');
    
    const response = await makeGoogleApiCall(() => 
      drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: 'files(id, name)',
      })
    );
    
    console.log('listSpreadsheets: Google Drive API response received:', response.data);
    const spreadsheets = response.data.files || [];
    console.log('listSpreadsheets: Returning', spreadsheets.length, 'spreadsheets');
    
    res.json({ spreadsheets });
  } catch (error: any) {
    console.error('listSpreadsheets: CRITICAL ERROR - Google API Error or Token Issue:');
    console.error('  Error type:', error.constructor.name);
    console.error('  Message:', error.message);
    console.error('  Status:', error.code || error.response?.status);
    console.error('  Details:', error.errors || error.response?.data);
    console.error('  Stack:', error.stack);
    
    // Handle specific error cases
    if (error.code === 401 || (error.message && error.message.includes('invalid_grant'))) {
      console.error('listSpreadsheets: Authentication error - tokens expired or invalid');
      return res.status(401).json({ message: 'Google authentication expired or invalid. Please reconnect Google Sheets.' });
    }
    
    if (error.message && error.message.includes('Google OAuth tokens not found')) {
      console.error('listSpreadsheets: OAuth tokens not found in database');
      return res.status(401).json({ error: 'Google account not connected.' });
    }
    
    if (error.message && error.message.includes('Google OAuth tokens missing')) {
      console.error('listSpreadsheets: OAuth tokens missing from database');
      return res.status(401).json({ error: 'Google account not connected. Please reconnect Google Sheets.' });
    }
    
    console.error('listSpreadsheets: Unhandled error, returning 500');
    res.status(500).json({ error: 'Failed to list Google Sheets.', details: error.message });
  }
}

// Helper function to detect and map headers with fallback for different sheet types
function detectHeaders(headers: string[]): { headerMap: Record<string, number>; detectedHeaders: string[]; missingRequired: string[]; sheetType: string } {
  console.log('detectHeaders: Input headers:', headers);
  
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
  console.log('detectHeaders: Normalized headers:', normalizedHeaders);
  
  // Try product catalog format first
  const productRequiredFields = ['sku', 'product_name', 'price', 'stock_quantity'];
  const productOptionalFields = ['description', 'category'];
  const productAllFields = [...productRequiredFields, ...productOptionalFields];
  
  // Common variations for each field - expanded to handle more cases
  const fieldVariations: Record<string, string[]> = {
    sku: ['sku', 'product sku', 'item sku', 'product code', 'item code', 'code', 'product id', 'item id', 'id'],
    product_name: ['product name', 'product_name', 'name', 'product', 'item name', 'item', 'product title', 'title'],
    description: ['description', 'desc', 'product description', 'details', 'notes', 'product details', 'item description'],
    price: ['price', 'cost', 'unit price', 'selling price', 'retail price', 'amount', 'value', 'product price'],
    stock_quantity: ['stock quantity', 'stock_quantity', 'quantity', 'stock', 'inventory', 'available', 'qty', 'stock qty', 'available quantity'],
    category: ['category', 'cat', 'product category', 'type', 'group', 'product type', 'item category']
  };
  
  const headerMap: Record<string, number> = {};
  const detectedHeaders: string[] = [];
  const missingRequired: string[] = [];
  
  console.log('detectHeaders: Starting field mapping...');
  
  // Map each required and optional field
  for (const field of productAllFields) {
    let found = false;
    const variations = fieldVariations[field] || [field];
    
    console.log(`detectHeaders: Looking for field "${field}" with variations:`, variations);
    
    for (const variation of variations) {
      const index = normalizedHeaders.findIndex(h => {
        // More flexible matching - check if header contains the variation or vice versa
        const headerWords = h.split(/[\s_-]+/);
        const variationWords = variation.split(/[\s_-]+/);
        
        // Check for exact match or partial matches
        const isMatch = h === variation || 
               h.includes(variation) || 
               variation.includes(h) ||
               headerWords.some(hw => variationWords.some(vw => hw === vw || hw.includes(vw) || vw.includes(hw)));
        
        if (isMatch) {
          console.log(`detectHeaders: Found match for "${field}" - header "${h}" matches variation "${variation}"`);
        }
        
        return isMatch;
      });
      
      if (index !== -1) {
        headerMap[field] = index;
        detectedHeaders.push(headers[index]); // Use original header name
        found = true;
        console.log(`detectHeaders: Mapped "${field}" to column "${headers[index]}" at index ${index}`);
        break;
      }
    }
    
    if (!found && productRequiredFields.includes(field)) {
      missingRequired.push(field);
      console.log(`detectHeaders: Missing required field "${field}"`);
    }
  }
  
  // Determine sheet type based on detected headers
  let sheetType = 'unknown';
  if (detectedHeaders.length >= 3) {
    // Check if this looks like a product catalog
    const hasProductFields = detectedHeaders.some(h => 
      h.toLowerCase().includes('product') || 
      h.toLowerCase().includes('sku') || 
      h.toLowerCase().includes('price')
    );
    
    if (hasProductFields) {
      sheetType = 'product_catalog';
    } else {
      // Check if this looks like sales data
      const hasSalesFields = detectedHeaders.some(h => 
        h.toLowerCase().includes('customer') || 
        h.toLowerCase().includes('total') || 
        h.toLowerCase().includes('quantity')
      );
      
      if (hasSalesFields) {
        sheetType = 'sales_data';
        console.log('detectHeaders: Detected sales data format - attempting to map to product fields');
        
        // Try to map sales data to product fields
        const salesMapping = {
          'id': 'sku',
          'product': 'product_name', 
          'price': 'price',
          'quantity': 'stock_quantity'
        };
        
        for (const [salesField, productField] of Object.entries(salesMapping)) {
          const index = normalizedHeaders.findIndex(h => h.includes(salesField));
          if (index !== -1 && !headerMap[productField]) {
            headerMap[productField] = index;
            detectedHeaders.push(headers[index]);
            console.log(`detectHeaders: Sales mapping - mapped "${salesField}" to "${productField}"`);
          }
        }
      }
    }
  }
  
  console.log('detectHeaders: Final mapping:', { headerMap, detectedHeaders, missingRequired, sheetType });
  return { headerMap, detectedHeaders, missingRequired, sheetType };
}

// Get sheet preview with header detection
export async function getSheetPreview(req: Request, res: Response) {
  try {
    console.log('getSheetPreview: Request body:', req.body);
    console.log('getSheetPreview: User ID:', req.user?.user_id);
    
    const { spreadsheetId } = req.body;
    const userId = req.user?.user_id;

    if (!spreadsheetId || !userId) {
      return res.status(400).json({ error: 'Spreadsheet ID and user ID are required' });
    }

    const oauth2Client = await getOAuth2Client(userId);
    if (!oauth2Client) {
      return res.status(401).json({ error: 'Google OAuth not configured' });
    }

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // First, get the sheet names to find the correct sheet
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    const sheetNames = spreadsheet.data.sheets?.map((sheet: any) => sheet.properties?.title).filter(Boolean) || [];
    console.log('getSheetPreview: Available sheet names:', sheetNames);

    if (sheetNames.length === 0) {
      return res.status(404).json({ error: 'No sheets found in spreadsheet' });
    }

    // Use the first sheet name instead of hardcoded "Sheet1"
    const firstSheetName = sheetNames[0];
    const range = `${firstSheetName}!A1:Z100`;

    console.log('getSheetPreview: Reading range:', range);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });

    const rows = response.data.values || [];
    console.log('getSheetPreview: Retrieved rows:', rows.length);

    // Return first 10 rows for preview
    const previewRows = rows.slice(0, 10);
    
    // Get headers and detect column mapping
    const headers = rows[0] || [];
    const { headerMap, detectedHeaders, missingRequired, sheetType } = detectHeaders(headers);
    
    console.log('getSheetPreview: Headers detected:', { headers, detectedHeaders, missingRequired, sheetType });
    
    return res.json({
      preview: previewRows,
      totalRows: rows.length,
      sheetNames: sheetNames,
      currentSheet: firstSheetName,
      headers: headers,
      detectedHeaders: detectedHeaders,
      headerMap: headerMap,
      missingRequired: missingRequired,
      sheetType: sheetType
    });

  } catch (err: any) {
    console.error('getSheetPreview: Request body:', req.body);
    console.error('getSheetPreview: User ID:', req.user?.user_id);
    
    if (err.code === 403) {
      return res.status(403).json({ 
        error: 'Access denied to Google Sheets. Please check permissions.',
        details: err.message 
      });
    }
    
    if (err.code === 404) {
      return res.status(404).json({ 
        error: 'Sheet not found. Please check the spreadsheet ID.',
        details: err.message 
      });
    }

    console.error('Error reading sheet preview:', err);
    return res.status(500).json({ 
      error: 'Failed to read sheet preview',
      details: err.message 
    });
  }
}

// Download template
export async function downloadTemplate(req: Request, res: Response) {
  try {
    const templateData = [
      ['SKU', 'Product Name', 'Description', 'Price', 'Stock Quantity', 'Category'],
      ['PROD001', 'Sample Product 1', 'This is a sample product description', '29.99', '100', 'Electronics'],
      ['PROD002', 'Sample Product 2', 'Another sample product', '49.99', '50', 'Accessories'],
      ['PROD003', 'Sample Product 3', 'Third sample product', '19.99', '200', 'Home & Garden']
    ];
    
    // Convert to CSV format
    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"');
    res.send(csvContent);
  } catch (err: any) {
    console.error('Error downloading template:', err);
    res.status(500).json({ error: 'Failed to download template.' });
  }
}

// Read data from a specific Google Sheet and sync to DB with flexible mapping
export async function readSheetData(req: Request, res: Response) {
  console.log('readSheetData: Endpoint hit');
  try {
    console.log('readSheetData: Request body:', req.body);
    console.log('readSheetData: User ID:', req.user?.user_id);
    
    const { spreadsheetId } = req.body;
    const userId = req.user?.user_id;

    if (!spreadsheetId || !userId) {
      return res.status(400).json({ error: 'Spreadsheet ID and user ID are required' });
    }

    const oauth2Client = await getOAuth2Client(userId);
    if (!oauth2Client) {
      return res.status(401).json({ error: 'Google OAuth not configured' });
    }

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // First, get the sheet names to find the correct sheet
    const spreadsheet = await makeGoogleApiCall(() => 
      sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      })
    );

    const sheetNames = spreadsheet.data.sheets?.map((sheet: any) => sheet.properties?.title).filter(Boolean) || [];
    console.log('readSheetData: Available sheet names:', sheetNames);

    if (sheetNames.length === 0) {
      return res.status(404).json({ error: 'No sheets found in spreadsheet' });
    }

    // Use the first sheet name instead of hardcoded "Sheet1"
    const firstSheetName = sheetNames[0];
    const range = `${firstSheetName}!A1:Z1000`;

    console.log('readSheetData: Reading range:', range);

    const response = await makeGoogleApiCall(() => 
      sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
      })
    );

    const rows = response.data.values || [];
    console.log('readSheetData: Retrieved rows:', rows.length);

    if (rows.length === 0) {
      return res.json({ message: 'No data found in sheet', imported: 0 });
    }

    // Get headers from first row
    const headers = rows[0] || [];
    console.log('readSheetData: Headers found:', headers);

    // Use the detectHeaders function to map columns
    const { headerMap, detectedHeaders, missingRequired, sheetType } = detectHeaders(headers);
    console.log('readSheetData: Header mapping result:', { headerMap, detectedHeaders, missingRequired, sheetType });

    // Check for missing required fields
    if (missingRequired.length > 0) {
      return res.status(400).json({ 
        error: `Missing required columns: ${missingRequired.join(', ')}. Please ensure your sheet has columns for: ${missingRequired.join(', ')}` 
      });
    }

    // Skip header row and process data
    const dataRows = rows.slice(1);
    let importedCount = 0;
    let errors = [];

    // Use database transaction for data import
    const client = await query('BEGIN');
    try {
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        try {
          // Use the header mapping to extract values
          const sku = row[headerMap.sku] || '';
          const productName = row[headerMap.product_name] || '';
          const description = row[headerMap.description] || '';
          const priceRaw = row[headerMap.price] || '0';
          const stockQuantityRaw = row[headerMap.stock_quantity] || '0';
          const category = row[headerMap.category] || '';

          // Validate required fields
          if (!productName.trim()) {
            console.log(`readSheetData: Skipping row ${i + 2} - missing product name`);
            continue;
          }

          // Parse price - handle commas and currency symbols
          const cleanPrice = priceRaw.toString().replace(/[^\d.,]/g, '').replace(',', '');
          const numericPrice = parseFloat(cleanPrice) || 0;

          // Parse stock quantity
          const numericStock = parseInt(stockQuantityRaw.toString()) || 0;

          console.log(`readSheetData: Processing row ${i + 2}:`, {
            sku: sku.trim(),
            productName: productName.trim(),
            price: numericPrice,
            stock: numericStock,
            category: category.trim()
          });

          const insertQuery = `
            INSERT INTO products (business_id, sku, product_name, description, price, stock_quantity, category, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (business_id, sku) 
            DO UPDATE SET 
              product_name = EXCLUDED.product_name,
              description = EXCLUDED.description,
              price = EXCLUDED.price,
              stock_quantity = EXCLUDED.stock_quantity,
              category = EXCLUDED.category,
              updated_at = NOW()
          `;

          await query(insertQuery, [
            userId,
            sku.trim(),
          productName.trim(),
          description.trim(),
          numericPrice,
          numericStock,
          category.trim()
        ]);

        importedCount++;
        console.log(`readSheetData: Successfully imported row ${i + 2}: ${productName}`);

      } catch (rowError: any) {
        console.error(`readSheetData: Error importing row ${i + 2}:`, rowError);
        errors.push({
          row: i + 2,
          error: rowError.message,
          data: row
        });
      }
    }

    // Commit transaction if successful
    await query('COMMIT');
    console.log(`readSheetData: Transaction committed successfully. Imported ${importedCount} products.`);

    return res.json({
      message: `Successfully imported ${importedCount} products`,
      imported: importedCount,
      totalRows: dataRows.length,
      errors: errors,
      sheetNames: sheetNames,
      currentSheet: firstSheetName,
      detectedHeaders: detectedHeaders,
      headerMap: headerMap,
      sheetType: sheetType
    });

  } catch (transactionError: any) {
    // Rollback transaction on error
    try {
      await query('ROLLBACK');
      console.log('readSheetData: Transaction rolled back due to error');
    } catch (rollbackError) {
      console.error('readSheetData: Failed to rollback transaction:', rollbackError);
    }
    
    console.error('readSheetData: Transaction error:', transactionError);
    return res.status(500).json({ 
      error: 'Failed to import data. Transaction rolled back.',
      details: transactionError.message 
    });
  }

  } catch (err: any) {
    console.error('readSheetData: Request body:', req.body);
    console.error('readSheetData: User ID:', req.user?.user_id);
    
    if (err.code === 403) {
      return res.status(403).json({ 
        error: 'Access denied to Google Sheets. Please check permissions.',
        details: err.message 
      });
    }
    
    if (err.code === 404) {
      return res.status(404).json({ 
        error: 'Sheet not found. Please check the spreadsheet ID.',
        details: err.message 
      });
    }

    console.error('Error reading sheet data:', err);
    return res.status(500).json({ 
      error: 'Failed to read sheet data',
      details: err.message 
    });
  }
} 

// Test endpoint to check database connectivity and table existence
export async function checkDatabase(req: Request, res: Response) {
  try {
    console.log('checkDatabase: Testing database connectivity...');
    const connectivityResult = await query('SELECT NOW() as current_time');
    console.log('checkDatabase: Database connectivity test passed');
    
    const tableCheckResult = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
      ) as table_exists
    `);
    const tableExists = tableCheckResult.rows[0]?.table_exists;
    console.log('checkDatabase: Products table exists:', tableExists);
    
    let tableStructure = null;
    if (tableExists) {
      const structureResult = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
        ORDER BY ordinal_position
      `);
      tableStructure = structureResult.rows;
      console.log('checkDatabase: Table structure:', tableStructure);
    }
    
    let insertTest = false;
    if (tableExists) {
      try {
        // Get a valid business_id from the businesses table
        const businessResult = await query('SELECT id FROM businesses LIMIT 1');
        const validBusinessId = businessResult.rows[0]?.id;
        
        if (validBusinessId) {
          await query('BEGIN');
          await query(`
            INSERT INTO products (business_id, sku, product_name, description, price, stock_quantity, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [validBusinessId, 'TEST_SKU', 'Test Product', 'Test Description', 0, 0, 'Test Category']);
          await query('ROLLBACK');
          insertTest = true;
          console.log('checkDatabase: Insert test passed');
        } else {
          console.log('checkDatabase: No businesses found for insert test');
          insertTest = false;
        }
      } catch (insertError: any) {
        console.error('checkDatabase: Insert test failed:', insertError);
        await query('ROLLBACK');
        insertTest = false;
      }
    }
    
    return res.json({
      status: 'database_check',
      connectivity: true,
      productsTableExists: tableExists,
      tableStructure,
      insertTest,
      currentTime: connectivityResult.rows[0]?.current_time
    });
  } catch (error: any) {
    console.error('checkDatabase: Error:', error);
    return res.status(500).json({ 
      error: 'Database check failed.',
      details: error.message 
    });
  }
} 