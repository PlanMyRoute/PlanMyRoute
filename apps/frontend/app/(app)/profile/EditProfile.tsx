import { CustomInput } from '@/components/customElements/CustomInput';
import { TextBold, TextRegular } from '@/components/customElements/CustomText';
import { InterestSelector } from '@/components/interests/InterestSelector';
import { useAuth } from '@/context/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useProfile } from '@/hooks/useUsers';
import { supabase } from '@/lib/supabase';
import { UserService } from '@/services/userService';
import { Ionicons } from '@expo/vector-icons';
import { Interest } from '@planmyroute/types';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Lista de zonas horarias comunes
const COMMON_TIMEZONES = [
    { label: 'América/México (UTC-6)', value: 'America/Mexico_City' },
    { label: 'América/Nueva York (UTC-5)', value: 'America/New_York' },
    { label: 'América/Los Ángeles (UTC-8)', value: 'America/Los_Angeles' },
    { label: 'América/Chicago (UTC-6)', value: 'America/Chicago' },
    { label: 'América/Buenos Aires (UTC-3)', value: 'America/Argentina/Buenos_Aires' },
    { label: 'América/São Paulo (UTC-3)', value: 'America/Sao_Paulo' },
    { label: 'América/Bogotá (UTC-5)', value: 'America/Bogota' },
    { label: 'América/Santiago (UTC-4)', value: 'America/Santiago' },
    { label: 'Europa/Madrid (UTC+1)', value: 'Europe/Madrid' },
    { label: 'Europa/Londres (UTC+0)', value: 'Europe/London' },
    { label: 'Europa/París (UTC+1)', value: 'Europe/Paris' },
    { label: 'Asia/Tokio (UTC+9)', value: 'Asia/Tokyo' },
    { label: 'UTC', value: 'UTC' },
];

