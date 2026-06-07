// types/app.ts
import { Database } from './supabase';
import { TokenTransactionType } from './tokenomics';

// --- Helpers para extraer tipos ---
export type DbTableRow<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type DbViewRow<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
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

// Stop con coordinates tipado correctamente (el campo coordinates en BD es Json genérico)
export type Stop = Omit<DbTableRow<'stop'>, 'coordinates'> & {
    coordinates: Coordinates;
};

export type Notification = DbTableRow<'notifications'>;
export type Vehicle = DbTableRow<'vehicle'>;
export type Reservation = DbTableRow<'reservation'>;
export type UserFollow = DbTableRow<'user_follows'>;
export type TripStatusHistory = DbTableRow<'trip_status_history'>;
export type Subscription = DbTableRow<'subscriptions'>;
export type Traveler = DbTableRow<'travelers'>;
export type RoadTrip = DbTableRow<'road_trip'>;
export type EventChatMessage = DbTableRow<'event_chat_message'>;
export type UserUsage = DbTableRow<'user_usage'>;
export type TripPhoto = DbTableRow<'trip_photos'>;
export type TripReview = DbTableRow<'trip_reviews'>;
export type PromoCode = DbTableRow<'promo_codes'>;
export type PromoCodeUsage = DbTableRow<'promo_code_usages'>;
export type Referral = DbTableRow<'referrals'>;
export type ReservationAttachment = DbTableRow<'reservation_attachments'>;

// --- Sistema de Tokens (definidos a mano hasta regenerar supabase.ts) ---
export type TokenWallet = {
    user_id: string;
    balance: number;
    updated_at: string;
};

export type TokenTransaction = {
    id: string;
    user_id: string;
    type: TokenTransactionType;
    amount: number; // positivo = ingreso, negativo = gasto
    balance_after: number;
    reference: Record<string, unknown> | null;
    created_at: string;
};
export type UserFollowStats = DbViewRow<'user_follow_stats'>;
// Tipos explícitos para los subtipos de paradas
export type Accommodation = {
    id: number;
    url: string | null;
    check_in_time: string | null;
    check_out_time: string | null;
    reservation_code: string | null;
    contact: string | null;
    nights: number | null;
    price_per_night: number | null;
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
// PlanType no existe como enum en Supabase; se define como tipo literal aquí
export type PlanType = 'monthly' | 'yearly';
export type CollaboratorRole = DbEnum<'collaborator_role'>;
export type ReservationStatus = DbEnum<'reservation_status'>;
export type NotificationActionStatus = DbEnum<'notification_action_status'>;
export type NotificationType = DbEnum<'notification_type'>;
export type NotificationStatus = DbEnum<'notification_status'>;
export type AccommodationType = DbEnum<'accommodation_type_enum'>;
export type SubscriptionStatus = DbEnum<'subscription_status'>;
export type SubscriptionTier = DbEnum<'subscription_tier'>;
export type FuelType = DbEnum<'type_fuel'>;
export type ServiceType = DbEnum<'service_type'>;

// --- Permisos y Roles ---
export type TripAction =
    | 'view_trip'
    | 'edit_trip'
    | 'delete_trip'
    | 'leave_trip'
    | 'invite_travelers'
    | 'change_roles'
    | 'remove_travelers'
    | 'add_stop'
    | 'edit_stop'
    | 'delete_stop'
    | 'manage_routes'
    | 'manage_accommodations'
    | 'manage_activities';

export type ExtendedRole = CollaboratorRole | 'guest';

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