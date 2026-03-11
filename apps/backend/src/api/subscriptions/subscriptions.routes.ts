import { Router } from 'express';
import { getMySubscription, startTrial, redeemCode } from './subscriptions.controller.js';
import { verifyToken } from '../../middleware/auth.js';

const router = Router();

// Aplicar el middleware a todas las rutas de este router
// Esto asegura que req.userId exista en los controladores
router.use(verifyToken);

router.get('/me', getMySubscription);
router.post('/trial', startTrial);
router.post('/redeem', redeemCode);

export default router;