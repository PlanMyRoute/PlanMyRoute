import { supabase } from "../supabase.js";

// Días de retención para usuarios anónimos (modo invitado) antes de borrarlos.
const GUEST_RETENTION_DAYS = 30;
/** Tamaño de página al listar usuarios de Supabase Auth */
const LIST_USERS_PAGE_SIZE = 200;

/**
 * Elimina cuentas anónimas (modo invitado) creadas hace más de GUEST_RETENTION_DAYS días.
 * Si el invitado upgradeó su cuenta (auth.users.is_anonymous pasa a false), no se borra.
 */
export const cleanupAnonymousUsers = async (): Promise<void> => {
  console.log("🧹 [GuestCleanup] Iniciando limpieza de cuentas de invitado...");

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - GUEST_RETENTION_DAYS);

  let deleted = 0;
  let page = 1;
  const perPage = LIST_USERS_PAGE_SIZE;

  try {
    // listUsers no permite filtrar por is_anonymous, así que paginamos y filtramos en código.
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) {
        console.error("❌ [GuestCleanup] Error listando usuarios:", error);
        return;
      }

      const users = data?.users ?? [];
      if (users.length === 0) break;

      for (const u of users) {
        const isAnonymous = (u as any).is_anonymous === true;
        if (!isAnonymous) continue;
        if (!u.created_at) continue;
        if (new Date(u.created_at) > cutoff) continue;

        // 1. Borrar los viajes de los que el invitado es propietario. La propiedad
        //    va por `travelers` (no hay FK directo trip→user), así que sin esto el
        //    borrado del usuario dejaría sus viajes huérfanos. El borrado del trip
        //    cascada a stops/travelers/etc. vía sus FK por trip_id.
        const { data: ownedTrips, error: ownedError } = await supabase
          .from("travelers")
          .select("trip_id")
          .eq("user_id", u.id)
          .eq("user_role", "owner");

        if (ownedError) {
          console.error(
            `❌ [GuestCleanup] Error obteniendo viajes de ${u.id}:`,
            ownedError,
          );
          continue;
        }

        const tripIds = (ownedTrips ?? []).map((t) => t.trip_id);
        if (tripIds.length > 0) {
          const { error: tripDelError } = await supabase
            .from("trip")
            .delete()
            .in("id", tripIds);
          if (tripDelError) {
            console.error(
              `❌ [GuestCleanup] Error borrando viajes de ${u.id}:`,
              tripDelError,
            );
            continue;
          }
        }

        // 2. Borrar el usuario de Auth. Cascada a public.user y, gracias a la
        //    migración fix_user_delete_cascade, a sus tablas hijas.
        const { error: delError } = await supabase.auth.admin.deleteUser(u.id);
        if (delError) {
          console.error(`❌ [GuestCleanup] Error borrando ${u.id}:`, delError);
          continue;
        }
        deleted += 1;
      }

      if (users.length < perPage) break;
      page += 1;
    }

    console.log(`✅ [GuestCleanup] Limpieza completada. Borrados: ${deleted}`);
  } catch (e) {
    console.error("❌ [GuestCleanup] Error inesperado:", e);
  }
};
