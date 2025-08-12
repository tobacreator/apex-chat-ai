import { Router } from 'express';
import * as businessController from '../controllers/businessController';
import { verifyToken } from '../middleware/authMiddleware';

const router = Router();

console.log('Registering route: /signup');
router.post('/signup', businessController.signupBusiness);
console.log('Registering route: /login');
router.post('/login', businessController.loginBusiness);
console.log('Registering route: /reset-password');
router.post('/reset-password', businessController.resetPassword);
console.log('Registering route: /profile');
router.get('/profile', verifyToken, businessController.getBusinessProfile);
console.log('Registering route: /profile');
router.put('/profile', verifyToken, businessController.updateBusinessProfile);

export default router;
