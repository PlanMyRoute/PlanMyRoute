import { useAuth } from '@/context/AuthContext';
import { TripService } from '@/services/tripService';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';

/**
 * Hook para gestionar los vehículos asociados a un viaje
 */
export function useTripVehicles(tripId: string | undefined, userId: string | undefined) {
    const { token } = useAuth();
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVehicles = useCallback(async () => {
        if (!tripId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const data = await TripService.getVehiclesInTrip(tripId, { token: token || undefined });
            setVehicles(data);
        } catch (err) {
            console.error('Error loading trip vehicles:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar vehículos');
        } finally {
            setLoading(false);
        }
    }, [tripId, token]);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const handleRemoveVehicle = useCallback(
        async (vehicleId: string) => {
            if (!tripId || !userId) {
                Alert.alert('Error', 'No se puede eliminar el vehículo');
                return;
            }

            Alert.alert(
                'Eliminar vehículo',
                '¿Estás seguro de que quieres eliminar este vehículo del viaje?',
                [
                    {
                        text: 'Cancelar',
                        style: 'cancel',
                    },
                    {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await TripService.removeVehicleFromTrip(userId, tripId, vehicleId, token || undefined);
                                // Actualizar la lista local
                                setVehicles((prev) => prev.filter((v) => v.id_vehicle !== vehicleId));
                                Alert.alert('Éxito', 'Vehículo eliminado del viaje');
                            } catch (error) {
                                console.error('Error removing vehicle:', error);
                                Alert.alert(
                                    'Error',
                                    error instanceof Error ? error.message : 'No se pudo eliminar el vehículo'
                                );
                            }
                        },
                    },
                ]
            );
        },
        [tripId, userId, token]
    );

    return {
        vehicles,
        loading,
        error,
        refetch: fetchVehicles,
        handleRemoveVehicle,
    };
}
