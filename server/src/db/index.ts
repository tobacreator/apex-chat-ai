import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

let pool: Pool | null = null;

// Export the pool for transaction support
export const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call connectDB() first.');
  }
  return pool;
};

const connectDB = async () => {
  console.log('connectDB: Function called.');
  
  console.log('connectDB: Checking if pool already initialized.');
  if (pool) {
    console.log('connectDB: Pool already exists, returning existing pool.');
    return pool;
  }
  
  console.log('connectDB: Pool not initialized. Proceeding to create new pool.');
  
  try {
    console.log('connectDB: Using DB_USER:', process.env.DB_USER, 'DB_HOST:', process.env.DB_HOST, 'DB_PORT:', process.env.DB_PORT);
    
    pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: parseInt(process.env.DB_PORT || '5432', 10),
    } as any);

    // Log a message when the connection pool is connected
    pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });

    // Log errors from the pool
    pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1); // Exit process if critical error
    });

    console.log('connectDB: Pool created successfully.');
    return pool;
  } catch (error: any) {
    console.error('--- CRITICAL DATABASE CONNECTION ERROR ---');
    console.error('connectDB: Failed to establish PostgreSQL database connection!');
    console.error('Error message:', error.message);
    console.error('Error code:', (error as any).code); // Add code for network errors like 'ECONNREFUSED'
    console.error('Error syscall:', (error as any).syscall); // Add syscall for network errors
    console.error('Error hostname:', (error as any).hostname); // Add hostname for DNS/network errors
    console.error('Error stack:', error.stack);
    console.error('--- END CRITICAL DATABASE CONNECTION ERROR ---');
    throw error;
  }
};

/**
 * Executes a SQL query against the database pool.
 * @param text The SQL query string.
 * @param params Optional parameters for the query.
 * @returns A Promise that resolves with the query result.
 */
export const query = async (text: string, params?: any[]) => {
  if (!pool) {
    await connectDB();
  }
  return pool!.query(text, params);
};

// Initialize the database connection
connectDB().catch((error) => {
  console.error('Failed to initialize database connection:', error);
  process.exit(1);
});

// Add logic to close the pool when the application is shutting down
process.on('SIGINT', async () => {
  if (pool) {
    await pool.end();
    console.log('PostgreSQL connection pool closed.');
  }
  process.exit(0);
}); 