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

const carLogoImage = require('../../assets/logo.png');

interface AlertConfig {
  title: string;
  message: string;
  type: 'error' | 'success';
}

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      showAlert('Email inválido', 'Por favor introduce una dirección de correo válida.');
      return;
    }
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      showAlert(
        'Email enviado',
        'Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.',
        'success'
      );
    } catch (e: any) {
      showAlert('Error', e.message || 'No se pudo enviar el email. Inténtalo de nuevo.');
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
        onClose={() => {
          setAlertVisible(false);
          if (alertConfig.type === 'success') {
            router.replace(ROUTES.login);
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
            <Text className="text-2xl text-[#202020]">Recupera tu acceso a</Text>
            <Text className="text-3xl font-bold text-[#202020] mb-3 text-center">PlanMyRoute</Text>
            <Image accessible={false} source={carLogoImage} style={{ width: 160, height: 96 }} resizeMode="contain" />
          </View>

          <View className="w-full">
            <Text className="text-2xl font-bold text-[#202020] mb-3">¿Olvidaste tu contraseña?</Text>
            <Text className="text-base text-[#202020] mb-6">
              Introduce tu email y te enviaremos un enlace para crear una nueva.
            </Text>

            <Text className="text-base font-semibold text-[#202020] mb-2 ml-2">Email</Text>
            <View className="flex-row items-center bg-white rounded-full h-14 px-6 mb-4 shadow-sm">
              <Ionicons name="mail-outline" size={20} color="#666" style={{ marginRight: 10 }} />
              <TextInput
                accessibilityLabel="Email"
                className="flex-1 text-base text-black h-full"
                placeholder="planmyroute@gmail.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            <TouchableOpacity
              className="bg-[#202020] rounded-full h-14 justify-center items-center mb-4 mt-4 shadow-md"
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-lg font-bold">Enviar enlace</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-4">
              <Pressable onPress={() => router.replace(ROUTES.login)}>
                <Text className="text-[#202020] font-bold underline">Volver a iniciar sesión</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
