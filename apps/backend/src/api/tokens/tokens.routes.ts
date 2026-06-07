import { Router } from 'express';
import { getBalance, getHistory } from './tokens.controller.js';
import { verifyToken } from '../../middleware/auth.js';

const router = Router();

// Todas las rutas requieren autenticación (req.userId)
router.use(verifyToken);

router.get('/balance', getBalance);
router.get('/history', getHistory);

export default router;
