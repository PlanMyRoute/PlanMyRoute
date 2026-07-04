import { supabase } from "../../supabase.js";
import { BadRequestError } from "../../utils/errors.js";

const TABLE = "event_chat_message";
const PAGE_SIZE = 50;
/** Longitud máxima de un mensaje de chat (caracteres) */
const MAX_MESSAGE_LENGTH = 500;

/**
 * Obtiene los mensajes del chat de un evento con datos de usuario, paginados
 * @param eventId - ID del evento de Ticketmaster
 * @param page - Número de página (0-indexed, 50 mensajes por página)
 * @returns Lista de mensajes con información del usuario que los envió
 */
export const getMessages = async (eventId: string, page = 0) => {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from(TABLE)
    .select("id, ticketmaster_event_id, user_id, message, created_at")
    .eq("ticketmaster_event_id", eventId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(`Error obteniendo mensajes: ${error.message}`);
  const messages = (data || []).reverse();
  if (messages.length === 0) return [];

  const userIds = [...new Set(messages.map((m: any) => m.user_id))];
  const { data: users } = await supabase
    .from("user")
    .select("id, username, img")
    .in("id", userIds);

  const usersMap = new Map((users || []).map((u: any) => [u.id, u]));

  return messages.map((m: any) => ({
    ...m,
    user: usersMap.get(m.user_id) || {
      id: m.user_id,
      username: "Usuario",
      img: null,
    },
  }));
};

/**
 * Envía un mensaje al chat de un evento
 * @param eventId - ID del evento de Ticketmaster
 * @param userId - ID del usuario que envía el mensaje
 * @param message - Contenido del mensaje
 * @returns Registro del mensaje creado en la base de datos
 */
export const sendMessage = async (
  eventId: string,
  userId: string,
  message: string,
) => {
  const trimmed = message.trim();
  if (!trimmed) throw new BadRequestError("El mensaje no puede estar vacío");
  if (trimmed.length > MAX_MESSAGE_LENGTH)
    throw new BadRequestError(
      `El mensaje es demasiado largo (máx. ${MAX_MESSAGE_LENGTH} caracteres)`,
    );

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ticketmaster_event_id: eventId,
      user_id: userId,
      message: trimmed,
    })
    .select()
    .single();

  if (error) throw new Error(`Error enviando mensaje: ${error.message}`);
  return data;
};
