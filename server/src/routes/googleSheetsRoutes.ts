import express, { Request, Response } from 'express';
import { google } from 'googleapis';
import { verifyToken } from '../middleware/authMiddleware';
import { listSpreadsheets, readSheetData, googleAuthCallback, getSheetPreview, downloadTemplate, checkUserStatus, checkGoogleConfig, checkDatabase } from '../controllers/googleSheetsController';
import { clearGoogleTokensForUser, checkUserTokenStatus } from '../utils/clearGoogleTokens';
import jwt from 'jsonwebtoken';

type AuthUser = { user_id: string; email?: string; [key: string]: any };

const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly', // <-- CRUCIAL NEW SCOPE
];

function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

// GET /auth - Initiate OAuth flow
console.log('Registering route: /auth');
router.get('/auth', (req: Request, res: Response) => {
  try {
    const oauth2Client = getOAuth2Client();
    const userToken = req.query.token as string;
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
      state: userToken || '', // Pass the JWT in the state param
    });
    return res.redirect(authUrl);
  } catch (error: any) {
    console.error('Google Sheets OAuth /auth error:', error);
    return res.status(500).json({ error: 'Failed to initiate Google Sheets OAuth flow.' });
  }
});

// GET /callback - Handle OAuth callback
console.log('Registering route: /callback');
router.get('/callback', async (req: Request, res: Response, next) => {
  // Extract JWT from state param and verify it
  const token = req.query.state as string;
  if (!token) {
    console.error('Google Sheets OAuth callback: No JWT token in state param.');
    return res.status(401).json({ error: 'Missing authentication token.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    if (typeof decoded === 'object' && decoded !== null) {
      const user_id = (decoded as any).user_id || (decoded as any).id || (decoded as any).sub;
      const email = String((decoded as any).email || "");
      const userObj: AuthUser = { user_id, email };
      // @ts-expect-error: We are explicitly ensuring email is a string
      req.user = userObj;
      // @ts-ignore
      return googleAuthCallback(req, res, next);
    } else {
      console.error('Google Sheets OAuth callback: Decoded JWT is not an object.', decoded);
      return res.status(401).json({ error: 'Invalid authentication token.' });
    }
  } catch (err) {
    console.error('Google Sheets OAuth callback: Invalid JWT token in state param.', err);
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
});

// NEW: Data Management routes
console.log('Registering route: /check-google-config');
router.get('/check-google-config', checkGoogleConfig);
console.log('Registering route: /check-user-status');
router.get('/check-user-status', verifyToken, checkUserStatus);
console.log('Registering route: /check-database');
router.get('/check-database', checkDatabase);

// Debug/Utility routes for token management
console.log('Registering route: /clear-tokens');
router.post('/clear-tokens', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }
    
    await clearGoogleTokensForUser(userId);
    res.json({ message: 'Google tokens cleared successfully. User will need to re-authenticate.' });
  } catch (error: any) {
    console.error('Error clearing tokens:', error);
    res.status(500).json({ error: 'Failed to clear tokens' });
  }
});

console.log('Registering route: /token-status');
router.get('/token-status', verifyToken, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }
    
    const status = await checkUserTokenStatus(userId);
    res.json(status);
  } catch (error: any) {
    console.error('Error checking token status:', error);
    res.status(500).json({ error: 'Failed to check token status' });
  }
});
console.log('Registering route: /list-spreadsheets');
router.get('/list-spreadsheets', verifyToken, listSpreadsheets);
console.log('Registering route: /preview-sheet');
router.post('/preview-sheet', verifyToken, getSheetPreview);
console.log('Registering route: /read-sheet-data');
router.post('/read-sheet-data', verifyToken, readSheetData);
console.log('Registering route: /download-template');
router.get('/download-template', verifyToken, downloadTemplate);

export default router; 