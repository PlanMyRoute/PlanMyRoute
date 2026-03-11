import CustomAlert from '@/components/customElements/CustomAlert';
import { TextRegular } from '@/components/customElements/CustomText';
import { InviteUserModal } from '@/components/modals/InviteUserModal';
import Traveler from '@/components/travelers/Traveler';
import { useCreateNotification, useDeleteNotification } from '@/hooks/useNotifications';
import { useTripPermissions } from '@/hooks/useTripPermissions';
import { TravelerWithRole, useChangeUserRole, useKickUser } from '@/hooks/useTrips';
import { Ionicons } from '@expo/vector-icons';
import { Trip, User } from '@planmyroute/types';
import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

type TravelersProps = {
    travelers: TravelerWithRole[];
    tripId?: string;
    currentTrip?: Trip;
    isCreatingTrip?: boolean; // Flag para indicar que el viaje aún no existe
    onInviteBeforeCreate?: (user: User, role: 'owner' | 'editor' | 'viewer') => void; // Callback para invitar sin crear notificación
};

const Travelers = ({
    travelers: initialTravelers,
    tripId,
    currentTrip,
    isCreatingTrip = false,
    onInviteBeforeCreate
}: TravelersProps) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [travelers, setTravelers] = useState<TravelerWithRole[]>(initialTravelers || []);
    const [showAlert, setShowAlert] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        type: 'error' | 'warning' | 'success' | 'info';
        title: string;
        message: string;
        actions?: Array<{ text: string; onPress: () => void; variant?: 'primary' | 'outline' | 'dark' }>;
    }>({ type: 'info', title: '', message: '' });

    const createNotificationMutation = useCreateNotification();
    const deleteNotificationMutation = useDeleteNotification();
    const changeRoleMutation = useChangeUserRole();
    const kickUserMutation = useKickUser();

    // Obtener permisos del usuario actual
    // Si isCreatingTrip=true, useTripPermissions habilita todos los permisos automáticamente
    const { canInvite, canChangeRoles, canRemoveTravelers } = useTripPermissions(tripId || null, isCreatingTrip);

    // Sincronizar travelers cuando la prop inicial cambie
    useEffect(() => {
        setTravelers(initialTravelers || []);
    }, [initialTravelers]);

    const handleNewTraveler = () => {
        setModalVisible(true);
    };

    const handleChangeRole = async (userId: string, newRole: 'owner' | 'editor' | 'viewer') => {
        if (!tripId) {
            setAlertConfig({
                type: 'error',
                title: 'Error',
                message: 'No se ha seleccionado ningún viaje'
            });
            setShowAlert(true);
            return;
        }

        try {
            await changeRoleMutation.mutateAsync({ userId, tripId, role: newRole });

            // Actualizar el estado local
            setTravelers(prevTravelers =>
                prevTravelers.map(t =>
                    t.user.id === userId ? { ...t, role: newRole } : t
                )
            );

            setAlertConfig({
                type: 'success',
                title: 'Éxito',
                message: 'Rol actualizado correctamente'
            });
            setShowAlert(true);
        } catch (error: any) {
            setAlertConfig({
                type: 'error',
                title: 'Error',
                message: error?.message || 'No se pudo cambiar el rol'
            });
            setShowAlert(true);
        }
    };

    const handleKickUser = async (userId: string, userName: string, isPending: boolean = false) => {
        if (!tripId) {
            setAlertConfig({
                type: 'error',
                title: 'Error',
                message: 'No se ha seleccionado ningún viaje'
            });
            setShowAlert(true);
            return;
        }

        setAlertConfig({
            type: 'warning',
            title: isPending ? 'Cancelar invitación' : 'Expulsar viajero',
            message: isPending
                ? `¿Estás seguro de que quieres cancelar la invitación de ${userName}?`
                : `¿Estás seguro de que quieres expulsar a ${userName} del viaje?`,
            actions: [
                { text: 'Cancelar', onPress: () => setShowAlert(false), variant: 'outline' },
                {
                    text: isPending ? 'Cancelar invitación' : 'Expulsar',
                    variant: 'dark',
                    onPress: async () => {
                        setShowAlert(false);
                        try {
                            if (isPending) {
                                // Para usuarios pendientes, eliminar la notificación
                                // Necesitaremos buscar la notificación por tripId y userId
                                await kickUserMutation.mutateAsync({ userId, tripId });
                            } else {
                                await kickUserMutation.mutateAsync({ userId, tripId });
                            }

                            // Actualizar el estado local
                            setTravelers(prevTravelers =>
                                prevTravelers.filter(t => t.user.id !== userId)
                            );

                            setAlertConfig({
                                type: 'success',
                                title: 'Éxito',
                                message: isPending
                                    ? `Invitación de ${userName} cancelada`
                                    : `${userName} ha sido expulsado del viaje`
                            });
                            setShowAlert(true);
                        } catch (error: any) {
                            setAlertConfig({
                                type: 'error',
                                title: 'Error',
                                message: error?.message || 'No se pudo realizar la acción'
                            });
                            setShowAlert(true);
                        }
                    }
                }
            ]
        });
        setShowAlert(true);
    };

    const handleInviteUser = async (user: User, role: 'owner' | 'editor' | 'viewer') => {
        // CASO 1: Estamos creando el viaje (no existe aún)
        if (isCreatingTrip) {
            if (onInviteBeforeCreate) {
                // Pasar usuario y rol al callback
                onInviteBeforeCreate(user, role);
                setModalVisible(false);
                setAlertConfig({
                    type: 'success',
                    title: 'Usuario añadido',
                    message: `${user.username} será invitado como ${role === 'owner' ? 'Propietario' : role === 'editor' ? 'Editor' : 'Observador'} cuando crees el viaje`
                });
                setShowAlert(true);
            }
            return;
        }

        // CASO 2: El viaje ya existe, crear notificación inmediatamente
        if (!tripId || !currentTrip) {
            setAlertConfig({
                type: 'error',
                title: 'Error',
                message: 'No se ha seleccionado ningún viaje'
            });
            setShowAlert(true);
            return;
        }

        try {
            const roleText = role === 'owner' ? 'Propietario' : role === 'editor' ? 'Editor' : 'Observador';

            // Crear la notificación de invitación
            await createNotificationMutation.mutateAsync({
                notification: {
                    user_receiver_id: user.id,
                    content: `Has sido invitado a unirte al viaje "${currentTrip.name || 'Sin nombre'}" como ${roleText}`,
                    type: 'invitation',
                    status: 'unread',
                    action_status: 'pending',
                    related_trip_id: Number(tripId),
                },
            });

            // Crear nuevo TravelerWithRole con estado pending
            const newTraveler: TravelerWithRole = {
                user: user,
                role: 'pending',
            };

            // Añadir el nuevo viajero al estado local (para feedback inmediato)
            setTravelers(prevTravelers => [...prevTravelers, newTraveler]);

            // Cerrar modal y mostrar mensaje de éxito
            setModalVisible(false);
            setAlertConfig({
                type: 'success',
                title: 'Invitación enviada',
                message: `Se ha enviado una invitación a ${user.username}`
            });
            setShowAlert(true);
        } catch (error) {
            console.error('Error al enviar invitación:', error);
            setAlertConfig({
                type: 'error',
                title: 'Error',
                message: 'No se pudo enviar la invitación. Por favor, inténtalo de nuevo.'
            });
            setShowAlert(true);
        }
    };

    // Extraer solo los usuarios de los travelers para pasarlos a la modal
    const currentTravelerUsers = travelers?.map(t => t.user) || [];

    return (
        <View>
            <View className="gap-3">
                {travelers.map((travelerData: TravelerWithRole) => (
                    <Traveler
                        key={travelerData.user.id}
                        user={travelerData.user}
                        role={travelerData.role}
                        canChangeRole={canChangeRoles && travelerData.role !== 'pending'}
                        onChangeRole={(newRole: 'owner' | 'editor' | 'viewer') => handleChangeRole(travelerData.user.id, newRole)}
                        canKick={canRemoveTravelers}
                        onKick={() => handleKickUser(
                            travelerData.user.id,
                            travelerData.user.username || 'Usuario',
                            travelerData.role === 'pending'
                        )}
                    />
                ))}
            </View>

            {/* Botón de invitar - Solo si tiene permiso */}
            {canInvite && (
                <TouchableOpacity
                    className={`flex-row items-center justify-center py-4 rounded-2xl mt-4 bg-primary-yellow`}
                    onPress={handleNewTraveler}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={'add-circle'}
                        size={20}
                        color="#202020"
                        className='mr-2'
                    />
                    <TextRegular className="text-dark-black font-semibold">
                        Añadir nuevo viajero
                    </TextRegular>
                </TouchableOpacity>
            )}

            {/* Modal de invitación */}
            <InviteUserModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onInvite={handleInviteUser}
                isLoading={createNotificationMutation.isPending}
                currentTravelers={currentTravelerUsers}
            />

            {/* CustomAlert para todos los mensajes */}
            <CustomAlert
                visible={showAlert}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                onClose={() => setShowAlert(false)}
                actions={alertConfig.actions}
            />
        </View>
    );
};

export default Travelers;