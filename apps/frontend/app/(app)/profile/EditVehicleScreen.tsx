import VehicleFormScreen from '@/components/profile/VehicleFormScreen';
import { useAuth } from '@/context/AuthContext';
import { Vehicle } from '@/services/vehicleService';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

export default function EditVehicleScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user, token } = useAuth();
    const id = params.id as string;

    const initialData: Partial<Vehicle> = {
        brand: (params.brand as string) || '',
        model: (params.model as string) || '',
        type: (params.type as any) || 'car',
        type_fuel: (params.type_fuel as any) || 'gasoline',
        avg_consumption: params.avg_consumption ? parseFloat(params.avg_consumption as string) : undefined,
        fuel_tank_capacity: params.fuel_tank_capacity ? parseFloat(params.fuel_tank_capacity as string) : undefined,
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Editar vehículo', headerShown: true }} />
            <VehicleFormScreen
                userId={user?.id || ''}
                token={token || undefined}
                isEditMode
                vehicleId={id}
                initialData={initialData}
                onSuccess={() => router.back()}
                onCancel={() => router.back()}
                onDelete={() => router.back()}
            />
        </>
    );
}
