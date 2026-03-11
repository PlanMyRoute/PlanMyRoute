import { MicrotextDark, TextRegular, Title3Semibold } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@planmyroute/types';
import { useState } from 'react';
import { Image, Modal, TouchableOpacity, View } from 'react-native';

type TravelerProps = {
    user: User;
    role: 'owner' | 'editor' | 'viewer' | 'pending';
    canChangeRole?: boolean;
    onChangeRole?: (newRole: 'owner' | 'editor' | 'viewer') => void;
    canKick?: boolean;
    onKick?: () => void;
};

const Traveler = ({ user, role, canChangeRole = false, onChangeRole, canKick = false, onKick }: TravelerProps) => {
    const DEFAULT_PROFILE_PIC = 'https://randomuser.me/api/portraits/men/1.jpg';
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [pendingRole, setPendingRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            owner: 'Propietario',
            editor: 'Editor',
            viewer: 'Espectador',
            pending: 'Pendiente',
        };
        return labels[role] || role;
    };

    const getRoleColor = (role: string) => {
        const colors: Record<string, string> = {
            owner: '#202020',
            editor: '#F97316',
            viewer: '#999999',
            pending: '#FF9800',
        };
        return colors[role] || '#999999';
    };

    const getRoleBgColor = (role: string) => {
        const colors: Record<string, string> = {
            owner: '#FFD54D',
            editor: '#FFEDD5',
            viewer: '#F5F5F5',
            pending: '#FFF3E0',
        };
        return colors[role] || '#F5F5F5';
    };

    const handleRoleChange = (newRole: 'owner' | 'editor' | 'viewer') => {
        if (role === newRole) {
            return;
        }
        setPendingRole(newRole);
    };

    const confirmRoleChange = () => {
        if (pendingRole) {
            onChangeRole?.(pendingRole);
            setShowRoleModal(false);
            setPendingRole(null);
        }
    };

    const handleCloseModal = () => {
        setShowRoleModal(false);
        setPendingRole(null);
    };

    return (
        <>
            <View className="flex-row items-center justify-between p-4 bg-white rounded-2xl border border-neutral-gray/20">
                <View className="flex-row items-center gap-3 flex-1">
                    <Image
                        source={{ uri: user.img || DEFAULT_PROFILE_PIC }}
                        className="w-14 h-14 rounded-full border-2 border-primary-yellow"
                    />
                    <View className="flex-1">
                        <TextRegular className="font-semibold text-dark-black">
                            {user.username || user.name}
                        </TextRegular>
                        {user.name && user.username && (
                            <MicrotextDark className="text-neutral-gray">@{user.username}</MicrotextDark>
                        )}
                    </View>
                </View>

                {/* Badge de rol con posibilidad de cambiar */}
                <View className="flex-row items-center gap-2">
                    {canChangeRole ? (
                        <TouchableOpacity
                            onPress={() => setShowRoleModal(true)}
                            className="px-3 py-2 rounded-2xl flex-row items-center gap-1.5"
                            style={{ backgroundColor: getRoleBgColor(role) }}
                            activeOpacity={0.7}
                        >
                            <MicrotextDark className="font-semibold" style={{ color: getRoleColor(role) }}>
                                {getRoleLabel(role)}
                            </MicrotextDark>
                            <Ionicons name="chevron-down" size={14} color={getRoleColor(role)} />
                        </TouchableOpacity>
                    ) : (
                        <View
                            className="px-3 py-2 rounded-2xl"
                            style={{ backgroundColor: getRoleBgColor(role) }}
                        >
                            <MicrotextDark className="font-semibold" style={{ color: getRoleColor(role) }}>
                                {getRoleLabel(role)}
                            </MicrotextDark>
                        </View>
                    )}

                    {/* Botón de expulsar/cancelar invitación */}
                    {role !== 'owner' && role !== 'pending' && canKick && onKick && (
                        <TouchableOpacity
                            testID="kick-button"
                            onPress={onKick}
                            className="bg-red-50 p-2 rounded-lg"
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                //name={role === 'pending' ? "close-circle" : "person-remove"}
                                name={"person-remove"}
                                size={20}
                                color="#EF4444"
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Modal para cambiar rol */}
            <Modal
                visible={showRoleModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowRoleModal(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-center items-center"
                    activeOpacity={1}
                    onPress={handleCloseModal}
                >
                    <View className="bg-white rounded-3xl p-6 m-4 w-80" onStartShouldSetResponder={() => true}>
                        {/* Botón de cerrar X */}
                        <TouchableOpacity
                            onPress={handleCloseModal}
                            className="absolute top-4 right-4 z-10 p-2"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close" size={24} color="#999999" />
                        </TouchableOpacity>

                        <Title3Semibold className="text-dark-black mb-4 pr-8">
                            Cambiar rol de {user.username || user.name}
                        </Title3Semibold>

                        <View className="gap-3">
                            <TouchableOpacity
                                onPress={() => handleRoleChange('owner')}
                                className="flex-row items-center justify-between p-4 rounded-2xl border-2"
                                style={{
                                    borderColor: pendingRole === 'owner' ? '#FFD54D' : (role === 'owner' ? '#FFD54D' : '#E0E0E0'),
                                    backgroundColor: pendingRole === 'owner' ? '#FFF9E6' : (role === 'owner' ? '#FFF9E6' : '#FFF'),
                                }}
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center gap-3">
                                    <Ionicons name="star" size={22} color="#FFD54D" />
                                    <View>
                                        <TextRegular className="font-semibold text-dark-black">Propietario</TextRegular>
                                        <MicrotextDark className="text-neutral-gray">Control total del viaje</MicrotextDark>
                                    </View>
                                </View>
                                {(pendingRole === 'owner' || (role === 'owner' && !pendingRole)) && <Ionicons name="checkmark-circle" size={22} color="#FFD54D" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleRoleChange('editor')}
                                className="flex-row items-center justify-between p-4 rounded-2xl border-2"
                                style={{
                                    borderColor: pendingRole === 'editor' ? '#F97316' : (role === 'editor' ? '#F97316' : '#E0E0E0'),
                                    backgroundColor: pendingRole === 'editor' ? '#FFEDD5' : (role === 'editor' ? '#FFEDD5' : '#FFF'),
                                }}
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center gap-3">
                                    <Ionicons name="create" size={22} color="#FFD54D" />
                                    <View>
                                        <TextRegular className="font-semibold text-dark-black">Editor</TextRegular>
                                        <MicrotextDark className="text-neutral-gray">Puede editar el contenido</MicrotextDark>
                                    </View>
                                </View>
                                {(pendingRole === 'editor' || (role === 'editor' && !pendingRole)) && <Ionicons name="checkmark-circle" size={22} color="#F97316" />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleRoleChange('viewer')}
                                className="flex-row items-center justify-between p-4 rounded-2xl border-2"
                                style={{
                                    borderColor: pendingRole === 'viewer' ? '#999999' : (role === 'viewer' ? '#999999' : '#E0E0E0'),
                                    backgroundColor: pendingRole === 'viewer' ? '#F5F5F5' : (role === 'viewer' ? '#F5F5F5' : '#FFF'),
                                }}
                                activeOpacity={0.7}
                            >
                                <View className="flex-row items-center gap-3">
                                    <Ionicons name="eye" size={22} color="#999999" />
                                    <View>
                                        <TextRegular className="font-semibold text-dark-black">Espectador</TextRegular>
                                        <MicrotextDark className="text-neutral-gray">Solo puede ver</MicrotextDark>
                                    </View>
                                </View>
                                {(pendingRole === 'viewer' || (role === 'viewer' && !pendingRole)) && <Ionicons name="checkmark-circle" size={22} color="#999999" />}
                            </TouchableOpacity>
                        </View>

                        {pendingRole && pendingRole !== role && (
                            <TouchableOpacity
                                onPress={confirmRoleChange}
                                className="mt-4 py-3 bg-primary-yellow rounded-2xl"
                                activeOpacity={0.7}
                            >
                                <TextRegular className="text-center text-dark-black font-semibold">Confirmar cambio</TextRegular>
                            </TouchableOpacity>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

export default Traveler;