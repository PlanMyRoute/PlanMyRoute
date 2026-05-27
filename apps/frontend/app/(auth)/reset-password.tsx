import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomAlert from '../../components/customElements/CustomAlert';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';

const carLogoImage = require('../../assets/car-logo.png');

interface AlertConfig {
  title: string;
  message: string;
  type: 'error' | 'success';
}

export default function ResetPasswordScreen() {
  const { updatePassword, signOut } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: '',
    message: '',
    type: 'error',
  });

  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      showAlert('Campos vacíos', 'Por favor introduce y confirma tu nueva contraseña.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Error de contraseña', 'Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      showAlert(
        'Contraseña débil',
        'La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await updatePassword(password);
      showAlert(
        'Contraseña actualizada',
        'Tu contraseña se ha cambiado correctamente. Inicia sesión con la nueva.',
        'success'
      );
    } catch (e: any) {
      showAlert('Error', e.message || 'No se pudo actualizar la contraseña. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccess = async () => {
    // Tras cambiar la contraseña Supabase deja una sesión temporal activa.
    // Cerramos sesión para forzar un login limpio con la nueva contraseña.
    await signOut();
    router.replace(ROUTES.login);
  };

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
        onClose={() => {
          setAlertVisible(false);
          if (alertConfig.type === 'success') {
            handleSuccess();
          }
        }}
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <ScrollView
          contentContainerClassName="flex-grow px-8 py-8 justify-center"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="items-center mb-8">
            <Image source={carLogoImage} style={{ width: 160, height: 96 }} resizeMode="contain" />
          </View>

          <View className="w-full">
            <Text className="text-2xl font-bold text-[#1D1D1B] mb-3">Nueva contraseña</Text>
            <Text className="text-base text-[#1D1D1B] mb-6">
              Introduce y confirma tu nueva contraseña.
            </Text>

            <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">Contraseña</Text>
            <View className="flex-row items-center bg-white rounded-full h-14 px-6 mb-4 shadow-sm">
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={{ marginRight: 10 }} />
              <TextInput
                className="flex-1 text-base text-black h-full"
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color="#666" />
              </Pressable>
            </View>

            <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">
              Confirmar contraseña
            </Text>
            <View className="flex-row items-center bg-white rounded-full h-14 px-6 mb-4 shadow-sm">
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={{ marginRight: 10 }} />
              <TextInput
                className="flex-1 text-base text-black h-full"
                placeholder="••••••••"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
                <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={22} color="#666" />
              </Pressable>
            </View>

            <TouchableOpacity
              className="bg-[#232323] rounded-full h-14 justify-center items-center mb-4 mt-4 shadow-md"
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-lg font-bold">Cambiar contraseña</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
