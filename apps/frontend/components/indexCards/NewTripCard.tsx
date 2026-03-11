import { MicrotextDark, TextRegular } from '@/components/customElements/CustomText';
import { Ionicons } from '@expo/vector-icons';
import { Link } from "expo-router";
import { Pressable, View } from 'react-native';

export const NewTripCard = () => {
    return (
        <Link asChild href="/(app)/(tabs)/createTrip">
            <Pressable
                className="bg-white border-2 border-dashed border-neutral-gray/30 rounded-3xl p-8 items-center justify-center min-h-[200px]"
                style={({ pressed }) => ({
                    opacity: pressed ? 0.8 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
            >
                <View className="w-16 h-16 bg-primary-yellow/20 rounded-full items-center justify-center mb-4">
                    <Ionicons name="add" size={32} color="#202020" />
                </View>
                <TextRegular className="text-dark-black mb-1">
                    Crear nuevo viaje
                </TextRegular>
                <MicrotextDark className="text-neutral-gray text-center">
                    Comienza a planear tu próxima aventura
                </MicrotextDark>
            </Pressable>
        </Link>
    )
}