import { Router } from 'express';
import { getOrders, getOrderById, getOrderByOrderNumber } from '../controllers/orderController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

console.log('Registering route: /');
router.get('/', verifyToken, getOrders);
console.log('Registering route: /:id');
router.get('/:id', verifyToken, getOrderById);
console.log('Registering route: /by-number');
router.get('/by-number', verifyToken, getOrderByOrderNumber);

export default router; 