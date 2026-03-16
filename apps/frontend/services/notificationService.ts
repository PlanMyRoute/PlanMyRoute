import { apiFetch } from '@/constants/api';
import { CollaboratorRole, notifications as Notification } from '@planmyroute/types';

const BASE_PATH = '/notification';

type FetchOptions = {
    token?: string;
    signal?: AbortSignal;
};

export class NotificationService {
    static async getByReceiverId(userId: string | number, opts?: FetchOptions): Promise<Notification[]> {
        try {
            // Validar que userId existe
            if (!userId) {
                throw new Error('userId is required but was undefined or empty');
            }

            return await apiFetch<Notification[]>(`/api${BASE_PATH}/receiver/${userId}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('NotificationService.getByReceiverId error', error);
            throw error;
        }
    }

    static async getByTripId(tripId: string | number, opts?: FetchOptions): Promise<Notification[]> {
        try {
            if (!tripId) {
                throw new Error('tripId is required but was undefined or empty');
            }

            return await apiFetch<Notification[]>(`/api${BASE_PATH}/trip/${tripId}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('NotificationService.getByTripId error', error);
            throw error;
        }
    }

    static async getById(id: string | number, opts?: FetchOptions): Promise<Notification> {
        try {
            return await apiFetch<Notification>(`/api${BASE_PATH}/${id}`, {
                token: opts?.token,
                signal: opts?.signal,
            });
        } catch (error) {
            console.error('NotificationService.getById error', error);
            throw error;
        }
    }

    static async create(notification: Partial<Notification>, token?: string): Promise<Notification> {
        try {
            return await apiFetch<Notification>(`/api${BASE_PATH}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify(notification),
            });
        } catch (error) {
            console.error('NotificationService.create error', error);
            throw error;
        }
    }

    static async markAsRead(id: string | number, token?: string): Promise<Notification> {
        try {
            return await apiFetch<Notification>(`/api${BASE_PATH}/${id}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
            });
        } catch (error) {
            console.error('NotificationService.markAsRead error', error);
            throw error;
        }
    }

    static async deleteNotification(id: string | number, token?: string): Promise<void> {
        try {
            await apiFetch<void>(`/api${BASE_PATH}/${id}`, {
                method: 'DELETE',
                token,
            });
        } catch (error) {
            console.error('NotificationService.deleteNotification error', error);
            throw error;
        }
    }

    static async acceptInvitation(id: string | number, role: CollaboratorRole, token?: string): Promise<void> {
        try {
            await apiFetch<void>(`/api${BASE_PATH}/${id}/accept`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
                body: JSON.stringify({ role }),
            });
        } catch (error) {
            console.error('NotificationService.acceptInvitation error', error);
            throw error;
        }
    }

    static async declineInvitation(id: string | number, token?: string): Promise<void> {
        try {
            await apiFetch<void>(`/api${BASE_PATH}/${id}/decline`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                token,
            });
        } catch (error) {
            console.error('NotificationService.declineInvitation error', error);
            throw error;
        }
    }
}

export default NotificationService;

