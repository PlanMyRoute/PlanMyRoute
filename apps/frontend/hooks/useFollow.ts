// hooks/useFollow.ts
import { useAuth } from '@/context/AuthContext';
import { FollowService, type FollowStats } from '@/services/followService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook to check if current user is following another user
 */
export const useIsFollowing = (followingId: string | undefined) => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['isFollowing', user?.id, followingId],
        queryFn: async () => {
            if (!user?.id || !followingId) return false;
            return await FollowService.checkIfFollowing(user.id, followingId);
        },
        enabled: !!user?.id && !!followingId,
    });
};

/**
 * Hook to get follow statistics for a user
 */
export const useFollowStats = (userId: string | undefined) => {
    return useQuery<FollowStats>({
        queryKey: ['followStats', userId],
        queryFn: async () => {
            if (!userId) throw new Error('User ID is required');
            return await FollowService.getFollowStats(userId);
        },
        enabled: !!userId,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
};

/**
 * Hook to get followers of a user
 */
export const useFollowers = (userId: string | undefined) => {
    return useQuery({
        queryKey: ['followers', userId],
        queryFn: async () => {
            if (!userId) throw new Error('User ID is required');
            return await FollowService.getFollowers(userId);
        },
        enabled: !!userId,
    });
};

/**
 * Hook to get users that a user is following
 */
export const useFollowing = (userId: string | undefined) => {
    return useQuery({
        queryKey: ['following', userId],
        queryFn: async () => {
            if (!userId) throw new Error('User ID is required');
            return await FollowService.getFollowing(userId);
        },
        enabled: !!userId,
    });
};

/**
 * Hook to follow/unfollow a user with optimistic updates
 */
export const useFollowUser = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const followMutation = useMutation({
        mutationFn: async (followingId: string) => {
            if (!user?.id) throw new Error('User not authenticated');
            return await FollowService.followUser(user.id, followingId);
        },
        onMutate: async (followingId: string) => {
            // Cancel outgoing queries
            await queryClient.cancelQueries({ queryKey: ['isFollowing', user?.id, followingId] });

            // Snapshot previous value
            const previousValue = queryClient.getQueryData(['isFollowing', user?.id, followingId]);

            // Optimistically update to following
            queryClient.setQueryData(['isFollowing', user?.id, followingId], true);

            return { previousValue };
        },
        onError: (err, followingId, context) => {
            // Revert optimistic update on error
            queryClient.setQueryData(
                ['isFollowing', user?.id, followingId],
                context?.previousValue
            );
        },
        onSettled: (data, error, followingId) => {
            // Invalidate and refetch
            queryClient.invalidateQueries({ queryKey: ['isFollowing', user?.id, followingId] });
            queryClient.invalidateQueries({ queryKey: ['followStats', followingId] });
            queryClient.invalidateQueries({ queryKey: ['followStats', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['followers', followingId] });
            queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
        },
    });

    const unfollowMutation = useMutation({
        mutationFn: async (followingId: string) => {
            if (!user?.id) throw new Error('User not authenticated');
            return await FollowService.unfollowUser(user.id, followingId);
        },
        onMutate: async (followingId: string) => {
            await queryClient.cancelQueries({ queryKey: ['isFollowing', user?.id, followingId] });

            const previousValue = queryClient.getQueryData(['isFollowing', user?.id, followingId]);

            // Optimistically update to not following
            queryClient.setQueryData(['isFollowing', user?.id, followingId], false);

            return { previousValue };
        },
        onError: (err, followingId, context) => {
            queryClient.setQueryData(
                ['isFollowing', user?.id, followingId],
                context?.previousValue
            );
        },
        onSettled: (data, error, followingId) => {
            queryClient.invalidateQueries({ queryKey: ['isFollowing', user?.id, followingId] });
            queryClient.invalidateQueries({ queryKey: ['followStats', followingId] });
            queryClient.invalidateQueries({ queryKey: ['followStats', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['followers', followingId] });
            queryClient.invalidateQueries({ queryKey: ['following', user?.id] });
        },
    });

    return {
        follow: followMutation.mutate,
        unfollow: unfollowMutation.mutate,
        isFollowPending: followMutation.isPending,
        isUnfollowPending: unfollowMutation.isPending,
        followError: followMutation.error,
        unfollowError: unfollowMutation.error,
    };
};