export default function EditProfileScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const userId = user?.id;

    const { data: profile } = useProfile(userId, undefined);
    const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences(userId);

    // Estados para campos editables
    const [name, setName] = useState<string>('');
    const [lastname, setLastname] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [userInterests, setUserInterests] = useState<Interest[]>([]);

    // Estados para contraseña
    const [showPasswordSection, setShowPasswordSection] = useState<boolean>(false);
    const [currentPassword, setCurrentPassword] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
    const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

    // Estados para preferencias
    const [selectedTimezone, setSelectedTimezone] = useState<string>('UTC');
    const [autoUpdate, setAutoUpdate] = useState<boolean>(false);
    const [showTimezoneList, setShowTimezoneList] = useState<boolean>(false);

    // Estado de guardado
    const [isSaving, setIsSaving] = useState<boolean>(false);

    // Inicializar valores cuando se carguen los datos
    useEffect(() => {
        if (profile?.user) {
            setName(profile.user.name || '');
            setLastname(profile.user.lastname || '');
            setUsername(profile.user.username || '');
            setEmail(user?.email || '');
            setProfileImage(profile.user.img || null);
            setUserInterests((profile.user.user_type as Interest[]) || []);
        }
    }, [profile, user]);

    useEffect(() => {
        if (preferences) {
            setSelectedTimezone(preferences.timezone || 'UTC');
            setAutoUpdate(preferences.autoTripStatusUpdate || false);
        }
    }, [preferences]);

    const handleSave = async () => {
        if (!userId) return;

        setIsSaving(true);
        try {
            // Validaciones
            if (!name.trim() || !lastname.trim() || !username.trim()) {
                Alert.alert('Error', 'El nombre, apellido y username son obligatorios');
                setIsSaving(false);
                return;
            }

            // Validar contraseña si se intenta cambiar
            if (newPassword || confirmPassword || currentPassword) {
                if (!currentPassword) {
                    Alert.alert('Error', 'Debes ingresar tu contraseña actual');
                    setIsSaving(false);
                    return;
                }
                if (newPassword !== confirmPassword) {
                    Alert.alert('Error', 'Las contraseñas no coinciden');
                    setIsSaving(false);
                    return;
                }
                if (newPassword.length < 6) {
                    Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
                    setIsSaving(false);
                    return;
                }
            }

            // 1. Obtener token de autenticación
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                throw new Error('No se pudo obtener el token de autenticación');
            }

            // 2. Actualizar datos del usuario
            await UserService.updateUser(
                userId,
                {
                    name: name.trim(),
                    lastname: lastname.trim(),
                    username: username.trim(),
                    user_type: userInterests,
                },
                session.access_token
            );

            // 3. Actualizar foto de perfil si cambió
            if (profileImage && profileImage !== profile?.user.img) {
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/${userId}/upload-profile-image`, {
                    method: 'POST',
                    body: JSON.stringify({ image: profileImage }),
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Error al actualizar la foto de perfil');
                }
            }

            // 4. Actualizar contraseña si se proporcionó
            if (newPassword && currentPassword) {
                const { error } = await supabase.auth.updateUser({
                    password: newPassword,
                });

                if (error) {
                    throw new Error('Error al actualizar la contraseña: ' + error.message);
                }
            }

            // 5. Actualizar email si cambió
            if (email !== user?.email) {
                const { error } = await supabase.auth.updateUser({
                    email: email,
                });

                if (error) {
                    throw new Error('Error al actualizar el email: ' + error.message);
                }
            }

            // 6. Actualizar preferencias
            await updatePreferences({
                timezone: selectedTimezone,
                autoTripStatusUpdate: autoUpdate,
            });

            Alert.alert('¡Éxito!', 'Tu perfil se ha actualizado correctamente', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo guardar el perfil. Intenta nuevamente.');
            console.error('Error saving profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleProfilePicturePress = async () => {
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
                setProfileImage(base64Image);
                Alert.alert('Éxito', 'Foto seleccionada. Recuerda guardar los cambios.');
            }
        } catch (error) {
            console.error('Error selecting profile picture:', error);
            Alert.alert('Error', 'No se pudo seleccionar la foto de perfil.');
        }
    };

    const getTimezoneLabel = (value: string) => {
        return COMMON_TIMEZONES.find((tz) => tz.value === value)?.label || value;
    };

    if (!userId) return null;

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <Stack.Screen
                options={{
                    title: 'Editar Perfil',
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: '#FFFFFF',
                    },
                    headerShadowVisible: false,
                    headerRight: () => {
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={isSaving}
                            className={`flex-1 py-4 rounded-2xl items-center ${isSaving ? 'bg-primary-yellow/50' : 'bg-primary-yellow'
                                }`}
                            activeOpacity={0.7}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#202020" />
                            ) : (
                                <TextBold className="text-dark-black">Guardar Cambios</TextBold>
                            )}
                        </TouchableOpacity>
                    },
                }}
            />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                {/* Foto de Perfil */}
                <View className="px-6 py-6 items-center border-b border-neutral-gray/10">
                    <TouchableOpacity onPress={handleProfilePicturePress} activeOpacity={0.7}>
                        <View className="relative">
                            <View className="w-24 h-24 rounded-full bg-neutral-gray/20 items-center justify-center overflow-hidden">
                                {profileImage ? (
                                    <View className="w-full h-full">
                                        <Image
                                            src={profileImage}
                                            alt="Profile"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    </View>
                                ) : (
                                    <Ionicons name="person" size={40} color="#999" />
                                )}
                            </View>
                            <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary-yellow rounded-full items-center justify-center border-2 border-white">
                                <Ionicons name="camera" size={16} color="#202020" />
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TextRegular className="text-neutral-gray text-sm mt-2">Toca para cambiar foto</TextRegular>
                </View>

                {/* Información del Usuario */}
                <View className="px-6 py-4 border-b border-neutral-gray/10">
                    <TextBold className="text-lg text-dark-black mb-2">Información Personal</TextBold>
                    <View className="bg-neutral-gray/10 p-4 rounded-2xl gap-3">
                        <View className="flex-row gap-4">
                            <View className="flex-[0.4]">
                                <TextRegular className="text-neutral-gray text-sm mb-1">Nombre</TextRegular>
                                <CustomInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Ingresa tu nombre"
                                />
                            </View>
                            <View className="flex-[0.6]">
                                <TextRegular className="text-neutral-gray text-sm mb-1">Apellidos</TextRegular>
                                <CustomInput
                                    value={lastname}
                                    onChangeText={setLastname}
                                    placeholder="Ingresa tus apellidos"
                                />
                            </View>
                        </View>

                        <View>
                            <TextRegular className="text-neutral-gray text-sm mb-1">Username</TextRegular>
                            <CustomInput
                                value={username}
                                onChangeText={setUsername}
                                placeholder="@username"
                            />
                        </View>

                        <View>
                            <TextRegular className="text-neutral-gray text-sm mb-1">Correo Electrónico</TextRegular>
                            <CustomInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="correo@ejemplo.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>
                </View>

                {/* Intereses */}
                <View className="px-6 py-4 border-b border-neutral-gray/10">
                    <TextBold className="text-lg text-dark-black mb-2">Mis Intereses</TextBold>
                    <View className="bg-neutral-gray/10 p-4 rounded-2xl">
                        <InterestSelector
                            selectedInterests={userInterests}
                            onInterestsChange={setUserInterests}
                            multiple={true}
                        />
                    </View>
                </View>

                {/* Cambiar Contraseña */}
                <View className="px-6 py-4 border-b border-neutral-gray/10">
                    <TouchableOpacity
                        onPress={() => setShowPasswordSection(!showPasswordSection)}
                        className="flex-row items-center justify-between mb-3"
                        activeOpacity={0.7}
                    >
                        <TextBold className="text-lg text-dark-black">Cambiar Contraseña</TextBold>
                        <Ionicons
                            name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color="#666"
                        />
                    </TouchableOpacity>

                    {showPasswordSection && (
                        <View className="bg-neutral-gray/10 p-4 rounded-2xl gap-3">
                            <View>
                                <TextRegular className="text-neutral-gray text-sm mb-1">Contraseña Actual</TextRegular>
                                <View className="flex-row items-center bg-white border-2 border-neutral-gray/30 rounded-xl px-3">
                                    <CustomInput
                                        value={currentPassword}
                                        onChangeText={setCurrentPassword}
                                        placeholder="Ingresa tu contraseña actual"
                                        secureTextEntry={!showCurrentPassword}
                                        className="flex-1"
                                    />
                                    <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                                        <Ionicons
                                            name={showCurrentPassword ? 'eye-off' : 'eye'}
                                            size={20}
                                            color="#999"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View>
                                <TextRegular className="text-neutral-gray text-sm mb-1">Nueva Contraseña</TextRegular>
                                <View className="flex-row items-center bg-white border-2 border-neutral-gray/30 rounded-xl px-3">
                                    <CustomInput
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        placeholder="Mínimo 6 caracteres"
                                        secureTextEntry={!showNewPassword}
                                        className="flex-1"
                                    />
                                    <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                                        <Ionicons
                                            name={showNewPassword ? 'eye-off' : 'eye'}
                                            size={20}
                                            color="#999"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View>
                                <TextRegular className="text-neutral-gray text-sm mb-1">Confirmar Nueva Contraseña</TextRegular>
                                <View className="flex-row items-center bg-white border-2 border-neutral-gray/30 rounded-xl px-3">
                                    <CustomInput
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        placeholder="Confirma tu nueva contraseña"
                                        secureTextEntry={!showConfirmPassword}
                                        className="flex-1"
                                    />
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <Ionicons
                                            name={showConfirmPassword ? 'eye-off' : 'eye'}
                                            size={20}
                                            color="#999"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className="bg-primary-yellow/10 p-3 rounded-xl">
                                <View className="flex-row items-start">
                                    <Ionicons name="information-circle-outline" size={20} color="#FDB40F" style={{ marginTop: 2 }} />
                                    <TextRegular className="text-dark-black text-xs ml-2 flex-1">
                                        La contraseña debe tener al menos 6 caracteres. Si cambias tu contraseña, deberás iniciar sesión nuevamente.
                                    </TextRegular>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Preferencias de Viajes */}
                <View className="px-6 py-4">
                    <TextBold className="text-lg text-dark-black mb-3">Preferencias de usuario</TextBold>

                    {isLoading ? (
                        <View className="py-8 items-center">
                            <ActivityIndicator size="large" color="#FBD85D" />
                            <TextRegular className="text-neutral-gray mt-4">Cargando preferencias...</TextRegular>
                        </View>
                    ) : (
                        <>
                            {/* Auto-actualización de Estados */}
                            <View className="bg-neutral-gray/10 p-4 rounded-2xl mb-4">
                                <View className="flex-row items-center justify-between mb-2">
                                    <View className="flex-1 mr-4">
                                        <TextBold className="text-dark-black mb-1">
                                            Actualización Automática
                                        </TextBold>
                                        <TextRegular className="text-neutral-gray text-sm">
                                            Actualiza automáticamente el estado de tus viajes sin necesidad de
                                            confirmación
                                        </TextRegular>
                                    </View>
                                    <Switch
                                        value={autoUpdate}
                                        onValueChange={setAutoUpdate}
                                        trackColor={{ false: '#D1D5DB', true: '#FBD85D' }}
                                        thumbColor={autoUpdate ? '#FDB40F' : '#F3F4F6'}
                                        ios_backgroundColor="#D1D5DB"
                                    />
                                </View>

                                {/* Información adicional */}
                                <View className="mt-3 p-3 bg-primary-yellow/10 rounded-xl">
                                    <View className="flex-row items-start">
                                        <Ionicons
                                            name="information-circle-outline"
                                            size={20}
                                            color="#FDB40F"
                                            style={{ marginTop: 2 }}
                                        />
                                        <TextRegular className="text-dark-black text-xs ml-2 flex-1">
                                            {autoUpdate
                                                ? 'Tus viajes cambiarán de estado automáticamente según las fechas programadas.'
                                                : 'Recibirás notificaciones para confirmar manualmente el inicio y fin de tus viajes.'}
                                        </TextRegular>
                                    </View>
                                </View>
                            </View>

                            {/* Zona Horaria */}
                            <View className="bg-neutral-gray/10 p-4 rounded-2xl mb-4">
                                <TextBold className="text-dark-black mb-2">Zona Horaria</TextBold>
                                <TextRegular className="text-neutral-gray text-sm mb-3">
                                    Selecciona tu zona horaria para gestionar correctamente tus viajes
                                </TextRegular>

                                <TouchableOpacity
                                    onPress={() => setShowTimezoneList(!showTimezoneList)}
                                    className="bg-white border-2 border-neutral-gray/30 p-4 rounded-xl flex-row items-center justify-between"
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center flex-1">
                                        <Ionicons name="globe-outline" size={20} color="#666" />
                                        <TextRegular className="text-dark-black ml-2 flex-1">
                                            {getTimezoneLabel(selectedTimezone)}
                                        </TextRegular>
                                    </View>
                                    <Ionicons
                                        name={showTimezoneList ? 'chevron-up' : 'chevron-down'}
                                        size={20}
                                        color="#666"
                                    />
                                </TouchableOpacity>

                                {/* Lista de Zonas Horarias */}
                                {showTimezoneList && (
                                    <View className="mt-2 bg-white border-2 border-neutral-gray/30 rounded-xl overflow-hidden">
                                        <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
                                            {COMMON_TIMEZONES.map((tz) => (
                                                <TouchableOpacity
                                                    key={tz.value}
                                                    onPress={() => {
                                                        setSelectedTimezone(tz.value);
                                                        setShowTimezoneList(false);
                                                    }}
                                                    className={`p-4 border-b border-neutral-gray/10 ${selectedTimezone === tz.value ? 'bg-primary-yellow/20' : ''
                                                        }`}
                                                    activeOpacity={0.7}
                                                >
                                                    <View className="flex-row items-center justify-between">
                                                        <TextRegular className="text-dark-black flex-1">
                                                            {tz.label}
                                                        </TextRegular>
                                                        {selectedTimezone === tz.value && (
                                                            <Ionicons name="checkmark-circle" size={20} color="#FDB40F" />
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Footer con Botones */}
            <View className="px-6 py-4 border-t border-neutral-gray/20 flex-row gap-3 bg-white">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="flex-1 bg-neutral-gray/20 py-4 rounded-2xl items-center"
                    activeOpacity={0.7}
                >
                    <TextBold className="text-dark-black">Cancelar</TextBold>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleSave}
                    disabled={isSaving}
                    className={`flex-1 py-4 rounded-2xl items-center ${isSaving ? 'bg-primary-yellow/50' : 'bg-primary-yellow'
                        }`}
                    activeOpacity={0.7}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#202020" />
                    ) : (
                        <TextBold className="text-dark-black">Guardar Cambios</TextBold>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
