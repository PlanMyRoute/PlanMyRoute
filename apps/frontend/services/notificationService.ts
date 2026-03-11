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

            const url = `${process.env.EXPO_PUBLIC_API_URL}/api${BASE_PATH}/receiver/${userId}`;
            const response = await fetch(url, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error fetching notifications: ${response.status} - ${errorText}`);
            }

            return await response.json();
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

            const url = `${process.env.EXPO_PUBLIC_API_URL}/api${BASE_PATH}/trip/${tripId}`;
            const response = await fetch(url, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error fetching trip notifications: ${response.status} - ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('NotificationService.getByTripId error', error);
            throw error;
        }
    }

    static async getById(id: string | number, opts?: FetchOptions): Promise<Notification> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api${BASE_PATH}/${id}`, {
                headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
                signal: opts?.signal,
            });
            if (!response.ok) throw new Error('Error fetching notification');
            return await response.json();
        } catch (error) {
            console.error('NotificationService.getById error', error);
            throw error;
        }
    }

    static async create(notification: Partial<Notification>, token?: string): Promise<Notification> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api${BASE_PATH}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(notification),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Error creating notification');
            }
            return await response.json();
        } catch (error) {
            console.error('NotificationService.create error', error);
            throw error;
        }
    }

    static async markAsRead(id: string | number, token?: string): Promise<Notification> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api${BASE_PATH}/${id}/read`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!response.ok) throw new Error('Error marking notification as read');
            return await response.json();
        } catch (error) {
            console.error('NotificationService.markAsRead error', error);
            throw error;
        }
    }

    static async deleteNotification(id: string | number, token?: string): Promise<void> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api${BASE_PATH}/${id}`, {
                method: 'DELETE',
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!response.ok) throw new Error('Error deleting notification');
        } catch (error) {
            console.error('NotificationService.deleteNotification error', error);
            throw error;
        }
    }

    static async acceptInvitation(id: string | number, role: CollaboratorRole, token?: string): Promise<void> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api${BASE_PATH}/${id}/accept`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ role }),
            });
            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                console.error('acceptInvitation server error', response.status, errBody);
                throw new Error(errBody.error || 'Error accepting invitation');
            }
        } catch (error) {
            console.error('NotificationService.acceptInvitation error', error);
            throw error;
        }
    }

    static async declineInvitation(id: string | number, token?: string): Promise<void> {
        try {
            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api${BASE_PATH}/${id}/decline`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (!response.ok) {
                const errBody = await response.json().catch(() => ({}));
                console.error('declineInvitation server error', response.status, errBody);
                throw new Error(errBody.error || 'Error declining invitation');
            }
        } catch (error) {
            console.error('NotificationService.declineInvitation error', error);
            throw error;
        }
    }
}

export default NotificationService;
