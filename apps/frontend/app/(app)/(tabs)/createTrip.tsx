import { BalancedBudgetIcon, BalancedIcon, ExploreIcon, LuxuryIcon, SaverIcon, SedentaryIcon } from '@/components/assets/Icons';
import CustomAlert, { type AlertAction } from '@/components/customElements/CustomAlert';
import CustomButton from '@/components/customElements/CustomButton';
import CustomInput from '@/components/customElements/CustomInput';
import { MicrotextDark, SubtitleSemibold, TextRegular, Title1, Title2 } from '@/components/customElements/CustomText';
import DateTimePickerWeb from '@/components/customElements/DateTimePickerWeb';
import { LocationSearchInput } from '@/components/customElements/LocationSearchInput';
import { InterestSelector } from '@/components/interests/InterestSelector';
import { VehicleCard } from '@/components/profile/VehicleCard';
import { VehiclesSection } from '@/components/profile/VehiclesSection';
import Travelers from '@/components/travelers/Travelers';
import { AiTripLoader } from '@/components/trip/AiTripLoader';
import { useAuth } from '@/context/AuthContext';
import { useCreateNotification } from '@/hooks/useNotifications';
import { TravelerWithRole } from '@/hooks/useTrips';
import { useProfile, useUser } from '@/hooks/useUsers';
import { useUserUsage } from '@/hooks/useUserUsage';
import { useVehicles } from '@/hooks/useVehicles';
import '@/index.css';
import { TripService } from '@/services/tripService';
import { VehicleService } from '@/services/VehicleService';
import { validateTripBasic, validateTripComplete, type LocationData, type TripValidationResult } from '@/utils/tripValidation';
import { Ionicons } from '@expo/vector-icons';
import { Interest, User, Vehicle } from '@planmyroute/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    PanResponder,
    Platform,
    ScrollView,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TravelerCounts = {
    adults: number;
    children: number;
    infants: number;
    elders: number;
    pets: number;
};

const MIN_VALUE = 50;
const MAX_VALUE_ABSOLUTE = 50000; // Tope máximo absoluto

// --- Componente de Indicador de Pasos ---
const StepIndicator = ({
    currentStep,
    totalSteps,
    onStepPress,
    canNavigateToStep
}: {
    currentStep: number;
    totalSteps: number;
    onStepPress: (step: number) => void;
    canNavigateToStep: (step: number) => boolean;
}) => {
    return (
        <View className="flex-row items-center justify-center mb-6 px-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
                const isActive = step === currentStep;
                const isCompleted = step < currentStep;
                const canNavigate = canNavigateToStep(step);

                return (
                    <View key={step} className="flex-row items-center">
                        <TouchableOpacity
                            onPress={() => canNavigate && onStepPress(step)}
                            disabled={!canNavigate}
                            activeOpacity={0.7}
                            className={`w-9 h-9 rounded-full items-center justify-center ${isActive ? 'bg-primary-yellow' : isCompleted ? 'bg-primary-yellow' : 'bg-white border-2 border-neutral-gray'
                                }`}
                        >
                            <TextRegular className={`text-sm ${isActive || isCompleted ? 'text-dark-black' : 'text-neutral-gray'}`}>
                                {step}
                            </TextRegular>
                        </TouchableOpacity>
                        {step < totalSteps && (
                            <View className={`w-8 h-0.5 mx-1 ${step < currentStep ? 'bg-primary-yellow' : 'bg-neutral-gray'}`} />
                        )}
                    </View>
                );
            })}
        </View>
    );
};

