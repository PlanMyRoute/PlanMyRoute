import { CustomInput } from '@/components/customElements/CustomInput';
import CustomButton from '@/components/customElements/CustomButton';
import { MicrotextDark, SubtitleSemibold, TextRegular } from '@/components/customElements/CustomText';
import { InterestSelector } from '@/components/interests/InterestSelector';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { useUserPreferences } from '@/hooks/users/useUserPreferences';
import { useProfile } from '@/hooks/users/useUsers';
import { supabase } from '@/lib/supabase';
import { UserService } from '@/services/userService';
import { Ionicons } from '@expo/vector-icons';
import { Interest } from '@planmyroute/types';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    Switch,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const { preferences, isLoading, updatePreferences } = useUserPreferences(userId);

    const [name, setName] = useState('');
    const [lastname, setLastname] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [userInterests, setUserInterests] = useState<Interest[]>([]);

    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [selectedTimezone, setSelectedTimezone] = useState('UTC');
    const [autoUpdate, setAutoUpdate] = useState(false);
    const [showTimezoneList, setShowTimezoneList] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const { showAlert, closeAlert } = useAlert();

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
            if (!name.trim() || !lastname.trim() || !username.trim()) {
                showAlert({ title: 'Campos requeridos', message: 'El nombre, apellido y username son obligatorios', type: 'error' });
                setIsSaving(false);
                return;
            }
            if (newPassword || confirmPassword || currentPassword) {
                if (!currentPassword) {
                    showAlert({ title: 'Contraseña requerida', message: 'Debes ingresar tu contraseña actual', type: 'error' });
                    setIsSaving(false);
                    return;
                }
                if (newPassword !== confirmPassword) {
                    showAlert({ title: 'Error', message: 'Las contraseñas no coinciden', type: 'error' });
                    setIsSaving(false);
                    return;
                }
                if (newPassword.length < 6) {
                    showAlert({ title: 'Contraseña corta', message: 'La nueva contraseña debe tener al menos 6 caracteres', type: 'error' });
                    setIsSaving(false);
                    return;
                }
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error('No se pudo obtener el token de autenticación');

            await UserService.updateUser(userId, {
                name: name.trim(),
                lastname: lastname.trim(),
                username: username.trim(),
                user_type: userInterests,
            }, session.access_token);

            if (profileImage && profileImage !== profile?.user.img) {
                const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/${userId}/upload-profile-image`, {
                    method: 'POST',
                    body: JSON.stringify({ image: profileImage }),
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                });
                if (!response.ok) throw new Error('Error al actualizar la foto de perfil');
            }

            if (newPassword && currentPassword) {
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw new Error('Error al actualizar la contraseña: ' + error.message);
            }

            let emailChangePending = false;
            if (email !== user?.email) {
                const { error } = await supabase.auth.updateUser({ email });
                if (error) throw new Error('Error al actualizar el email: ' + error.message);
                emailChangePending = true;
            }

            await updatePreferences({ timezone: selectedTimezone, autoTripStatusUpdate: autoUpdate });

            if (emailChangePending) {
                showAlert({
                    title: 'Perfil actualizado',
                    message: 'Tus cambios han sido guardados.\n\nAtención: hemos enviado un email de verificación a tu nueva dirección. El cambio de email se aplicará cuando confirmes el enlace.',
                    type: 'info',
                    actions: [{ text: 'Entendido', onPress: () => { closeAlert(); router.back(); }, variant: 'primary' }],
                });
            } else {
                showAlert({
                    title: '¡Perfil actualizado!',
                    message: 'Tus cambios han sido guardados correctamente',
                    type: 'success',
                    actions: [{ text: 'OK', onPress: () => { closeAlert(); router.back(); }, variant: 'primary' }],
                });
            }
        } catch (error: unknown) {
            showAlert({ title: 'Error', message: error instanceof Error ? error.message : 'No se pudo guardar el perfil. Inténtalo de nuevo.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleProfilePicturePress = async () => {
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
                setProfileImage(`data:image/jpeg;base64,${image.base64}`);
            }
        } catch {
            showAlert({ title: 'Error', message: 'No se pudo seleccionar la foto de perfil', type: 'error' });
        }
    };

    const getTimezoneLabel = (value: string) => COMMON_TIMEZONES.find(tz => tz.value === value)?.label || value;

    if (!userId) return null;

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <Stack.Screen options={{ title: 'Editar Perfil', headerShown: true }} />

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

                {/* Foto de Perfil */}
                <View className="px-6 py-6 items-center border-b border-neutral/10">
                    <TouchableOpacity onPress={handleProfilePicturePress} activeOpacity={0.7}>
                        <View className="relative">
                            <View className="w-24 h-24 rounded-full bg-neutral/20 items-center justify-center overflow-hidden">
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} style={{ width: 96, height: 96, borderRadius: 48 }} />
                                ) : (
                                    <Ionicons name="person" size={40} color="#999" />
                                )}
                            </View>
                            <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full items-center justify-center border-2 border-white">
                                <Ionicons name="camera" size={16} color="#202020" />
                            </View>
                        </View>
                    </TouchableOpacity>
                    <MicrotextDark className="text-neutral mt-2">Toca para cambiar foto</MicrotextDark>
                </View>

                {/* Información personal */}
                <View className="px-6 py-5 border-b border-neutral/10 gap-4">
                    <SubtitleSemibold>Información personal</SubtitleSemibold>
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <CustomInput label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
                        </View>
                        <View className="flex-[1.5]">
                            <CustomInput label="Apellidos" value={lastname} onChangeText={setLastname} placeholder="Tus apellidos" />
                        </View>
                    </View>
                    <CustomInput label="Username" value={username} onChangeText={setUsername} placeholder="@username" autoCapitalize="none" />
                    <CustomInput label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" />
                </View>

                {/* Intereses */}
                <View className="px-6 py-5 border-b border-neutral/10 gap-4">
                    <SubtitleSemibold>Mis intereses</SubtitleSemibold>
                    <InterestSelector selectedInterests={userInterests} onInterestsChange={setUserInterests} multiple />
                </View>

                {/* Cambiar contraseña */}
                <View className="px-6 py-5 border-b border-neutral/10">
                    <TouchableOpacity
                        onPress={() => setShowPasswordSection(v => !v)}
                        className="flex-row items-center justify-between mb-1"
                        activeOpacity={0.7}
                    >
                        <SubtitleSemibold>Cambiar contraseña</SubtitleSemibold>
                        <Ionicons name={showPasswordSection ? 'chevron-up' : 'chevron-down'} size={20} color="#999999" />
                    </TouchableOpacity>

                    {showPasswordSection && (
                        <View className="gap-4 mt-4">
                            <CustomInput
                                label="Contraseña actual"
                                placeholder="Ingresa tu contraseña actual"
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry={!showCurrentPassword}
                                rightElement={
                                    <TouchableOpacity onPress={() => setShowCurrentPassword(v => !v)} className="px-3 py-3">
                                        <Ionicons name={showCurrentPassword ? 'eye-off' : 'eye'} size={20} color="#999999" />
                                    </TouchableOpacity>
                                }
                            />
                            <CustomInput
                                label="Nueva contraseña"
                                placeholder="Mínimo 6 caracteres"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry={!showNewPassword}
                                rightElement={
                                    <TouchableOpacity onPress={() => setShowNewPassword(v => !v)} className="px-3 py-3">
                                        <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#999999" />
                                    </TouchableOpacity>
                                }
                            />
                            <CustomInput
                                label="Confirmar nueva contraseña"
                                placeholder="Repite la nueva contraseña"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                                rightElement={
                                    <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} className="px-3 py-3">
                                        <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#999999" />
                                    </TouchableOpacity>
                                }
                            />
                            <View className="bg-primary/10 p-3 rounded-xl flex-row items-start gap-2">
                                <Ionicons name="information-circle-outline" size={18} color="#202020" style={{ marginTop: 1 }} />
                                <TextRegular className="flex-1 text-dark" style={{ fontSize: 12 }}>
                                    La contraseña debe tener al menos 6 caracteres. Si la cambias, deberás iniciar sesión nuevamente.
                                </TextRegular>
                            </View>
                        </View>
                    )}
                </View>

                {/* Preferencias */}
                <View className="px-6 py-5 gap-4">
                    <SubtitleSemibold>Preferencias</SubtitleSemibold>

                    {isLoading ? (
                        <View className="py-6 items-center">
                            <ActivityIndicator size="large" color="#FFD54D" />
                        </View>
                    ) : (
                        <>
                            {/* Auto-actualización */}
                            <View className="border border-neutral/20 rounded-2xl p-4 gap-3">
                                <View className="flex-row items-center justify-between">
                                    <View className="flex-1 mr-4">
                                        <TextRegular style={{ fontFamily: 'Urbanist-SemiBold', color: '#202020' }}>Actualización automática</TextRegular>
                                        <MicrotextDark className="text-neutral mt-1">
                                            Cambia el estado de tus viajes automáticamente según las fechas
                                        </MicrotextDark>
                                    </View>
                                    <Switch
                                        value={autoUpdate}
                                        onValueChange={setAutoUpdate}
                                        trackColor={{ false: '#D1D5DB', true: '#FFD54D' }}
                                        thumbColor={autoUpdate ? '#202020' : '#F3F4F6'}
                                        ios_backgroundColor="#D1D5DB"
                                    />
                                </View>
                            </View>

                            {/* Zona horaria */}
                            <View className="border border-neutral/20 rounded-2xl p-4 gap-3">
                                <TextRegular style={{ fontFamily: 'Urbanist-SemiBold', color: '#202020' }}>Zona horaria</TextRegular>
                                <TouchableOpacity
                                    onPress={() => setShowTimezoneList(v => !v)}
                                    className="bg-white border border-neutral/30 p-4 rounded-xl flex-row items-center justify-between"
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center flex-1 gap-2">
                                        <Ionicons name="globe-outline" size={18} color="#999999" />
                                        <TextRegular className="text-dark flex-1">{getTimezoneLabel(selectedTimezone)}</TextRegular>
                                    </View>
                                    <Ionicons name={showTimezoneList ? 'chevron-up' : 'chevron-down'} size={18} color="#999999" />
                                </TouchableOpacity>
                                {showTimezoneList && (
                                    <View className="bg-white border border-neutral/30 rounded-xl overflow-hidden">
                                        <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator>
                                            {COMMON_TIMEZONES.map(tz => (
                                                <TouchableOpacity
                                                    key={tz.value}
                                                    onPress={() => { setSelectedTimezone(tz.value); setShowTimezoneList(false); }}
                                                    className={`p-4 border-b border-neutral/10 flex-row items-center justify-between ${selectedTimezone === tz.value ? 'bg-primary/10' : ''}`}
                                                    activeOpacity={0.7}
                                                >
                                                    <TextRegular className="text-dark flex-1">{tz.label}</TextRegular>
                                                    {selectedTimezone === tz.value && <Ionicons name="checkmark-circle" size={18} color="#FFD54D" />}
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

            {/* Footer */}
            <View className="px-6 py-4 border-t border-neutral/10 flex-row gap-3 bg-white">
                <View className="flex-1">
                    <CustomButton title="Cancelar" variant="outline" size="large" onPress={() => router.back()} disabled={isSaving} />
                </View>
                <View className="flex-1">
                    <CustomButton
                        title="Guardar"
                        variant="primary"
                        size="large"
                        onPress={handleSave}
                        disabled={isSaving}
                        loading={isSaving}
                    />
                </View>
            </View>

        </SafeAreaView>
    );
}
