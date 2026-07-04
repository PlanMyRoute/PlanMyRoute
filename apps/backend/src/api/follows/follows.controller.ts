// src/api/follows/follows.controller.ts
import * as FollowService from "./follows.service.js";
import { asyncHandler } from "../../utils/errors.js";

/**
 * Follow a user
 * POST /api/follows/:userId/follow/:followingId
 */
export const followUser = asyncHandler(async (req, res) => {
  const { userId, followingId } = req.params as Record<string, string>;
  const follow = await FollowService.followUser(userId, followingId);
  res.status(201).json(follow);
});

/**
 * Unfollow a user
 * DELETE /api/follows/:userId/unfollow/:followingId
 */
export const unfollowUser = asyncHandler(async (req, res) => {
  const { userId, followingId } = req.params as Record<string, string>;
  await FollowService.unfollowUser(userId, followingId);
  res.status(200).json({ message: "Usuario dejado de seguir correctamente" });
});

/**
 * Check if user follows another user
 * GET /api/follows/:userId/is-following/:followingId
 */
export const checkIfFollowing = asyncHandler(async (req, res) => {
  const { userId, followingId } = req.params as Record<string, string>;
  const isFollowing = await FollowService.checkIfFollowing(userId, followingId);
  res.json({ isFollowing });
});

/**
 * Get followers of a user
 * GET /api/follows/:userId/followers
 */
export const getFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params as Record<string, string>;
  const followers = await FollowService.getFollowers(userId);
  res.json(followers);
});

/**
 * Get users that a user is following
 * GET /api/follows/:userId/following
 */
export const getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params as Record<string, string>;
  const following = await FollowService.getFollowing(userId);
  res.json(following);
});

/**
 * Get follow statistics for a user
 * GET /api/follows/:userId/stats
 */
export const getFollowStats = asyncHandler(async (req, res) => {
  const { userId } = req.params as Record<string, string>;
  const stats = await FollowService.getFollowStats(userId);
  res.json(stats);
});
