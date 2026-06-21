import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { refuelLimiter } from '../../middleware/rateLimiter.js';
import { suggestRefuel, applyRefuelSuggestions } from './refuelAdvisor.controller.js';

const router = Router();

router.post('/trips/:tripId/suggest-refuel', verifyToken, requirePermission('add_stop'), refuelLimiter, suggestRefuel);

router.post('/trips/:tripId/apply-refuel', verifyToken, requirePermission('add_stop'), applyRefuelSuggestions);

export default router;
