import { useAuth } from "@/context/AuthContext";
import { ReviewService } from "@/services/reviewService";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Alert } from "react-native";

/**
 * Hook para verificar si el usuario puede crear una reseña
 */
export function useCanReviewTrip(tripId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["canReview", tripId],
    queryFn: () => {
      if (!token) throw new Error("No autenticado");
      return ReviewService.canReviewTrip(tripId, token);
    },
    enabled: Boolean(tripId) && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener la reseña del usuario para un viaje
 */
export function useUserTripReview(tripId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["userReview", tripId],
    queryFn: () => {
      if (!token) throw new Error("No autenticado");
      return ReviewService.getUserReviewForTrip(tripId, token);
    },
    enabled: Boolean(tripId) && !!token,
  });
}

/**
 * Hook para crear una reseña
 */
export function useCreateReview() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      trip_id: number;
      rating: number;
      comment?: string;
      is_public?: boolean;
    }) => {
      if (!token) throw new Error("No autenticado");
      return ReviewService.createReview(data, token);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["userReview", variables.trip_id.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["canReview", variables.trip_id.toString()],
      });
      queryClient.invalidateQueries({ queryKey: ["publicFeed"] });
      queryClient.invalidateQueries({
        queryKey: ["tripReviews", variables.trip_id.toString()],
      });
      queryClient.invalidateQueries({
        queryKey: ["tripStats", variables.trip_id.toString()],
      });

      Alert.alert("Éxito", "Reseña publicada correctamente");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo crear la reseña");
    },
  });
}

/**
 * Hook para actualizar una reseña
 */
export function useUpdateReview(tripId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      reviewId: string;
      rating?: number;
      comment?: string;
      is_public?: boolean;
    }) => {
      if (!token) throw new Error("No autenticado");

      const { reviewId, ...updates } = data;
      return ReviewService.updateReview(reviewId, updates, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userReview", tripId] });
      queryClient.invalidateQueries({ queryKey: ["publicFeed"] });
      queryClient.invalidateQueries({ queryKey: ["tripReviews", tripId] });
      queryClient.invalidateQueries({ queryKey: ["tripStats", tripId] });

      Alert.alert("Éxito", "Reseña actualizada correctamente");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo actualizar la reseña");
    },
  });
}

/**
 * Hook para eliminar una reseña
 */
export function useDeleteReview(tripId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      if (!token) throw new Error("No autenticado");
      return ReviewService.deleteReview(reviewId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userReview", tripId] });
      queryClient.invalidateQueries({ queryKey: ["canReview", tripId] });
      queryClient.invalidateQueries({ queryKey: ["publicFeed"] });
      queryClient.invalidateQueries({ queryKey: ["tripReviews", tripId] });
      queryClient.invalidateQueries({ queryKey: ["tripStats", tripId] });

      Alert.alert("Éxito", "Reseña eliminada correctamente");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo eliminar la reseña");
    },
  });
}

/**
 * Hook para obtener el feed público de reseñas con paginación infinita
 */
export function usePublicReviewsFeed({
  limit = 10,
  offset = 0,
}: { limit?: number; offset?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ["publicFeed"],
    queryFn: async ({ pageParam = 0 }) => {
      const reviews = await ReviewService.getPublicFeed(limit, pageParam);
      return reviews;
    },
    initialPageParam: offset,
    getNextPageParam: (lastPage, allPages) => {
      // Si la última página tiene menos items que el límite, no hay más páginas
      if (lastPage.length < limit) return undefined;
      // Siguiente offset es el total de items cargados
      return allPages.length * limit;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      // Aplanar todas las páginas en un solo array para facilitar el renderizado
      reviews: data.pages.flat(),
    }),
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para obtener el feed social de reseñas con paginación infinita
 * Muestra solo reseñas de usuarios que sigues o que te siguen
 */
export function useSocialReviewsFeed({
  limit = 10,
  offset = 0,
}: { limit?: number; offset?: number } = {}) {
  const { token } = useAuth();
  return useInfiniteQuery({
    queryKey: ["socialFeed"],
    queryFn: async ({ pageParam = 0 }) => {
      if (!token) throw new Error("No autenticado");
      const reviews = await ReviewService.getSocialFeed(
        limit,
        pageParam,
        token,
      );
      return reviews;
    },
    enabled: !!token,
    initialPageParam: offset,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < limit) return undefined;
      return allPages.length * limit;
    },
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      reviews: data.pages.flat(),
    }),
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para obtener las reseñas de un viaje
 */
export function useTripReviews(tripId: string) {
  return useQuery({
    queryKey: ["tripReviews", tripId],
    queryFn: () => ReviewService.getTripReviews(tripId),
    enabled: Boolean(tripId),
  });
}

/**
 * Hook para obtener estadísticas de un viaje
 */
export function useTripStats(tripId: string) {
  return useQuery({
    queryKey: ["tripStats", tripId],
    queryFn: () => ReviewService.getTripStats(tripId),
    enabled: Boolean(tripId),
  });
}
