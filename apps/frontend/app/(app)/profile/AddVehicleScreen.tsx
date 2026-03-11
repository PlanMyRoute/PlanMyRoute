import VehicleFormScreen from '@/components/profile/VehicleFormScreen';
import { useAuth } from '@/context/AuthContext';
import { Stack, useRouter } from 'expo-router';

export default function AddVehicleScreen() {
  const router = useRouter();
  const { user, token } = useAuth();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Añadir Vehículo',
          headerShown: true,
        }}
      />
      <VehicleFormScreen
        userId={user?.id || ''}
        token={token || undefined}
        isEditMode={false}
        onSuccess={() => router.back()}
        onCancel={() => router.back()}
      />
    </>
  );
}