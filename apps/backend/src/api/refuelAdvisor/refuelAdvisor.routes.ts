import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { suggestRefuel, applyRefuelSuggestions } from './refuelAdvisor.controller.js';

const router = Router();

router.use(verifyToken);

// Analiza el itinerario y sugiere puntos de repostaje (cobra tokens)
router.post('/trips/:tripId/suggest-refuel', suggestRefuel);

// Crea las paradas de repostaje elegidas por el usuario
router.post('/trips/:tripId/apply-refuel', applyRefuelSuggestions);

export default router;
