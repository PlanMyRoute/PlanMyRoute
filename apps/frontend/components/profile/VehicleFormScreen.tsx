import CustomButton from "@/components/customElements/CustomButton";
import CustomInput from "@/components/customElements/CustomInput";
import {
  MicrotextDark,
  SubtitleSemibold,
  TextRegular,
} from "@/components/customElements/CustomText";
import { useAlert } from "@/context/AlertContext";
import {
  CarQueryMake,
  CarQueryModel,
  FuelType,
  Vehicle,
  VehicleService,
} from "@/services/vehicleService";
import { Ionicons } from "@expo/vector-icons";
import { VehicleType } from "@planmyroute/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const VEHICLE_TYPES: {
  value: VehicleType;
  label: string;
  icon: string;
  brandPlaceholder: string;
  modelPlaceholder: string;
}[] = [
  {
    value: "car",
    label: "Coche",
    icon: "car-outline",
    brandPlaceholder: "Ej: Toyota, Volkswagen",
    modelPlaceholder: "Ej: Corolla, Golf",
  },
  {
    value: "motorcycle",
    label: "Moto",
    icon: "bicycle-outline",
    brandPlaceholder: "Ej: Yamaha, Honda",
    modelPlaceholder: "Ej: MT-07, CBR600",
  },
  {
    value: "campervan",
    label: "Autocaravana",
    icon: "bus-outline",
    brandPlaceholder: "Ej: Hymer, Dethleffs",
    modelPlaceholder: "Ej: B-Class, Globebus",
  },
  {
    value: "van",
    label: "Furgoneta",
    icon: "car-sport-outline",
    brandPlaceholder: "Ej: Mercedes, Ford",
    modelPlaceholder: "Ej: Sprinter, Transit",
  },
];

const FUEL_TYPES: { value: FuelType; label: string; icon: string }[] = [
  { value: "gasoline", label: "Gasolina", icon: "flame-outline" },
  { value: "diesel", label: "Diésel", icon: "water-outline" },
  { value: "electric", label: "Eléctrico", icon: "flash-outline" },
  { value: "LPG", label: "GLP", icon: "cloud-outline" },
];

const DEFAULT_SPECS: Record<string, { consumption: number; tank: number }> = {
  "car-gasoline":       { consumption: 7.0,  tank: 50 },
  "car-diesel":         { consumption: 5.5,  tank: 55 },
  "car-electric":       { consumption: 16,   tank: 400 },
  "car-LPG":            { consumption: 9.0,  tank: 50 },
  "motorcycle-gasoline": { consumption: 4.5,  tank: 15 },
  "motorcycle-diesel":  { consumption: 3.5,  tank: 15 },
  "motorcycle-electric": { consumption: 7,    tank: 150 },
  "motorcycle-LPG":     { consumption: 5.5,  tank: 15 },
  "campervan-gasoline": { consumption: 14,   tank: 90 },
  "campervan-diesel":   { consumption: 11,   tank: 90 },
  "campervan-electric": { consumption: 30,   tank: 250 },
  "campervan-LPG":      { consumption: 16,   tank: 90 },
  "van-gasoline":       { consumption: 10,   tank: 70 },
  "van-diesel":         { consumption: 8,    tank: 70 },
  "van-electric":       { consumption: 22,   tank: 300 },
  "van-LPG":            { consumption: 12,   tank: 70 },
};

