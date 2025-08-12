import { query } from '../db';

/**
 * Utility function to clear Google OAuth tokens for a specific user
 * This forces the user to re-authenticate and get fresh tokens
 */
export async function clearGoogleTokensForUser(userId: string): Promise<void> {
  try {
    console.log(`Clearing Google tokens for user ID: ${userId}`);
    
    const result = await query(
      'UPDATE businesses SET google_access_token = NULL, google_refresh_token = NULL WHERE id = $1 RETURNING id',
      [userId]
    );
    
    if (result.rows.length === 0) {
      console.log(`No user found with ID: ${userId}`);
    } else {
      console.log(`Successfully cleared Google tokens for user ID: ${userId}`);
    }
  } catch (error) {
    console.error('Error clearing Google tokens:', error);
    throw error;
  }
}

/**
 * Utility function to clear Google OAuth tokens for all users
 * Use with caution - this will force all users to re-authenticate
 */
export async function clearAllGoogleTokens(): Promise<void> {
  try {
    console.log('Clearing Google tokens for all users...');
    
    const result = await query(
      'UPDATE businesses SET google_access_token = NULL, google_refresh_token = NULL RETURNING id'
    );
    
    console.log(`Successfully cleared Google tokens for ${result.rows.length} users`);
  } catch (error) {
    console.error('Error clearing all Google tokens:', error);
    throw error;
  }
}

/**
 * Utility function to check token status for a specific user
 */
export async function checkUserTokenStatus(userId: string): Promise<{
  hasAccessToken: boolean;
  hasRefreshToken: boolean;
  userId: string;
}> {
  try {
    const result = await query(
      'SELECT google_access_token, google_refresh_token FROM businesses WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return {
        hasAccessToken: false,
        hasRefreshToken: false,
        userId
      };
    }
    
    const user = result.rows[0];
    return {
      hasAccessToken: !!user.google_access_token,
      hasRefreshToken: !!user.google_refresh_token,
      userId
    };
  } catch (error) {
    console.error('Error checking user token status:', error);
    throw error;
  }
} 