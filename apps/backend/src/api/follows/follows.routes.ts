// src/api/follows/follows.routes.ts
import { Router } from 'express';
import * as FollowController from './follows.controller.js';
import { verifyToken, requireSameUser } from '../../middleware/auth.js';

const router = Router();
const BASE_PATH = '/follows';

// Follow/Unfollow routes — requieren auth y que :userId sea el propio usuario
router.post(`${BASE_PATH}/:userId/follow/:followingId`, verifyToken, requireSameUser, FollowController.followUser);
router.delete(`${BASE_PATH}/:userId/unfollow/:followingId`, verifyToken, requireSameUser, FollowController.unfollowUser);

// Check following status
router.get(`${BASE_PATH}/:userId/is-following/:followingId`, FollowController.checkIfFollowing);

// Get followers and following
router.get(`${BASE_PATH}/:userId/followers`, FollowController.getFollowers);
router.get(`${BASE_PATH}/:userId/following`, FollowController.getFollowing);

// Get follow statistics
router.get(`${BASE_PATH}/:userId/stats`, FollowController.getFollowStats);

export default router;
