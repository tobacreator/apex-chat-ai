import express from 'express';
import { handleAiQuery } from '../controllers/aiController';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

console.log('Registering route: /query');
router.post('/query', verifyToken, handleAiQuery);

export default router; 