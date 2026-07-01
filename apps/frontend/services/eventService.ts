import { apiFetch } from "@/constants/api";

export interface EventVenue {
  name: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  address: string | null;
  coordinates: { lat: number; lng: number } | null;
}

export interface EventArtist {
  id: string;
  name: string;
  image: string | null;
}

export interface TmEvent {
  id: string;
  name: string;
  url: string | null;
  image: string | null;
  date: string | null;
  dates: string[];
  time: string | null;
  status: string;
  venue: EventVenue | null;
  artists: EventArtist[];
  segment: string | null;
  genre: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string | null;
}

export interface EventsPage {
  events: TmEvent[];
  page: number;
  totalPages: number;
}

export interface ChatUser {
  id: string;
  username: string;
  img: string | null;
}

export interface ChatMessage {
  id: number;
  ticketmaster_event_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: ChatUser;
}

type FetchOpts = { token?: string; signal?: AbortSignal };

function buildQuery(q: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.append(k, String(v));
  });
  const str = params.toString();
  return str ? `?${str}` : "";
}

export class EventService {
  /**
   * Obtiene una lista paginada de eventos con filtros opcionales.
   * @param params - Filtros de búsqueda (página, código de país, palabra clave, coordenadas)
   * @param opts - Opciones de fetch (token, signal)
   * @returns Página de eventos con metadatos de paginación
   */
  static async getEvents(
    params: {
      page?: number;
      countryCode?: string;
      keyword?: string;
      lat?: number;
      lng?: number;
    } = {},
    opts?: FetchOpts,
  ): Promise<EventsPage> {
    return apiFetch<EventsPage>(
      `/api/events${buildQuery({ page: params.page, countryCode: params.countryCode, keyword: params.keyword, lat: params.lat, lng: params.lng })}`,
      { token: opts?.token, signal: opts?.signal },
    );
  }

  /**
   * Obtiene un evento por su ID.
   * @param id - Identificador del evento
   * @param opts - Opciones de fetch (token, signal)
   * @returns El evento encontrado
   */
  static async getEventById(id: string, opts?: FetchOpts): Promise<TmEvent> {
    return apiFetch<TmEvent>(`/api/events/${id}`, {
      token: opts?.token,
      signal: opts?.signal,
    });
  }

  /**
   * Obtiene los mensajes del chat de un evento con paginación.
   * @param eventId - Identificador del evento
   * @param page - Número de página (por defecto 0)
   * @param opts - Opciones de fetch (token, signal)
   * @returns Lista de mensajes del chat
   */
  static async getChatMessages(
    eventId: string,
    page = 0,
    opts?: FetchOpts,
  ): Promise<ChatMessage[]> {
    return apiFetch<ChatMessage[]>(
      `/api/events/${eventId}/chat${buildQuery({ page })}`,
      { token: opts?.token, signal: opts?.signal },
    );
  }

  /**
   * Envía un mensaje al chat de un evento.
   * @param eventId - Identificador del evento
   * @param message - Contenido del mensaje
   * @param opts - Opciones de fetch (token, signal)
   * @returns El mensaje enviado
   */
  static async sendChatMessage(
    eventId: string,
    message: string,
    opts?: FetchOpts,
  ): Promise<ChatMessage> {
    return apiFetch<ChatMessage>(`/api/events/${eventId}/chat`, {
      method: "POST",
      token: opts?.token,
      signal: opts?.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  }

  /**
   * Obtiene eventos cercanos a las paradas de un viaje.
   * @param stops - Lista de paradas con ciudad, fecha y código de país opcional
   * @param opts - Opciones de fetch (token, signal)
   * @returns Lista de eventos cercanos a las paradas
   */
  static async getNearStops(
    stops: { city: string; date: string; countryCode?: string }[],
    opts?: FetchOpts,
  ): Promise<TmEvent[]> {
    return apiFetch<TmEvent[]>(
      `/api/events/near-stops?stops=${encodeURIComponent(JSON.stringify(stops))}`,
      { token: opts?.token, signal: opts?.signal },
    );
  }
}
