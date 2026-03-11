import CustomAlert from '@/components/customElements/CustomAlert';
import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import { ReviewModal } from '@/components/modals/ReviewModal';
import { PastTripsGallery } from '@/components/profile/PastTripsGallery';
import { VehiclesSection } from '@/components/profile/VehiclesSection';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useFollowStats, useFollowUser, useIsFollowing } from '@/hooks/useFollow';
import { useCreateReview, useUserTripReview } from '@/hooks/useReviews';
import { usePastTrips } from '@/hooks/useTrips';
import { useProfile } from '@/hooks/useUsers';
import { useVehicles } from '@/hooks/useVehicles';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';

interface UserProfileProps {
    userId: string;
    isOwnProfile: boolean;
}

export default function UserProfile({ userId, isOwnProfile }: UserProfileProps) {
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const { isPremium: amIPremium } = useSubscription();

    // Custom hooks
    const { data: profile, isLoading: userLoading, refetch } = useProfile(userId, undefined);
    const DEFAULT_PROFILE_PIC = `https://ui-avatars.com/api/?name=${profile?.user.username || 'User'}&background=FFD54D&color=202020&size=200`;

    const isVerified = isOwnProfile
        ? amIPremium
        : profile?.is_premium;

    const {
        vehicles,
        loading: vehiclesLoading,
        handleAddVehicle,
        handleEditVehicle,
        handleDeleteVehicle,
        maxVehicles,
        alert,
        closeAlert,
    } = useVehicles(userId);

    const { data: pastTrips, isLoading: pastTripsLoading } = usePastTrips(
        userId,
        { publicOnly: !isOwnProfile }
    );

    // Follow system hooks
    const { data: isFollowing, isLoading: isFollowingLoading } = useIsFollowing(userId);
    const { data: followStats } = useFollowStats(userId);
    const { follow, unfollow, isFollowPending, isUnfollowPending } = useFollowUser();

    // Review system states
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedTripForReview, setSelectedTripForReview] = useState<{
        id: number;
        name: string;
    } | null>(null);

    // Review hooks
    const createReview = useCreateReview();
    const { data: existingReview } = useUserTripReview(selectedTripForReview?.id?.toString() || '');

    // Profile picture handler
    const handleProfilePicturePress = async () => {
        if (!isOwnProfile) return;

        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a tus fotos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.3,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const image = result.assets[0];

                if (!image.base64) {
                    Alert.alert('Error', 'No se pudo procesar la imagen');
                    return;
                }

                const base64Image = `data:image/jpeg;base64,${image.base64}`;

                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/${userId}/upload-profile-image`, {
                    method: 'POST',
                    body: JSON.stringify({ image: base64Image }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Error ${response.status}: ${errorText}`);
                }

                refetch();
                Alert.alert('Éxito', 'Foto de perfil actualizada');
            }
        } catch (error) {
            console.error('Error updating profile picture:', error);
            Alert.alert('Error', 'No se pudo actualizar la foto de perfil. Por favor intenta de nuevo.');
        }
    };

    const handleOpenReviewModal = (tripId: number, tripName: string) => {
        setSelectedTripForReview({ id: tripId, name: tripName });
        setReviewModalVisible(true);
    };

    const handleSubmitReview = async (rating: number, comment: string, isPublic: boolean) => {
        if (!selectedTripForReview) return;

        createReview.mutate(
            {
                trip_id: selectedTripForReview.id,
                rating,
                comment,
                is_public: isPublic,
            },
            {
                onSuccess: () => {
                    setReviewModalVisible(false);
                    setSelectedTripForReview(null);
                    Alert.alert('¡Éxito!', 'Tu reseña ha sido publicada');
                },
                onError: (error) => {
                    Alert.alert('Error', 'No se pudo publicar la reseña');
                },
            }
        );
    };

    const handleFollowPress = () => {
        if (isFollowing) {
            Alert.alert(
                'Dejar de seguir',
                `¿Dejar de seguir a @${profile?.user.username}?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Dejar de seguir',
                        style: 'destructive',
                        onPress: () => unfollow(userId),
                    },
                ]
            );
        } else {
            follow(userId);
        }
    };

    // --- NUEVO: Manejador para el click en el verificado ---
    const handleVerifiedPress = () => {
        // Aquí iría la lógica para abrir tu Modal explicativa
        Alert.alert('Usuario Verificado', 'Este usuario es miembro Premium de Plan My Route 🌟');
    };

    // --- RENDERIZADO ---
    if (userLoading) {
        return (
            <View className="flex-1 bg-white items-center justify-center pt-10">
                <ActivityIndicator size="large" color="#FFD54D" />
            </View>
        );
    }

    if (!profile) {
        return (
            <View className="flex-1 bg-white items-center pt-10">
                <TextRegular className="text-neutral-gray">No se pudo cargar el perfil del usuario</TextRegular>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-white"
            contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}
        >
            <View className="w-full px-5 gap-4">
                {/* --- Informacion del usuario --- */}
                <View className="flex-row items-center justify-center mb-4">
                    <TouchableOpacity onPress={isOwnProfile ? handleProfilePicturePress : undefined} className="relative">
                        <Image
                            source={{ uri: profile?.user.img || DEFAULT_PROFILE_PIC }}
                            // --- OPCIONAL: Si es Premium, podríamos poner un borde dorado en vez de amarillo
                            className={`w-[100px] h-[100px] rounded-full border-4 ${isVerified ? 'border-primary-yellow' : 'border-primary-yellow'}`}
                        />
                        {isOwnProfile && (
                            <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary-yellow rounded-full items-center justify-center border-2 border-white">
                                <Ionicons name="camera" size={16} color="#202020" />
                            </View>
                        )}
                    </TouchableOpacity>

                    <View className="ml-4 flex-1">
                        {/* --- NUEVO: Nombre + Badge Verificado --- */}
                        <View className="flex-row items-center gap-2">
                            <Title2Semibold className="shrink">{profile?.user.name}</Title2Semibold>
                            {isVerified && (
                                <TouchableOpacity onPress={handleVerifiedPress}>
                                    <Ionicons name="checkmark-circle" size={22} color="#FFD54D" />
                                </TouchableOpacity>
                            )}
                        </View>
                        {/* -------------------------------------- */}

                        <MicrotextDark className="text-neutral-gray mt-1">
                            Miembro desde {new Date(profile?.user.created_at || '').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </MicrotextDark>

                        {/* Follow stats */}
                        <View className="flex-row gap-3 mt-2">
                            <View>
                                <TextRegular className="text-dark-black">
                                    <TextRegular className="font-semibold">{followStats?.followers_count || 0}</TextRegular>
                                    {' '}
                                    <TextRegular className="text-neutral-gray">seguidores</TextRegular>
                                </TextRegular>
                            </View>
                            <View>
                                <TextRegular className="text-dark-black">
                                    <TextRegular className="font-semibold">{followStats?.following_count || 0}</TextRegular>
                                    {' '}
                                    <TextRegular className="text-neutral-gray">seguidos</TextRegular>
                                </TextRegular>
                            </View>
                        </View>
                    </View>
                </View>

                {/* --- NUEVO: Botón de Suscribirse (Si es mi perfil y soy Free) --- */}
                {isOwnProfile && !isVerified && (
                    <View className="mb-2">
                        <CustomButton
                            title="Hazte Premium"
                            onPress={() => router.push('/premium')}
                            variant="primary"
                            size="medium"
                        />
                    </View>
                )}
                {/* ------------------------------------------------------------- */}

                {/* --- FOLLOW BUTTON (only if not own profile) --- */}
                {!isOwnProfile && (
                    <View className="mb-6">
                        <CustomButton
                            title={isFollowing ? 'Siguiendo' : 'Seguir'}
                            onPress={handleFollowPress}
                            variant={isFollowing ? 'outline' : 'primary'}
                            size="medium"
                            loading={isFollowPending || isUnfollowPending || isFollowingLoading}
                            icon={isFollowing ? undefined : 'person-add-outline'}
                        />
                    </View>
                )}

                {/* --- ESTADÍSTICAS --- */}
                <View className="bg-white mb-6">
                    <Title2Semibold className="mb-4">Viajes</Title2Semibold>
                    <View className="flex-row justify-around border border-neutral-gray/20 rounded-3xl p-4">
                        <View className="items-center">
                            <Title2Semibold>{profile?.stats.tripsCreated || 0}</Title2Semibold>
                            <MicrotextDark className="text-neutral-gray mt-1">Creados</MicrotextDark>
                        </View>
                        <View className="items-center">
                            <Title2Semibold>{profile?.stats.tripsFinished || 0}</Title2Semibold>
                            <MicrotextDark className="text-neutral-gray mt-1">Terminados</MicrotextDark>
                        </View>
                    </View>
                </View>

                {/* --- SECCIÓN DE VEHÍCULOS (only own profile) --- */}
                <VehiclesSection
                    vehicles={vehicles}
                    loading={vehiclesLoading}
                    maxVehicles={maxVehicles}
                    onAddVehicle={handleAddVehicle}
                    onEditVehicle={handleEditVehicle}
                    onDeleteVehicle={handleDeleteVehicle}
                />

                {/* --- GALERÍA DE VIAJES PASADOS --- */}
                <PastTripsGallery
                    trips={pastTrips}
                    loading={pastTripsLoading}
                />
            </View>

            {/* --- REVIEW MODAL (only own profile) --- */}
            {isOwnProfile && selectedTripForReview && (
                <ReviewModal
                    visible={reviewModalVisible}
                    tripId={selectedTripForReview.id}
                    tripName={selectedTripForReview.name}
                    onClose={() => {
                        setReviewModalVisible(false);
                        setSelectedTripForReview(null);
                    }}
                    onSubmit={handleSubmitReview}
                    loading={createReview.isPending}
                    existingReview={existingReview}
                />
            )}

            {/* --- ALERT DE VEHÍCULOS --- */}
            <CustomAlert
                visible={alert.visible}
                title={alert.title}
                message={alert.message}
                type={alert.type}
                onClose={closeAlert}
            />
        </ScrollView>
    );
}