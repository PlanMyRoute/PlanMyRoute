import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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

export default function RegisterScreen() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    // 1.5. Validar username (mínimo 3 caracteres, solo alfanuméricos y guiones bajos)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      showAlert('Username inválido', 'El username debe tener entre 3 y 20 caracteres y solo puede contener letras, números y guiones bajos.');
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
    try {
      console.log('🔵 Iniciando registro...');
      const result = await signUp(email, password, username);
      console.log('🔵 Registro exitoso, redirigiendo a verify-email...');
      console.log('🔵 Email:', email);
      
      // Usar setTimeout para asegurar que la redirección ocurra después del render
      setTimeout(() => {
        console.log('🔵 Ejecutando redirección...');
        router.replace(`/verify-email?email=${encodeURIComponent(email)}`);
      }, 100);
      
      console.log('🔵 Redirección programada');
    } catch (e) {
      console.error('🔴 Error en registro:', e);
      showAlert('Error en el registro', (e as Error).message);
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
        contentContainerClassName="flex-grow px-8 pt-16 pb-8 justify-start"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-6">
          <Text className="text-3xl text-[#1D1D1B]">Bienvenid@ a</Text>
          <Text className="text-4xl font-bold text-[#1D1D1B] mb-4 text-center">PlanMyRoute</Text>
          <Image source={carLogoImage} className="mb-4" style={{ width: 192, height: 112 }} resizeMode="contain"/>
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
            keyboardType="email-address"
          />

          {/* Contraseña */}
          <Text className="text-base font-semibold text-[#1D1D1B] mb-2 ml-2">Contraseña</Text>
          <View className="flex-row items-center bg-white rounded-full h-14 px-6 mb-4 shadow-sm">
            <TextInput
              className="flex-1 text-base text-black h-full"
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
              <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={22} color="#666" />
            </Pressable>
          </View>

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
            />
            <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="p-1">
              <Ionicons name={showConfirmPassword ? 'eye' : 'eye-off'} size={22} color="#666" />
            </Pressable>
          </View>

          <TouchableOpacity
            className="bg-[#232323] rounded-full h-14 justify-center items-center mb-4 mt-6 shadow-md"
            onPress={handleRegister}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-bold">Registrarse</Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mb-6 mt-6">
            <Text className="text-[#1D1D1B]">¿Ya tienes una cuenta? </Text>
            <Pressable onPress={() => router.push('/login')}>
              <Text className="text-[#1D1D1B] font-bold underline">Inicia sesión</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}