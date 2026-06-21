import FilePicker, { FileInfo } from "@/components/trip/FilePicker";
import { PLACEHOLDER_TEXT_COLOR } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Activity } from "@planmyroute/types";
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ActivityData = Partial<Omit<Activity, "id">> & {
  reservationFile?: FileInfo | null;
  estimated_price?: number;
};

interface ActivityStopFormProps {
  activityData: ActivityData;
  onUpdateField: (field: keyof ActivityData, value: any) => void;
}

const CATEGORIES = [
  "Museo",
  "Parque",
  "Restaurante",
  "Café",
  "Monumento",
  "Playa",
  "Montaña",
  "Tienda",
  "Teatro",
  "Cine",
  "Galería",
  "Mercado",
  "Otro",
];

export default function ActivityStopForm({
  activityData,
  onUpdateField,
}: ActivityStopFormProps) {
  const [entryPriceStr, setEntryPriceStr] = useState<string>(
    activityData.entry_price?.toString() || "",
  );
  const [durationStr, setDurationStr] = useState<string>(
    activityData.estimated_duration_minutes?.toString() || "",
  );
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    setEntryPriceStr(activityData.entry_price?.toString() || "");
  }, [activityData.entry_price]);
  useEffect(() => {
    setDurationStr(activityData.estimated_duration_minutes?.toString() || "");
  }, [activityData.estimated_duration_minutes]);

  return (
    <View className="bg-gray-50 border border-neutral-gray/20 rounded-2xl p-4 gap-3">
      <Text className="text-xs font-bold text-dark-black uppercase tracking-widest mb-1">
        Detalles de la actividad
      </Text>

      {/* Categoría */}
      <View>
        <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
          Categoría
        </Text>
        <TouchableOpacity
          onPress={() => setShowCategoryModal(true)}
          className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-3 flex-row items-center justify-between"
        >
          <Text
            className={`text-sm ${activityData.category ? "text-dark-black" : "text-neutral-gray"}`}
          >
            {activityData.category || "Selecciona una categoría"}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#999999" />
        </TouchableOpacity>

        <Modal
          visible={showCategoryModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View
            className="flex-1 bg-black/50 justify-end"
            accessibilityViewIsModal
          >
            <View className="bg-white rounded-t-3xl p-5">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-base font-bold text-dark-black">
                  Categoría
                </Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                  <Ionicons name="close" size={22} color="#202020" />
                </TouchableOpacity>
              </View>
              <ScrollView
                className="max-h-96"
                showsVerticalScrollIndicator={false}
              >
                {CATEGORIES.map((cat) => {
                  const selected = activityData.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        onUpdateField("category", cat);
                        setShowCategoryModal(false);
                      }}
                      className={`py-3 px-4 rounded-xl mb-2 border-2 ${selected ? "bg-primary-yellow border-primary-yellow" : "bg-gray-50 border-neutral-gray/20"}`}
                    >
                      <Text
                        className={`font-semibold text-sm ${selected ? "text-dark-black" : "text-neutral-gray"}`}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>

      {/* Precio entrada + Duración */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
            Precio entrada (€)
          </Text>
          <TextInput
            placeholder="0.00"
            className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
            keyboardType="decimal-pad"
            value={entryPriceStr}
            onChangeText={(value) => {
              setEntryPriceStr(value);
              const n = parseFloat(value.replace(",", "."));
              onUpdateField("entry_price", !isNaN(n) ? n : undefined);
            }}
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
            Duración (min)
          </Text>
          <TextInput
            placeholder="60"
            className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
            placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
            keyboardType="numeric"
            value={durationStr}
            onChangeText={(value) => {
              setDurationStr(value);
              const n = parseInt(value, 10);
              onUpdateField(
                "estimated_duration_minutes",
                !isNaN(n) ? n : undefined,
              );
            }}
          />
        </View>
      </View>

      {/* Precio estimado */}
      <View>
        <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
          Precio estimado (€)
        </Text>
        <TextInput
          placeholder="Ej: 15.50"
          className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
          placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
          keyboardType="decimal-pad"
          value={activityData.estimated_price?.toString() || ""}
          onChangeText={(value) => {
            const n = parseFloat(value.replace(",", "."));
            onUpdateField("estimated_price", !isNaN(n) ? n : undefined);
          }}
        />
      </View>

      {/* URL */}
      <View>
        <Text className="text-xs font-semibold text-neutral-gray mb-1.5">
          URL
        </Text>
        <TextInput
          placeholder="https://..."
          className="bg-white border border-neutral-gray/20 rounded-xl px-3 py-2.5 text-sm text-dark-black"
          placeholderTextColor={PLACEHOLDER_TEXT_COLOR}
          value={activityData.url || ""}
          onChangeText={(value) => onUpdateField("url", value)}
          keyboardType="url"
        />
      </View>

      {/* Requiere reserva */}
      <TouchableOpacity
        onPress={() =>
          onUpdateField("booking_required", !activityData.booking_required)
        }
        className="flex-row items-center gap-3"
        activeOpacity={0.7}
      >
        <View
          className={`w-5 h-5 rounded-md border-2 items-center justify-center ${activityData.booking_required ? "bg-dark-black border-dark-black" : "bg-white border-neutral-gray/40"}`}
        >
          {activityData.booking_required && (
            <Ionicons name="checkmark" size={13} color="#FFD54D" />
          )}
        </View>
        <Text className="text-sm text-dark-black">Requiere reserva</Text>
      </TouchableOpacity>

      {activityData.booking_required && (
        <FilePicker
          label="Comprobante de reserva"
          currentFile={activityData.reservationFile || null}
          onFileSelected={(file) => onUpdateField("reservationFile", file)}
        />
      )}
    </View>
  );
}
