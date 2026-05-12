import { supabase } from '../../supabase.js';

const TABLE = 'event_chat_message';
const PAGE_SIZE = 50;

export const getMessages = async (eventId: string, page = 0) => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
        .from(TABLE)
        .select('id, ticketmaster_event_id, user_id, message, created_at')
        .eq('ticketmaster_event_id', eventId)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) throw new Error(`Error obteniendo mensajes: ${error.message}`);
    const messages = (data || []).reverse();
    if (messages.length === 0) return [];

    const userIds = [...new Set(messages.map((m: any) => m.user_id))];
    const { data: users } = await supabase
        .from('user')
        .select('id, username, img')
        .in('id', userIds);

    const usersMap = new Map((users || []).map((u: any) => [u.id, u]));

    return messages.map((m: any) => ({
        ...m,
        user: usersMap.get(m.user_id) || { id: m.user_id, username: 'Usuario', img: null },
    }));
};

export const sendMessage = async (
    eventId: string,
    userId: string,
    message: string,
) => {
    const trimmed = message.trim();
    if (!trimmed) throw new Error('El mensaje no puede estar vacío');
    if (trimmed.length > 500) throw new Error('El mensaje es demasiado largo (máx. 500 caracteres)');

    const { data, error } = await supabase
        .from(TABLE)
        .insert({ ticketmaster_event_id: eventId, user_id: userId, message: trimmed })
        .select()
        .single();

    if (error) throw new Error(`Error enviando mensaje: ${error.message}`);
    return data;
};
