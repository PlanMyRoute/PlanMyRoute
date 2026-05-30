import { ROUTES } from '@/constants/routes';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { Vehicle, VehicleService } from '@/services/VehicleService';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

const MAX_VEHICLES = 3;

export function useVehicles(userId: string | undefined) {
    const router = useRouter();
    const { token } = useAuth();
    const { showAlert } = useAlert();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);

    const refetch = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const data = await VehicleService.getUserVehicles(userId, { token: token || undefined });
            setVehicles(data);
        } catch (error) {
            console.error('Error loading vehicles:', error);
        } finally {
            setLoading(false);
        }
    }, [userId, token]);

    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const handleAddVehicle = useCallback(() => {
        if (vehicles.length >= MAX_VEHICLES) {
            showAlert({
                title: 'Límite alcanzado',
                message: `Solo puedes tener un máximo de ${MAX_VEHICLES} vehículos registrados.`,
                type: 'warning',
            });
            return;
        }
        router.push(ROUTES.addVehicle);
    }, [vehicles.length, router, showAlert]);

    const handleEditVehicle = useCallback(
        (vehicle: Vehicle) => {
            router.push({
                pathname: ROUTES.editVehicle,
                params: {
                    id: vehicle.id,
                    brand: vehicle.brand,
                    model: vehicle.model,
                    type: vehicle.type,
                    type_fuel: vehicle.type_fuel,
                    avg_consumption: vehicle.avg_consumption?.toString() || '',
                    fuel_tank_capacity: vehicle.fuel_tank_capacity?.toString() || '',
                },
            } as any);
        },
        [router]
    );

    const handleDeleteVehicle = useCallback(
        async (vehicle: Vehicle) => {
            if (!userId) {
                showAlert({ title: 'Error', message: 'No se puede eliminar el vehículo.', type: 'error' });
                return;
            }
            try {
                await VehicleService.deleteVehicle(userId, vehicle.id.toString(), { token: token || undefined });
                showAlert({ title: '¡Eliminado!', message: 'El vehículo ha sido eliminado correctamente.', type: 'success' });
                refetch();
            } catch {
                showAlert({ title: 'Error', message: 'No se pudo eliminar el vehículo.', type: 'error' });
            }
        },
        [userId, refetch, token, showAlert]
    );

    return {
        vehicles,
        loading,
        refetch,
        handleAddVehicle,
        handleEditVehicle,
        handleDeleteVehicle,
        maxVehicles: MAX_VEHICLES,
    };
}
