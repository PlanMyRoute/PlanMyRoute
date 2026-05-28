import { Router } from 'express';
import * as EventsController from './events.controller.js';

const router = Router();

// GET /api/events?page=0&countryCode=ES&keyword=...
router.get('/', EventsController.getEvents);

// GET /api/events/near-stops?stops=[{city,date,countryCode}]&limit=10
router.get('/near-stops', EventsController.getNearStops);

// GET /api/events/:id
router.get('/:id', EventsController.getEventById);

export default router;
