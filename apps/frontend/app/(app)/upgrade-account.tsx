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
import { supabase } from '../../lib/supabase';

const carLogoImage = require('../../assets/car-logo.png');

interface AlertConfig {
  title: string;
  message: string;
  type: 'error' | 'success';
}

export default function UpgradeAccountScreen() {
  const { isGuest } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
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

  const handleUpgrade = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showAlert('Email inválido', 'Por favor introduce una dirección de correo válida.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Error de contraseña', 'Las contraseñas no coinciden.');
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
      // Vincula email + password al usuario anónimo actual. El user.id se conserva,
      // así que todos los viajes creados como invitado siguen siendo del mismo usuario.
      const { error } = await supabase.auth.updateUser({ email, password });
      if (error) throw error;

      showAlert(
        'Cuenta creada',
        'Hemos enviado un email para confirmar tu dirección. Una vez confirmado, ya podrás iniciar sesión con tu email y contraseña.',
        'success'
      );
    } catch (e: any) {
      showAlert('Error', e.message || 'No se pudo crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isGuest) {
    // No es invitado — no hay nada que upgradear.
    return (
      <View className="flex-1 bg-primary justify-center items-center px-8">
        <Text className="text-[#1D1D1B] text-center mb-4">
          Esta opción solo está disponible para cuentas de invitado.
        </Text>
        <TouchableOpacity onPress={() => router.replace(ROUTES.tabsHome)}>
          <Text className="text-[#1D1D1B] font-bold underline">Volver al inicio</Text>
        </TouchableOpacity>
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
        onClose={() => {
          setAlertVisible(false);
          if (alertConfig.type === 'success') {
            router.replace(ROUTES.tabsHome);
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
          <View className="items-center mb-6">
            <Image source={carLogoImage} style={{ width: 160, height: 96 }} resizeMode="contain" />
          </View>

          <Text className="text-2xl font-bold text-[#1D1D1B] mb-2">Crea tu cuenta</Text>
          <Text className="text-base text-[#1D1D1B] mb-6">
            Vincula un email y contraseña para conservar tus viajes y poder iniciar sesión más adelante.
          </Text>

          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">Email</Text>
          <View className="flex-row items-center bg-white rounded-full h-14 px-6 mb-4 shadow-sm">
            <Ionicons name="mail-outline" size={20} color="#666" style={{ marginRight: 10 }} />
            <TextInput
              className="flex-1 text-base text-black h-full"
              placeholder="planmyroute@gmail.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
            />
          </View>

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
              onSubmitEditing={handleUpgrade}
            />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
              <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={22} color="#666" />
            </Pressable>
          </View>

          <TouchableOpacity
            className="bg-[#232323] rounded-full h-14 justify-center items-center mb-4 mt-4 shadow-md"
            onPress={handleUpgrade}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-lg font-bold">Crear cuenta</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mt-2">
            <Pressable onPress={() => router.back()}>
              <Text className="text-[#1D1D1B] font-bold underline">Seguir como invitado</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
