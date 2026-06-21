/**
 * Funciones de formato de fecha compartidas para toda la aplicación.
 * Reemplaza las ~15 implementaciones duplicadas que existían en distintos componentes.
 */

// ─────────────── Helpers internos ───────────────

/** Normaliza un input flexible a Date o null */
function toDate(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return input;
  return new Date(input);
}

// ─────────────── Funciones exportadas ───────────────

/**
 * Formato relativo ("Hace 5 min", "Ayer", "Hace 3 días") con fallback a fecha corta.
 * Usado en notificaciones y reseñas.
 * @param dateString - Fecha ISO en string
 * @param options.includeWeeks - Mostrar "Hace N semanas" (por defecto false)
 * @param options.includeYear - Incluir año en el fallback (por defecto false)
 */
export function formatRelativeDate(
  dateString: string,
  options?: { includeWeeks?: boolean; includeYear?: boolean },
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = Math.abs(now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} dias`;

  if (options?.includeWeeks && diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `Hace ${weeks} semanas`;
  }

  const opts: Intl.DateTimeFormatOptions = options?.includeYear
    ? { day: "numeric", month: "short", year: "numeric" }
    : { day: "2-digit", month: "short" };

  return date.toLocaleDateString("es-ES", opts);
}

/**
 * Fecha corta con año: "3 ene 2025".
 * Usado en listas de eventos.
 */
export function formatShortDate(date: string | null): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Fecha completa con día de la semana y opcionalmente hora:
 * "viernes, 3 de enero de 2025" o "viernes, 3 de enero de 2025 · 14:30".
 * Usado en detalle de evento.
 */
export function formatFullDate(
  date: string | null,
  time?: string | null,
): string {
  if (!date) return "Fecha por confirmar";
  const d = new Date(`${date}T${time || "00:00:00"}`);
  let result = d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (time) {
    result += ` · ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return result;
}

/**
 * Fecha larga sin día de semana: "3 de enero de 2025".
 * Usado en suscripciones.
 */
export function formatLongDate(
  dateString: string | null | undefined,
  fallback = "N/A",
): string {
  if (!dateString) return fallback;
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Fecha numérica: "03/01/2025".
 * Usado en formularios de viaje.
 */
export function formatNumericDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Mes y año con primera letra mayúscula: "Ene 2025".
 * Usado en galería de viajes pasados.
 */
export function formatMonthYear(dateString: string | null): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  const month = d.toLocaleDateString("es-ES", { month: "short" });
  const year = d.getFullYear();
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
}

/**
 * Rango de fechas: "03 ene - 10 feb".
 * Usado en tarjetas de viaje.
 */
export function formatDateRange(
  startInput: string | Date | null | undefined,
  endInput?: string | Date | null | undefined,
): string {
  const start = toDate(startInput);
  if (!start) return "";

  const pad = (n: number) => n.toString().padStart(2, "0");

  const startDay = pad(start.getDate());
  const startMonth = start.toLocaleDateString("es-ES", { month: "short" });

  const end = toDate(endInput);
  if (!end) return `${startDay} ${startMonth}`;

  const endDay = pad(end.getDate());
  const endMonth = end.toLocaleDateString("es-ES", { month: "short" });

  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

/**
 * Fecha ISO "2025-01-03". Usado internamente por calendarios y inputs HTML.
 */
export function toISODate(date: Date | null): string {
  if (!date) return "";
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}
