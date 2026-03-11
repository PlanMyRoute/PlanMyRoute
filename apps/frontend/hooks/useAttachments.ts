import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ItineraryService } from '@/services/itineraryService';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

/**
 * Hook para obtener adjuntos de una parada
 */
export function useStopAttachments(stopId: string | undefined) {
    return useQuery({
        queryKey: ['attachments', stopId],
        queryFn: async () => {
            console.log('🔍 useStopAttachments queryFn ejecutado:', { stopId });
            
            if (!stopId) {
                console.log('⚠️ No hay stopId, retornando array vacío');
                return [];
            }
            
            const { data: { session } } = await supabase.auth.getSession();
            console.log('🔑 Sesión obtenida:', { hasSession: !!session, hasToken: !!session?.access_token });
            
            if (!session) {
                console.error('❌ No hay sesión de usuario');
                throw new Error('No autenticado');
            }
            
            console.log('📡 Llamando a ItineraryService.getStopAttachments...', { stopId });
            const result = await ItineraryService.getStopAttachments(stopId, session.access_token);
            console.log('✅ Adjuntos obtenidos:', { count: result.length, result });
            
            return result;
        },
        enabled: Boolean(stopId), // Solo ejecutar si hay stopId
        retry: false, // No reintentar si falla (puede que no haya adjuntos)
        staleTime: 30000, // Cachear por 30 segundos
    });
}

/**
 * Hook para subir adjuntos a una parada
 */
export function useUploadAttachment(stopId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (file: { uri: string; name: string; mimeType: string }) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No autenticado');

            return ItineraryService.uploadReservationFile(stopId, file, session.access_token);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attachments', stopId] });
            Alert.alert('Éxito', 'Archivo subido correctamente');
        },
        onError: (error: Error) => {
            Alert.alert('Error', error.message || 'No se pudo subir el archivo');
        },
    });
}

/**
 * Hook para eliminar adjuntos
 */
export function useDeleteAttachment(stopId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (attachmentId: string) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No autenticado');

            return ItineraryService.deleteAttachment(attachmentId, session.access_token);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attachments', stopId] });
            Alert.alert('Éxito', 'Adjunto eliminado');
        },
        onError: (error: Error) => {
            Alert.alert('Error', error.message || 'No se pudo eliminar el adjunto');
        },
    });
}
