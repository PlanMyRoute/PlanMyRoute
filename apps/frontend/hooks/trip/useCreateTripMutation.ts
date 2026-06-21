import { useAuth } from "@/context/AuthContext";
import { useCreateNotification } from "@/hooks/useNotifications";
import { TripService } from "@/services/tripService";
import { Interest, User } from "@planmyroute/types";
import { useState } from "react";

export type MandatoryStopPayload = {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  expectedArrivalDate: string | null;
};

export type CreateTripPayload = {
  name: string;
  description: string;
  start_date: string | null;
  end_date: string | null;
  start_time?: string;
  end_time?: string;
  circular: boolean;
  n_adults: number;
  n_children: number;
  n_babies: number;
  n_elders: number;
  n_pets: number;
  type: Interest[];
  promptKeywords?: string[];
  estimated_price_min: number;
  estimated_price_max: number;
  status: "planning";
  origin: string;
  destination: string;
  vehicleIds: number[];
  travelStyle: "explorer" | "balanced" | "sedentary";
  travelSpendingLevel?: "saver" | "balanced" | "luxury";
  mandatoryStops?: MandatoryStopPayload[];
  enableAutoRefuel?: boolean;
};

type InvitedUserWithRole = { user: User; role: "owner" | "editor" | "viewer" };

/**
 * Hook de mutación para crear un viaje y enviar invitaciones a los usuarios invitados.
 * @returns Función de mutación, estado de carga y error
 */
export function useCreateTripMutation() {
  const { user: authUser, token } = useAuth();
  const createNotificationMutation = useCreateNotification();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (params: {
    payload: CreateTripPayload;
    isAiTrip: boolean;
    invitedUsers: InvitedUserWithRole[];
    tripName: string;
  }): Promise<number | null> => {
    if (!authUser?.id) throw new Error("Usuario no autenticado");

    setIsPending(true);
    setError(null);

    try {
      const response = await TripService.createTrip(
        params.payload,
        authUser.id,
        params.isAiTrip,
        token || undefined,
      );

      const tripId: number | null = response?.trip?.id ?? null;

      if (params.invitedUsers.length > 0 && tripId) {
        await Promise.all(
          params.invitedUsers.map(({ user, role }) => {
            const roleText =
              role === "owner"
                ? "Propietario"
                : role === "editor"
                  ? "Editor"
                  : "Observador";
            return createNotificationMutation.mutateAsync({
              notification: {
                user_receiver_id: user.id,
                content: `Has sido invitado a unirte al viaje "${params.tripName}" como ${roleText}`,
                type: "invitation",
                status: "unread",
                action_status: "pending",
                related_trip_id: Number(tripId),
              },
            });
          }),
        );
      }

      return tripId;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending, error };
}
