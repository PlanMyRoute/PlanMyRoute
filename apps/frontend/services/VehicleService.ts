// services/vehicleService.ts
import { Vehicle as SharedVehicle, VehicleType as SharedVehicleType, TablesUpdate } from '@planmyroute/types';

// Re-exportar tipos del shared
export type Vehicle = SharedVehicle;
export type VehicleType = SharedVehicleType;

// Tipo local para FuelType (hasta que se agregue al shared)
export type FuelType = 'diesel' | 'gasoline' | 'electric' | 'LPG';

// Payload para crear vehículo
export interface CreateVehiclePayload {
  brand: string | null;
  model: string | null;
  type: VehicleType;
  type_fuel: FuelType | null;
  avg_consumption?: number | null;
  fuel_tank_capacity?: number | null;
}

// Payload para actualizar vehículo
export type UpdateVehiclePayload = TablesUpdate<'vehicle'>

type FetchOptions = {
  token?: string;
  signal?: AbortSignal;
};

export class VehicleService {
  /**
   * Obtiene todos los vehículos de un usuario
   */
  static async getUserVehicles(userId: string, opts?: FetchOptions): Promise<Vehicle[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${userId}/vehicles`, {
        headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        signal: opts?.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error fetching vehicles');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo vehículo para un usuario
   */
  static async createVehicle(
    userId: string,
    payload: CreateVehiclePayload,
    opts?: FetchOptions
  ): Promise<Vehicle> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${userId}/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: opts?.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error creating vehicle');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }
  }

  /**
   * Actualiza un vehículo existente
   */
  static async updateVehicle(
    userId: string,
    vehicleId: string,
    payload: UpdateVehiclePayload,
    opts?: FetchOptions
  ): Promise<Vehicle> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${userId}/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(opts?.token ? { Authorization: `Bearer ${opts.token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: opts?.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error updating vehicle');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }
  }

  /**
   * Elimina un vehículo
   */
  static async deleteVehicle(userId: string, vehicleId: string, opts?: FetchOptions): Promise<void> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/users/${userId}/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        signal: opts?.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error deleting vehicle');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }
}