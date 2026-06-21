import CustomDateTimePicker from "@/components/customElements/CustomDateTimePicker";
import FilePicker, { FileInfo } from "@/components/trip/FilePicker";
import { PLACEHOLDER_TEXT_COLOR } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Accommodation } from "@planmyroute/types";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

type AccommodationData = Partial<Omit<Accommodation, "id">> & {
  reservationFile?: FileInfo | null;
  estimated_price?: number;
};

interface AccommodationStopFormProps {
  accommodationData: AccommodationData;
  onUpdateField: (field: keyof AccommodationData, value: any) => void;
}

function timeStringToDate(
  time: string | undefined,
  fallbackHour: number,
): Date {
  const date = new Date();
  if (time) {
    const [hours, minutes] = time.split(":").map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
  } else {
    date.setHours(fallbackHour, 0, 0, 0);
  }
  return date;
}

function TimeField({
  label,
  value,
  placeholder,
  iconName,
  fallbackHour,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  iconName: keyof typeof Ionicons.glyphMap;
  fallbackHour: number;
  onChange: (time: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View className="flex-1">
      <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
        {label}
      </Text>
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        className="flex-row items-center bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5"
      >
        <Ionicons name={iconName} size={16} color="#9CA3AF" />
        <Text
          className={`ml-2 text-sm ${value ? "text-dark-black" : "text-neutral-gray"}`}
        >
          {value || placeholder}
        </Text>
      </TouchableOpacity>
      <CustomDateTimePicker
        value={timeStringToDate(value, fallbackHour)}
        mode="time"
        isVisible={showPicker}
        onConfirm={(date) => {
          setShowPicker(false);
          onChange(
            `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`,
          );
        }}
        onCancel={() => setShowPicker(false)}
      />
    </View>
  );
}

export default function AccommodationStopForm({
  accommodationData,
  onUpdateField,
}: AccommodationStopFormProps) {
  return (
    <View className="bg-gray-50 border border-neutral-gray/20 rounded-2xl p-4 gap-3">
      <Text className="text-xs font-bold text-dark-black uppercase tracking-widest mb-1">
        Detalles del alojamiento
      </Text>

      {/* URL */}
      <View>
        <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
          URL de reserva
        </Text>
        <TextInput
          placeholder="https://..."
          className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
          placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
          value={accommodationData.url || ""}
          onChangeText={(value) => onUpdateField("url", value)}
          keyboardType="url"
        />
      </View>

      {/* Check-in / Check-out */}
      <View className="flex-row gap-3">
        <TimeField
          label="Check-in"
          value={accommodationData.check_in_time || ""}
          placeholder="15:00"
          iconName="enter"
          fallbackHour={15}
          onChange={(time) => onUpdateField("check_in_time", time)}
        />
        <TimeField
          label="Check-out"
          value={accommodationData.check_out_time || ""}
          placeholder="12:00"
          iconName="exit"
          fallbackHour={12}
          onChange={(time) => onUpdateField("check_out_time", time)}
        />
      </View>

      {/* Código de reserva */}
      <View>
        <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
          Código de reserva
        </Text>
        <TextInput
          placeholder="Ej: ABC123"
          className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
          placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
          value={accommodationData.reservation_code || ""}
          onChangeText={(value) => onUpdateField("reservation_code", value)}
        />
      </View>

      {/* Contacto + Noches */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
            Contacto
          </Text>
          <TextInput
            placeholder="Teléfono o email"
            className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
            value={accommodationData.contact || ""}
            onChangeText={(value) => onUpdateField("contact", value)}
          />
        </View>
        <View className="w-24">
          <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
            Noches
          </Text>
          <TextInput
            placeholder="1"
            className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
            keyboardType="number-pad"
            value={accommodationData.nights?.toString() || ""}
            onChangeText={(value) =>
              onUpdateField("nights", value ? parseInt(value) : 1)
            }
          />
        </View>
      </View>

      {/* Precio por noche */}
      <View>
        <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
          Precio por noche (€)
        </Text>
        <TextInput
          placeholder="Ej: 75.00"
          className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
          placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
          keyboardType="decimal-pad"
          value={accommodationData.estimated_price?.toString() || ""}
          onChangeText={(value) => {
            const n = parseFloat(value.replace(",", "."));
            if (!isNaN(n)) {
              onUpdateField("estimated_price", n);
              if (!accommodationData.nights) onUpdateField("nights", 1);
            } else {
              onUpdateField("estimated_price", undefined);
            }
          }}
        />
      </View>

      <FilePicker
        label="Comprobante de reserva del alojamiento"
        currentFile={accommodationData.reservationFile || null}
        onFileSelected={(file) => onUpdateField("reservationFile", file)}
      />
    </View>
  );
}
