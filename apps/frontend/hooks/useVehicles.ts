import { useAuth } from '@/context/AuthContext';
import { Vehicle, VehicleService } from '@/services/VehicleService';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

const MAX_VEHICLES = 3;

export type VehicleAlert = {
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success' | 'info' | 'warning';
};

export function useVehicles(userId: string | undefined) {
    const router = useRouter();
    const { token } = useAuth();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<VehicleAlert>({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

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
            Alert.alert(
                'Límite alcanzado',
                `Solo puedes tener un máximo de ${MAX_VEHICLES} vehículos registrados.`,
                [{ text: 'Entendido' }]
            );
            return;
        }
        router.push('/profile/AddVehicleScreen' as any);
    }, [vehicles.length, router]);

    const handleEditVehicle = useCallback(
        (vehicle: Vehicle) => {
            router.push({
                pathname: '/profile/EditVehicleScreen',
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
                setAlert({
                    visible: true,
                    title: 'Error',
                    message: 'No se puede eliminar el vehículo.',
                    type: 'error'
                });
                return;
            }
            try {
                await VehicleService.deleteVehicle(userId, vehicle.id.toString(), { token: token || undefined });
                setAlert({
                    visible: true,
                    title: '¡Eliminado!',
                    message: 'El vehículo ha sido eliminado correctamente.',
                    type: 'success'
                });
                refetch();
            } catch (error) {
                setAlert({
                    visible: true,
                    title: 'Error',
                    message: 'No se pudo eliminar el vehículo.',
                    type: 'error'
                });
            }
        },
        [userId, refetch, token]
    );

    const closeAlert = useCallback(() => {
        setAlert(prev => ({ ...prev, visible: false }));
    }, []);

    return {
        vehicles,
        loading,
        refetch,
        handleAddVehicle,
        handleEditVehicle,
        handleDeleteVehicle,
        maxVehicles: MAX_VEHICLES,
        alert,
        closeAlert,
    };
}
