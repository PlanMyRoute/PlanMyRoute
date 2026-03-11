import CustomButton from '@/components/customElements/CustomButton';
import { TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import UserProfile from '@/components/profile/UserProfile';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useUsers';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function UserProfileScreen() {
    const router = useRouter();
    const { username } = useLocalSearchParams<{ username: string }>();
    const { user } = useAuth();

    // Estado para almacenar el ID del usuario del perfil
    const [profileUserId, setProfileUserId] = useState<string | null>(null);

    // Obtener perfil por username
    const { data: profile, isLoading: userLoading, error } = useProfile(undefined, username);

    // Actualizar profileUserId cuando se cargue el perfil
    useEffect(() => {
        if (profile?.user?.id) {
            setProfileUserId(profile.user.id);
        }
    }, [profile]);

    // Si es tu propio perfil, redirigir al tab de profile
    useEffect(() => {
        if (profile?.user?.id && user?.id && profile.user.id === user.id) {
            router.replace('/(app)/(tabs)/profile');
        }
    }, [profile, user, router]);

    // --- RENDERIZADO ---
    if (userLoading) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: `@${username}`,
                        headerShown: true,
                        headerBackTitle: 'Atrás',
                        headerShadowVisible: false,
                        headerStyle: {
                            backgroundColor: '#FFFFFF',
                        },
                    }}
                />
                <View className="flex-1 bg-white items-center justify-center">
                    <ActivityIndicator size="large" color="#FFD54D" />
                </View>
            </>
        );
    }

    if (error || !profile || !profileUserId) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: `@${username}`,
                        headerShown: true,
                        headerBackTitle: 'Atrás',
                        headerShadowVisible: false,
                        headerStyle: {
                            backgroundColor: '#FFFFFF',
                        },
                    }}
                />
                <View className="flex-1 bg-white items-center justify-center px-5">
                    <Ionicons name="person-circle-outline" size={80} color="#999999" />
                    <Title2Semibold className="mt-4">Usuario no encontrado</Title2Semibold>
                    <TextRegular className="text-neutral-gray mt-2 text-center">
                        El usuario @{username} no existe o fue eliminado
                    </TextRegular>
                    <CustomButton
                        title="Volver"
                        onPress={() => router.back()}
                        variant="primary"
                        size="medium"
                        className="mt-6"
                    />
                </View>
            </>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    title: `@${username}`,
                    headerShown: true,
                    headerBackTitle: 'Atrás',
                    headerShadowVisible: false,
                    headerStyle: {
                        backgroundColor: '#FFFFFF',
                    },
                }}
            />
            <UserProfile userId={profileUserId} isOwnProfile={false} />
        </>
    );
}
