// src/api/trips/tripStatusHistory.service.ts
import { supabase } from '../../supabase.js';
import { TripStatusHistory, TripStatus, TripStatusChangeSource } from '@planmyroute/types';

const TABLE_NAME = 'trip_status_history';

/**
 * Obtiene el historial completo de cambios de estado de un viaje
 * @param tripId - ID del viaje
 * @returns Array de registros de historial ordenados por fecha (más reciente primero)
 */
export const getByTripId = async (tripId: number): Promise<TripStatusHistory[]> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('trip_id', tripId)
        .order('changed_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener el historial del viaje: ${error.message}`);
    }

    return data as TripStatusHistory[];
};

/**
 * Obtiene el último cambio de estado de un viaje
 * @param tripId - ID del viaje
 * @returns Último registro de cambio de estado o null si no hay historial
 */
export const getLatestByTripId = async (tripId: number): Promise<TripStatusHistory | null> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('trip_id', tripId)
        .order('changed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(`Error al obtener el último cambio de estado: ${error.message}`);
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

/**
 * Obtiene todos los cambios realizados por un usuario específico
 * @param userId - ID del usuario
 * @returns Array de cambios realizados por el usuario
 */
export const getByUserId = async (userId: string): Promise<TripStatusHistory[]> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener historial del usuario: ${error.message}`);
    }

    return data as TripStatusHistory[];
};

/**
 * Obtiene estadísticas de cambios de estado para un viaje
 * @param tripId - ID del viaje
 * @returns Objeto con estadísticas del viaje
 */
export const getTripStatistics = async (tripId: number) => {
    const history = await getByTripId(tripId);

    if (history.length === 0) {
        return {
            totalChanges: 0,
            automaticChanges: 0,
            manualChanges: 0,
            systemChanges: 0,
            currentStatus: null,
            createdAt: null,
            lastChangedAt: null,
        };
    }

    const automaticChanges = history.filter(h => h.changed_by === 'auto').length;
    const manualChanges = history.filter(h => h.changed_by === 'user').length;
    const systemChanges = history.filter(h => h.changed_by === 'system').length;

    return {
        totalChanges: history.length,
        automaticChanges,
        manualChanges,
        systemChanges,
        currentStatus: history[0].new_status,
        createdAt: history[history.length - 1].changed_at,
        lastChangedAt: history[0].changed_at,
    };
};

/**
 * Obtiene todos los viajes que cambiaron de estado en un rango de fechas
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns Array de cambios en el rango especificado
 */
export const getByDateRange = async (startDate: string, endDate: string): Promise<TripStatusHistory[]> => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .gte('changed_at', startDate)
        .lte('changed_at', endDate)
        .order('changed_at', { ascending: false });

    if (error) {
        throw new Error(`Error al obtener historial por rango de fechas: ${error.message}`);
    }

    return data as TripStatusHistory[];
};

/**
 * Elimina todo el historial de un viaje (normalmente no se usa, solo para limpieza)
 * @param tripId - ID del viaje
 */
export const deleteByTripId = async (tripId: number): Promise<void> => {
    const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('trip_id', tripId);

    if (error) {
        throw new Error(`Error al eliminar historial del viaje: ${error.message}`);
    }
};