interface VehicleFormScreenProps {
  userId: string;
  token?: string;
  isEditMode?: boolean;
  vehicleId?: string;
  initialData?: Partial<Vehicle>;
  onSuccess: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function VehicleFormScreen({
  userId,
  token,
  isEditMode = false,
  vehicleId,
  initialData,
  onSuccess,
  onCancel,
  onDelete,
}: VehicleFormScreenProps) {
  const [brand, setBrand] = useState(initialData?.brand || "");
  const [model, setModel] = useState(initialData?.model || "");
  const [selectedType, setSelectedType] = useState<VehicleType>(
    initialData?.type || "car",
  );
  const [selectedFuelType, setSelectedFuelType] = useState<FuelType>(
    initialData?.type_fuel || "gasoline",
  );
  const [avgConsumption, setAvgConsumption] = useState(
    initialData?.avg_consumption?.toString() || "",
  );
  const [fuelTankCapacity, setFuelTankCapacity] = useState(
    initialData?.fuel_tank_capacity?.toString() || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const specsManuallyEdited = useRef(isEditMode);
  const { showAlert, closeAlert } = useAlert();

  // CarQuery autocomplete state
  const [allMakes, setAllMakes] = useState<CarQueryMake[]>([]);
  const [makeSuggestions, setMakeSuggestions] = useState<CarQueryMake[]>([]);
  const [showMakeSuggestions, setShowMakeSuggestions] = useState(false);
  const [modelSuggestions, setModelSuggestions] = useState<CarQueryModel[]>([]);
  const [showModelSuggestions, setShowModelSuggestions] = useState(false);
  const [selectedMakeId, setSelectedMakeId] = useState<string | null>(null);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const brandDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load makes list once
  useEffect(() => {
    VehicleService.getCarQueryMakes({ token: token || undefined })
      .then(setAllMakes)
      .catch(() => {});
  }, [token]);

  const handleBrandChange = useCallback(
    (text: string) => {
      setBrand(text);
      setSelectedMakeId(null);
      if (brandDebounceRef.current) clearTimeout(brandDebounceRef.current);
      if (text.length < 2 || allMakes.length === 0) {
        setShowMakeSuggestions(false);
        return;
      }
      brandDebounceRef.current = setTimeout(() => {
        const lower = text.toLowerCase();
        const filtered = allMakes
          .filter((m) => m.make_display.toLowerCase().includes(lower))
          .slice(0, 6);
        setMakeSuggestions(filtered);
        setShowMakeSuggestions(filtered.length > 0);
      }, 200);
    },
    [allMakes],
  );

  const handleSelectMake = useCallback(
    (make: CarQueryMake) => {
      setBrand(make.make_display);
      setSelectedMakeId(make.make_id);
      setShowMakeSuggestions(false);
      setModel("");
      setModelSuggestions([]);
      VehicleService.getCarQueryModels(make.make_id, {
        token: token || undefined,
      })
        .then((models) => {
          const unique = [
            ...new Map(models.map((m) => [m.model_name, m])).values(),
          ];
          setModelSuggestions(unique);
        })
        .catch(() => {});
    },
    [token],
  );

  const handleModelChange = useCallback((text: string) => {
    setModel(text);
    setShowModelSuggestions(text.length >= 1);
  }, []);

  const handleSelectModel = useCallback(
    (m: CarQueryModel) => {
      setModel(m.model_name);
      setShowModelSuggestions(false);
      if (!selectedMakeId) return;
      setLoadingSpecs(true);
      VehicleService.getCarQuerySpecs(selectedMakeId, m.model_name, {
        token: token || undefined,
      })
        .then((specs) => {
          if (specs && !specsManuallyEdited.current) {
            if (specs.avgConsumption)
              setAvgConsumption(specs.avgConsumption.toString());
            if (specs.fuelTankCapacity)
              setFuelTankCapacity(specs.fuelTankCapacity.toString());
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSpecs(false));
    },
    [selectedMakeId, token],
  );

  const filteredModelSuggestions = useMemo(() => {
    if (!showModelSuggestions || modelSuggestions.length === 0) return [];
    const lower = model.toLowerCase();
    return modelSuggestions
      .filter((m) => m.model_name.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [model, modelSuggestions, showModelSuggestions]);

  useEffect(() => {
    if (specsManuallyEdited.current) return;
    const key = `${selectedType}-${selectedFuelType}`;
    const defaults = DEFAULT_SPECS[key];
    if (defaults) {
      setAvgConsumption(defaults.consumption.toString());
      setFuelTankCapacity(defaults.tank.toString());
    }
  }, [selectedType, selectedFuelType]);

  const isElectric = selectedFuelType === "electric";

  const isFormValid = brand.trim().length > 0 && model.trim().length > 0;

  const hasChanges = useMemo(() => {
    if (!isEditMode) return true;
    return (
      brand.trim() !== (initialData?.brand || "") ||
      model.trim() !== (initialData?.model || "") ||
      selectedType !== (initialData?.type || "car") ||
      selectedFuelType !== (initialData?.type_fuel || "gasoline") ||
      avgConsumption !== (initialData?.avg_consumption?.toString() || "") ||
      fuelTankCapacity !== (initialData?.fuel_tank_capacity?.toString() || "")
    );
  }, [
    brand,
    model,
    selectedType,
    selectedFuelType,
    avgConsumption,
    fuelTankCapacity,
    initialData,
    isEditMode,
  ]);

  const selectedVehicleType = VEHICLE_TYPES.find(
    (t) => t.value === selectedType,
  );

  const handleSubmit = async () => {
    if (!isFormValid) {
      showAlert({
        title: "Campos requeridos",
        message: "La marca y el modelo son obligatorios.",
        type: "error",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const vehicleData = {
        brand: brand.trim(),
        model: model.trim(),
        type: selectedType,
        type_fuel: selectedFuelType,
        avg_consumption: avgConsumption ? parseFloat(avgConsumption) : null,
        fuel_tank_capacity: fuelTankCapacity
          ? parseFloat(fuelTankCapacity)
          : null,
      };
      if (isEditMode && vehicleId) {
        await VehicleService.updateVehicle(
          userId,
          vehicleId,
          vehicleData,
          token ? { token } : undefined,
        );
      } else {
        await VehicleService.createVehicle(
          userId,
          vehicleData,
          token ? { token } : undefined,
        );
      }
      showAlert({
        title: "¡Listo!",
        message: isEditMode
          ? "El vehículo se ha actualizado correctamente"
          : "El vehículo se ha añadido correctamente",
        type: "success",
        actions: [
          {
            text: "OK",
            onPress: () => {
              closeAlert();
              onSuccess();
            },
            variant: "primary",
          },
        ],
      });
    } catch {
      showAlert({
        title: "Error",
        message: isEditMode
          ? "Hubo un problema al actualizar el vehículo."
          : "Hubo un problema al añadir el vehículo.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePress = () => {
    showAlert({
      title: "Eliminar vehículo",
      message: `¿Estás seguro de que quieres eliminar ${brand || "este vehículo"}? Esta acción no se puede deshacer.`,
      type: "warning",
      actions: [
        { text: "Cancelar", onPress: closeAlert, variant: "outline" },
        {
          text: "Eliminar",
          onPress: async () => {
            closeAlert();
            if (!vehicleId) return;
            setIsDeleting(true);
            try {
              await VehicleService.deleteVehicle(
                userId,
                vehicleId,
                token ? { token } : undefined,
              );
              if (onDelete) onDelete();
              else onSuccess();
            } catch {
              showAlert({
                title: "Error",
                message: "No se pudo eliminar el vehículo.",
                type: "error",
              });
            } finally {
              setIsDeleting(false);
            }
          },
          variant: "danger",
        },
      ],
    });
  };

  const specLabel = {
    avgConsumption: isElectric
      ? "Consumo medio (kWh/100km)"
      : "Consumo medio (L/100km)",
    avgConsumptionPlaceholder: isElectric ? "Ej: 18.5" : "Ej: 5.8",
    tankCapacity: isElectric ? "Autonomía (km)" : "Capacidad del depósito (L)",
    tankCapacityPlaceholder: isElectric ? "Ej: 400" : "Ej: 50",
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-5 gap-6">
            {/* Tipo de vehículo */}
            <View>
              <SubtitleSemibold className="mb-3">
                ¿Qué tipo de vehículo es?
              </SubtitleSemibold>
              <View className="flex-row flex-wrap gap-3">
                {VEHICLE_TYPES.map((type) => {
                  const selected = selectedType === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => setSelectedType(type.value)}
                      className={`flex-row items-center border-2 px-4 py-3 rounded-2xl flex-1 min-w-[45%] gap-2 ${selected ? "bg-primary border-primary" : "bg-white border-neutral/30"}`}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={22}
                        color={selected ? "#202020" : "#999999"}
                      />
                      <TextRegular
                        style={{
                          fontFamily: "Urbanist-SemiBold",
                          color: selected ? "#202020" : "#999999",
                        }}
                      >
                        {type.label}
                      </TextRegular>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="h-px bg-neutral/15" />

            {/* Información básica */}
            <View className="gap-4">
              <SubtitleSemibold>Información básica</SubtitleSemibold>
              <View>
                <CustomInput
                  label="Marca*"
                  placeholder={
                    selectedVehicleType?.brandPlaceholder || "Marca del vehículo"
                  }
                  value={brand}
                  onChangeText={handleBrandChange}
                  onFocus={() => {
                    if (brand.length >= 2 && makeSuggestions.length > 0)
                      setShowMakeSuggestions(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowMakeSuggestions(false), 200)
                  }
                />
                {showMakeSuggestions && makeSuggestions.length > 0 && (
                  <View className="bg-white border border-neutral/20 rounded-xl mt-1 overflow-hidden">
                    {makeSuggestions.map((m) => (
                      <TouchableOpacity
                        key={m.make_id}
                        onPress={() => handleSelectMake(m)}
                        className="px-4 py-2.5 border-b border-neutral/10"
                        activeOpacity={0.7}
                      >
                        <TextRegular className="text-dark">
                          {m.make_display}
                        </TextRegular>
                        {m.make_country ? (
                          <MicrotextDark className="text-neutral">
                            {m.make_country}
                          </MicrotextDark>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <View>
                <CustomInput
                  label="Modelo*"
                  placeholder={
                    selectedVehicleType?.modelPlaceholder ||
                    "Modelo del vehículo"
                  }
                  value={model}
                  onChangeText={handleModelChange}
                  onFocus={() => {
                    if (filteredModelSuggestions.length > 0)
                      setShowModelSuggestions(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowModelSuggestions(false), 200)
                  }
                />
                {showModelSuggestions &&
                  filteredModelSuggestions.length > 0 && (
                    <View className="bg-white border border-neutral/20 rounded-xl mt-1 overflow-hidden">
                      {filteredModelSuggestions.map((m, idx) => (
                        <TouchableOpacity
                          key={`${m.model_name}-${idx}`}
                          onPress={() => handleSelectModel(m)}
                          className="px-4 py-2.5 border-b border-neutral/10"
                          activeOpacity={0.7}
                        >
                          <TextRegular className="text-dark">
                            {m.model_name}
                          </TextRegular>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                {loadingSpecs && (
                  <MicrotextDark className="text-neutral mt-1">
                    Buscando especificaciones...
                  </MicrotextDark>
                )}
              </View>
            </View>

            <View className="h-px bg-neutral/15" />

            {/* Tipo de combustible */}
            <View>
              <SubtitleSemibold className="mb-3">
                Tipo de combustible
              </SubtitleSemibold>
              <View className="flex-row flex-wrap gap-3">
                {FUEL_TYPES.map((fuel) => {
                  const selected = selectedFuelType === fuel.value;
                  return (
                    <TouchableOpacity
                      key={fuel.value}
                      onPress={() => setSelectedFuelType(fuel.value)}
                      className={`flex-row items-center border-2 px-4 py-3 rounded-2xl flex-1 min-w-[45%] gap-2 ${selected ? "bg-primary border-primary" : "bg-white border-neutral/30"}`}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={fuel.icon as any}
                        size={22}
                        color={selected ? "#202020" : "#999999"}
                      />
                      <TextRegular
                        style={{
                          fontFamily: "Urbanist-SemiBold",
                          color: selected ? "#202020" : "#999999",
                        }}
                      >
                        {fuel.label}
                      </TextRegular>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="h-px bg-neutral/15" />

            {/* Especificaciones técnicas */}
            <View className="gap-4">
              <View>
                <SubtitleSemibold>Especificaciones técnicas</SubtitleSemibold>
                <MicrotextDark className="text-neutral mt-1">
                  (Opcional)
                </MicrotextDark>
              </View>

              {isElectric && (
                <View className="bg-primary/10 rounded-xl p-3 flex-row items-center gap-2">
                  <Ionicons name="flash" size={16} color="#202020" />
                  <TextRegular
                    className="text-dark flex-1"
                    style={{ fontSize: 12 }}
                  >
                    Para vehículos eléctricos mostramos consumo en kWh y
                    autonomía en km
                  </TextRegular>
                </View>
              )}

              <CustomInput
                label={specLabel.avgConsumption}
                placeholder={specLabel.avgConsumptionPlaceholder}
                value={avgConsumption}
                onChangeText={(t) => { specsManuallyEdited.current = true; setAvgConsumption(t); }}
                keyboardType="decimal-pad"
              />
              <CustomInput
                label={specLabel.tankCapacity}
                placeholder={specLabel.tankCapacityPlaceholder}
                value={fuelTankCapacity}
                onChangeText={(t) => { specsManuallyEdited.current = true; setFuelTankCapacity(t); }}
                keyboardType="decimal-pad"
              />
              {!specsManuallyEdited.current && avgConsumption && (
                <MicrotextDark className="text-neutral -mt-2">
                  Valores estimados para un {VEHICLE_TYPES.find(t => t.value === selectedType)?.label.toLowerCase() || 'vehículo'} típico. Ajústalos si conoces los de tu modelo.
                </MicrotextDark>
              )}
            </View>

            {/* Acciones principales */}
            <View className="gap-3 mt-2">
              <CustomButton
                title={isEditMode ? "Guardar cambios" : "Añadir vehículo"}
                variant="primary"
                size="large"
                onPress={handleSubmit}
                disabled={
                  !isFormValid || !hasChanges || isSubmitting || isDeleting
                }
                loading={isSubmitting}
              />
              <CustomButton
                title="Cancelar"
                variant="outline"
                size="large"
                onPress={onCancel}
                disabled={isSubmitting || isDeleting}
              />
            </View>

            {/* Zona de peligro (solo en modo edición) */}
            {isEditMode && vehicleId && (
              <View className="border-t border-neutral/15 pt-6 gap-3">
                <MicrotextDark className="text-neutral">
                  Zona de peligro
                </MicrotextDark>
                <CustomButton
                  title="Eliminar vehículo"
                  variant="danger"
                  size="large"
                  onPress={handleDeletePress}
                  disabled={isSubmitting || isDeleting}
                  loading={isDeleting}
                  icon={
                    <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  }
                />
              </View>
            )}

            {/* Spacer */}
            <View className="h-4" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
