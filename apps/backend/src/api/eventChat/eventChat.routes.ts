import { Router } from 'express';
import * as EventChatController from './eventChat.controller.js';
import { verifyToken } from '../../middleware/auth.js';

const router = Router({ mergeParams: true });

// GET /api/events/:eventId/chat?page=0
router.get('/', EventChatController.getMessages);

// POST /api/events/:eventId/chat  (requiere auth)
router.post('/', verifyToken, EventChatController.sendMessage);

export default router;
