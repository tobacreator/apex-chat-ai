import { Router } from 'express';
import { createFAQ, getFAQs, getFAQById, updateFAQ, deleteFAQ } from '../controllers/faqController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

console.log('Registering route: /');
router.post('/', verifyToken, createFAQ);
console.log('Registering route: /');
router.get('/', verifyToken, getFAQs);
console.log('Registering route: /:id');
router.get('/:id', verifyToken, getFAQById);
console.log('Registering route: /:id');
router.put('/:id', verifyToken, updateFAQ);
console.log('Registering route: /:id');
router.delete('/:id', verifyToken, deleteFAQ);

export default router; 