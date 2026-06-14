import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';

const carLogoImage = require('../../assets/logo.png');

interface AlertConfig {
  title: string;
  message: string;
  type: 'error' | 'success';
}

export default function RegisterScreen() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
  };

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollToBottom = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
  };

  // --- LÓGICA DEL CUSTOM ALERT ---
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

  const handleRegister = async () => {
    // 1. Validar campos vacíos
    if (!username || !email || !password || !confirmPassword) {
      showAlert('Campos vacíos', 'Por favor completa todos los campos para registrarte.');
      return;
    }

    // 1.5. Validar username (mínimo 3 caracteres, alfanuméricos, guiones y guiones bajos)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      showAlert('Username inválido', 'El username debe tener entre 3 y 20 caracteres y solo puede contener letras, números, guiones y guiones bajos.');
      return;
    }

    // 2. VALIDAR FORMATO DE EMAIL (NUEVO)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Email inválido', 'Por favor introduce una dirección de correo válida.');
      return;
    }

    // 3. Validar que contraseñas coincidan
    if (password !== confirmPassword) {
      showAlert('Error de contraseña', 'Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    // 4. Validar seguridad de contraseña (Min 8 chars, 1 Mayus, 1 Minus, 1 Num)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      showAlert(
        'Contraseña débil',
        'La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula y un número.'
      );
      return;
    }

    // 5. Intentar registro
    setIsSubmitting(true);
    try {
      console.log('🔵 Iniciando registro...');
      const result = await signUp(email, password, username);
      console.log('🔵 Registro exitoso, redirigiendo a verify-email...');
      console.log('🔵 Email:', email);

      router.replace(ROUTES.verifyEmail(email));
    } catch (e) {
      console.error('🔴 Error en registro:', e);
      const message = (e as Error).message;
      if (message === 'EMAIL_ALREADY_REGISTERED') {
        showAlert(
          'Email ya registrado',
          'Ya existe una cuenta con este email. Inicia sesión o recupera tu contraseña si la has olvidado.'
        );
        return;
      }
      showAlert('Error en el registro', message);
    } finally {
      setIsSubmitting(false);
    }
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
        onClose={() => setAlertVisible(false)}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerClassName="flex-grow px-8 pt-16 pb-8 justify-start"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        <View className="items-center mb-6">
          <Text className="text-3xl text-[#1D1D1B]">Bienvenid@ a</Text>
          <Text className="text-4xl font-bold text-[#1D1D1B] mb-4 text-center">PlanMyRoute</Text>
          <Image source={carLogoImage} className="mb-4" style={{ width: 192, height: 112 }} resizeMode="contain" />
        </View>

        <View className="w-full">
          <Text className="text-2xl font-bold text-[#1D1D1B] mb-6">Regístrate</Text>

          {/* Username */}
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">Username</Text>
          <TextInput
            className="bg-white rounded-full h-14 px-6 text-base mb-4 shadow-sm text-black"
            placeholder="usuario123"
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username-new"
            returnKeyType="next"
          />

          {/* Email */}
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">Email</Text>
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
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">Contraseña</Text>
          <View className="flex-row items-center bg-white rounded-full h-14 px-6 mb-2 shadow-sm">
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
              onFocus={scrollToBottom}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color="#666" />
            </Pressable>
          </View>

          {/* Checklist de fuerza de contraseña */}
          {password.length > 0 && (
            <View className="ml-2 mb-3">
              {([
                ['length', 'Mínimo 8 caracteres'],
                ['upper', 'Una letra mayúscula'],
                ['lower', 'Una letra minúscula'],
                ['digit', 'Un número'],
              ] as const).map(([key, label]) => {
                const ok = passwordChecks[key];
                return (
                  <View key={key} className="flex-row items-center mb-0.5">
                    <Ionicons
                      name={ok ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={ok ? '#16A34A' : '#9CA3AF'}
                    />
                    <Text className={`text-xs ml-1 ${ok ? 'text-green-700' : 'text-gray-500'}`}>
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Confirmar Contraseña */}
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">Confirmar Contraseña</Text>
          <View className="flex-row items-center bg-white rounded-full h-14 px-6 mb-4 shadow-sm">
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
              onSubmitEditing={handleRegister}
              onFocus={scrollToBottom}
            />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
              <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={22} color="#666" />
            </Pressable>
          </View>

          <TouchableOpacity
            className="bg-[#232323] rounded-full h-14 justify-center items-center mb-4 mt-6 shadow-md"
            onPress={handleRegister}
            activeOpacity={0.8}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-lg font-bold">Registrarse</Text>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center mb-6 mt-6">
            <Text className="text-[#1D1D1B]">¿Ya tienes una cuenta? </Text>
            <Pressable onPress={() => router.push(ROUTES.login)}>
              <Text className="text-[#1D1D1B] font-bold underline">Inicia sesión</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}