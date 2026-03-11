import CustomAlert from '@/components/customElements/CustomAlert';
import CustomButton from '@/components/customElements/CustomButton';
import CustomInput from '@/components/customElements/CustomInput';
import { MicrotextDark, SubtitleSemibold, TextRegular } from '@/components/customElements/CustomText';
import { FuelType, Vehicle, VehicleService } from '@/services/VehicleService';
import { Ionicons } from '@expo/vector-icons';
import { VehicleType } from '@planmyroute/types';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const VEHICLE_TYPES: { value: VehicleType; label: string; icon: string; brandPlaceholder: string; modelPlaceholder: string }[] = [
    { value: 'car', label: 'Coche', icon: 'car', brandPlaceholder: 'Ej: Toyota, Volkswagen', modelPlaceholder: 'Ej: Corolla, Golf' },
    { value: 'motorcycle', label: 'Moto', icon: 'bicycle', brandPlaceholder: 'Ej: Yamaha, Honda', modelPlaceholder: 'Ej: MT-07, CBR600' },
    { value: 'campervan', label: 'Autocaravana', icon: 'bus', brandPlaceholder: 'Ej: Hymer, Dethleffs', modelPlaceholder: 'Ej: B-Class, Globebus' },
    { value: 'van', label: 'Furgoneta', icon: 'cube', brandPlaceholder: 'Ej: Mercedes, Ford', modelPlaceholder: 'Ej: Sprinter, Transit' },
];

const FUEL_TYPES: { value: FuelType; label: string; icon: string }[] = [
    { value: 'gasoline', label: 'Gasolina', icon: 'flame' },
    { value: 'diesel', label: 'Diésel', icon: 'water' },
    { value: 'electric', label: 'Eléctrico', icon: 'flash' },
    { value: 'LPG', label: 'GLP', icon: 'cloud' },
];

