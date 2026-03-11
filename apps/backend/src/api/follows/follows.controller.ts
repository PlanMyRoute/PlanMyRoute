// src/api/follows/follows.controller.ts
import { Request, Response } from 'express';
import * as FollowService from './follows.service.js';

/**
 * Follow a user
 * POST /api/follows/:userId/follow/:followingId
 */
export const followUser = async (req: Request, res: Response) => {
    const { userId, followingId } = req.params;

    try {
        const follow = await FollowService.followUser(userId, followingId);
        res.status(201).json(follow);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('Ya sigues')) {
            return res.status(409).json({ error: err.message });
        }
        if (err.message.includes('No puedes seguirte')) {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

/**
 * Unfollow a user
 * DELETE /api/follows/:userId/unfollow/:followingId
 */
export const unfollowUser = async (req: Request, res: Response) => {
    const { userId, followingId } = req.params;

    try {
        await FollowService.unfollowUser(userId, followingId);
        res.status(200).json({ message: 'Usuario dejado de seguir correctamente' });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

/**
 * Check if user follows another user
 * GET /api/follows/:userId/is-following/:followingId
 */
export const checkIfFollowing = async (req: Request, res: Response) => {
    const { userId, followingId } = req.params;

    try {
        const isFollowing = await FollowService.checkIfFollowing(userId, followingId);
        res.json({ isFollowing });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get followers of a user
 * GET /api/follows/:userId/followers
 */
export const getFollowers = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const followers = await FollowService.getFollowers(userId);
        res.json(followers);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get users that a user is following
 * GET /api/follows/:userId/following
 */
export const getFollowing = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const following = await FollowService.getFollowing(userId);
        res.json(following);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get follow statistics for a user
 * GET /api/follows/:userId/stats
 */
export const getFollowStats = async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
        const stats = await FollowService.getFollowStats(userId);
        res.json(stats);
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ error: err.message });
    }
};
