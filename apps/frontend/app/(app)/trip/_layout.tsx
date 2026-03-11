import { useClientOnlyValue } from '@/components/useClientOnlyValue.web';
import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';

export default function TripLayout() {
    const router = useRouter();

    const goBackToTrip = useCallback(() => {
        router.back();
    }, [router]);

    return (
        <Stack
            screenOptions={{
                headerShown: useClientOnlyValue(false, true),
            }}
        >
            <Stack.Screen
                name="[tripId]"
                options={{
                    headerShown: false,
                }}
            />

            <Stack.Screen
                name="(tabs)"
                options={{
                    headerShown: false,
                }}
            />

            <Stack.Screen
                name="edit"
                options={{
                }}
            />

            <Stack.Screen
                name="addNewStop"
                options={{
                    headerShown: false,
                }}
            />

            <Stack.Screen
                name="travelers"
                options={{
                    title: 'Viajeros',
                }}
            />

            <Stack.Screen
                name="vehicles"
                options={{
                    title: 'Vehículos',
                }}
            />
        </Stack>
    );
}