// src/api/itinerary/itinerary.routes.ts
import { Router } from 'express';
import * as ctrl from './automaticTrip.controller.js';
import { verifyToken, requireSameUser } from '../../middleware/auth.js';
import { requirePremiumForCircular } from '../../middleware/requirePremiumForCircular.js';

const router = Router();
const AUTOMATICTRIPS_BASE_PATH = '/automatic-trips';

router.post(`${AUTOMATICTRIPS_BASE_PATH}/validate-trip-request`, verifyToken, ctrl.validateTrip);
router.post(`${AUTOMATICTRIPS_BASE_PATH}/:userId/generate-trip`, verifyToken, requireSameUser, requirePremiumForCircular, ctrl.generateAutomaticTrip);


export default router;
