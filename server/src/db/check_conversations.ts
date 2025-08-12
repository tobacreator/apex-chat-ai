import { getPool } from './index';

(async () => {
  try {
    const pool = getPool();
    
    // Check conversations table (the one actually being used)
    console.log('=== CHECKING CONVERSATIONS TABLE ===');
    const convRes = await pool.query('SELECT * FROM conversations ORDER BY created_at DESC LIMIT 5');
    console.log('Conversations:', convRes.rows);
    
    // Also check conversation_states table for comparison
    console.log('\n=== CHECKING CONVERSATION_STATES TABLE ===');
    const stateRes = await pool.query('SELECT * FROM conversation_states ORDER BY created_at DESC LIMIT 5');
    console.log('Conversation States:', stateRes.rows);
    
    // Check businesses table
    console.log('\n=== CHECKING BUSINESSES TABLE ===');
    const bizRes = await pool.query('SELECT * FROM businesses ORDER BY created_at DESC LIMIT 5');
    console.log('Businesses:', bizRes.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
})(); 