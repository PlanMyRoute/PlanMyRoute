import { CollaboratorRole, Trip } from '@planmyroute/types';
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useTripAccess } from '../hooks/useTripAccess';
import { useTripPermissions } from '../hooks/useTripPermissions';

interface TripContextValue {
    currentTrip: Trip | null;
    tripId: string | null;
    setCurrentTrip: (trip: Trip | null) => void;
    setTripId: (id: string | null) => void;
    // Permisos del usuario actual en el viaje (hook nuevo del servidor)
    access: ReturnType<typeof useTripAccess>;
    // Mantener permissions para compatibilidad con código existente
    permissions: ReturnType<typeof useTripPermissions>;
    userRole: CollaboratorRole | 'pending' | 'guest' | null;
}

const TripContext = createContext<TripContextValue | undefined>(undefined);

export function TripProvider({ children }: { children: ReactNode }) {
    const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
    const [tripId, setTripId] = useState<string | null>(null);

    // Obtener permisos del servidor (incluye guest y completed)
    const access = useTripAccess(tripId);

    // Mantener hook antiguo para retrocompatibilidad
    const permissions = useTripPermissions(tripId);

    const value = useMemo(() => ({
        currentTrip,
        tripId,
        setCurrentTrip,
        setTripId,
        access,
        permissions,
        userRole: access.role as CollaboratorRole | 'pending' | 'guest' | null,
    }), [currentTrip, tripId, access, permissions]);

    return (
        <TripContext.Provider value={value}>
            {children}
        </TripContext.Provider>
    );
}

export function useTripContext() {
    const context = useContext(TripContext);
    if (context === undefined) {
        throw new Error('useTripContext must be used within a TripProvider');
    }
    return context;
}
