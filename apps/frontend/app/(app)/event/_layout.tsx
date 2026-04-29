import { Stack } from 'expo-router';

export default function EventLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="[id]" options={{ headerShown: false }} />
            <Stack.Screen name="createFromEvent" options={{ headerShown: false }} />
        </Stack>
    );
}
