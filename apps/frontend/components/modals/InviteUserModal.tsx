import { MicrotextDark, Title2Semibold } from '@/components/customElements/CustomText';
import { UserSearchInput } from '@/components/customElements/UserSearchInput';
import { useModalAnimation } from '@/hooks/useModalAnimation';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@planmyroute/types';
import { useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, TouchableOpacity, View } from 'react-native';

type InviteUserModalProps = {
    visible: boolean;
    onClose: () => void;
    onInvite: (user: User, role: 'owner' | 'editor' | 'viewer') => void;
    isLoading: boolean;
    currentTravelers?: User[]; // Lista de usuarios que ya están en el viaje
};

export const InviteUserModal = ({ visible, onClose, onInvite, isLoading, currentTravelers = [] }: InviteUserModalProps) => {
    const [selectedRole, setSelectedRole] = useState<'owner' | 'editor' | 'viewer'>('editor');

    // Animaciones del modal
    const { overlayOpacity, slideAnim, handleClose } = useModalAnimation({ visible, onClose });

    // Resetear rol cuando se cierra el modal
    useEffect(() => {
        if (!visible) {
            setSelectedRole('editor');
        }
    }, [visible]);

    const handleUserSelect = (user: User) => {
        onInvite(user, selectedRole);
        // No cerramos el modal aquí, el componente padre lo hará cuando termine la invitación
    };

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <View style={{ flex: 1 }}>
                {/* Overlay (fondo oscuro) - Sin animación en web */}
                {Platform.OS === 'web' ? (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        }}
                    />
                ) : (
                    <Animated.View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            opacity: overlayOpacity,
                        }}
                    />
                )}

                {/* Contenido del modal */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                >
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        {Platform.OS === 'web' ? (
                            <View
                                style={{
                                    minHeight: 500,
                                    maxHeight: '80%'
                                }}
                                className="bg-white rounded-t-3xl pt-6 pb-10 px-6"
                            >
                                {/* Header */}
                                <View className="flex-row justify-between items-center mb-6">
                                    <Title2Semibold className="text-dark-black">
                                        Invitar viajero
                                    </Title2Semibold>
                                    <TouchableOpacity onPress={handleClose} className="p-1">
                                        <Ionicons name="close" size={24} color="#202020" />
                                    </TouchableOpacity>
                                </View>

                                {/* Selector de Rol */}
                                <View className="mb-6">
                                    <MicrotextDark className="mb-3 text-neutral-gray">Rol del viajero:</MicrotextDark>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            className={`flex-1 py-3 px-3 rounded-2xl border-2 ${selectedRole === 'owner'
                                                ? 'bg-primary-yellow/10 border-primary-yellow'
                                                : 'bg-neutral-gray/5 border-neutral-gray/20'
                                                }`}
                                            onPress={() => setSelectedRole('owner')}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center justify-center gap-1.5">
                                                <Ionicons
                                                    name="star"
                                                    size={16}
                                                    color={selectedRole === 'owner' ? '#FFD54D' : '#999999'}
                                                />
                                                <MicrotextDark
                                                    className={`font-semibold ${selectedRole === 'owner' ? 'text-dark-black' : 'text-neutral-gray'
                                                        }`}
                                                >
                                                    Propietario
                                                </MicrotextDark>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            className={`flex-1 py-3 px-3 rounded-2xl border-2 ${selectedRole === 'editor'
                                                ? 'bg-primary-yellow/10 border-primary-yellow'
                                                : 'bg-neutral-gray/5 border-neutral-gray/20'
                                                }`}
                                            onPress={() => setSelectedRole('editor')}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center justify-center gap-1.5">
                                                <Ionicons
                                                    name="create"
                                                    size={16}
                                                    color={selectedRole === 'editor' ? '#FFD54D' : '#999999'}
                                                />
                                                <MicrotextDark
                                                    className={`font-semibold ${selectedRole === 'editor' ? 'text-dark-black' : 'text-neutral-gray'
                                                        }`}
                                                >
                                                    Editor
                                                </MicrotextDark>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            className={`flex-1 py-3 px-3 rounded-2xl border-2 ${selectedRole === 'viewer'
                                                ? 'bg-primary-yellow/10 border-primary-yellow'
                                                : 'bg-neutral-gray/5 border-neutral-gray/20'
                                                }`}
                                            onPress={() => setSelectedRole('viewer')}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center justify-center gap-1.5">
                                                <Ionicons
                                                    name="eye"
                                                    size={16}
                                                    color={selectedRole === 'viewer' ? '#FFD54D' : '#999999'}
                                                />
                                                <MicrotextDark
                                                    className={`font-semibold ${selectedRole === 'viewer' ? 'text-dark-black' : 'text-neutral-gray'
                                                        }`}
                                                >
                                                    Observador
                                                </MicrotextDark>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Campo de búsqueda */}
                                <UserSearchInput
                                    onUserSelect={handleUserSelect}
                                    placeholder="Buscar usuarios..."
                                    excludeUsers={currentTravelers}
                                />
                            </View>
                        ) : (
                            <Animated.View
                                style={{
                                    transform: [{ translateY: slideAnim }],
                                    minHeight: 450,
                                    maxHeight: '75%'
                                }}
                                className="bg-white rounded-t-3xl pt-6 pb-10 px-6"
                            >
                                {/* Header */}
                                <View className="flex-row justify-between items-center mb-6">
                                    <Title2Semibold className="text-dark-black">
                                        Invitar viajero
                                    </Title2Semibold>
                                    <TouchableOpacity onPress={handleClose} className="p-1">
                                        <Ionicons name="close" size={24} color="#202020" />
                                    </TouchableOpacity>
                                </View>

                                {/* Selector de Rol */}
                                <View className="mb-6">
                                    <MicrotextDark className="mb-3 text-neutral-gray">Rol del viajero:</MicrotextDark>
                                    <View className="flex-row gap-2">
                                        <TouchableOpacity
                                            className={`flex-1 py-3 px-3 rounded-2xl border-2 ${selectedRole === 'owner'
                                                ? 'bg-primary-yellow/10 border-primary-yellow'
                                                : 'bg-neutral-gray/5 border-neutral-gray/20'
                                                }`}
                                            onPress={() => setSelectedRole('owner')}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center justify-center gap-1.5">
                                                <Ionicons
                                                    name="star"
                                                    size={16}
                                                    color={selectedRole === 'owner' ? '#FFD54D' : '#999999'}
                                                />
                                                <MicrotextDark
                                                    className={`font-semibold ${selectedRole === 'owner' ? 'text-dark-black' : 'text-neutral-gray'
                                                        }`}
                                                >
                                                    Propietario
                                                </MicrotextDark>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            className={`flex-1 py-3 px-3 rounded-2xl border-2 ${selectedRole === 'editor'
                                                ? 'bg-primary-yellow/10 border-primary-yellow'
                                                : 'bg-neutral-gray/5 border-neutral-gray/20'
                                                }`}
                                            onPress={() => setSelectedRole('editor')}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center justify-center gap-1.5">
                                                <Ionicons
                                                    name="create"
                                                    size={16}
                                                    color={selectedRole === 'editor' ? '#FFD54D' : '#999999'}
                                                />
                                                <MicrotextDark
                                                    className={`font-semibold ${selectedRole === 'editor' ? 'text-dark-black' : 'text-neutral-gray'
                                                        }`}
                                                >
                                                    Editor
                                                </MicrotextDark>
                                            </View>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            className={`flex-1 py-3 px-3 rounded-2xl border-2 ${selectedRole === 'viewer'
                                                ? 'bg-primary-yellow/10 border-primary-yellow'
                                                : 'bg-neutral-gray/5 border-neutral-gray/20'
                                                }`}
                                            onPress={() => setSelectedRole('viewer')}
                                            activeOpacity={0.7}
                                        >
                                            <View className="flex-row items-center justify-center gap-1.5">
                                                <Ionicons
                                                    name="eye"
                                                    size={16}
                                                    color={selectedRole === 'viewer' ? '#FFD54D' : '#999999'}
                                                />
                                                <MicrotextDark
                                                    className={`font-semibold ${selectedRole === 'viewer' ? 'text-dark-black' : 'text-neutral-gray'
                                                        }`}
                                                >
                                                    Observador
                                                </MicrotextDark>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Campo de búsqueda */}
                                <UserSearchInput
                                    onUserSelect={handleUserSelect}
                                    placeholder="Buscar usuarios..."
                                    excludeUsers={currentTravelers}
                                />
                            </Animated.View>
                        )}
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};
