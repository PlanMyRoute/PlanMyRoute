import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ItineraryService } from "@/services/itineraryService";
import { Alert } from "react-native";
import { useAuth } from "@/context/AuthContext";

/**
 * Hook para obtener adjuntos de una parada
 */
export function useStopAttachments(stopId: string | undefined) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["attachments", stopId],
    queryFn: async () => {
      if (!stopId) return [];
      if (!token) throw new Error("No autenticado");
      return ItineraryService.getStopAttachments(stopId, token);
    },
    enabled: Boolean(stopId) && !!token,
    retry: false,
    staleTime: 30000,
  });
}

/**
 * Hook para subir adjuntos a una parada
 */
export function useUploadAttachment(stopId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: {
      uri: string;
      name: string;
      mimeType: string;
    }) => {
      if (!token) throw new Error("No autenticado");
      return ItineraryService.uploadReservationFile(stopId, file, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", stopId] });
      Alert.alert("Éxito", "Archivo subido correctamente");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo subir el archivo");
    },
  });
}

/**
 * Hook para eliminar adjuntos
 */
export function useDeleteAttachment(stopId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      if (!token) throw new Error("No autenticado");
      return ItineraryService.deleteAttachment(attachmentId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attachments", stopId] });
      Alert.alert("Éxito", "Adjunto eliminado");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "No se pudo eliminar el adjunto");
    },
  });
}
