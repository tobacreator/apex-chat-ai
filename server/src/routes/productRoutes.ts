import { Router } from 'express';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct } from '../controllers/productController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

console.log('Registering route: /');
router.post('/', verifyToken, createProduct);
console.log('Registering route: /');
router.get('/', verifyToken, getProducts);
console.log('Registering route: /:id');
router.get('/:id', verifyToken, getProductById);
console.log('Registering route: /:id');
router.put('/:id', verifyToken, updateProduct);
console.log('Registering route: /:id');
router.delete('/:id', verifyToken, deleteProduct);

export default router; 