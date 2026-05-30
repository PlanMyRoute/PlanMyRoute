import CustomAlert from '@/components/customElements/CustomAlert';
import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, SubtitleSemibold, TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import { SkeletonBox } from '@/components/customElements/SkeletonBox';
import { ReviewModal } from '@/components/modals/ReviewModal';
import { PastTripsGallery } from '@/components/profile/PastTripsGallery';
import { VehiclesSection } from '@/components/profile/VehiclesSection';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useCreateReview, useUserTripReview } from '@/hooks/useReviews';
import { useFollowers, useFollowing, useFollowStats, useFollowUser, useIsFollowing } from '@/hooks/users/useFollow';
import { useProfile } from '@/hooks/users/useUsers';
import { usePastTrips } from '@/hooks/useTrips';
import { useVehicles } from '@/hooks/useVehicles';
import { FollowerUser, FollowingUser } from '@/services/followService';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    FlatList,
    Image,
    Modal,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import { ProfileHeaderSkeleton } from '@/components/profile/ProfileHeaderSkeleton';

interface UserProfileProps {
    userId: string;
    isOwnProfile: boolean;
}

type AlertState = {
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'success' | 'info' | 'warning';
    actions?: { text: string; onPress: () => void; variant?: 'primary' | 'outline' | 'danger' }[];
};

const EMPTY_ALERT: AlertState = { visible: false, title: '', message: '', type: 'info' };

