/**
 * Backfill único de stop.distance_to_next_meters (y trip.total_distance_meters)
 * para los viajes ya existentes, que no tienen las distancias de segmento
 * calculadas porque se crearon antes de eliminar la tabla `route`.
 *
 * Reutiliza recalculateTripSegments para garantizar exactamente la misma lógica
 * que el flujo normal (crear/reordenar/eliminar paradas).
 *
 * Ejecutar (desde apps/backend):
 *   npx tsx src/scripts/backfillStopDistances.ts
 *   # o:  pnpm backfill:distances
 *
 * Es idempotente: volver a ejecutarlo recalcula los mismos valores.
 */
import { supabase } from "../supabase.js";
import { recalculateTripSegments } from "../api/itinerary/itinerary.service.js";

/** Viajes procesados en paralelo a la vez (evita saturar Supabase). */
const CONCURRENCY = 5;
/** Tamaño de página al listar viajes. */
const PAGE_SIZE = 1000;

/** Obtiene todos los IDs de viaje paginando. */
const getAllTripIds = async (): Promise<number[]> => {
  const ids: number[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("trip")
      .select("id")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Error listando viajes: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    ids.push(...data.map((t) => t.id as number));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return ids;
};

const main = async () => {
  console.log("🚀 Backfill de distancias de segmento — inicio");

  const tripIds = await getAllTripIds();
  console.log(`📋 ${tripIds.length} viajes a procesar`);

  let ok = 0;
  let failed = 0;

  for (let i = 0; i < tripIds.length; i += CONCURRENCY) {
    const batch = tripIds.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((id) => recalculateTripSegments(id)),
    );

    results.forEach((res, idx) => {
      if (res.status === "fulfilled") {
        ok += 1;
      } else {
        failed += 1;
        console.error(
          `❌ Viaje ${batch[idx]} falló:`,
          res.reason instanceof Error ? res.reason.message : res.reason,
        );
      }
    });

    console.log(
      `   …procesados ${Math.min(i + CONCURRENCY, tripIds.length)}/${tripIds.length}`,
    );
  }

  console.log(`✅ Backfill completado: ${ok} OK, ${failed} con error`);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("💥 Backfill abortado:", err);
    process.exit(1);
  });