export default function CreateTripTabScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { user: authUser, token } = useAuth(); // Usuario de autenticación
    const { data: profileUser } = useUser(authUser?.id); // Usuario de la tabla public.user
    const userId = authUser?.id;

    const { data: profile } = useProfile(userId, undefined);
    const createNotificationMutation = useCreateNotification();
    const { data: userUsage } = useUserUsage();

    // --- NUEVO ESTADO PARA EL ASISTENTE ---
    const [step, setStep] = useState(0); // 0 = selección de modo, 1+ = pasos del formulario
    const [maxStepReached, setMaxStepReached] = useState(0); // Trackea el paso máximo alcanzado

    // Ocultar/mostrar tab bar según el paso
    useLayoutEffect(() => {
        navigation.setOptions({
            tabBarStyle: step > 0
                ? { display: 'none' }
                : {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 0,
                    elevation: 0,
                    paddingBottom: 2,
                    paddingTop: 8,
                },
        });
    }, [step, navigation]);

    // Actualizar el paso máximo cuando avanzamos
    useEffect(() => {
        if (step > maxStepReached) {
            setMaxStepReached(step);
        }
    }, [step]);


    // --- ESTADO PARA USUARIOS INVITADOS ANTES DE CREAR EL VIAJE ---
    // Almacenar usuarios invitados con sus roles asignados
    const [invitedUsers, setInvitedUsers] = useState<Array<{ user: User; role: 'owner' | 'editor' | 'viewer' }>>([]);

    // --- SHOW DATE PICKERS ---
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // --- FORMULARIO ---
    //Step 0
    const [tripName, setTripName] = useState('');
    const [isAiTrip, setIsAiTrip] = useState(true);
    const [modeSelected, setModeSelected] = useState(false); // Indica si ya se seleccionó el modo

    //Step 1
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [originData, setOriginData] = useState<LocationData | null>(null);
    const [destinationData, setDestinationData] = useState<LocationData | null>(null);
    const [validationResult, setValidationResult] = useState<TripValidationResult | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);
    const [roundTrip, setRoundTrip] = useState(false);
    //Slider presupuesto
    const [minBudget, setMinBudget] = useState(80);
    const [maxBudget, setMaxBudget] = useState(1000);
    const [minBudgetInput, setMinBudgetInput] = useState('80');
    const [maxBudgetInput, setMaxBudgetInput] = useState('1000');
    const [sliderWidth, setSliderWidth] = useState(0);
    const [spendingLevel, setSpendingLevel] = useState<'saver' | 'balanced' | 'luxury'>('balanced');
    const [budgetManuallyModified, setBudgetManuallyModified] = useState(false); // Flag para saber si el usuario modificó el presupuesto

    // Máximo dinámico del slider: siempre 100€ más que el presupuesto máximo
    const sliderMaxValue = Math.max(1000, Math.min(maxBudget + 100, MAX_VALUE_ABSOLUTE));
    // --- SINCRONIZACIÓN DE SLIDERS CON INPUTS ---
    useEffect(() => {
        setMinBudgetInput(minBudget.toString());
    }, [minBudget]);

    useEffect(() => {
        setMaxBudgetInput(maxBudget.toString());
    }, [maxBudget]);

    //Step 2
    const [travelerCounts, setTravelerCounts] = useState<TravelerCounts>({
        adults: 1, children: 0, infants: 0, elders: 0, pets: 0,
    });

    //Step 3
    const {
        vehicles,
        loading: vehiclesLoading,
        handleAddVehicle,
        handleEditVehicle,
        handleDeleteVehicle,
        maxVehicles,
    } = useVehicles(authUser?.id);
    const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);

    // Vehículos de los viajeros invitados
    const [travelersVehicles, setTravelersVehicles] = useState<Vehicle[]>([]);
    const [loadingTravelersVehicles, setLoadingTravelersVehicles] = useState(false);

    // Cargar vehículos de los usuarios invitados cuando cambia la lista
    useEffect(() => {
        const fetchTravelersVehicles = async () => {
            if (invitedUsers.length === 0) {
                setTravelersVehicles([]);
                return;
            }

            setLoadingTravelersVehicles(true);
            try {
                // Obtener vehículos de cada usuario invitado
                const vehiclesPromises = invitedUsers.map(({ user }) =>
                    VehicleService.getUserVehicles(user.id, { token: token || undefined })
                );

                const vehiclesArrays = await Promise.all(vehiclesPromises);

                // Combinar todos los vehículos en un solo array
                const allVehicles = vehiclesArrays.flat();
                setTravelersVehicles(allVehicles);
            } catch (error) {
                console.error('Error loading travelers vehicles:', error);
                setTravelersVehicles([]);
            } finally {
                setLoadingTravelersVehicles(false);
            }
        };

        fetchTravelersVehicles();
    }, [invitedUsers]);


    //Step 4
    const [selectedInterests, setSelectedInterests] = useState<Interest[]>((profile?.user.user_type as Interest[]) || []);
    const [travelStyle, setTravelStyle] = useState<'explorer' | 'balanced' | 'sedentary'>('balanced');

    // --- ESTADO PARA ANIMACIÓN DEL LOADER DE IA ---
    const [showAiLoader, setShowAiLoader] = useState(false);
    const [buttonCoords, setButtonCoords] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const buttonRef = useRef<View>(null);
    const [tripCreated, setTripCreated] = useState(false);
    const [createdTripId, setCreatedTripId] = useState<number | null>(null);

    // --- ESTADO PARA ALERTAS DE VALIDACIÓN ---
    const [showValidationAlert, setShowValidationAlert] = useState(false);
    const [validationAlertConfig, setValidationAlertConfig] = useState<{
        title: string;
        message: string;
        type: 'error' | 'warning' | 'success' | 'info';
        actions: AlertAction[];
    } | null>(null);
    const [isValidating, setIsValidating] = useState(false);


    // Calcular el número total de pasos según el modo seleccionado
    const totalSteps = isAiTrip ? 5 : 3;

    // --- VALIDACIÓN POR FORM ---
    const isStepValid = useMemo(() => {
        if (step === 0) {
            // Paso de selección de modo: solo validar nombre del viaje
            const valid = tripName.trim().length > 0;
            console.log('Step 0 validation:', { tripName, valid, isAiTrip });
            return valid;
        }
        switch (step) {
            case 1: // Detalles del viaje: Origen, Destino, Fechas
                return origin.trim().length > 0 && destination.trim().length > 0 && startDate !== null && endDate !== null;
            case 2: // Viajeros y presupuesto - siempre válido (valores por defecto)
                return true;
            case 3: //Elección de vehículos - siempre válido
                return true;
            case 4: // Intereses y tipo de viaje (solo para IA) - Debe haber por lo menos un interés seleccionado
                return selectedInterests.length > 0;
            case 5:
                return true;
            default:
                return false;
        }
    }, [step, tripName, origin, destination, startDate, endDate, selectedInterests]);

    // Limpiar validación cuando cambien datos relevantes
    useEffect(() => {
        setValidationResult(null);
        setShowValidationAlert(false);
    }, [origin, destination, startDate, endDate]);

    // --- OBTENCIÓN DE COORDENADAS ---
    // Ya no es necesario este useEffect porque LocationSearchInput maneja
    // el geocoding automáticamente y actualiza originData/destinationData
    // directamente en el callback onLocationSelect

    // Recalcular solo presupuesto cuando cambia el nivel de gasto 
    useEffect(() => {
        if (step === 5 && originData && destinationData && startDate && endDate) {
            // Calcular consumo promedio de vehículos seleccionados
            let avgConsumption: number | undefined = undefined;
            if (selectedVehicles.length > 0) {
                const consumptions = selectedVehicles
                    .map(v => v.avg_consumption)
                    .filter((c): c is number => c !== null && c !== undefined);

                if (consumptions.length > 0) {
                    avgConsumption = consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length;
                }
            }

            // Validar el viaje con las coordenadas ya obtenidas (validación rápida sin ORS)
            const validation = validateTripBasic({
                origin: originData.coords,
                destination: destinationData.coords,
                start_date: startDate,
                end_date: endDate,
                n_adults: travelerCounts.adults,
                budget_total: maxBudget,
                vehicle_consumption_l_per_100: avgConsumption,
                spending_level: spendingLevel
            });

            setValidationResult(validation);
        }
    }, [step, spendingLevel, maxBudget, selectedVehicles, travelerCounts.adults]);

    // Aplicar presupuesto recomendado cuando se llega al paso 5 (solo si no se ha modificado manualmente)
    useEffect(() => {
        if (validationResult?.budgetEst && step === 5 && !budgetManuallyModified) {
            // Solo aplicar la primera vez que llegamos al paso 5 o si el usuario no ha tocado los valores
            const recommendedMin = validationResult.budgetEst.estimate_min;
            const recommendedMax = validationResult.budgetEst.estimate_max;

            setMinBudget(recommendedMin);
            setMaxBudget(recommendedMax);
        }
    }, [validationResult?.budgetEst, step, budgetManuallyModified]);

    // Resetear flag cuando cambia el nivel de gasto (para aplicar nuevos cálculos)
    useEffect(() => {
        setBudgetManuallyModified(false);
    }, [spendingLevel]);

    // --- FUNCIONES DE NAVEGACIÓN DEL ASISTENTE ---
    const nextStep = async () => {
        console.log('nextStep called:', { step, isStepValid, isValidating, isAiTrip });
        if (!isStepValid) return;
        if (isValidating) return; // Evitar doble clic

        if (step === 0) {
            console.log('Step 0 - checking AI limit:', {
                isAiTrip,
                hasUsageData: !!userUsage?.ai_trip_creation,
                canCreate: userUsage?.ai_trip_creation?.can_create
            });
            // Verificar límite de IA antes de avanzar (solo para IA)
            if (isAiTrip && userUsage?.ai_trip_creation && !userUsage.ai_trip_creation.can_create) {
                setValidationAlertConfig({
                    title: '🔒 Límite alcanzado',
                    message: `Has usado ${userUsage.ai_trip_creation.used_count}/${userUsage.ai_trip_creation.max_count} viajes con IA este mes. Cambia a modo manual para continuar o actualiza a Premium para viajes ilimitados.`,
                    type: 'warning',
                    actions: [
                        {
                            text: 'Ver Premium',
                            onPress: () => {
                                setShowValidationAlert(false);
                                router.push('/premium');
                            },
                            variant: 'yellow'
                        },
                        {
                            text: 'Usar modo manual',
                            onPress: () => {
                                setShowValidationAlert(false);
                                setIsAiTrip(false);
                            },
                            variant: 'outline'
                        },
                        {
                            text: 'Cerrar',
                            onPress: () => setShowValidationAlert(false),
                            variant: 'dark'
                        }
                    ]
                });
                setShowValidationAlert(true);
                return;
            }
            // Pasar del modo de selección al primer paso del formulario
            setModeSelected(true);
            setStep(1);
        } else if (step === 1) {
            // VALIDAR CONECTIVIDAD Y FECHAS ANTES DE AVANZAR
            if (!originData || !destinationData) {
                setValidationAlertConfig({
                    title: 'Datos incompletos',
                    message: 'Por favor, completa el origen y destino del viaje.',
                    type: 'error',
                    actions: [{
                        text: 'Entendido',
                        onPress: () => setShowValidationAlert(false),
                        variant: 'dark'
                    }]
                });
                setShowValidationAlert(true);
                return;
            }

            // Validar ruta de forma síncrona
            setIsValidating(true);
            try {
                const validation = await validateTripComplete({
                    origin: originData,
                    destination: destinationData,
                    start_date: startDate,
                    end_date: endDate,
                    // NO incluir presupuesto aquí - solo validar conectividad y días
                });

                setValidationResult(validation);

                if (validation.errors.length > 0) {
                    // Viaje imposible - Mostrar alerta y no permitir avanzar
                    const errorMessages = validation.errors.join('\n\n');
                    setValidationAlertConfig({
                        title: '¡Viaje imposible!',
                        message: errorMessages,
                        type: 'error',
                        actions: [{
                            text: 'Cambiar datos',
                            onPress: () => setShowValidationAlert(false),
                            variant: 'dark'
                        }]
                    });
                    setShowValidationAlert(true);
                    return; // No avanzar
                } else if (validation.warnings.length > 0) {
                    // Viaje no recomendado - Mostrar alerta con opción de continuar
                    const warningMessages = validation.warnings.join('\n\n');
                    setValidationAlertConfig({
                        title: 'Viaje no recomendado',
                        message: warningMessages,
                        type: 'warning',
                        actions: [
                            {
                                text: 'Modificar viaje',
                                onPress: () => setShowValidationAlert(false),
                                variant: 'outline'
                            },
                            {
                                text: 'Continuar así',
                                onPress: () => {
                                    setShowValidationAlert(false);
                                    setStep(2);
                                },
                                variant: 'primary'
                            }
                        ]
                    });
                    setShowValidationAlert(true);
                    return; // Esperar decisión del usuario
                } else {
                    // Todo OK - avanzar
                    setStep(2);
                }
            } catch (error) {
                console.error('Error validando viaje:', error);
                setValidationAlertConfig({
                    title: 'Error de validación',
                    message: 'No se pudo validar el viaje. Verifica tu conexión e intenta de nuevo.',
                    type: 'error',
                    actions: [{
                        text: 'Entendido',
                        onPress: () => setShowValidationAlert(false),
                        variant: 'dark'
                    }]
                });
                setShowValidationAlert(true);
            } finally {
                setIsValidating(false);
            }
        } else if (step < totalSteps) {
            setStep(step + 1);
        } else {
            // Si estamos en el último paso (presupuesto), validar antes de crear
            if (validationResult?.budgetEst && maxBudget < validationResult.budgetEst.estimate_min * 0.6) {
                // Presupuesto muy bajo - Mostrar alerta
                setValidationAlertConfig({
                    title: 'Presupuesto insuficiente',
                    message: `El presupuesto de ${maxBudget}€ es muy inferior al recomendado (${validationResult.budgetEst.estimate_min}€). El viaje puede no ser viable.`,
                    type: 'warning',
                    actions: [
                        {
                            text: 'Ajustar presupuesto',
                            onPress: () => setShowValidationAlert(false),
                            variant: 'outline'
                        },
                        {
                            text: 'Crear viaje',
                            onPress: () => {
                                setShowValidationAlert(false);
                                handleCreateTripPress();
                            },
                            variant: 'primary'
                        }
                    ]
                });
                setShowValidationAlert(true);
                return;
            }
            // Si el presupuesto es aceptable, crear el viaje
            handleCreateTripPress();
        }
    };

    const prevStep = () => {
        if (step === 1) {
            // Volver a la selección de modo
            setModeSelected(false);
            setStep(0);
            setMaxStepReached(0);
        } else if (step > 1) {
            setStep(step - 1);
        }
    };

    // Función para determinar si se puede navegar a un paso
    const canNavigateToStep = (targetStep: number): boolean => {
        if (targetStep === 1) return modeSelected;
        if (targetStep < step) return true; // Puede volver atrás (pero no al mismo paso)

        // Para avanzar (incluso a pasos ya visitados), siempre validar los pasos intermedios
        // Esto asegura que si vuelves atrás y modificas datos, no puedas saltar pasos inválidos
        for (let i = step; i < targetStep; i++) {
            if (!isStepValidForStep(i)) return false;
        }
        return true;
    };

    // Función auxiliar para validar un paso específico
    const isStepValidForStep = (stepNumber: number): boolean => {
        if (stepNumber === 0) {
            return tripName.trim().length > 0;
        }
        if (stepNumber === 1) {
            return origin.trim().length > 0 &&
                destination.trim().length > 0 &&
                startDate !== null &&
                endDate !== null;
        }
        if (stepNumber === 2) {
            return travelerCounts.adults >= 1;
        }
        if (stepNumber === 3) {
            return true;
        }
        if (stepNumber === 4) {
            return isAiTrip ? selectedInterests.length > 0 : true;
        }
        if (stepNumber === 5) {
            return isAiTrip;
        }
        return false;
    };

    // Función para manejar click en un paso
    const handleStepPress = (targetStep: number) => {
        if (canNavigateToStep(targetStep)) {
            setStep(targetStep);
        }
    };

    const getPositionFromValue = (value: number) => {
        if (sliderWidth === 0) return 0;
        return ((value - MIN_VALUE) / (sliderMaxValue - MIN_VALUE)) * sliderWidth;
    };
    const getValueFromPosition = (position: number) => {
        if (sliderWidth === 0) return MIN_VALUE;
        const value = (position / sliderWidth) * (sliderMaxValue - MIN_VALUE) + MIN_VALUE;
        return Math.max(MIN_VALUE, Math.min(sliderMaxValue, Math.round(value / 10) * 10));
    };

    // Funciones para manejar cambios en los inputs de presupuesto
    const handleMinBudgetInputChange = (text: string) => {
        setMinBudgetInput(text);
        const value = parseInt(text);
        if (!isNaN(value) && value >= MIN_VALUE && value < maxBudget) {
            setMinBudget(value);
            setBudgetManuallyModified(true);
        }
    };

    const handleMaxBudgetInputChange = (text: string) => {
        setMaxBudgetInput(text);
        const value = parseInt(text);
        if (!isNaN(value) && value > minBudget && value <= MAX_VALUE_ABSOLUTE) {
            setMaxBudget(value);
            setBudgetManuallyModified(true);
        }
    };

    // Validar inputs cuando pierden el foco
    const handleMinBudgetBlur = () => {
        const value = parseInt(minBudgetInput);
        if (isNaN(value) || value < MIN_VALUE || value >= maxBudget) {
            setMinBudgetInput(minBudget.toString());
        }
    };

    const handleMaxBudgetBlur = () => {
        const value = parseInt(maxBudgetInput);
        if (isNaN(value) || value <= minBudget || value > MAX_VALUE_ABSOLUTE) {
            setMaxBudgetInput(maxBudget.toString());
        }
    };

    const minPanResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            const newPosition = getPositionFromValue(minBudget) + gestureState.dx;
            const newValue = getValueFromPosition(newPosition);
            if (newValue < maxBudget - 50) {
                setMinBudget(newValue);
                setBudgetManuallyModified(true);
            }
        },
    });
    const maxPanResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
            const newPosition = getPositionFromValue(maxBudget) + gestureState.dx;
            const newValue = getValueFromPosition(newPosition);
            if (newValue > minBudget + 50) {
                setMaxBudget(newValue);
                setBudgetManuallyModified(true);
            }
        },
    });

    const updateTravelerCount = (type: keyof TravelerCounts, delta: number) => {
        setTravelerCounts(prev => {
            const newValue = prev[type] + delta;
            if (newValue < 0) return prev;
            if (type === 'adults' && newValue < 1) return prev;
            return { ...prev, [type]: newValue };
        });
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const formatTime = (time: Date | null) => {
        if (!time) return '';
        return time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    // --- TRAVELERS ---
    // Combinar owner + usuarios invitados con sus roles asignados
    const travelers: TravelerWithRole[] = useMemo(() => {
        const base: TravelerWithRole[] = profileUser && !Array.isArray(profileUser)
            ? [{ user: profileUser, role: 'owner' }]
            : [];

        const invited: TravelerWithRole[] = invitedUsers.map(({ user, role }) => ({
            user,
            role: 'pending' as const // Mostrar como pendiente hasta que acepten
        }));

        return [...base, ...invited];
    }, [profileUser, invitedUsers]);

    // --- VEHICLES ---
    const handleSelectVehicle = (vehicle: Vehicle) => {
        // Toggle: si ya está seleccionado, lo deseleccionamos
        if (selectedVehicles.find(v => v.id === vehicle.id)) {
            setSelectedVehicles(selectedVehicles.filter(v => v.id !== vehicle.id));
        } else {
            // Agregar a la lista de seleccionados
            setSelectedVehicles([...selectedVehicles, vehicle]);
        }
    };

    // --- CREATE NEW TRIP ---
    const handleCreateTripPress = () => {
        // Medir posición del botón para la animación
        buttonRef.current?.measureInWindow((x, y, width, height) => {
            setButtonCoords({ x, y, width, height });
            setShowAiLoader(true);

            // Pequeño delay para que arranque la animación antes de la petición
            setTimeout(() => {
                handleAiSubmit();
            }, 100);
        });
    };

    const handleNavigateToTrip = () => {
        if (!createdTripId) return;

        // Ocultar loader y navegar
        setShowAiLoader(false);
        router.push(`/trip/${createdTripId}`);

        // Resetear el formulario
        setTripName('');
        setOrigin('');
        setDestination('');
        setStartDate(null);
        setEndDate(null);
        setStartTime(null);
        setEndTime(null);
        setRoundTrip(false);
        setTravelerCounts({ adults: 1, children: 0, infants: 0, elders: 0, pets: 0 });
        setSelectedInterests([]);
        setMinBudget(80);
        setMaxBudget(1000);
        setInvitedUsers([]);
        setSelectedVehicles([]);
        setModeSelected(false);
        setStep(0);
        setMaxStepReached(0);
        setIsAiTrip(false);
        setBudgetManuallyModified(false);
        setTripCreated(false);
        setCreatedTripId(null);
    };

    const handleAiSubmit = async () => {
        // Verificar que el usuario está autenticado
        if (!authUser?.id) {
            setShowAiLoader(false);
            setValidationAlertConfig({
                title: 'Error de autenticación',
                message: 'Debes iniciar sesión para crear un viaje.',
                type: 'error',
                actions: [{
                    text: 'Cerrar',
                    onPress: () => setShowValidationAlert(false),
                    variant: 'dark'
                }]
            });
            setShowValidationAlert(true);
            return;
        }

        try {
            // Extraer los IDs de los vehículos seleccionados
            const vehicleIds = selectedVehicles.map(vehicle => vehicle.id);

            const tripPayload = {
                name: tripName.trim(),
                description: `Viaje de ${origin.trim()} a ${destination.trim()}`,
                start_date: startDate ? startDate.toISOString() : null,
                end_date: endDate ? endDate.toISOString() : null,
                circular: roundTrip,
                n_adults: travelerCounts.adults,
                n_children: travelerCounts.children,
                n_babies: travelerCounts.infants,
                n_elders: travelerCounts.elders,
                n_pets: travelerCounts.pets,
                type: selectedInterests as Interest[],
                estimated_price_min: minBudget,
                estimated_price_max: maxBudget,
                status: 'planning' as const,

                //Extra info
                origin: origin.trim(),
                destination: destination.trim(),
                vehicleIds: vehicleIds,
                travelStyle: travelStyle,
            };

            // Crear promesa de espera mínima (3 segundos) para la animación
            const minTimePromise = new Promise(resolve => setTimeout(resolve, 3000));

            // Ejecutar petición y espera mínima en paralelo
            const [response] = await Promise.all([
                TripService.createTrip(tripPayload, authUser.id, isAiTrip, token || undefined),
                minTimePromise
            ]);

            const tripId = response.trip?.id;

            // Crear notificaciones para usuarios invitados
            if (invitedUsers.length > 0 && tripId) {
                try {
                    await Promise.all(
                        invitedUsers.map(({ user, role }) => {
                            const roleText = role === 'owner' ? 'Propietario' : role === 'editor' ? 'Editor' : 'Observador';
                            return createNotificationMutation.mutateAsync({
                                notification: {
                                    user_receiver_id: user.id,
                                    content: `Has sido invitado a unirte al viaje "${tripName}" como ${roleText}`,
                                    type: 'invitation',
                                    status: 'unread',
                                    action_status: 'pending',
                                    related_trip_id: Number(tripId),
                                },
                            });
                        })
                    );
                } catch (notifError) {
                    console.error('Error al enviar invitaciones:', notifError);
                }
            }

            // Marcar viaje como creado pero NO cerrar el loader
            // El juego seguirá activo hasta que el jugador pierda
            setTripCreated(true);
            setCreatedTripId(tripId || null);

        } catch (error: any) {
            setShowAiLoader(false);
            setTripCreated(false);
            setCreatedTripId(null);
            console.error('Error creating trip:', error);

            // Verificar si es un error de límite de viajes IA
            if (error?.requiresPremium || error?.status === 403) {
                setValidationAlertConfig({
                    title: '🔒 Límite alcanzado',
                    message: error?.error || 'Has alcanzado el límite de viajes con IA para este mes. Actualiza a Premium para crear viajes ilimitados.',
                    type: 'warning',
                    actions: [
                        {
                            text: 'Ver Premium',
                            onPress: () => {
                                setShowValidationAlert(false);
                                router.push('/premium');
                            },
                            variant: 'yellow'
                        },
                        {
                            text: 'Cerrar',
                            onPress: () => setShowValidationAlert(false),
                            variant: 'dark'
                        }
                    ]
                });
            } else {
                setValidationAlertConfig({
                    title: 'Error',
                    message: 'Hubo un problema al crear el viaje. Por favor, inténtalo de nuevo.',
                    type: 'error',
                    actions: [{
                        text: 'Cerrar',
                        onPress: () => setShowValidationAlert(false),
                        variant: 'dark'
                    }]
                });
            }
            setShowValidationAlert(true);
        }
    };

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <SafeAreaView className="flex-1 bg-white" edges={step === 0 ? ["top"] : ["top", "bottom"]}>
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="pt-6 px-6">
                    {/* Mostrar indicador de pasos solo cuando se ha seleccionado el modo */}
                    {modeSelected && (
                        <StepIndicator
                            currentStep={step}
                            totalSteps={totalSteps}
                            onStepPress={handleStepPress}
                            canNavigateToStep={canNavigateToStep}
                        />
                    )}
                </View>

                {/* Contenido principal de los pasos */}
                <View className="px-6">
                    {/* PASO 0: SELECCIÓN DE MODO Y NOMBRE DEL VIAJE */}
                    {step === 0 && (
                        <View className="pt-4">
                            <Title1 className="mb-10">
                                Empecemos{'\n'}la aventura
                            </Title1>

                            {/* Nombre del viaje */}
                            <CustomInput
                                label={<SubtitleSemibold className='mb-3'>Dale nombre a tu viaje*</SubtitleSemibold>}
                                placeholder="Ruta por los Pirineos"
                                value={tripName}
                                onChangeText={setTripName}
                            />
                            <View className="flex-1 pt-6">

                                <Title2 className="mb-2">¿Cómo quieres planear?</Title2>
                                <SubtitleSemibold className="text-neutral-gray mb-6">
                                    Elige la experiencia que mejor se adapte a tu viaje.
                                </SubtitleSemibold>

                                <View className="flex-row gap-3">
                                    {/* Opción IA */}
                                    <TouchableOpacity
                                        onPress={() => {
                                            // Verificar si el usuario puede crear viajes con IA
                                            if (userUsage?.ai_trip_creation && !userUsage.ai_trip_creation.can_create) {
                                                setValidationAlertConfig({
                                                    title: '🔒 Límite alcanzado',
                                                    message: `Has usado ${userUsage.ai_trip_creation.used_count}/${userUsage.ai_trip_creation.max_count} viajes con IA este mes. Actualiza a Premium para crear viajes ilimitados o selecciona el modo manual.`,
                                                    type: 'warning',
                                                    actions: [
                                                        {
                                                            text: 'Ver Premium',
                                                            onPress: () => {
                                                                setShowValidationAlert(false);
                                                                router.push('/premium');
                                                            },
                                                            variant: 'yellow'
                                                        },
                                                        {
                                                            text: 'Usar modo manual',
                                                            onPress: () => {
                                                                setShowValidationAlert(false);
                                                                setIsAiTrip(false);
                                                            },
                                                            variant: 'outline'
                                                        },
                                                        {
                                                            text: 'Cerrar',
                                                            onPress: () => setShowValidationAlert(false),
                                                            variant: 'dark'
                                                        }
                                                    ]
                                                });
                                                setShowValidationAlert(true);
                                            } else {
                                                setIsAiTrip(true);
                                            }
                                        }}
                                        className={`flex-1 p-4 rounded-2xl border-2 items-center ${isAiTrip
                                            ? 'bg-primary-yellow/10 border-primary-yellow'
                                            : 'bg-white border-neutral-gray/30'
                                            }`}
                                        activeOpacity={0.7}
                                    >
                                        <View className="mb-3">
                                            <Ionicons
                                                name="sparkles"
                                                size={32}
                                                color={isAiTrip ? '#FFD54D' : '#999999'}
                                            />
                                        </View>
                                        <TextRegular className="text-dark-black font-semibold text-center mb-1">
                                            Copiloto IA
                                        </TextRegular>
                                        <MicrotextDark className="text-neutral-gray text-center">
                                            Itinerario personalizado
                                        </MicrotextDark>

                                        {/* Badge de uso de viajes IA */}
                                        {userUsage?.ai_trip_creation && (
                                            <View className={`mt-2 px-3 py-1.5 rounded-full ${userUsage.ai_trip_creation.can_create ? 'bg-green-100' : 'bg-red-500'}`}>
                                                <MicrotextDark className={`text-xs font-semibold ${userUsage.ai_trip_creation.can_create ? 'text-green-700' : 'text-white'}`}>
                                                    {userUsage.ai_trip_creation.max_count === undefined
                                                        ? `${userUsage.ai_trip_creation.used_count || 0}/ilimitado`
                                                        : `${userUsage.ai_trip_creation.used_count || 0}/${userUsage.ai_trip_creation.max_count}`}
                                                </MicrotextDark>
                                            </View>
                                        )}

                                        {isAiTrip && (
                                            <View className="absolute top-2 right-2">
                                                <Ionicons name="checkmark-circle" size={20} color="#FFD54D" />
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    {/* Opción Manual */}
                                    <TouchableOpacity
                                        onPress={() => setIsAiTrip(false)}
                                        className={`flex-1 p-4 rounded-2xl border-2 items-center ${!isAiTrip
                                            ? 'bg-dark-black/5 border-dark-black'
                                            : 'bg-white border-neutral-gray/30'
                                            }`}
                                        activeOpacity={0.7}
                                    >
                                        <View className="mb-3">
                                            <Ionicons
                                                name="map"
                                                size={32}
                                                color={!isAiTrip ? '#202020' : '#999999'}
                                            />
                                        </View>
                                        <TextRegular className="text-dark-black font-semibold text-center mb-1">
                                            Modo Manual
                                        </TextRegular>
                                        <MicrotextDark className="text-neutral-gray text-center">
                                            Planea a tu ritmo
                                        </MicrotextDark>
                                        {!isAiTrip && (
                                            <View className="absolute top-2 right-2">
                                                <Ionicons name="checkmark-circle" size={20} color="#202020" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>

                            </View>
                        </View>
                    )}

                    {/* --- PASO 1: Detalles del viaje --- */}
                    {step === 1 && (
                        <View className="gap-8">
                            {/* Elige hora y lugar */}
                            <View className="mt-2 gap-4" style={{ overflow: 'visible' }}>
                                <SubtitleSemibold>Fecha y lugar</SubtitleSemibold>

                                <View className="flex-row gap-3" style={{ overflow: 'visible', zIndex: 2 }}>
                                    {/* Origen */}
                                    <View className="flex-1" style={{ overflow: 'visible' }}>
                                        <MicrotextDark className="mb-2">Origen*</MicrotextDark>
                                        <LocationSearchInput
                                            placeholder="Madrid"
                                            value={origin}
                                            onLocationSelect={(address, coords) => {
                                                setOrigin(address);
                                                setOriginData({
                                                    display_name: address,
                                                    coords: {
                                                        lat: coords.latitude,
                                                        lng: coords.longitude
                                                    }
                                                });
                                            }}
                                            showLocationButton={true}
                                        />
                                    </View>

                                    {/* Destino */}
                                    <View className="flex-1" style={{ overflow: 'visible' }}>
                                        <MicrotextDark className="mb-2">Destino*</MicrotextDark>
                                        <LocationSearchInput
                                            placeholder="Alarcón"
                                            value={destination}
                                            onLocationSelect={(address, coords) => {
                                                setDestination(address);
                                                setDestinationData({
                                                    display_name: address,
                                                    coords: {
                                                        lat: coords.latitude,
                                                        lng: coords.longitude
                                                    }
                                                });
                                            }}
                                            showLocationButton={false}
                                        />
                                    </View>
                                </View>

                                {/* Fechas */}
                                <View className="flex-row gap-3">
                                    {/* Fecha de salida - Web */}
                                    {Platform.OS === 'web' && (
                                        <>
                                            <DateTimePickerWeb
                                                value={startDate}
                                                mode="date"
                                                onChange={(date) => {
                                                    setStartDate(date);
                                                    if (endDate && date && endDate < date) {
                                                        setEndDate(null);
                                                    }
                                                }}
                                                minimumDate={new Date()}
                                                label="Fecha de salida*"
                                                containerClassName="flex-1"
                                            />
                                            <DateTimePickerWeb
                                                value={endDate}
                                                mode="date"
                                                onChange={(date) => setEndDate(date)}
                                                minimumDate={startDate || new Date()}
                                                label="Fecha de llegada al destino*"
                                                containerClassName="flex-1"
                                            />
                                        </>
                                    )}

                                    {/* Fecha de salida - Mobile (fallback) */}
                                    {Platform.OS !== 'web' && (
                                        <>
                                            <CustomInput
                                                label="Fecha de salida*"
                                                placeholder="DD/MM/AA"
                                                value={startDate ? formatDate(startDate) : ''}
                                                onPress={() => { setShowStartPicker(true); }}
                                                containerClassName="flex-1"
                                                editable={false}
                                            />
                                            <CustomInput
                                                label="Fecha de llegada al destino*"
                                                placeholder="DD/MM/AA"
                                                value={endDate ? formatDate(endDate) : ''}
                                                onPress={() => { setShowEndPicker(true); }}
                                                containerClassName="flex-1"
                                                editable={false}
                                            />
                                        </>
                                    )}
                                </View>

                                {/* Horas */}
                                <View className="flex-row gap-3">
                                    {/* Horas - Web */}
                                    {Platform.OS === 'web' && (
                                        <>
                                            <DateTimePickerWeb
                                                value={startTime}
                                                mode="time"
                                                onChange={(time) => setStartTime(time)}
                                                label="Hora de salida"
                                                containerClassName="flex-1"
                                            />
                                            <DateTimePickerWeb
                                                value={endTime}
                                                mode="time"
                                                onChange={(time) => setEndTime(time)}
                                                label="Hora de llegada"
                                                containerClassName="flex-1"
                                            />
                                        </>
                                    )}

                                    {/* Horas - Mobile (fallback) */}
                                    {Platform.OS !== 'web' && (
                                        <>
                                            <View className='flex-1'>
                                                <CustomInput
                                                    label="Hora de salida"
                                                    placeholder="HH:MM"
                                                    value={startTime ? formatTime(startTime) : ''}
                                                    onPress={() => { setShowStartTimePicker(true); }}
                                                    inputClassName="w-[85px]"
                                                    editable={false}
                                                />
                                            </View>
                                            <View className='flex-1'>
                                                <CustomInput
                                                    label="Hora de llegada"
                                                    placeholder="HH:MM"
                                                    value={endTime ? formatTime(endTime) : ''}
                                                    onPress={() => { setShowEndTimePicker(true); }}
                                                    inputClassName="w-[85px]"
                                                    editable={false}
                                                />
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* --- PASO 2: Viajeros --- */}
                    {step === 2 && (
                        <View>
                            {/* Sección de Viajeros */}
                            <View className="mb-8">
                                <SubtitleSemibold className="mb-4">
                                    Número de viajeros
                                </SubtitleSemibold>
                                <View className="gap-3">
                                    {[
                                        { key: 'adults' as keyof TravelerCounts, label: 'Adultos', description: 'Mayores de 14 años' },
                                        { key: 'children' as keyof TravelerCounts, label: 'Niños', description: 'De 2 a 14 años' },
                                        { key: 'infants' as keyof TravelerCounts, label: 'Bebés', description: 'Menos de 2 años' },
                                        { key: 'elders' as keyof TravelerCounts, label: 'Mayores', description: 'Más de 65 años' },
                                        { key: 'pets' as keyof TravelerCounts, label: 'Mascotas', description: 'Animales de compañía' },
                                    ].map(({ key, label, description }) => (
                                        <View key={key} className="flex-row items-center justify-between py-1">
                                            <View className="flex-1">
                                                <TextRegular className="text-dark-black mb-0.5">
                                                    {label}
                                                </TextRegular>
                                                <MicrotextDark className="text-neutral-gray">
                                                    {description}
                                                </MicrotextDark>
                                            </View>
                                            <View className="flex-row items-center rounded-full border border-neutral-gray/30 bg-white h-12">
                                                <TouchableOpacity
                                                    onPress={() => updateTravelerCount(key, -1)}
                                                    disabled={travelerCounts[key] === 0 || (key === 'adults' && travelerCounts[key] === 1)}
                                                    className={`w-12 h-12 items-center justify-center ${travelerCounts[key] === 0 || (key === 'adults' && travelerCounts[key] === 1) ? 'opacity-30' : ''}`}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="remove" size={20} color="#202020" />
                                                </TouchableOpacity>
                                                <View className="w-12 items-center justify-center">
                                                    <TextRegular className="text-dark-black text-center">
                                                        {travelerCounts[key]}
                                                    </TextRegular>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={() => updateTravelerCount(key, 1)}
                                                    className="w-12 h-12 items-center justify-center"
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="add" size={20} color="#202020" />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                            <Travelers
                                travelers={travelers}
                                isCreatingTrip
                                onInviteBeforeCreate={(user, role) => {
                                    setInvitedUsers(prev => [...prev, { user, role }]);
                                }}
                            />
                        </View>
                    )}

                    {/* --- PASO 3: Vehiculo --- */}
                    {step === 3 && (
                        <View>
                            <Title1 className="mb-6">
                                Elige tu vehículo
                            </Title1>

                            {/* --- SECCIÓN DE VEHÍCULOS --- */}
                            <VehiclesSection
                                vehicles={vehicles}
                                loading={vehiclesLoading}
                                maxVehicles={maxVehicles}
                                onAddVehicle={handleAddVehicle}
                                onEditVehicle={handleEditVehicle}
                                onDeleteVehicle={handleDeleteVehicle}
                                onSelectVehicle={handleSelectVehicle}
                                selectedVehicles={selectedVehicles}
                                isCreatingTrip={true}
                            />

                            {/* Vehículos de viajeros invitados */}
                            {invitedUsers.length > 0 && (
                                <View className="mb-6">
                                    <View className="flex-row justify-between items-center mb-4">
                                        <SubtitleSemibold>Vehículos de viajeros invitados</SubtitleSemibold>
                                    </View>

                                    {loadingTravelersVehicles ? (
                                        <View className="bg-white border border-neutral-gray/20 rounded-3xl p-6 items-center">
                                            <TextRegular className="text-neutral-gray">
                                                Cargando vehículos...
                                            </TextRegular>
                                        </View>
                                    ) : travelersVehicles.length === 0 ? (
                                        <View className="bg-white border border-neutral-gray/20 rounded-3xl p-6 items-center">
                                            <Ionicons name="car-outline" size={48} color="#999999" />
                                            <TextRegular className="text-neutral-gray text-center mt-3">
                                                Los viajeros invitados no tienen vehículos registrados
                                            </TextRegular>
                                        </View>
                                    ) : (
                                        <View className="gap-3">
                                            {travelersVehicles.map((vehicle) => {
                                                const isSelected = selectedVehicles.some(v => v.id === vehicle.id);
                                                return (
                                                    <VehicleCard
                                                        key={vehicle.id}
                                                        vehicle={vehicle}
                                                        onEdit={() => { }}
                                                        onDelete={() => { }}
                                                        isCreatingTrip
                                                        isSelected={isSelected}
                                                        onPress={() => handleSelectVehicle(vehicle)}
                                                    />
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            )}

                        </View>
                    )}

                    {/* --- PASO 4: Intereses y Estilo de Viaje (solo para IA) --- */}
                    {step === 4 && isAiTrip && (
                        <View>
                            <Title1 className="mb-2">
                                ¿Qué tipo de experiencia buscas?
                            </Title1>

                            {/* Sección de Intereses */}
                            <View className="mb-8">
                                <SubtitleSemibold className="mb-4 text-neutral-gray">
                                    Selecciona tus intereses y preferencias
                                </SubtitleSemibold>
                                <InterestSelector
                                    selectedInterests={selectedInterests}
                                    onInterestsChange={setSelectedInterests}
                                    multiple={true}
                                />
                            </View>

                            {/* Sección de Estilo de Viaje */}
                            <View>
                                <SubtitleSemibold className="mb-6">
                                    ¿Cómo te gusta viajar?
                                </SubtitleSemibold>
                                <View className="flex-row gap-4">
                                    {[
                                        { key: 'explorer' as const, label: 'Explorador', description: 'Ciudad que piso ciudad que exploro' },
                                        { key: 'balanced' as const, label: 'Equilibrado', description: 'Un poco de todo' },
                                        { key: 'sedentary' as const, label: 'Sedentario', description: 'Mejor me limito a mi destino' },
                                    ].map(({ key, label, description }) => (
                                        <View key={key} className="flex-1">
                                            <TouchableOpacity
                                                onPress={() => setTravelStyle(key)}
                                                className={`rounded-3xl border-2 items-center justify-center pt-6 pb-5 ${travelStyle === key ? 'bg-primary-yellow border-primary-yellow' : 'border-neutral-gray/20 bg-white'}`}
                                                activeOpacity={0.7}
                                            >
                                                {/* Iconos más grandes */}
                                                <View className="mb-3 items-center justify-center">
                                                    {key === 'explorer' && <ExploreIcon width={80} height={80} />}
                                                    {key === 'balanced' && <BalancedIcon width={80} height={80} />}
                                                    {key === 'sedentary' && <SedentaryIcon width={80} height={80} />}
                                                </View>
                                                <TextRegular className="text-dark-black text-center">
                                                    {label}
                                                </TextRegular>
                                            </TouchableOpacity>
                                            {/* Descripción fuera del rectángulo */}
                                            <MicrotextDark className="text-center text-neutral-gray mt-2 px-1">
                                                {description}
                                            </MicrotextDark>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* --- PASO 5: Presupuesto y gastos (solo para IA) --- */}
                    {step === 5 && isAiTrip && (
                        <View>
                            <Title1 className="mb-2">
                                ¿Cuánto te quieres gastar?
                            </Title1>

                            {/* Sección de Nivel de Gasto */}
                            <View className="mb-8">
                                <SubtitleSemibold className="mb-6">
                                    ¿Qué tipo de gastador eres?
                                </SubtitleSemibold>
                                <View className="flex-row gap-4">
                                    {[
                                        { key: 'saver' as const, label: 'Ahorrador', description: 'Cada céntimo cuenta' },
                                        { key: 'balanced' as const, label: 'Equilibrado', description: 'Ni muy muy, ni tan tan' },
                                        { key: 'luxury' as const, label: 'Derrochador', description: 'El dinero no es problema' },
                                    ].map(({ key, label, description }) => (
                                        <View key={key} className="flex-1">
                                            <TouchableOpacity
                                                onPress={() => setSpendingLevel(key)}
                                                className={`rounded-3xl border-2 items-center justify-center pt-6 pb-5 ${spendingLevel === key ? 'bg-primary-yellow border-primary-yellow' : 'border-neutral-gray/20 bg-white'}`}
                                                activeOpacity={0.7}
                                            >
                                                <View className="mb-3 items-center justify-center">
                                                    {key === 'saver' && <SaverIcon width={80} height={80} />}
                                                    {key === 'balanced' && <BalancedBudgetIcon width={80} height={80} />}
                                                    {key === 'luxury' && <LuxuryIcon width={80} height={80} />}
                                                </View>
                                                <TextRegular className="text-dark-black text-center">
                                                    {label}
                                                </TextRegular>
                                            </TouchableOpacity>
                                            <MicrotextDark className="text-center text-neutral-gray mt-2 px-1">
                                                {description}
                                            </MicrotextDark>
                                        </View>
                                    ))}
                                </View>
                            </View>

                            <View>
                                <SubtitleSemibold>
                                    Indica tu presupuesto
                                </SubtitleSemibold>
                                <TextRegular className="mb-4">
                                    Presupuesto total del viaje para {travelerCounts.adults + travelerCounts.children + travelerCounts.infants + travelerCounts.elders} viajero{travelerCounts.adults + travelerCounts.children + travelerCounts.infants + travelerCounts.elders !== 1 ? 's' : ''} y {selectedVehicles.length} vehículo{selectedVehicles.length !== 1 ? 's' : ''}
                                </TextRegular>

                                {/* Slider */}
                                <View
                                    className="h-10 mb-4 relative justify-center"
                                    onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
                                >
                                    {/* Barra de fondo */}
                                    <View className="absolute h-2 bg-neutral-gray/20 w-full rounded-full" />
                                    {/* Barra activa */}
                                    <View
                                        className="absolute h-2 bg-primary-yellow rounded-full"
                                        style={{
                                            left: getPositionFromValue(minBudget),
                                            width: getPositionFromValue(maxBudget) - getPositionFromValue(minBudget),
                                        }}
                                    />
                                    {/* Thumb mínimo */}
                                    <View
                                        {...minPanResponder.panHandlers}
                                        className="absolute w-8 h-8 rounded-full bg-primary-yellow border-4 border-white shadow-lg"
                                        style={{ left: getPositionFromValue(minBudget) - 16 }}
                                    />
                                    {/* Thumb máximo */}
                                    <View
                                        {...maxPanResponder.panHandlers}
                                        className="absolute w-8 h-8 rounded-full bg-primary-yellow border-4 border-white shadow-lg"
                                        style={{ left: getPositionFromValue(maxBudget) - 16 }}
                                    />
                                </View>

                                {/* Inputs del presupuesto */}
                                <View className="flex-row justify-between items-center gap-4 px-2">
                                    <View className="flex-1">
                                        <View className="px-4 mb-2">
                                            <CustomInput
                                                value={minBudgetInput}
                                                onChangeText={handleMinBudgetInputChange}
                                                onBlur={handleMinBudgetBlur}
                                                keyboardType="numeric"
                                                placeholder="50"
                                                inputClassName="text-center text-base font-semibold"
                                            />
                                        </View>
                                        <MicrotextDark className="text-neutral-gray text-center">Mínimo</MicrotextDark>
                                    </View>
                                    <View className="flex-1">
                                        <View className="px-4 mb-2">
                                            <CustomInput
                                                value={maxBudgetInput}
                                                onChangeText={handleMaxBudgetInputChange}
                                                onBlur={handleMaxBudgetBlur}
                                                keyboardType="numeric"
                                                placeholder="1000"
                                                containerClassName="border-0 p-0"
                                                inputClassName="text-center text-base font-semibold"
                                            />
                                        </View>
                                        <MicrotextDark className="text-neutral-gray text-center">Máximo</MicrotextDark>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* --- NAVEGACIÓN --- */}
            <View className={`px-6 pt-4 bg-white ${step === 0 ? 'pb-6' : 'pb-4'}`}>
                {modeSelected && step > 0 ? (
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <CustomButton
                                variant="dark"
                                title={
                                    <View className="flex-row items-center justify-center gap-2">
                                        <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
                                        <TextRegular className="text-white">
                                            Anterior
                                        </TextRegular>
                                    </View>
                                }
                                onPress={prevStep}
                                disabled={showAiLoader}
                            />
                        </View>
                        <View
                            ref={buttonRef}
                            collapsable={false}
                            className="flex-1"
                        >
                            <CustomButton
                                variant="primary"
                                title={
                                    <View className="flex-row items-center justify-center gap-2">
                                        <TextRegular className="text-dark-black">
                                            {isValidating ? 'Validando...' : (step === totalSteps ? 'Crear Viaje' : 'Siguiente')}
                                        </TextRegular>
                                        {!isValidating && <Ionicons name="arrow-forward" size={16} color="#202020" />}
                                    </View>
                                }
                                onPress={nextStep}
                                disabled={!isStepValid || showAiLoader || isValidating}
                                loading={isValidating}
                            />
                        </View>
                    </View>
                ) : (
                    <CustomButton
                        variant="primary"
                        title={
                            <View className="flex-row items-center justify-center gap-2">
                                <TextRegular className="text-dark-black">
                                    {isValidating ? 'Validando...' : (step === 0 ? 'Continuar' : 'Siguiente')}
                                </TextRegular>
                                {!isValidating && <Ionicons name="arrow-forward" size={16} color="#202020" />}
                            </View>
                        }
                        onPress={nextStep}
                        disabled={!isStepValid || showAiLoader || isValidating}
                        loading={isValidating}
                    />
                )}
            </View>

            {/* DatePickers (se renderizan fuera del flujo) */}
            {showStartPicker && (
                <DateTimePicker
                    value={startDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={new Date()}
                    onChange={(_, selectedDate) => {
                        setShowStartPicker(false);
                        if (selectedDate) {
                            setStartDate(selectedDate);
                            if (endDate && endDate < selectedDate) setEndDate(null);
                        }
                    }}
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={endDate || startDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={startDate || new Date()}
                    onChange={(_, selectedDate) => {
                        setShowEndPicker(false);
                        if (selectedDate) setEndDate(selectedDate);
                    }}
                />
            )}
            {/* TimePickers para las horas */}
            {showStartTimePicker && (
                <DateTimePicker
                    value={startTime || new Date()}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, selectedTime) => {
                        setShowStartTimePicker(false);
                        if (selectedTime) {
                            setStartTime(selectedTime);
                        }
                    }}
                />
            )}
            {showEndTimePicker && (
                <DateTimePicker
                    value={endTime || new Date()}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(_, selectedTime) => {
                        setShowEndTimePicker(false);
                        if (selectedTime) {
                            setEndTime(selectedTime);
                        }
                    }}
                />
            )}

            {/* COMPONENTE LOADER DE IA */}
            <AiTripLoader
                visible={showAiLoader}
                buttonCoords={buttonCoords}
                useFlappyBird={true}
                tripCreated={tripCreated}
                tripId={createdTripId || undefined}
                onNavigateToTrip={handleNavigateToTrip}
            />

            {/* ALERTA DE VALIDACIÓN */}
            {validationAlertConfig && (
                <CustomAlert
                    visible={showValidationAlert}
                    title={validationAlertConfig.title}
                    message={validationAlertConfig.message}
                    type={validationAlertConfig.type}
                    actions={validationAlertConfig.actions}
                    onClose={() => setShowValidationAlert(false)}
                />
            )}
        </SafeAreaView>
    );
}