export default function UserProfile({ userId, isOwnProfile }: UserProfileProps) {
    const { user: currentUser, isGuest } = useAuth();
    const router = useRouter();
    const { isPremium: amIPremium } = useSubscription();

    const { data: profile, isLoading: userLoading, refetch } = useProfile(userId, undefined);
    const isGuestOwnProfile = isOwnProfile && isGuest;
    const displayName = isGuestOwnProfile ? 'Viajero' : (profile?.user.name || '');
    const DEFAULT_PROFILE_PIC = `https://ui-avatars.com/api/?name=${isGuestOwnProfile ? 'Viajero' : (profile?.user.username || 'User')}&background=FFD54D&color=202020&size=200`;

    const isVerified = isOwnProfile ? amIPremium : profile?.is_premium;

    const { vehicles, loading: vehiclesLoading, handleAddVehicle, handleEditVehicle, handleDeleteVehicle, maxVehicles, alert: vehicleAlert, closeAlert: closeVehicleAlert } = useVehicles(isOwnProfile ? userId : undefined);

    const { data: pastTrips, isLoading: pastTripsLoading } = usePastTrips(userId, { publicOnly: !isOwnProfile });

    const { data: isFollowing, isLoading: isFollowingLoading } = useIsFollowing(userId);
    const { data: followStats } = useFollowStats(userId);
    const { follow, unfollow, isFollowPending, isUnfollowPending } = useFollowUser();

    // Follow list modal
    const [followListType, setFollowListType] = useState<'followers' | 'following' | null>(null);
    const { data: followersList, isLoading: followersLoading } = useFollowers(followListType === 'followers' ? userId : undefined);
    const { data: followingList, isLoading: followingLoading } = useFollowing(followListType === 'following' ? userId : undefined);

    // Review
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedTripForReview, setSelectedTripForReview] = useState<{ id: number; name: string } | null>(null);
    const createReview = useCreateReview();
    const { data: existingReview } = useUserTripReview(selectedTripForReview?.id?.toString() || '');

    // Unified alert
    const [alertState, setAlertState] = useState<AlertState>(EMPTY_ALERT);
    const showAlert = (s: Omit<AlertState, 'visible'>) => setAlertState({ ...s, visible: true });
    const closeAlert = () => setAlertState(EMPTY_ALERT);

    const handleProfilePicturePress = async () => {
        if (!isOwnProfile) return;
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
                showAlert({ title: 'Permiso denegado', message: 'Necesitamos permiso para acceder a tus fotos', type: 'warning' });
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.3,
                base64: true,
            });
            if (!result.canceled && result.assets?.length > 0) {
                const image = result.assets[0];
                if (!image.base64) {
                    showAlert({ title: 'Error', message: 'No se pudo procesar la imagen', type: 'error' });
                    return;
                }
                const base64Image = `data:image/jpeg;base64,${image.base64}`;
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/${userId}/upload-profile-image`, {
                    method: 'POST',
                    body: JSON.stringify({ image: base64Image }),
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!response.ok) throw new Error(`Error ${response.status}`);
                refetch();
                showAlert({ title: 'Foto actualizada', message: 'Tu foto de perfil ha sido cambiada', type: 'success' });
            }
        } catch (error) {
            showAlert({ title: 'Error', message: 'No se pudo actualizar la foto de perfil. Inténtalo de nuevo.', type: 'error' });
        }
    };

    const handleOpenReviewModal = (tripId: number, tripName: string) => {
        setSelectedTripForReview({ id: tripId, name: tripName });
        setReviewModalVisible(true);
    };

    const handleSubmitReview = async (rating: number, comment: string, isPublic: boolean) => {
        if (!selectedTripForReview) return;
        createReview.mutate(
            { trip_id: selectedTripForReview.id, rating, comment, is_public: isPublic },
            {
                onSuccess: () => {
                    setReviewModalVisible(false);
                    setSelectedTripForReview(null);
                    showAlert({ title: '¡Reseña publicada!', message: 'Tu reseña ha sido publicada correctamente', type: 'success' });
                },
                onError: () => {
                    showAlert({ title: 'Error', message: 'No se pudo publicar la reseña', type: 'error' });
                },
            }
        );
    };

    const handleFollowPress = () => {
        if (isFollowing) {
            showAlert({
                title: 'Dejar de seguir',
                message: `¿Dejar de seguir a @${profile?.user.username}?`,
                type: 'warning',
                actions: [
                    { text: 'Cancelar', onPress: closeAlert, variant: 'outline' },
                    { text: 'Dejar de seguir', onPress: () => { closeAlert(); unfollow(userId); }, variant: 'danger' },
                ],
            });
        } else {
            follow(userId);
        }
    };

    const handleVerifiedPress = () => {
        showAlert({ title: 'Usuario Premium', message: 'Este usuario es miembro Premium de PlanMyRoute 🌟', type: 'info' });
    };

    if (userLoading) {
        return (
            <ScrollView className="flex-1 bg-white" contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}>
                <ProfileHeaderSkeleton />
            </ScrollView>
        );
    }

    if (!profile) {
        return (
            <View className="flex-1 bg-white items-center pt-10">
                <TextRegular className="text-neutral">No se pudo cargar el perfil del usuario</TextRegular>
            </View>
        );
    }

    const listItems: (FollowerUser | FollowingUser)[] = followListType === 'followers'
        ? (followersList ?? [])
        : (followingList ?? []);
    const listLoading = followListType === 'followers' ? followersLoading : followingLoading;

    return (
        <>
            <ScrollView className="flex-1 bg-white" contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
                <View className="w-full px-5 gap-4">
                    {/* Avatar + info */}
                    <View className="flex-row items-center justify-center mb-4">
                        <TouchableOpacity onPress={isOwnProfile ? handleProfilePicturePress : undefined} className="relative">
                            <Image
                                source={{ uri: profile.user.img || DEFAULT_PROFILE_PIC }}
                                className="w-[100px] h-[100px] rounded-full border-4 border-primary"
                            />
                            {isOwnProfile && (
                                <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full items-center justify-center border-2 border-white">
                                    <Ionicons name="camera" size={16} color="#202020" />
                                </View>
                            )}
                        </TouchableOpacity>

                        <View className="ml-4 flex-1">
                            <View className="flex-row items-center gap-2">
                                <Title2Semibold className="shrink">{displayName}</Title2Semibold>
                                {isVerified && (
                                    <TouchableOpacity onPress={handleVerifiedPress}>
                                        <Ionicons name="checkmark-circle" size={22} color="#FFD54D" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <MicrotextDark className="text-neutral mt-1">
                                Miembro desde {new Date(profile.user.created_at || '').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </MicrotextDark>

                            {/* Follow stats — clickable */}
                            <View className="flex-row gap-3 mt-2">
                                <TouchableOpacity onPress={() => setFollowListType('followers')} activeOpacity={0.7}>
                                    <TextRegular className="text-dark">
                                        <TextRegular style={{ fontFamily: 'Urbanist-SemiBold' }}>{followStats?.followers_count ?? 0}</TextRegular>
                                        {'  '}
                                        <TextRegular className="text-neutral">seguidores</TextRegular>
                                    </TextRegular>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setFollowListType('following')} activeOpacity={0.7}>
                                    <TextRegular className="text-dark">
                                        <TextRegular style={{ fontFamily: 'Urbanist-SemiBold' }}>{followStats?.following_count ?? 0}</TextRegular>
                                        {'  '}
                                        <TextRegular className="text-neutral">seguidos</TextRegular>
                                    </TextRegular>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Premium CTA (own profile + free) */}
                    {isOwnProfile && !isVerified && (
                        <View className="mb-2">
                            <CustomButton title="Hazte Premium" onPress={() => router.push(ROUTES.premium)} variant="primary" size="medium" />
                        </View>
                    )}

                    {/* Follow button (other profile) */}
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

                    {/* Trip stats */}
                    <View className="bg-white mb-6">
                        <Title2Semibold className="mb-4">Viajes</Title2Semibold>
                        <View className="flex-row justify-around border border-neutral/20 rounded-3xl p-4">
                            <View className="items-center">
                                <Title2Semibold>{profile.stats.tripsCreated ?? 0}</Title2Semibold>
                                <MicrotextDark className="text-neutral mt-1">Creados</MicrotextDark>
                            </View>
                            <View className="items-center">
                                <Title2Semibold>{profile.stats.tripsFinished ?? 0}</Title2Semibold>
                                <MicrotextDark className="text-neutral mt-1">Terminados</MicrotextDark>
                            </View>
                        </View>
                    </View>

                    {/* Vehicles (own profile only) */}
                    {isOwnProfile && (
                        <VehiclesSection
                            vehicles={vehicles}
                            loading={vehiclesLoading}
                            maxVehicles={maxVehicles}
                            onAddVehicle={handleAddVehicle}
                            onEditVehicle={handleEditVehicle}
                            onDeleteVehicle={handleDeleteVehicle}
                        />
                    )}

                    {/* Past trips gallery */}
                    <PastTripsGallery trips={pastTrips} loading={pastTripsLoading} />
                </View>

                {isOwnProfile && selectedTripForReview && (
                    <ReviewModal
                        visible={reviewModalVisible}
                        tripId={selectedTripForReview.id}
                        tripName={selectedTripForReview.name}
                        onClose={() => { setReviewModalVisible(false); setSelectedTripForReview(null); }}
                        onSubmit={handleSubmitReview}
                        loading={createReview.isPending}
                        existingReview={existingReview}
                    />
                )}
            </ScrollView>

            {/* Followers / following list modal */}
            <Modal
                visible={followListType !== null}
                animationType="slide"
                transparent
                onRequestClose={() => setFollowListType(null)}
            >
                <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                    <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8" style={{ maxHeight: '70%' }}>
                        {/* Handle + header */}
                        <View className="w-10 h-1 bg-neutral/30 rounded-full self-center mb-4" />
                        <View className="flex-row items-center justify-between mb-4">
                            <SubtitleSemibold>
                                {followListType === 'followers' ? 'Seguidores' : 'Seguidos'}
                            </SubtitleSemibold>
                            <TouchableOpacity onPress={() => setFollowListType(null)} className="w-8 h-8 rounded-full bg-neutral/10 items-center justify-center">
                                <Ionicons name="close" size={18} color="#202020" />
                            </TouchableOpacity>
                        </View>

                        {listLoading ? (
                            <View className="gap-3 py-2">
                                {[1, 2, 3].map(i => (
                                    <View key={i} className="flex-row items-center gap-3">
                                        <SkeletonBox width={44} height={44} borderRadius={22} />
                                        <View className="flex-1 gap-2">
                                            <SkeletonBox height={14} width="50%" borderRadius={6} />
                                            <SkeletonBox height={11} width="30%" borderRadius={6} />
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : listItems.length === 0 ? (
                            <View className="items-center py-8">
                                <Ionicons name="people-outline" size={40} color="#999999" />
                                <TextRegular className="text-neutral mt-3">
                                    {followListType === 'followers' ? 'Aún no tiene seguidores' : 'Aún no sigue a nadie'}
                                </TextRegular>
                            </View>
                        ) : (
                            <FlatList
                                data={listItems}
                                keyExtractor={(item) => item.id.toString()}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => {
                                    const u = followListType === 'followers'
                                        ? (item as FollowerUser).user
                                        : (item as FollowingUser).following;
                                    const avatarUri = u.img || `https://ui-avatars.com/api/?name=${u.username}&background=FFD54D&color=202020&size=80`;
                                    return (
                                        <TouchableOpacity
                                            className="flex-row items-center gap-3 py-3 border-b border-neutral/10"
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                setFollowListType(null);
                                                router.push(ROUTES.userProfile(u.username));
                                            }}
                                        >
                                            <Image source={{ uri: avatarUri }} className="w-11 h-11 rounded-full border-2 border-primary/30" />
                                            <View className="flex-1">
                                                <TextRegular style={{ fontFamily: 'Urbanist-SemiBold', color: '#202020' }}>{u.name}</TextRegular>
                                                <MicrotextDark className="text-neutral">@{u.username}</MicrotextDark>
                                            </View>
                                            <Ionicons name="chevron-forward" size={16} color="#999999" />
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Unified alert */}
            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                actions={alertState.actions}
                onClose={closeAlert}
            />

            {/* Vehicle alert */}
            <CustomAlert
                visible={vehicleAlert.visible}
                title={vehicleAlert.title}
                message={vehicleAlert.message}
                type={vehicleAlert.type}
                onClose={closeVehicleAlert}
            />
        </>
    );
}
