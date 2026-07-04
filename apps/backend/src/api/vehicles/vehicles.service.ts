// src/api/vehicles/vehicles.service.ts
import { supabase } from "../../supabase.js";
import {
  Vehicle,
  VehicleType,
  FuelType,
  TablesUpdate,
} from "@planmyroute/types";
import { ForbiddenError, NotFoundError } from "../../utils/errors.js";

const TABLE_NAME = "vehicle";
/** Número máximo de vehículos por usuario (plan gratuito) */
const MAX_VEHICLES_PER_USER = 3;

// Payload para crear vehículo (omitimos id, user_id ya que se asignan en el backend)
export interface CreateVehiclePayload {
  brand: string | null;
  model: string | null;
  type: VehicleType;
  type_fuel: FuelType | null;
  avg_consumption?: number | null;
  fuel_tank_capacity?: number | null;
}

// Payload para actualizar vehículo
export type UpdateVehiclePayload = TablesUpdate<"vehicle">;

/**
 * Obtiene todos los vehículos de un usuario
 */
export const getUserVehicles = async (userId: string): Promise<Vehicle[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Error al obtener los vehículos: ${error.message}`);
  }

  return data || [];
};

/**
 * Obtiene un vehículo por su ID. Lanza error si no existe.
 */
export const getVehicleFromId = async (vehicleId: string): Promise<Vehicle> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", vehicleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error al obtener el vehículo: ${error.message}`);
  }

  if (!data) {
    throw new NotFoundError("No se encontró el vehículo");
  }

  return data;
};

/**
 * Crea un nuevo vehículo para un usuario
 */
export const createVehicle = async (
  userId: string,
  payload: CreateVehiclePayload,
): Promise<Vehicle> => {
  const { count, error: countError } = await supabase
    .from(TABLE_NAME)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError)
    throw new Error(`Error al verificar vehículos: ${countError.message}`);
  if ((count ?? 0) >= MAX_VEHICLES_PER_USER)
    throw new ForbiddenError("Has alcanzado el límite máximo de 3 vehículos", {
      code: "VEHICLE_LIMIT_REACHED",
    });

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      user_id: userId,
      brand: payload.brand,
      model: payload.model,
      type: payload.type,
      type_fuel: payload.type_fuel,
      avg_consumption: payload.avg_consumption || null,
      fuel_tank_capacity: payload.fuel_tank_capacity || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error al crear el vehículo: ${error.message}`);
  }

  return data;
};

/**
 * Actualiza un vehículo existente
 */
export const updateVehicle = async (
  vehicleId: string,
  userId: string,
  payload: UpdateVehiclePayload,
): Promise<Vehicle> => {
  // Primero verificamos que el vehículo pertenece al usuario
  const { data: existingVehicle, error: checkError } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("id", vehicleId)
    .eq("user_id", userId)
    .single();

  if (checkError || !existingVehicle) {
    throw new NotFoundError("Vehículo no encontrado o no pertenece al usuario");
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(payload)
    .eq("id", vehicleId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar el vehículo: ${error.message}`);
  }

  return data;
};

/**
 * Elimina un vehículo
 */
export const deleteVehicle = async (
  vehicleId: string,
  userId: string,
): Promise<void> => {
  // Verificamos que el vehículo pertenece al usuario antes de eliminarlo
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq("id", vehicleId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Error al eliminar el vehículo: ${error.message}`);
  }
};
