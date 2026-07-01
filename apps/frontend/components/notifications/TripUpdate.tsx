import {
  MicrotextDark,
  TextRegular,
} from "@/components/customElements/CustomText";
import { formatRelativeDate } from "@/utils/formatDate";
import { Notification } from "@planmyroute/types";
import { Link } from "expo-router";
import { TouchableOpacity, View } from "react-native";

interface TripUpdateProps {
  notification: Notification;
}

export const TripUpdate: React.FC<TripUpdateProps> = ({ notification }) => {
  return (
    <View className="bg-white border-2 border-neutral-gray/20 rounded-3xl p-4 mb-3">
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 pr-2">
          <View className="flex-row items-center mb-1">
            <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
            <TextRegular className="text-dark-black font-semibold">
              ℹ️ Actualización de Viaje
            </TextRegular>
          </View>
          <TextRegular className="text-dark-black mt-1">
            {notification.content}
          </TextRegular>
        </View>
        <MicrotextDark className="text-neutral-gray">
          {formatRelativeDate(notification.created_at)}
        </MicrotextDark>
      </View>

      {notification.related_trip_id && (
        <Link href={`/trip/${notification.related_trip_id}`} asChild>
          <TouchableOpacity className="bg-neutral-gray/10 border-2 border-neutral-gray/30 rounded-2xl py-2.5 px-4">
            <TextRegular className="text-dark-black text-center">
              Ver viaje
            </TextRegular>
          </TouchableOpacity>
        </Link>
      )}
    </View>
  );
};
