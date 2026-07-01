// src/api/trips/tripStatusHistory.service.ts
import { supabase } from "../../supabase.js";
import {
  TripStatusHistory,
  TripStatus,
  TripStatusChangeSource,
} from "@planmyroute/types";

const TABLE_NAME = "trip_status_history";

/**
 * Obtiene el historial completo de cambios de estado de un viaje
 * @param tripId - ID del viaje
 * @returns Array de registros de historial ordenados por fecha (más reciente primero)
 */
export const getByTripId = async (
  tripId: number,
): Promise<TripStatusHistory[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("trip_id", tripId)
    .order("changed_at", { ascending: false });

  if (error) {
    throw new Error(
      `Error al obtener el historial del viaje: ${error.message}`,
    );
  }

  return data as TripStatusHistory[];
};

/**
 * Obtiene el último cambio de estado de un viaje
 * @param tripId - ID del viaje
 * @returns Último registro de cambio de estado o null si no hay historial
 */
export const getLatestByTripId = async (
  tripId: number,
): Promise<TripStatusHistory | null> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("trip_id", tripId)
    .order("changed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error al obtener el último cambio de estado: ${error.message}`,
    );
  }

  return data as TripStatusHistory | null;
};

/**
 * Crea un registro en el historial de cambios de estado
 * @param historyData - Datos del cambio de estado
 * @returns Registro creado
 */
export const create = async (historyData: {
  trip_id: number;
  old_status: TripStatus | null;
  new_status: TripStatus;
  changed_by: TripStatusChangeSource;
  reason?: string;
  user_id?: string;
}): Promise<TripStatusHistory> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      ...historyData,
      changed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error al crear registro de historial: ${error.message}`);
  }

  return data as TripStatusHistory;
};
