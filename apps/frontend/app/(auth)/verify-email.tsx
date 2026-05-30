import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
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

export default function VerifyEmailScreen() {
  const { verifyOtp, resendOtp } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;

  console.log('🟢 Pantalla verify-email cargada');
  console.log('🟢 Email recibido:', email);

  // 6 inputs separados para el código
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [isResending, setIsResending] = useState(false);

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

  const handleCodeChange = (text: string, index: number) => {
    // Solo números
    if (text && !/^\d$/.test(text)) return;

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    // Auto-focus al siguiente input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Si completó los 6 dígitos, verificar automáticamente
    if (newCode.every(digit => digit !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otp?: string) => {
    const otpCode = otp || code.join('');

    if (otpCode.length !== 6) {
      showAlert('Código incompleto', 'Por favor ingresa los 6 dígitos del código.');
      return;
    }

    console.log('🔵 Verificando código:', {
      email,
      otp: otpCode,
    });

    try {
      const result = await verifyOtp(email, otpCode);
      console.log('✅ Verificación exitosa:', result);
      showAlert(
        '¡Email verificado!',
        'Tu cuenta ha sido verificada correctamente.',
        'success'
      );
    } catch (e: any) {
      console.error('🔴 Error en verificación:', e);
      showAlert('Código inválido', e.message || 'El código ingresado no es válido o ha expirado. Por favor inténtalo de nuevo.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
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
            router.replace(ROUTES.tabsHome);
          }
        }}
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <ScrollView
          contentContainerClassName="flex-grow px-8 py-8 justify-center"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center mb-8">
            <Text className="text-2xl text-[#1D1D1B]">Verifica tu email</Text>
            <Text className="text-3xl font-bold text-[#1D1D1B] mb-3 text-center">PlanMyRoute</Text>
            <Image source={carLogoImage} style={{ width: 160, height: 96 }} resizeMode="contain" />
          </View>

          <View className="w-full">
            <Text className="text-base text-[#1D1D1B] mb-1 text-center">
              Hemos enviado un código de 6 dígitos a:
            </Text>
            <Text className="text-lg font-bold text-[#1D1D1B] mb-8 text-center">
              {email}
            </Text>

            {/* Inputs del código OTP */}
            <View className="flex-row justify-center gap-2 mb-8">
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  className="bg-white rounded-xl w-12 h-14 text-center text-2xl font-bold text-black shadow-md"
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={index === 0}
                />
              ))}
            </View>

            <TouchableOpacity
              className="bg-[#232323] rounded-full h-14 justify-center items-center mb-3 shadow-md"
              onPress={() => handleVerify()}
              activeOpacity={0.8}
            >
              <Text className="text-white text-lg font-bold">Verificar código</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white border border-[#232323] rounded-full h-14 justify-center items-center mb-3 shadow-sm"
              onPress={async () => {
                if (isResending) return;
                setIsResending(true);
                try {
                  await resendOtp(email);
                  showAlert('Código reenviado', 'Revisa tu correo electrónico', 'success');
                } catch (error: any) {
                  showAlert('Error', error.message || 'No se pudo reenviar el código', 'error');
                } finally {
                  setIsResending(false);
                }
              }}
              activeOpacity={0.8}
              disabled={isResending}
            >
              <Text className="text-[#232323] text-lg font-bold">
                {isResending ? 'Reenviando...' : 'Reenviar código'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center mt-4"
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text className="text-[#1D1D1B] text-sm underline">Volver al registro</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
