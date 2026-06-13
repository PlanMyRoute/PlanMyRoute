import { MicrotextDark, Title2Semibold } from '@/components/customElements/CustomText';
import { ModalSheet } from '@/components/modals/ModalSheet';
import { UserSearchInput } from '@/components/customElements/UserSearchInput';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@planmyroute/types';
import { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

type InviteUserModalProps = {
    visible: boolean;
    onClose: () => void;
    onInvite: (user: User, role: 'owner' | 'editor' | 'viewer') => void;
    isLoading: boolean;
    currentTravelers?: User[];
};

export const InviteUserModal = ({ visible, onClose, onInvite, isLoading, currentTravelers = [] }: InviteUserModalProps) => {
    const [selectedRole, setSelectedRole] = useState<'owner' | 'editor' | 'viewer'>('editor');

    useEffect(() => {
        if (!visible) setSelectedRole('editor');
    }, [visible]);

    const handleUserSelect = (user: User) => {
        onInvite(user, selectedRole);
    };

    const ROLES: { key: 'owner' | 'editor' | 'viewer'; label: string; icon: 'star' | 'create' | 'eye' }[] = [
        { key: 'owner', label: 'Propietario', icon: 'star' },
        { key: 'editor', label: 'Editor', icon: 'create' },
        { key: 'viewer', label: 'Observador', icon: 'eye' },
    ];

    return (
        <ModalSheet visible={visible} onClose={onClose} minHeight={480} contentStyle={{ maxHeight: '80%' }}>
            {(handleClose) => (
                <View className="pt-2 pb-10 px-6">
                    {/* Header */}
                    <View className="flex-row justify-between items-center mb-6">
                        <Title2Semibold>Invitar viajero</Title2Semibold>
                        <TouchableOpacity onPress={handleClose} className="p-1">
                            <Ionicons name="close" size={24} color="#202020" />
                        </TouchableOpacity>
                    </View>

                    {/* Role selector */}
                    <View className="mb-6">
                        <MicrotextDark className="mb-3 text-neutral-gray">Rol del viajero:</MicrotextDark>
                        <View className="flex-row gap-2">
                            {ROLES.map(({ key, label, icon }) => (
                                <TouchableOpacity
                                    key={key}
                                    className={`flex-1 py-3 px-3 rounded-2xl border-2 ${
                                        selectedRole === key
                                            ? 'bg-primary-yellow/10 border-primary-yellow'
                                            : 'bg-neutral-gray/5 border-neutral-gray/20'
                                    }`}
                                    onPress={() => setSelectedRole(key)}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center justify-center gap-1.5">
                                        <Ionicons
                                            name={icon}
                                            size={16}
                                            color={selectedRole === key ? '#FFD54D' : '#999999'}
                                        />
                                        <MicrotextDark
                                            className={`font-semibold ${
                                                selectedRole === key ? 'text-dark-black' : 'text-neutral-gray'
                                            }`}
                                        >
                                            {label}
                                        </MicrotextDark>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <UserSearchInput
                        onUserSelect={handleUserSelect}
                        placeholder="Buscar usuarios..."
                        excludeUsers={currentTravelers}
                    />
                </View>
            )}
        </ModalSheet>
    );
};
