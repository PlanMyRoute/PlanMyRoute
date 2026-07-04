import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/** Ventana de validez de la caché persistida (24 h). */
export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Cambiar este valor invalida toda la caché persistida (p. ej. tras un cambio de
 * forma de los datos que rompa la compatibilidad).
 */
export const PERSIST_BUSTER = "pmr-cache-v1";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      // gcTime debe ser >= maxAge de la persistencia; si no, React Query descarta
      // las queries inactivas antes de que puedan restaurarse desde disco.
      gcTime: PERSIST_MAX_AGE,
    },
  },
});

/**
 * Persistencia de la caché en AsyncStorage — solo en nativo. Permite:
 *  - arranque instantáneo mostrando los últimos datos mientras se revalida
 *  - consultar viajes/itinerarios sin conexión (uso real en carretera)
 * En web usamos caché en memoria (sin persistencia).
 */
export const asyncStoragePersister =
  Platform.OS !== "web"
    ? createAsyncStoragePersister({
        storage: AsyncStorage,
        key: "PMR_QUERY_CACHE",
        throttleTime: 1000,
      })
    : undefined;
