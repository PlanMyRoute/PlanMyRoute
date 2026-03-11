import { Trip } from '@planmyroute/types';

type FetchOptions = {
  token?: string;
  signal?: AbortSignal;
  query?: Record<string, string | number>;
};

function buildQuery(q?: Record<string, string | number>) {
  if (!q) return '';
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => params.append(k, String(v)));
  return `?${params.toString()}`;
}

export class TripService {
  /**
   * Obtiene todos los viajes (sin filtrar por usuario)
   * @deprecated Usar getUserTrips con userId para obtener viajes del usuario
   */
  static async getTrips(opts?: FetchOptions): Promise<Trip[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/trip${buildQuery(opts?.query)}`, {
        headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        signal: opts?.signal,
      });
      if (!response.ok) throw new Error('Error fetching trips');
      return await response.json();
    } catch (error) {
      console.error('Error in getTrips:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los viajes de un usuario específico
   */
  static async getUserTrips(userId: string, opts?: FetchOptions): Promise<Trip[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/travelers/${userId}/trips${buildQuery(opts?.query)}`, {
        headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        signal: opts?.signal,
      });
      if (!response.ok) throw new Error('Error fetching user trips');
      return await response.json();
    } catch (error) {
      console.error('Error in getUserTrips:', error);
      throw error;
    }
  }

  /**
   * Obtiene un viaje específico por su ID
   */
  static async getTripById(id: string, opts?: FetchOptions): Promise<Trip> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/trip/${id}`, {
        headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        signal: opts?.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('getTripById error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
        });
        throw new Error(`Error ${response.status}: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error in getTripById:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo viaje.
   */
  static async createTrip(
    trip: Partial<Trip>,
    userId: string,
    iaTrip: boolean,
    token?: string
  ): Promise<any> {
    try {
      let response
      if (iaTrip) {
        trip.description = ""; // IA will generate description
        response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/automatic-trips/${userId}/generate-trip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(trip),
        });
      } else {
        const url = `${process.env.EXPO_PUBLIC_API_URL}/api/travelers/${userId}/trip`;
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(trip),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response from server:', errorData);

        // Si es un error 403, incluir toda la información del backend
        if (response.status === 403) {
          const error: any = new Error(errorData.error || 'Límite alcanzado');
          error.status = 403;
          error.requiresPremium = errorData.requiresPremium;
          error.usedCount = errorData.usedCount;
          error.maxCount = errorData.maxCount;
          error.error = errorData.error;
          throw error;
        }

        throw new Error(errorData.error || 'Error creating trip');
      }

      return await response.json();
    } catch (error) {
      console.error('Error in createTrip:', error);
      throw error;
    }
  }

  /**
   * Actualiza un viaje existente
   */
  static async updateTrip(id: string, trip: Partial<Trip>, userId: string, token?: string): Promise<Trip> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/travelers/${userId}/trip/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(trip),
      });
      if (!response.ok) throw new Error('Error updating trip');
      return await response.json();
    } catch (error) {
      console.error('Error in updateTrip:', error);
      throw error;
    }
  }

  /**
   * Elimina un viaje
   */
  static async deleteTrip(id: string, userId: string, token?: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/travelers/${userId}/trip/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) throw new Error('Error deleting trip');
    } catch (error) {
      console.error('Error in deleteTrip:', error);
      throw error;
    }
  }

  static async getNumberOfStops(tripId: string, opts?: FetchOptions): Promise<any[]> {
    try {
      // Backend exposes stops for a trip at /itinerary/trip/:tripId/stops
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/itinerary/trip/${tripId}/stops`, {
        headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        signal: opts?.signal,
      });
      if (!response.ok) throw new Error('Error fetching stops');
      return await response.json();
    } catch (error) {
      console.error('Error in getNumberOfStops:', error);
      throw error;
    }
  }

  // =============== TRAVELERS CONTROLLERS ===============
  static async getTravelersInTrip(tripId: string, opts?: FetchOptions): Promise<any[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/travelers/trip/${tripId}`, {
        headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        signal: opts?.signal,
      });
      if (!response.ok) throw new Error('Error fetching travelers in trip');
      return await response.json();
    } catch (error) {
      console.error('Error in getTravelersInTrip:', error);
      throw error;
    }
  }

  /**
   * Obtiene el rol del usuario en un viaje específico
   */
  static async getUserRoleInTrip(userId: string, tripId: string, opts?: FetchOptions): Promise<'owner' | 'editor' | 'viewer' | null> {
    try {
      const travelers = await this.getTravelersInTrip(tripId, opts);
      const traveler = travelers.find((t: any) => t.user.id === userId);
      return traveler ? traveler.role : null;
    } catch (error) {
      console.error('Error in getUserRoleInTrip:', error);
      return null;
    }
  }

  /**
   * Obtiene el nivel de acceso completo del usuario en un viaje
   * Incluye rol, estado del viaje, y permisos granulares
   */
  static async getTripAccessLevel(tripId: string, opts?: FetchOptions): Promise<{
    role: 'owner' | 'editor' | 'viewer' | 'guest';
    tripStatus: 'planning' | 'going' | 'completed';
    isGuest: boolean;
    isCompleted: boolean;
    permissions: {
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canManageTravelers: boolean;
      canChangeRoles: boolean;
      canLeave: boolean;
    };
  }> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/trip/${tripId}/access-level`, {
        headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        signal: opts?.signal,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error fetching access level' }));
        throw new Error(errorData.error || 'Error fetching access level');
      }
      return await response.json();
    } catch (error) {
      console.error('Error in getTripAccessLevel:', error);
      throw error;
    }
  }

  /**
   * Elimina a un usuario de un viaje (salir del viaje)
   */
  static async leaveTrip(userId: string, tripId: string, token?: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/travelers/${userId}/trip/${tripId}/leave`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error leaving trip' }));
        throw new Error(errorData.error || 'Error leaving trip');
      }
    } catch (error) {
      console.error('Error in leaveTrip:', error);
      throw error;
    }
  }

  /**
   * Cambia el rol de un usuario en un viaje
   */
  static async changeUserRole(
    actorUserId: string,
    targetUserId: string,
    tripId: string,
    role: 'owner' | 'editor' | 'viewer',
    token?: string
  ): Promise<any> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/travelers/${targetUserId}/trip/${tripId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role, actorUserId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error changing role' }));
        throw new Error(errorData.error || 'Error changing role');
      }
      return await response.json();
    } catch (error) {
      console.error('Error in changeUserRole:', error);
      throw error;
    }
  }

  /**
   * Expulsa a un usuario de un viaje (solo para owners)
   */
  static async kickUser(actorUserId: string, targetUserId: string, tripId: string, token?: string): Promise<void> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/travelers/${targetUserId}/trip/${tripId}/kick?actorUserId=${actorUserId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error kicking user' }));
        throw new Error(errorData.error || 'Error kicking user');
      }
    } catch (error) {
      console.error('Error in kickUser:', error);
      throw error;
    }
  }

  // =============== VEHICLE METHODS ===============

  /**
   * Obtiene los vehículos asociados a un viaje
   */
  static async getVehiclesInTrip(tripId: string, opts?: FetchOptions): Promise<any[]> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/trip/${tripId}/vehicles`, {
        headers: opts?.token ? { Authorization: `Bearer ${opts.token}` } : undefined,
        signal: opts?.signal,
      });
      if (!response.ok) throw new Error('Error fetching vehicles in trip');
      return await response.json();
    } catch (error) {
      console.error('Error in getVehiclesInTrip:', error);
      throw error;
    }
  }

  /**
   * Elimina un vehículo de un viaje (requiere permisos de editor u owner)
   */
  static async removeVehicleFromTrip(
    userId: string,
    tripId: string,
    vehicleId: string,
    token?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/travelers/${userId}/trip/${tripId}/vehicle/${vehicleId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error removing vehicle from trip' }));
        throw new Error(errorData.error || 'Error removing vehicle from trip');
      }
    } catch (error) {
      console.error('Error in removeVehicleFromTrip:', error);
      throw error;
    }
  }
}



/**
 * Servicio para gestionar rutas y geocodificación
 */
// Local shape for stops used in route calculation. The authoritative Stop type
// may live elsewhere; keep this tolerant until stops types are added to Shared.
type StopLike = {
  order?: number;
  location?: { latitude: number; longitude: number };
};

export class RouteService {
  /**
   * Calcula la ruta entre múltiples paradas usando OSRM
   */
  static async calculateRoute(stops: StopLike[]): Promise<{ latitude: number; longitude: number }[]> {
    // If stops don't have location/order, we can't calculate a route.
    const validStops = (stops || []).filter(s => s?.location && typeof s.location.latitude === 'number' && typeof s.location.longitude === 'number');
    if (validStops.length < 2) return [];

    try {
      const sortedStops = [...validStops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const coordinates = sortedStops
        .map(stop => `${stop.location!.longitude},${stop.location!.latitude}`)
        .join(';');

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
      );

      if (!response.ok) throw new Error('Error calculating route');

      const data = await response.json();

      if (data.routes && data.routes[0]) {
        return data.routes[0].geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
      }

      return [];
    } catch (error) {
      console.error('Error in calculateRoute:', error);
      throw error;
    }
  }

  /**
   * Geocodifica una dirección usando Nominatim (OpenStreetMap)
   */
  static async geocodeAddress(address: string): Promise<{
    latitude: number;
    longitude: number;
    displayName: string;
  } | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'PlanMyRoute/1.0',
          },
        }
      );

      if (!response.ok) throw new Error('Error geocoding address');

      const data = await response.json();

      if (data.length === 0) return null;

      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    } catch (error) {
      console.error('Error in geocodeAddress:', error);
      throw error;
    }
  }

  /**
   * Geocodifica inversamente unas coordenadas (obtiene la dirección)
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            'User-Agent': 'PlanMyRoute/1.0',
          },
        }
      );

      if (!response.ok) throw new Error('Error reverse geocoding');

      const data = await response.json();

      return data.display_name || null;
    } catch (error) {
      console.error('Error in reverseGeocode:', error);
      throw error;
    }
  }

  /**
   * Calcula la distancia y duración entre dos puntos
   */
  static async getDistanceAndDuration(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ): Promise<{ distance: number; duration: number } | null> {
    try {
      const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=false`
      );

      if (!response.ok) throw new Error('Error getting distance and duration');

      const data = await response.json();

      if (data.routes && data.routes[0]) {
        return {
          distance: data.routes[0].distance, // en metros
          duration: data.routes[0].duration, // en segundos
        };
      }

      return null;
    } catch (error) {
      console.error('Error in getDistanceAndDuration:', error);
      throw error;
    }
  }
}
