import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ROUTES } from '../../constants/routes';
import { useEffect, useState } from 'react';
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
  View
} from 'react-native';
import CustomAlert from '../../components/customElements/CustomAlert';
import { useAuth } from '../../context/AuthContext';

const carLogoImage = require('../../assets/car-logo.png');

interface AlertConfig {
  title: string;
  message: string;
  type: 'error' | 'success';
}

export default function LoginScreen() {
  const { login, signInWithGoogle, signInAsGuest, user, isLoading } = useAuth();
  const router = useRouter();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // const [rememberMe, setRememberMe] = useState(false);

  // --- Lógica de la Alerta ---
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: '',
    message: '',
    type: 'error'
  });

  const showAlert = (title: string, message: string, type: 'error' | 'success' = 'error') => {
    setAlertConfig({ title, message, type });
    setAlertVisible(true);
  };

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(ROUTES.tabsHome);
    }
  }, [user, isLoading]);

  const handleLogin = async () => {
    if (!email || !password) {
      // Aquí se llama a la función que cambia el estado a true
      showAlert('Campos incompletos', 'Por favor, introduce tu email y contraseña para continuar.');
      return;
    }
    setIsLoggingIn(true);
    try {
      await login(email, password);
    } catch (e) {
      showAlert('Error de acceso', 'El usuario o la contraseña son incorrectos. Por favor inténtalo de nuevo.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      showAlert('Error', e.message || 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.');
    }
  };

  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    try {
      await signInAsGuest();
    } catch (e: any) {
      showAlert('Error', e.message || 'No se pudo iniciar el modo invitado.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
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
        contentContainerClassName="flex-grow px-8 pt-16 pb-8 justify-start"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >

        {/* --- HEADER --- */}
        <View className="items-center mb-8">
          <Text className="text-3xl text-[#1D1D1B]">
            Bienvenid@ a
          </Text>
          <Text className="text-4xl font-bold text-[#1D1D1B] mb-6 text-center">
            PlanMyRoute
          </Text>
          <Image
            source={carLogoImage}
            className="mb-4"
            style={{ width: 192, height: 112 }}
            resizeMode="contain"
          />
        </View>

        {/* --- FORMULARIO --- */}
        <View className="w-full">
          <Text className="text-2xl font-bold text-[#1D1D1B] mb-6">
            Inicia Sesión
          </Text>

          {/* Email */}
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">
            Email
          </Text>
          <TextInput
            className="bg-white rounded-full h-14 px-6 text-base mb-4 shadow-sm text-black"
            placeholder="planmyroute@gmail.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
          />

          {/* Contraseña */}
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">
            Contraseña
          </Text>
          <View className="flex-row items-center bg-white rounded-full h-14 px-6 mb-2 shadow-sm">
            <TextInput
              className="flex-1 text-base text-black h-full"
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
              <Ionicons
                name={showPassword ? 'eye' : 'eye-off'}
                size={22}
                color="#666"
              />
            </Pressable>
          </View>

          {/* Forgot password */}
          <Pressable
            onPress={() => router.push(ROUTES.forgotPassword)}
            className="self-end mb-2"
          >
            <Text className="text-[#1D1D1B] text-sm underline">¿Olvidaste tu contraseña?</Text>
          </Pressable>

          {/* Botón Principal */}
          <TouchableOpacity
            className="bg-[#232323] rounded-full h-14 justify-center items-center mb-4 mt-6 shadow-md"
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-lg font-bold">
                Iniciar Sesión
              </Text>
            )}
          </TouchableOpacity>

          {/* Separador */}
          <Text className="text-center text-xl font-bold text-[#1D1D1B] mb-4">
            o
          </Text>

          {/* Botón Google */}
          <TouchableOpacity
            className="bg-white rounded-full h-14 flex-row justify-center items-center mb-3 shadow-sm"
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={20} color="black" style={{ marginRight: 10 }} />
            <Text className="text-[#1D1D1B] text-lg font-bold">
              Continuar con Google
            </Text>
          </TouchableOpacity>

          {/* Botón Invitado */}
          <TouchableOpacity
            className="bg-transparent border border-[#1D1D1B] rounded-full h-14 flex-row justify-center items-center mb-8"
            onPress={handleGuestLogin}
            activeOpacity={0.7}
            disabled={isGuestLoading}
          >
            {isGuestLoading ? (
              <ActivityIndicator color="#1D1D1B" />
            ) : (
              <>
                <Ionicons name="person-outline" size={20} color="#1D1D1B" style={{ marginRight: 10 }} />
                <Text className="text-[#1D1D1B] text-lg font-bold">
                  Continuar como invitado
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Footer Links */}
          <View className="flex-row justify-center mb-6">
            <Text className="text-[#1D1D1B]">
              ¿No tienes cuenta?{' '}
            </Text>
            <Pressable onPress={() => router.push(ROUTES.register)}>
              <Text className="text-[#1D1D1B] font-bold underline">
                Regístrate
              </Text>
            </Pressable>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}