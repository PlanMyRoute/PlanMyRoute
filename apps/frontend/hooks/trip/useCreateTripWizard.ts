import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Vehicle } from "@planmyroute/types";
import {
  splitInterests,
  ExtendedInterest,
} from "@/components/interests/InterestSelector";
import { WizardDraft, saveDraftAsync, clearDraftAsync } from "./useWizardDraft";
import { type AlertAction } from "@/components/customElements/CustomAlert";
import { useAuth } from "@/context/AuthContext";
import { useProfile, useUser } from "@/hooks/users/useUsers";
import {
  useTokenBalance,
  useInvalidateTokenBalance,
} from "@/hooks/users/useTokenBalance";
import { useSubscription } from "@/context/SubscriptionContext";
import { getActionCost } from "@planmyroute/types";
import { TravelerWithRole } from "@/hooks/useTrips";
import { useVehicles } from "@/hooks/useVehicles";
import { ROUTES } from "@/constants/routes";
import {
  validateTripBasic,
  validateTripComplete,
  TripValidationResult,
} from "@/utils/tripValidation";

import { useTripBasicsForm } from "./useTripBasicsForm";
import { useTripTravelersForm } from "./useTripTravelersForm";
import { useTripBudgetForm } from "./useTripBudgetForm";
import { useTripPreferencesForm } from "./useTripPreferencesForm";
import { useTripIntermediateStops } from "./useTripIntermediateStops";
import { useCreateTripMutation } from "./useCreateTripMutation";
import {
  TripService,
  PremiumLimitError,
  InsufficientTokensError,
} from "@/services/tripService";
import { ItineraryService } from "@/services/itineraryService";

/** La generación IA terminó en estado "failed" mientras esperábamos el día 1 */
class GenerationFailedError extends Error {}

const DAY_ONE_POLL_INTERVAL_MS = 2500;
const DAY_ONE_MAX_WAIT_MS = 120_000;

export type ValidationAlertConfig = {
  title: string;
  message: string;
  type: "error" | "warning" | "success" | "info";
  actions: AlertAction[];
};

type WizardParams = {
  initialTripName?: string;
  initialIsAi?: boolean;
  initialStep?: number;
};

/**
 * Hook principal del wizard de creación de viaje: orquesta pasos, validación, borradores y envío del viaje (manual o IA).
 * @param params - Parámetros iniciales del wizard: nombre del viaje, modo IA y paso inicial
 * @returns Estado completo del wizard, navegación entre pasos, sub-formularios y funciones de envío
 */
