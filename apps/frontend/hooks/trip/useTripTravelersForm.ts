import { useEffect, useState } from 'react';
import { Vehicle, User } from '@planmyroute/types';
import { VehicleService } from '@/services/VehicleService';

export type TravelerCounts = {
    adults: number;
    children: number;
    infants: number;
    elders: number;
    pets: number;
};

export type InvitedUser = { user: User; role: 'owner' | 'editor' | 'viewer' };

export function useTripTravelersForm(token: string | null | undefined) {
    const [travelerCounts, setTravelerCounts] = useState<TravelerCounts>({
        adults: 1, children: 0, infants: 0, elders: 0, pets: 0,
    });
    const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
    const [travelersVehicles, setTravelersVehicles] = useState<Vehicle[]>([]);
    const [loadingTravelersVehicles, setLoadingTravelersVehicles] = useState(false);

    useEffect(() => {
        const fetchTravelersVehicles = async () => {
            if (invitedUsers.length === 0) {
                setTravelersVehicles([]);
                return;
            }
            setLoadingTravelersVehicles(true);
            try {
                const arrays = await Promise.all(
                    invitedUsers.map(({ user }) =>
                        VehicleService.getUserVehicles(user.id, { token: token || undefined })
                    )
                );
                setTravelersVehicles(arrays.flat());
            } catch {
                setTravelersVehicles([]);
            } finally {
                setLoadingTravelersVehicles(false);
            }
        };
        fetchTravelersVehicles();
    }, [invitedUsers, token]);

    const updateTravelerCount = (type: keyof TravelerCounts, delta: number) => {
        setTravelerCounts(prev => {
            const newValue = prev[type] + delta;
            if (newValue < 0) return prev;
            if (type === 'adults' && newValue < 1) return prev;
            return { ...prev, [type]: newValue };
        });
    };

    const addInvitedUser = (user: User, role: 'owner' | 'editor' | 'viewer') => {
        setInvitedUsers(prev => [...prev, { user, role }]);
    };

    const removeInvitedUser = (userId: string) => {
        setInvitedUsers(prev => prev.filter(({ user }) => user.id !== userId));
    };

    const reset = () => {
        setTravelerCounts({ adults: 1, children: 0, infants: 0, elders: 0, pets: 0 });
        setInvitedUsers([]);
        setTravelersVehicles([]);
    };

    return {
        travelerCounts,
        setTravelerCounts,
        invitedUsers,
        travelersVehicles,
        loadingTravelersVehicles,
        updateTravelerCount,
        addInvitedUser,
        removeInvitedUser,
        reset,
    };
}