interface VehicleFormScreenProps {
    userId: string;
    token?: string;
    isEditMode?: boolean;
    vehicleId?: string;
    initialData?: Partial<Vehicle>;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function VehicleFormScreen({
    userId,
    token,
    isEditMode = false,
    vehicleId,
    initialData,
    onSuccess,
    onCancel,
}: VehicleFormScreenProps) {
    const [brand, setBrand] = useState(initialData?.brand || '');
    const [model, setModel] = useState(initialData?.model || '');
    const [selectedType, setSelectedType] = useState<VehicleType>(initialData?.type || 'car');
    const [selectedFuelType, setSelectedFuelType] = useState<FuelType>(initialData?.type_fuel || 'gasoline');
    const [avgConsumption, setAvgConsumption] = useState(initialData?.avg_consumption?.toString() || '');
    const [fuelTankCapacity, setFuelTankCapacity] = useState(initialData?.fuel_tank_capacity?.toString() || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        title: string;
        message: string;
        type: 'error' | 'success' | 'info' | 'warning';
    }>({ title: '', message: '', type: 'info' });

    const isFormValid = brand.trim().length > 0 && model.trim().length > 0;

    // Obtener placeholders dinámicos según el tipo de vehículo
    const selectedVehicleType = VEHICLE_TYPES.find(t => t.value === selectedType);
    const brandPlaceholder = selectedVehicleType?.brandPlaceholder || 'Marca del vehículo';
    const modelPlaceholder = selectedVehicleType?.modelPlaceholder || 'Modelo del vehículo';

    const handleSubmit = async () => {
        if (!isFormValid) {
            setAlertConfig({
                title: 'Error',
                message: 'Por favor, completa los campos obligatorios.',
                type: 'error'
            });
            setShowAlert(true);
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
                fuel_tank_capacity: fuelTankCapacity ? parseFloat(fuelTankCapacity) : null,
            };

            if (isEditMode && vehicleId) {
                await VehicleService.updateVehicle(userId, vehicleId, vehicleData, token ? { token } : undefined);
            } else {
                await VehicleService.createVehicle(userId, vehicleData, token ? { token } : undefined);
            }

            setAlertConfig({
                title: '¡Éxito!',
                message: isEditMode
                    ? 'El vehículo se ha actualizado correctamente'
                    : 'El vehículo se ha añadido correctamente',
                type: 'success'
            });
            setShowAlert(true);

            // Pequeño delay antes de cerrar
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (error) {
            console.error('Error saving vehicle:', error);
            setAlertConfig({
                title: 'Error',
                message: isEditMode
                    ? 'Hubo un problema al actualizar el vehículo.'
                    : 'Hubo un problema al añadir el vehículo.',
                type: 'error'
            });
            setShowAlert(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    <View className="p-5 gap-6">
                        {/* Paso 1: Tipo de Vehículo */}
                        <View>
                            <SubtitleSemibold className="text-dark-black mb-3">¿Qué tipo de vehículo es?</SubtitleSemibold>

                            <View className="flex-row flex-wrap gap-3">
                                {VEHICLE_TYPES.map(type => {
                                    const selected = selectedType === type.value;
                                    return (
                                        <TouchableOpacity
                                            key={type.value}
                                            onPress={() => setSelectedType(type.value)}
                                            className={`flex-row items-center border-2 px-4 py-3 rounded-2xl flex-1 min-w-[45%] ${selected
                                                ? 'bg-primary-yellow border-primary-yellow'
                                                : 'bg-white border-neutral-gray/30'
                                                }`}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={type.icon as any}
                                                size={22}
                                                color={selected ? '#202020' : '#999999'}
                                                style={{ marginRight: 8 }}
                                            />
                                            <TextRegular
                                                className={`font-semibold ${selected ? 'text-dark-black' : 'text-neutral-gray'
                                                    }`}
                                            >
                                                {type.label}
                                            </TextRegular>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Línea separadora */}
                        <View className="h-px bg-neutral-gray/20" />

                        {/* Paso 2: Información Básica */}
                        <View className="gap-4">
                            <SubtitleSemibold className="text-dark-black">Información básica</SubtitleSemibold>

                            <CustomInput
                                label="Marca*"
                                placeholder={brandPlaceholder}
                                value={brand}
                                onChangeText={setBrand}
                            />

                            <CustomInput
                                label="Modelo*"
                                placeholder={modelPlaceholder}
                                value={model}
                                onChangeText={setModel}
                            />
                        </View>

                        {/* Línea separadora */}
                        <View className="h-px bg-neutral-gray/20" />

                        {/* Paso 3: Tipo de Combustible */}
                        <View>
                            <SubtitleSemibold className="text-dark-black mb-3">Tipo de combustible</SubtitleSemibold>

                            <View className="flex-row flex-wrap gap-3">
                                {FUEL_TYPES.map(fuel => {
                                    const selected = selectedFuelType === fuel.value;
                                    return (
                                        <TouchableOpacity
                                            key={fuel.value}
                                            onPress={() => setSelectedFuelType(fuel.value)}
                                            className={`flex-row items-center border-2 px-4 py-3 rounded-2xl flex-1 min-w-[45%] ${selected
                                                ? 'bg-primary-yellow border-primary-yellow'
                                                : 'bg-white border-neutral-gray/30'
                                                }`}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons
                                                name={fuel.icon as any}
                                                size={22}
                                                color={selected ? '#202020' : '#999999'}
                                                style={{ marginRight: 8 }}
                                            />
                                            <TextRegular
                                                className={`font-semibold ${selected ? 'text-dark-black' : 'text-neutral-gray'
                                                    }`}
                                            >
                                                {fuel.label}
                                            </TextRegular>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Línea separadora */}
                        <View className="h-px bg-neutral-gray/20" />

                        {/* Paso 4: Especificaciones Técnicas (Opcional) */}
                        <View className="gap-4">
                            <View>
                                <SubtitleSemibold className="text-dark-black">Especificaciones técnicas</SubtitleSemibold>
                                <MicrotextDark className="text-neutral-gray mt-1">(Opcional)</MicrotextDark>
                            </View>

                            <CustomInput
                                label="Consumo medio (L/100km)"
                                placeholder="Ej: 5.8"
                                value={avgConsumption}
                                onChangeText={setAvgConsumption}
                                keyboardType="decimal-pad"
                            />

                            <CustomInput
                                label="Capacidad del depósito (L)"
                                placeholder="Ej: 50"
                                value={fuelTankCapacity}
                                onChangeText={setFuelTankCapacity}
                                keyboardType="decimal-pad"
                            />
                        </View>

                        {/* Botones de acción */}
                        <View className="gap-3 mt-4 mb-8">
                            <CustomButton
                                title={isEditMode ? 'Guardar Cambios' : 'Añadir Vehículo'}
                                variant="primary"
                                size="large"
                                onPress={handleSubmit}
                                disabled={!isFormValid || isSubmitting}
                                loading={isSubmitting}
                            />

                            <CustomButton
                                title="Cancelar"
                                variant="outline"
                                size="large"
                                onPress={onCancel}
                                disabled={isSubmitting}
                            />
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Alert */}
            <CustomAlert
                visible={showAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setShowAlert(false)}
            />
        </SafeAreaView>
    );
}
