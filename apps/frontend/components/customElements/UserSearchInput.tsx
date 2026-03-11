import { useSearchUsers } from '@/hooks/useSearchUsers';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@planmyroute/types';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, TouchableOpacity, View } from 'react-native';
import CustomInput from './CustomInput';
import { MicrotextDark, TextRegular } from './CustomText';

type UserSearchInputProps = {
    onUserSelect: (user: User) => void;
    placeholder?: string;
    excludeUsers?: User[]; // Usuarios que no se deben mostrar en los resultados
    containerClassName?: string;
};

/**
 * Componente reutilizable para buscar usuarios
 * Muestra un input de búsqueda con resultados desplegables
 */
export const UserSearchInput = ({
    onUserSelect,
    placeholder = 'Buscar por nombre de usuario...',
    excludeUsers = [],
    containerClassName = ''
}: UserSearchInputProps) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Buscar usuarios cuando cambia la query
    const { users: searchedUsers, isLoading: searchLoading } = useSearchUsers(searchQuery);

    // Mostrar resultados si hay query y resultados
    const shouldShowResults = useMemo(() => {
        return searchQuery.trim().length > 0 && (searchedUsers && Array.isArray(searchedUsers) && searchedUsers.length > 0);
    }, [searchQuery, searchedUsers]);

    // Filtrar usuarios excluidos
    const availableUsers = useMemo(() => {
        if (!searchedUsers || !Array.isArray(searchedUsers)) return [];
        return searchedUsers.filter(
            user => !excludeUsers.some(excluded => excluded.id === user.id)
        );
    }, [searchedUsers, excludeUsers]);

    const handleUserClick = (user: User) => {
        setSearchQuery(''); // Limpiar búsqueda
        onUserSelect(user);
    };

    return (
        <View className={`relative ${containerClassName}`}>
            <CustomInput
                placeholder={placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                inputClassName="pl-10"
                autoCapitalize="none"
                autoCorrect={false}
            />
            <View className="absolute left-4 top-3">
                <Ionicons name="search" size={20} color="#999999" />
            </View>

            {/* User search results dropdown */}
            {shouldShowResults && (
                <View className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-gray/20 rounded-2xl shadow-lg z-20" style={{ maxHeight: 280 }}>
                    {searchLoading ? (
                        <View className="p-4 items-center">
                            <ActivityIndicator size="small" color="#FFD54D" />
                        </View>
                    ) : availableUsers.length === 0 ? (
                        <View className="p-4 items-center">
                            <MicrotextDark className="text-neutral-gray">
                                {searchedUsers.length === 0
                                    ? 'No se encontraron usuarios'
                                    : 'Estos usuarios ya están en el viaje'}
                            </MicrotextDark>
                        </View>
                    ) : (
                        <ScrollView
                            className="py-2"
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                        >
                            {availableUsers.map((user: User) => (
                                <TouchableOpacity
                                    key={user.id}
                                    onPress={() => handleUserClick(user)}
                                    className="flex-row items-center px-4 py-3 active:bg-neutral-gray/5"
                                >
                                    <Image
                                        source={{
                                            uri: user.img || `https://ui-avatars.com/api/?name=${user.username}&background=FFD54D&color=202020&size=100`
                                        }}
                                        className="w-12 h-12 rounded-full border-2 border-primary-yellow"
                                    />
                                    <View className="ml-3 flex-1">
                                        <TextRegular className="font-semibold text-dark-black">
                                            {user.name || user.username}
                                        </TextRegular>
                                        <MicrotextDark className="text-neutral-gray">
                                            @{user.username}
                                        </MicrotextDark>
                                    </View>
                                    <Ionicons name="person-add" size={20} color="#FFD54D" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}
        </View>
    );
};

export default UserSearchInput;
