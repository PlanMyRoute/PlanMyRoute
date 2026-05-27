import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { ROUTES } from '../constants/routes';
import { useAuth } from '../context/AuthContext';

export default function GuestBanner() {
  const { isGuest } = useAuth();
  const router = useRouter();

  if (!isGuest) return null;

  return (
    <View className="flex-row items-center justify-between bg-[#FEF3C7] border-b border-[#F59E0B] px-4 py-2">
      <View className="flex-row items-center flex-1">
        <Ionicons name="information-circle-outline" size={18} color="#92400E" />
        <Text className="text-[#92400E] text-xs ml-2 flex-1" numberOfLines={2}>
          Estás navegando como invitado. Crea una cuenta para no perder tus datos.
        </Text>
      </View>
      <Pressable
        onPress={() => router.push(ROUTES.upgradeAccount)}
        className="ml-3"
        hitSlop={8}
      >
        <Text className="text-[#92400E] text-xs font-bold underline">Crear cuenta</Text>
      </Pressable>
    </View>
  );
}
