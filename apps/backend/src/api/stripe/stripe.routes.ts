import { Router } from 'express';
import express from 'express';
import { 
    createCheckoutSession, 
    createPortalSession, 
    cancelSubscription,
    reactivateSubscription,
    handleWebhook 
} from './stripe.controller.js';
import { verifyToken } from '../../middleware/auth.js';

const router = Router();

// Rutas protegidas (requieren autenticación)
router.post('/create-checkout-session', verifyToken, createCheckoutSession);
router.post('/create-portal-session', verifyToken, createPortalSession);
router.post('/cancel', verifyToken, cancelSubscription);
router.post('/reactivate', verifyToken, reactivateSubscription);

// Webhook de Stripe (NO requiere autenticación, usa firma de Stripe)
// IMPORTANTE: Necesita el raw body, no JSON parseado
router.post(
    '/webhook', 
    express.raw({ type: 'application/json' }), 
    handleWebhook
);

export default router;
