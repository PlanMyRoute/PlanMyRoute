// types/app.ts
import { Database } from './supabase';

// --- Helper para extraer tipos ---
// Extrae el tipo de una fila de una tabla específica
export type DbTableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

// Extrae un tipo Enum
export type DbEnum<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// --- Tipos de Coordenadas ---
export type Coordinates = {
    latitude: number;
    longitude: number;
};

// --- Tipos de Seguimiento (Social Network) ---
export type FollowStats = {
    followers_count: number;
    following_count: number;
};

export type FollowerUser = {
    id: number;
    created_at: string;
    user: {
        id: string;
        user_name: string;
        name: string;
        img: string | null;
    };
};

export type FollowingUser = {
    id: number;
    created_at: string;
    following: {
        id: string;
        user_name: string;
        name: string;
        img: string | null;
    };
};

// --- Tipos de Entidades Principales ---
export type User = DbTableRow<'user'>;
export type Trip = DbTableRow<'trip'>;
export type Route = DbTableRow<'route'>;

// Stop con coordinates tipado correctamente
export type Stop = Omit<DbTableRow<'stop'>, 'coordinates'> & {
    coordinates: Coordinates;
};

export type notifications = DbTableRow<'notifications'>;
export type Vehicle = DbTableRow<'vehicle'>;
export type Reservation = DbTableRow<'reservation'>;
export type UserFollow = DbTableRow<'user_follows'>;
export type TripStatusHistory = DbTableRow<'trip_status_history'>;
// Tipos explícitos para los subtipos de paradas
export type Accommodation = {
    id: number;
    url: string | null;
    check_in_time: string | null;
    check_out_time: string | null;
    reservation_code: string | null;
    contact: string | null;
    nights: number | null;
};

export type Activity = {
    id: number;
    category: string | null;
    entry_price: number | null;
    estimated_duration_minutes: number | null;
    booking_required: boolean | null;
    url: string | null;
};

export type Refuel = {
    id: number;
    liters: number | null;
    fuel_type: string | null;
    total_cost: number | null;
    price_per_unit: number | null;
    station_brand: string | null;
};

// --- Enums ---
export type Interest = DbEnum<'interest'>;
export type VehicleType = DbEnum<'vehicle_type'>;
export type TripStatus = DbEnum<'trip_status'>;
export type StopType = DbEnum<'StopType'>;
export type PlanType = DbEnum<'plan_type'>;
export type CollaboratorRole = DbEnum<'collaborator_role'>;
export type ReservationStatus = DbEnum<'reservation_status'>;
export type NotificationActionStatus = DbEnum<'notification_action_status'>;
export type NotificationType = DbEnum<'notification_type'>;
export type NotificationStatus = DbEnum<'notification_status'>;

// --- Tipos para Trip Status Management ---
export type TripStatusChangeSource = 'user' | 'auto' | 'system';

export type UserPreferences = {
    autoTripStatusUpdate: boolean;
    timezone: string;
};

export type TripStatusHistoryEntry = {
    id: number;
    tripId: number;
    oldStatus: TripStatus | null;
    newStatus: TripStatus;
    changedBy: TripStatusChangeSource;
    changedAt: string;
    reason?: string;
    userId?: string;
};