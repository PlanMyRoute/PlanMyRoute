import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { LocationData } from "@/utils/tripValidation";

// ─── Types ───────────────────────────────────────────────────────────────────

export type WizardDraft = {
  /** ISO timestamp of last save */
  savedAt: string;
  /** Wizard step the user was on (1-based) */
  step: number;

  // Step 0
  tripName: string;
  isAiTrip: boolean;

  // Step 1 – basics
  origin: string;
  originData: LocationData | null;
  destination: string;
  destinationData: LocationData | null;
  startDate: string | null; // ISO
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  roundTrip: boolean;
  intermediateStops: Array<{
    id: string;
    name: string;
    address: string;
    coordinates: { lat: number; lng: number } | null;
    expectedArrivalDate: string | null;
  }>;

  // Step 2 – travelers
  travelerCounts: {
    adults: number;
    children: number;
    infants: number;
    elders: number;
    pets: number;
  };

  // Step 4 – preferences
  selectedInterests: string[];
  travelStyle: "explorer" | "balanced" | "sedentary";

  // Step 5 – budget
  spendingLevel: "saver" | "balanced" | "luxury";
  minBudget: number;
  maxBudget: number;
};

// ─── Storage key ─────────────────────────────────────────────────────────────

const draftKey = (userId: string) => `@planmyroute/wizard_draft_${userId}`;

// ─── Pure async helpers ───────────────────────────────────────────────────────

/**
 * Guarda el borrador del wizard en AsyncStorage.
 * @param userId - ID del usuario propietario del borrador
 * @param draft - Datos del borrador a guardar
 */
export async function saveDraftAsync(
  userId: string,
  draft: WizardDraft,
): Promise<void> {
  await AsyncStorage.setItem(draftKey(userId), JSON.stringify(draft));
}

/**
 * Carga el borrador del wizard desde AsyncStorage.
 * @param userId - ID del usuario propietario del borrador
 * @returns El borrador guardado o null si no existe
 */
export async function loadDraftAsync(
  userId: string,
): Promise<WizardDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as WizardDraft;
  } catch {
    return null;
  }
}

/**
 * Elimina el borrador del wizard de AsyncStorage.
 * @param userId - ID del usuario propietario del borrador
 */
export async function clearDraftAsync(userId: string): Promise<void> {
  await AsyncStorage.removeItem(draftKey(userId));
}

// ─── Hook for createTrip tab banner ──────────────────────────────────────────

/**
 * Used in createTrip.tsx to detect whether a draft exists and show the banner.
 */
export function useDraftBanner(userId: string | undefined) {
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!userId) {
      setChecked(true);
      return;
    }
    loadDraftAsync(userId).then((d) => {
      setDraft(d);
      setChecked(true);
    });
  }, [userId]);

  const discard = useCallback(async () => {
    if (!userId) return;
    await clearDraftAsync(userId);
    setDraft(null);
  }, [userId]);

  return { draft, hasDraft: !!draft, checked, discard };
}
