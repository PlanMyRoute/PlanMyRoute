import { Stack } from 'expo-router';

export default function UsersLayout() {
    return (
        <Stack
            screenOptions={{
                headerShadowVisible: false,
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerTitleStyle: { fontFamily: 'Urbanist-SemiBold', fontSize: 18, color: '#202020' },
                headerTintColor: '#202020',
                headerBackTitle: 'Atrás',
            }}
        />
    );
}
