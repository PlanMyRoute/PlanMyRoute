import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import CustomAlert from '../../components/customElements/CustomAlert';
import { useAuth } from '../../context/AuthContext';
import { UserService } from '../../services/userService';

const carLogoImage = require('../../assets/car-logo.png');

export default function CompleteProfileScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userExists, setUserExists] = useState(false);

  // Alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    type: 'error' as 'error' | 'success'
  });

  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  // Cargar perfil una sola vez al montar
  useEffect(() => {
    const loadProfile = async () => {
      console.log('🔄 [CompleteProfile] Iniciando carga de perfil...');
      console.log('User ID:', user?.id);
      console.log('User metadata:', user?.user_metadata);
      
      if (!user?.id) {
        console.log('⚠️ No hay usuario autenticado');
        setIsLoading(false);
        return;
      }

      // Timeout de seguridad de 5 segundos
      const timeoutId = setTimeout(() => {
        console.log('⏱️ Timeout de carga alcanzado, usando datos de auth');
        if (user?.user_metadata) {
          setName(user.user_metadata.name || user.user_metadata.full_name || '');
          setSurname(user.user_metadata.surname || '');
          setUserName(user.user_metadata.user_name || '');
        }
        setUserExists(false);
        setIsLoading(false);
      }, 5000);

      try {
        console.log('🔍 Verificando si usuario existe en BD...');
        const profile = await UserService.getUserProfile(user.id, { token: token || undefined });
        clearTimeout(timeoutId);
        
        if (profile?.user) {
          console.log('✅ Perfil encontrado, pre-llenando datos');
          setName(profile.user.name || '');
          setLastname(profile.user.lastname || '');
          setUsername(profile.user.username || '');
          setUserExists(true);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.log('⚠️ No hay perfil en BD, usando datos de auth', error);
        // Usuario no existe, usar datos de Google Auth
        if (user?.user_metadata) {
          const fullName = user.user_metadata.full_name || '';
          const names = fullName.split(' ');
          setName(user.user_metadata.name || names[0] || '');
          setLastname(user.user_metadata.surname || (names.length > 1 ? names.slice(1).join(' ') : '') || '');
          setUsername(user.user_metadata.user_name || '');
        }
        setUserExists(false);
      } finally {
        setIsLoading(false);
        console.log('✅ [CompleteProfile] Carga finalizada');
      }
    };

    loadProfile();
  }, [user?.id]);

  const handleSaveProfile = async () => {
    console.log('=== handleSaveProfile ===');
    
    // Validaciones
    if (!username.trim()) {
      showAlert('Campo requerido', 'El nombre de usuario es obligatorio.');
      return;
    }

    if (!name.trim()) {
      showAlert('Campo requerido', 'El nombre es obligatorio.');
      return;
    }

    // Validar formato de username (3-20 caracteres, solo alfanuméricos y guiones bajos)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      showAlert(
        'Username inválido',
        'El username debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos.'
      );
      return;
    }

    if (!user) {
      console.log('No hay usuario, abortando');
      return;
    }

    setIsSaving(true);
    try {
      const profileData = {
        name: name.trim(),
        lastname: lastname.trim() || '',
        username: username.trim(),
      };

      console.log('Guardando perfil con:', profileData);

      let result;
      
      // Verificar nuevamente si el usuario existe (pudo ser creado por el trigger)
      let finalUserExists = userExists;
      try {
        const checkProfile = await UserService.getUserProfile(user.id, {});
        if (checkProfile?.user) {
          finalUserExists = true;
          console.log('✅ Usuario ya existe (creado por trigger), actualizando...');
        }
      } catch (e) {
        finalUserExists = false;
        console.log('⚠️ Usuario no existe, creando...');
      }

      if (!finalUserExists) {
        console.log('📝 Creando usuario...');
        result = await UserService.createUser({
          id: user.id,
          email: user.email!,
          ...profileData,
          img: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          timezone: 'UTC',
          auto_trip_status_update: false,
        }, token || undefined);
        console.log('✅ Usuario creado:', result);
      } else {
        console.log('🔄 Actualizando usuario existente...');
        result = await UserService.updateUser(user.id, profileData, token || undefined);
        console.log('✅ Usuario actualizado:', result);
      }

      await queryClient.invalidateQueries({ queryKey: ['user', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });

      // Limpiar flag de localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('needsCompleteProfile');
      }

      showAlert('¡Perfecto!', 'Tu perfil está completo. ¡Bienvenido a PlanMyRoute!', 'success');
      
      // Redirigir después de mostrar el alert
      setTimeout(() => {
        router.replace('/');
      }, 1500);

    } catch (e) {
      console.error('Error al guardar perfil:', e);
      showAlert('Error', (e as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-primary">
        <ActivityIndicator size="large" color="#232323" />
        <Text className="mt-4 text-base text-[#1D1D1B]">Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-primary"
    >
      <CustomAlert
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />

      <ScrollView
        contentContainerClassName="flex-grow px-8 pt-12 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-6">
          <Image source={carLogoImage} style={{ width: 120, height: 70 }} resizeMode="contain"/>
          <Text className="text-3xl font-bold text-[#1D1D1B] mt-4">¡Último paso!</Text>
          <Text className="text-base text-[#666] text-center mt-2 px-4">
            Completa tu perfil para empezar a planificar tus viajes
          </Text>
        </View>

        <View className="w-full">
          {/* Username */}
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">
            Username <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            className="bg-white rounded-full h-14 px-6 text-base mb-4 shadow-sm text-black"
            placeholder="usuario123"
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />

          {/* Nombre */}
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">
            Nombre <Text className="text-red-500">*</Text>
          </Text>
          <TextInput
            className="bg-white rounded-full h-14 px-6 text-base mb-4 shadow-sm text-black"
            placeholder="Juan"
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
          />

          {/* Apellido */}
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">Apellido</Text>
          <TextInput
            className="bg-white rounded-full h-14 px-6 text-base mb-6 shadow-sm text-black"
            placeholder="Pérez"
            placeholderTextColor="#9ca3af"
            value={lastname}
            onChangeText={setLastname}
          />

          <TouchableOpacity
            className="bg-[#232323] rounded-full h-14 justify-center items-center shadow-md"
            onPress={handleSaveProfile}
            activeOpacity={0.8}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white text-lg font-bold">Completar Perfil</Text>
            )}
          </TouchableOpacity>

          <View className="mt-6 items-center">
            <Text className="text-xs text-[#666] text-center">
              Los campos marcados con <Text className="text-red-500">*</Text> son obligatorios
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}