export function useCreateTripWizard({
  initialTripName = "",
  initialIsAi = true,
  initialStep = 0,
}: WizardParams = {}) {
  const router = useRouter();
  const { user: authUser, token } = useAuth();
  const { data: profileUser } = useUser(authUser?.id);
  const { data: profile } = useProfile(authUser?.id, undefined);
  const { data: tokenBalance } = useTokenBalance();
  const invalidateTokenBalance = useInvalidateTokenBalance();
  const { isPremium } = useSubscription();

  const vehicleHook = useVehicles(authUser?.id);

  // Coste base para iniciar un viaje con IA (GENERATE_TRIP). El addon circular se suma al enviar.
  const aiBaseCost = getActionCost("GENERATE_TRIP", isPremium);
  const hasEnoughForAiBase =
    typeof tokenBalance !== "number" || tokenBalance >= aiBaseCost;

  // ---- Step 0 state ----
  const [tripName, setTripName] = useState(initialTripName);
  const [isAiTrip, setIsAiTrip] = useState(initialIsAi);
  const [modeSelected, setModeSelected] = useState(initialStep > 0);

  // ---- Step navigation ----
  const [step, setStep] = useState(initialStep);
  const [maxStepReached, setMaxStepReached] = useState(initialStep);

  useEffect(() => {
    if (step > maxStepReached) setMaxStepReached(step);
  }, [step]);

  const totalSteps = isAiTrip ? 5 : 3;

  // ---- Sub-forms ----
  const basics = useTripBasicsForm();
  const travelers = useTripTravelersForm(token);
  const preferences = useTripPreferencesForm(
    (profile?.user.user_type as ExtendedInterest[]) || [],
  );

  // ---- Validation result (needed by budget form) ----
  const [validationResult, setValidationResult] =
    useState<TripValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const budget = useTripBudgetForm(validationResult, step);
  const intermediateStops = useTripIntermediateStops();
  const { mutate: doCreateTrip, isPending: isSubmitting } =
    useCreateTripMutation();

  // ---- Selected vehicles & refuel toggle ----
  const [selectedVehicles, setSelectedVehicles] = useState<Vehicle[]>([]);
  const [enableAutoRefuel, setEnableAutoRefuel] = useState(isPremium);

  const toggleVehicle = (vehicle: Vehicle) => {
    setSelectedVehicles((prev) =>
      prev.find((v) => v.id === vehicle.id)
        ? prev.filter((v) => v.id !== vehicle.id)
        : [...prev, vehicle],
    );
  };

  // ---- Clear validation when key route inputs change ----
  useEffect(() => {
    setValidationResult(null);
  }, [basics.origin, basics.destination, basics.startDate, basics.endDate]);

  // ---- Recalculate budget estimate when reaching step 5 ----
  useEffect(() => {
    if (
      step === 5 &&
      basics.originData &&
      basics.destinationData &&
      basics.startDate &&
      basics.endDate
    ) {
      let avgConsumption: number | undefined;
      if (selectedVehicles.length > 0) {
        const consumptions = selectedVehicles
          .map((v) => v.avg_consumption)
          .filter((c): c is number => c !== null && c !== undefined);
        if (consumptions.length > 0) {
          avgConsumption =
            consumptions.reduce((sum, c) => sum + c, 0) / consumptions.length;
        }
      }
      const result = validateTripBasic({
        origin: basics.originData.coords,
        destination: basics.destinationData.coords,
        start_date: basics.startDate,
        end_date: basics.endDate,
        n_adults: travelers.travelerCounts.adults,
        budget_total: budget.maxBudget,
        vehicle_consumption_l_per_100: avgConsumption,
        spending_level: budget.spendingLevel,
      });
      setValidationResult(result);
    }
  }, [
    step,
    budget.spendingLevel,
    budget.maxBudget,
    selectedVehicles,
    travelers.travelerCounts.adults,
  ]);

  // ---- Alerts ----
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<ValidationAlertConfig | null>(
    null,
  );

  const showValidationAlert = (config: ValidationAlertConfig) => {
    setAlertConfig(config);
    setShowAlert(true);
  };
  const hideAlert = () => setShowAlert(false);

  // ---- AI Loader state ----
  const [showAiLoader, setShowAiLoader] = useState(false);
  const [buttonCoords, setButtonCoords] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // ---- Travelers display list (for Travelers component) ----
  const travelersList = useMemo((): TravelerWithRole[] => {
    const base: TravelerWithRole[] =
      profileUser && !Array.isArray(profileUser)
        ? [{ user: profileUser, role: "owner" }]
        : [];
    const invited: TravelerWithRole[] = travelers.invitedUsers.map(
      ({ user }) => ({
        user,
        role: "pending" as const,
      }),
    );
    return [...base, ...invited];
  }, [profileUser, travelers.invitedUsers]);

  // ---- Step validation ----
  const isStepValidForStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 0:
        return tripName.trim().length > 0;
      case 1:
        return (
          basics.origin.trim().length > 0 &&
          basics.originData !== null &&
          basics.destination.trim().length > 0 &&
          basics.destinationData !== null &&
          basics.startDate !== null &&
          basics.endDate !== null &&
          intermediateStops.list.every((s) => s.coordinates !== null)
        );
      case 2:
        return travelers.travelerCounts.adults >= 1;
      case 3:
        return !enableAutoRefuel || selectedVehicles.length > 0;
      case 4:
        return isAiTrip ? preferences.selectedInterests.length > 0 : true;
      case 5:
        return isAiTrip;
      default:
        return false;
    }
  };

  const isStepValid = useMemo(
    () => isStepValidForStep(step),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      step,
      tripName,
      basics.origin,
      basics.originData,
      basics.destination,
      basics.destinationData,
      basics.startDate,
      basics.endDate,
      travelers.travelerCounts.adults,
      preferences.selectedInterests,
      isAiTrip,
      intermediateStops.list,
      enableAutoRefuel,
      selectedVehicles,
    ],
  );

  const canNavigateToStep = (targetStep: number): boolean => {
    if (targetStep === 1) return modeSelected;
    if (targetStep < step) return true;
    for (let i = step; i < targetStep; i++) {
      if (!isStepValidForStep(i)) return false;
    }
    return true;
  };

  // ---- Draft auto-save (debounced 1.5s when wizard is active) ----
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (step === 0 || !authUser?.id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const draft: WizardDraft = {
        savedAt: new Date().toISOString(),
        step,
        tripName,
        isAiTrip,
        origin: basics.origin,
        originData: basics.originData,
        destination: basics.destination,
        destinationData: basics.destinationData,
        startDate: basics.startDate?.toISOString() ?? null,
        endDate: basics.endDate?.toISOString() ?? null,
        startTime: basics.startTime?.toISOString() ?? null,
        endTime: basics.endTime?.toISOString() ?? null,
        roundTrip: basics.roundTrip,
        intermediateStops: intermediateStops.list.map((s) => ({
          id: s.id,
          name: s.name,
          address: s.address,
          coordinates: s.coordinates,
          expectedArrivalDate: s.expectedArrivalDate?.toISOString() ?? null,
        })),
        travelerCounts: travelers.travelerCounts,
        selectedInterests: preferences.selectedInterests as string[],
        travelStyle: preferences.travelStyle,
        spendingLevel: budget.spendingLevel,
        minBudget: budget.minBudget,
        maxBudget: budget.maxBudget,
      };
      saveDraftAsync(authUser.id, draft).catch(() => {});
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    step,
    tripName,
    isAiTrip,
    basics.origin,
    basics.destination,
    basics.startDate,
    basics.endDate,
    basics.startTime,
    basics.endTime,
    basics.roundTrip,
    travelers.travelerCounts,
    preferences.selectedInterests,
    preferences.travelStyle,
    budget.spendingLevel,
    budget.minBudget,
    budget.maxBudget,
    intermediateStops.list,
  ]);

  // ---- Apply a saved draft to all sub-form state ----
  const applyDraft = (draft: WizardDraft) => {
    setTripName(draft.tripName);
    setIsAiTrip(draft.isAiTrip);
    basics.setOrigin(draft.origin);
    basics.setOriginData(draft.originData);
    basics.setDestination(draft.destination);
    basics.setDestinationData(draft.destinationData);
    if (draft.startDate) basics.setStartDate(new Date(draft.startDate));
    if (draft.endDate) basics.setEndDate(new Date(draft.endDate));
    if (draft.startTime) basics.setStartTime(new Date(draft.startTime));
    if (draft.endTime) basics.setEndTime(new Date(draft.endTime));
    basics.setRoundTrip(draft.roundTrip);
    travelers.setTravelerCounts(draft.travelerCounts);
    preferences.setSelectedInterests(draft.selectedInterests as ExtendedInterest[]);
    preferences.setTravelStyle(draft.travelStyle);
    budget.setSpendingLevel(draft.spendingLevel);
    budget.setMinBudget(draft.minBudget);
    budget.setMaxBudget(draft.maxBudget);
    budget.setBudgetManuallyModified(false);
    // Restore intermediate stops directly (preserving IDs from draft)
    intermediateStops.initStops(
      draft.intermediateStops.map((s) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        coordinates: s.coordinates,
        expectedArrivalDate: s.expectedArrivalDate
          ? new Date(s.expectedArrivalDate)
          : null,
      })),
    );
    // Navigate to the saved step
    const targetStep = Math.max(1, draft.step);
    setStep(targetStep);
    setMaxStepReached(targetStep);
    setModeSelected(true);
  };

  // ---- Alerta reutilizable de saldo de tokens insuficiente ----
  const showInsufficientTokensAlert = (
    required: number,
    currentBalance?: number,
  ) => {
    const balanceText =
      typeof currentBalance === "number" ? ` Tienes ${currentBalance}.` : "";
    showValidationAlert({
      title: "💎 Tokens insuficientes",
      message: `Necesitas ${required} tokens para generar este viaje con IA.${balanceText} Compra más tokens o usa el modo manual.`,
      type: "warning",
      actions: [
        {
          text: "Comprar tokens",
          onPress: () => {
            hideAlert();
            router.push(ROUTES.premium);
          },
          variant: "yellow",
        },
        {
          text: "Usar modo manual",
          onPress: () => {
            hideAlert();
            setIsAiTrip(false);
          },
          variant: "outline",
        },
        { text: "Cerrar", onPress: hideAlert, variant: "dark" },
      ],
    });
  };

  // ---- AI mode selection with token balance check ----
  const handleSelectAiMode = () => {
    if (!hasEnoughForAiBase) {
      showInsufficientTokensAlert(aiBaseCost, tokenBalance);
    } else {
      setIsAiTrip(true);
    }
  };

  // ---- Navigation ----
  const goNext = async () => {
    if (!isStepValid || isValidating) return;

    if (step === 0) {
      if (isAiTrip && !hasEnoughForAiBase) {
        showInsufficientTokensAlert(aiBaseCost, tokenBalance);
        return;
      }
      setModeSelected(true);
      setStep(1);
      return;
    }

    if (step === 1) {
      if (!basics.originData || !basics.destinationData) {
        showValidationAlert({
          title: "Datos incompletos",
          message: "Por favor, completa el origen y destino del viaje.",
          type: "error",
          actions: [{ text: "Entendido", onPress: hideAlert, variant: "dark" }],
        });
        return;
      }
      setIsValidating(true);
      try {
        const validation = await validateTripComplete({
          origin: basics.originData,
          destination: basics.destinationData,
          start_date: basics.startDate,
          end_date: basics.endDate,
        });
        setValidationResult(validation);
        if (validation.errors.length > 0) {
          showValidationAlert({
            title: "¡Viaje imposible!",
            message: validation.errors.join("\n\n"),
            type: "error",
            actions: [
              { text: "Cambiar datos", onPress: hideAlert, variant: "dark" },
            ],
          });
          return;
        }
        if (validation.warnings.length > 0) {
          showValidationAlert({
            title: "Viaje no recomendado",
            message: validation.warnings.join("\n\n"),
            type: "warning",
            actions: [
              {
                text: "Modificar viaje",
                onPress: hideAlert,
                variant: "outline",
              },
              {
                text: "Continuar así",
                onPress: () => {
                  hideAlert();
                  setStep(2);
                },
                variant: "primary",
              },
            ],
          });
          return;
        }
        // Check for a similar trip already in planning
        try {
          const existingTrips = await TripService.getUserTrips(authUser!.id, {
            token: token || undefined,
          });
          const originWord = basics.origin.split(",")[0].toLowerCase();
          const destWord = basics.destination.split(",")[0].toLowerCase();
          const duplicate = existingTrips.find((t) => {
            const ta = t as any;
            return (
              t.status === "planning" &&
              (ta.origin?.toLowerCase().includes(originWord) ?? false) &&
              (ta.destination?.toLowerCase().includes(destWord) ?? false)
            );
          });
          if (duplicate) {
            showValidationAlert({
              title: "Viaje similar existente",
              message: `Ya tienes "${duplicate.name}" planificado con el mismo origen y destino. ¿Quieres crear otro viaje igualmente?`,
              type: "warning",
              actions: [
                {
                  text: "Ver viaje existente",
                  onPress: () => {
                    hideAlert();
                    router.push(ROUTES.trip(duplicate.id!));
                  },
                  variant: "outline",
                },
                {
                  text: "Crear nuevo",
                  onPress: () => {
                    hideAlert();
                    setStep(2);
                  },
                  variant: "primary",
                },
              ],
            });
            return;
          }
        } catch {
          // Ignore errors in duplicate check — not critical
        }
        setStep(2);
      } catch {
        showValidationAlert({
          title: "Error de validación",
          message:
            "No se pudo validar el viaje. Verifica tu conexión e intenta de nuevo.",
          type: "error",
          actions: [{ text: "Entendido", onPress: hideAlert, variant: "dark" }],
        });
      } finally {
        setIsValidating(false);
      }
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    // Last step — validate budget then submit
    if (
      validationResult?.budgetEst &&
      budget.maxBudget < validationResult.budgetEst.estimate_min * 0.6
    ) {
      showValidationAlert({
        title: "Presupuesto insuficiente",
        message: `El presupuesto de ${budget.maxBudget}€ es muy inferior al recomendado (${validationResult.budgetEst.estimate_min}€). El viaje puede no ser viable.`,
        type: "warning",
        actions: [
          {
            text: "Ajustar presupuesto",
            onPress: hideAlert,
            variant: "outline",
          },
          {
            text: "Crear viaje",
            onPress: () => {
              hideAlert();
              _doSubmit();
            },
            variant: "primary",
          },
        ],
      });
      return;
    }
    _doSubmit();
  };

  const goBack = () => {
    if (step === 1) {
      setModeSelected(false);
      setStep(0);
      setMaxStepReached(0);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  const goToStep = (targetStep: number) => {
    if (canNavigateToStep(targetStep)) setStep(targetStep);
  };

  // ---- Submit ----
  const startTrip = (coords: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    setButtonCoords(coords);
    setShowAiLoader(true);
    setTimeout(() => _doSubmit(), 100);
  };

  /**
   * Espera (polling) a que el itinerario del día 1 esté persistido antes de
   * entrar al viaje: las paradas origen/destino se crean con el trip, así que
   * la señal es la primera parada que no sea ninguna de las dos. Lanza
   * GenerationFailedError si el backend marca la generación como fallida.
   * Si se supera el tiempo máximo, retorna igualmente (los skeletons del
   * itinerario cubren la espera restante dentro del viaje).
   */
  const waitForDayOneStops = async (tripId: number): Promise<void> => {
    const startedAt = Date.now();
    let cycle = 0;
    while (Date.now() - startedAt < DAY_ONE_MAX_WAIT_MS) {
      await new Promise((r) => setTimeout(r, DAY_ONE_POLL_INTERVAL_MS));
      cycle++;
      try {
        const stops = await ItineraryService.getStopsByTripId(String(tripId), {
          token: token || undefined,
        });
        if (
          Array.isArray(stops) &&
          stops.some((s) => s.type !== "origen" && s.type !== "destino")
        ) {
          return;
        }
        // Cada ~3 ciclos comprobamos si la generación ha fallado
        if (cycle % 3 === 0) {
          const trip = await TripService.getTripById(String(tripId), {
            token: token || undefined,
          });
          if ((trip as any)?.generation_status === "failed") {
            throw new GenerationFailedError();
          }
        }
      } catch (err) {
        if (err instanceof GenerationFailedError) throw err;
        // Error transitorio de red: seguimos esperando hasta el timeout
      }
    }
  };

  const _doSubmit = async () => {
    if (!authUser?.id) {
      showValidationAlert({
        title: "Error de autenticación",
        message: "Debes iniciar sesión para crear un viaje.",
        type: "error",
        actions: [{ text: "Cerrar", onPress: hideAlert, variant: "dark" }],
      });
      return;
    }

    setShowAiLoader(true);

    const combineDateAndTime = (date: Date, time: Date | null): string => {
      const pad = (n: number) => String(n).padStart(2, "0");
      const h = time ? time.getHours() : 0;
      const m = time ? time.getMinutes() : 0;
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(h)}:${pad(m)}:00`;
    };

    const formatTime = (time: Date | null, fallback: string): string => {
      if (!time) return fallback;
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${pad(time.getHours())}:${pad(time.getMinutes())}`;
    };

    try {
      const tripId = await doCreateTrip({
        payload: {
          name: tripName.trim(),
          description: `Viaje de ${basics.origin.trim()} a ${basics.destination.trim()}`,
          start_date: basics.startDate
            ? combineDateAndTime(basics.startDate, basics.startTime)
            : null,
          end_date: basics.endDate
            ? combineDateAndTime(basics.endDate, basics.endTime)
            : null,
          start_time: formatTime(basics.startTime, "09:00"),
          end_time: formatTime(basics.endTime, "18:00"),
          circular: basics.roundTrip,
          n_adults: travelers.travelerCounts.adults,
          n_children: travelers.travelerCounts.children,
          n_babies: travelers.travelerCounts.infants,
          n_elders: travelers.travelerCounts.elders,
          n_pets: travelers.travelerCounts.pets,
          type: splitInterests(preferences.selectedInterests).dbInterests,
          promptKeywords: splitInterests(preferences.selectedInterests).promptKeywords,
          estimated_price_min: budget.minBudget,
          estimated_price_max: budget.maxBudget,
          status: "planning",
          origin: basics.origin.trim(),
          destination: basics.destination.trim(),
          vehicleIds: selectedVehicles.map((v) => v.id),
          travelStyle: preferences.travelStyle,
          travelSpendingLevel: budget.spendingLevel,
          enableAutoRefuel: isAiTrip ? enableAutoRefuel : undefined,
          mandatoryStops: intermediateStops.list
            .filter((s) => s.coordinates !== null)
            .map((s) => ({
              name: s.name || s.address,
              address: s.address,
              coordinates: s.coordinates!,
              expectedArrivalDate: s.expectedArrivalDate?.toISOString() ?? null,
            })),
        },
        isAiTrip,
        invitedUsers: travelers.invitedUsers,
        tripName: tripName.trim(),
      });
      // Viajes IA: permanecemos en la pantalla de creación (resumen animado)
      // hasta que el día 1 del itinerario esté persistido — entrar antes
      // mostraría un viaje vacío. Viajes manuales: navegación inmediata.
      if (tripId && isAiTrip) {
        await waitForDayOneStops(tripId);
      }
      setShowAiLoader(false);
      // La generación cobró tokens en el backend: refrescamos el saldo.
      invalidateTokenBalance();
      if (tripId) {
        router.replace(
          isAiTrip ? ROUTES.tripJustCreated(tripId) : ROUTES.trip(tripId),
        );
        reset();
      }
    } catch (error: unknown) {
      setShowAiLoader(false);
      if (error instanceof GenerationFailedError) {
        // La generación falló mientras esperábamos el día 1: el backend ya
        // reembolsó los tokens (ver generateAutomaticTrip).
        invalidateTokenBalance();
        showValidationAlert({
          title: "No se pudo generar el viaje",
          message:
            "Hubo un problema generando el itinerario. Tus tokens han sido reembolsados. Inténtalo de nuevo en unos minutos.",
          type: "error",
          actions: [{ text: "Entendido", onPress: hideAlert, variant: "dark" }],
        });
      } else if (error instanceof InsufficientTokensError) {
        showInsufficientTokensAlert(
          error.required ?? aiBaseCost,
          error.balance ?? tokenBalance,
        );
      } else if (error instanceof PremiumLimitError) {
        showValidationAlert({
          title: "🔒 Límite alcanzado",
          message: String(
            error.error ??
              "Has alcanzado el límite de viajes con IA para este mes.",
          ),
          type: "warning",
          actions: [
            {
              text: "Ver Premium",
              onPress: () => {
                hideAlert();
                router.push(ROUTES.premium);
              },
              variant: "yellow",
            },
            { text: "Cerrar", onPress: hideAlert, variant: "dark" },
          ],
        });
      } else {
        showValidationAlert({
          title: "Error",
          message:
            "Hubo un problema al crear el viaje. Por favor, inténtalo de nuevo.",
          type: "error",
          actions: [{ text: "Cerrar", onPress: hideAlert, variant: "dark" }],
        });
      }
    }
  };

  // ---- Reset ----
  const reset = () => {
    // Clear saved draft so the banner disappears
    if (authUser?.id) clearDraftAsync(authUser.id).catch(() => {});
    setTripName("");
    setIsAiTrip(true);
    setModeSelected(false);
    setStep(0);
    setMaxStepReached(0);
    basics.reset();
    travelers.reset();
    preferences.reset();
    budget.reset();
    intermediateStops.reset();
    setSelectedVehicles([]);
    setEnableAutoRefuel(isPremium);
    setValidationResult(null);
    setShowAiLoader(false);
    setButtonCoords(null);
  };

  return {
    // Step 0
    tripName,
    setTripName,
    isAiTrip,
    handleSelectAiMode,
    setIsAiTrip,
    modeSelected,

    // Navigation
    step,
    totalSteps,
    maxStepReached,
    goNext,
    goBack,
    goToStep,
    isStepValid,
    isValidating,
    isSubmitting,
    canNavigateToStep,

    // Basics (step 1)
    basics,

    // Travelers (step 2)
    travelers,
    travelersList,

    // Vehicles (step 3)
    vehicles: vehicleHook.vehicles,
    vehiclesLoading: vehicleHook.loading,
    selectedVehicles,
    toggleVehicle,
    maxVehicles: vehicleHook.maxVehicles,
    handleAddVehicle: vehicleHook.handleAddVehicle,
    handleEditVehicle: vehicleHook.handleEditVehicle,
    handleDeleteVehicle: vehicleHook.handleDeleteVehicle,
    enableAutoRefuel,
    setEnableAutoRefuel,

    // Preferences (step 4)
    preferences,

    // Budget (step 5)
    budget,

    // Intermediate stops
    intermediateStops,

    // AI Loader
    showAiLoader,
    buttonCoords,
    setButtonCoords,
    startTrip,

    // Validation & alerts
    validationResult,
    showAlert,
    alertConfig,
    hideAlert,

    // Draft management
    applyDraft,

    // Tokens
    tokenBalance,
    aiBaseCost,
    isPremium,

    reset,
  };
}
