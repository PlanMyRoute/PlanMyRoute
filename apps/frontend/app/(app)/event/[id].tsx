import { useAuth } from '@/context/AuthContext';
import { useEvent } from '@/hooks/useEvents';
import { supabase } from '@/lib/supabase';
import { ChatMessage, EventService } from '@/services/eventService';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatDate(date: string | null, time: string | null) {
    if (!date) return 'Fecha por confirmar';
    const d = new Date(date + 'T' + (time || '00:00:00'));
    const dateStr = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (time) {
        const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} · ${timeStr}`;
    }
    return dateStr;
}

function formatPrice(min: number | null, max: number | null, currency: string | null) {
    if (min == null) return 'Precio a consultar';
    const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    if (max && max !== min) return `${sym}${min} – ${sym}${max}`;
    return `Desde ${sym}${min}`;
}

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

function ChatBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
    const avatar = msg.user?.img;
    const username = msg.user?.username || 'Usuario';

    return (
        <View className={`flex-row mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            {!isOwn && (
                <View className="w-8 h-8 rounded-full bg-gray-200 mr-2 mt-1 overflow-hidden items-center justify-center">
                    {avatar ? (
                        <Image source={{ uri: avatar }} className="w-8 h-8" />
                    ) : (
                        <Text className="text-xs font-bold text-gray-500">
                            {username.charAt(0).toUpperCase()}
                        </Text>
                    )}
                </View>
            )}
            <View className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                    <Text className="text-xs text-gray-500 mb-0.5 ml-1">{username}</Text>
                )}
                <View
                    className={`px-3 py-2 rounded-2xl ${
                        isOwn ? 'bg-primary-yellow rounded-tr-sm' : 'bg-white rounded-tl-sm'
                    }`}
                    style={{ elevation: 1 }}
                >
                    <Text className="text-sm text-dark-black">{msg.message}</Text>
                </View>
                <Text className="text-[10px] text-gray-400 mt-0.5 mx-1">
                    {timeAgo(msg.created_at)}
                </Text>
            </View>
        </View>
    );
}

// Full-screen chat modal with proper KeyboardAvoidingView
function ChatModal({
    visible,
    onClose,
    messages,
    loadingMessages,
    text,
    setText,
    sending,
    onSend,
    userId,
}: {
    visible: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    loadingMessages: boolean;
    text: string;
    setText: (t: string) => void;
    sending: boolean;
    onSend: () => void;
    userId: string | undefined;
}) {
    const insets = useSafeAreaInsets();
    const listRef = useRef<FlatList>(null);

    useEffect(() => {
        if (visible && messages.length > 0) {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 150);
        }
    }, [visible, messages.length]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                className="flex-1 bg-gray-50"
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* Header */}
                <View
                    className="bg-white border-b border-gray-100 px-4 flex-row items-center"
                    style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}
                >
                    <TouchableOpacity
                        className="mr-3 w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-down" size={20} color="#202020" />
                    </TouchableOpacity>
                    <View className="flex-1">
                        <Text className="text-base font-bold text-dark-black">Chat del evento</Text>
                        <Text className="text-xs text-gray-400">
                            {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}
                        </Text>
                    </View>
                </View>

                {/* Messages */}
                {loadingMessages ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator color="#FFD54D" />
                    </View>
                ) : messages.length === 0 ? (
                    <View className="flex-1 items-center justify-center px-8">
                        <Ionicons name="chatbubbles-outline" size={40} color="#ccc" />
                        <Text className="text-gray-400 text-sm mt-2 text-center">
                            Sé el primero en comentar este evento
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        ref={listRef}
                        data={messages}
                        keyExtractor={(m) => String(m.id)}
                        renderItem={({ item }) => (
                            <ChatBubble msg={item} isOwn={item.user_id === userId} />
                        )}
                        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                    />
                )}

                {/* Input */}
                <View
                    className="bg-white border-t border-gray-100 px-4 py-2 flex-row items-center"
                    style={{ paddingBottom: insets.bottom + 8 }}
                >
                    {userId ? (
                        <>
                            <TextInput
                                className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-dark-black mr-2"
                                placeholder="Escribe un mensaje…"
                                placeholderTextColor="#aaa"
                                value={text}
                                onChangeText={setText}
                                multiline
                                maxLength={500}
                                returnKeyType="send"
                                onSubmitEditing={onSend}
                                blurOnSubmit
                            />
                            <TouchableOpacity
                                className="w-10 h-10 bg-primary-yellow rounded-full items-center justify-center"
                                onPress={onSend}
                                disabled={sending || !text.trim()}
                                style={{ opacity: sending || !text.trim() ? 0.5 : 1 }}
                            >
                                <Ionicons name="send" size={16} color="#202020" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View className="flex-1 bg-gray-100 rounded-2xl py-3 items-center">
                            <Text className="text-gray-500 text-sm">Inicia sesión para chatear</Text>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export default function EventDetailScreen() {
    const { id, dates: datesParam } = useLocalSearchParams<{ id: string; dates?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user, token } = useAuth();
    const allDates: string[] = datesParam ? (JSON.parse(datesParam) as string[]) : [];

    const { data: event, isLoading, isError } = useEvent(id ?? null);

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [chatModalVisible, setChatModalVisible] = useState(false);

    // Cargar mensajes históricos
    useEffect(() => {
        if (!id) return;
        setLoadingMessages(true);
        EventService.getChatMessages(id, 0, { token })
            .then(setMessages)
            .catch(() => {})
            .finally(() => setLoadingMessages(false));
    }, [id]);

    // Supabase Realtime: escuchar nuevos mensajes
    useEffect(() => {
        if (!id) return;

        const channel = supabase
            .channel(`event-chat-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'event_chat_message',
                    filter: `ticketmaster_event_id=eq.${id}`,
                },
                (payload) => {
                    const newMsg = payload.new as ChatMessage;
                    setMessages((prev) => {
                        const exists = prev.some((m) => m.id === newMsg.id);
                        if (exists) return prev;
                        return [...prev, newMsg];
                    });
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const handleSend = async () => {
        if (!text.trim() || sending || !id || !token) return;
        const msg = text.trim();
        setText('');
        setSending(true);

        const optimistic: ChatMessage = {
            id: Date.now(),
            ticketmaster_event_id: id,
            user_id: user?.id || '',
            message: msg,
            created_at: new Date().toISOString(),
            user: { id: user?.id || '', username: 'Tú', img: null },
        };
        setMessages((prev) => [...prev, optimistic]);

        try {
            const realMsg = await EventService.sendChatMessage(id, msg, { token });
            setMessages((prev) =>
                prev.map((m) => (m.id === optimistic.id ? { ...realMsg, user: optimistic.user } : m)),
            );
        } catch {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            setText(msg);
        } finally {
            setSending(false);
        }
    };

    const handleCreateTrip = () => {
        if (!event) return;
        router.push({
            pathname: '/event/createFromEvent',
            params: {
                eventId: event.id,
                eventName: event.name,
                city: event.venue?.city || '',
                country: event.venue?.country || '',
                countryCode: event.venue?.countryCode || '',
                address: event.venue?.address || '',
                lat: event.venue?.coordinates?.lat?.toString() || '',
                lng: event.venue?.coordinates?.lng?.toString() || '',
                date: event.date || '',
            },
        });
    };

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#FFD54D" />
            </View>
        );
    }

    if (isError || !event) {
        return (
            <View className="flex-1 items-center justify-center bg-white px-8">
                <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
                <Text className="text-gray-500 text-center mt-3">No se pudo cargar el evento.</Text>
                <TouchableOpacity className="mt-4" onPress={() => router.back()}>
                    <Text className="text-primary-yellow font-bold">Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const previewMessages = messages.slice(-3);

    return (
        <>
            <ScrollView
                className="flex-1 bg-gray-50"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
                {/* Header con imagen */}
                <View className="relative" style={{ height: 220 }}>
                    {event.image ? (
                        <Image
                            source={{ uri: event.image }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full bg-gray-200 items-center justify-center">
                            <Ionicons name="musical-notes" size={64} color="#aaa" />
                        </View>
                    )}
                    <View className="absolute inset-0 bg-dark-black" style={{ opacity: 0.35 }} />
                    <TouchableOpacity
                        className="absolute top-3 left-4 w-9 h-9 bg-white/80 rounded-full items-center justify-center"
                        style={{ marginTop: insets.top }}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="chevron-back" size={20} color="#202020" />
                    </TouchableOpacity>
                </View>

                {/* Info del evento */}
                <View className="bg-white px-5 pt-5 pb-4">
                    {(event.segment || event.genre) && (
                        <View className="flex-row mb-2">
                            {event.segment && (
                                <View className="bg-primary-yellow/20 px-2 py-0.5 rounded-full mr-2">
                                    <Text className="text-xs font-semibold text-dark-black">{event.segment}</Text>
                                </View>
                            )}
                            {event.genre && (
                                <View className="bg-gray-100 px-2 py-0.5 rounded-full">
                                    <Text className="text-xs font-semibold text-gray-600">{event.genre}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    <Text className="text-2xl font-bold text-dark-black leading-tight">{event.name}</Text>

                    {event.artists.length > 0 && (
                        <View className="flex-row flex-wrap mt-2 gap-x-2">
                            {event.artists.map((a) => (
                                <Text key={a.id} className="text-gray-500 text-sm">{a.name}</Text>
                            ))}
                        </View>
                    )}

                    {/* Fecha(s) */}
                    {allDates.length > 1 ? (
                        <View className="mt-4">
                            <View className="flex-row items-center mb-2">
                                <View className="w-8 h-8 bg-primary-yellow/20 rounded-full items-center justify-center mr-3">
                                    <Ionicons name="calendar" size={16} color="#202020" />
                                </View>
                                <Text className="text-dark-black text-sm font-semibold">
                                    {allDates.length} fechas disponibles
                                </Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="ml-11">
                                {allDates.map((d) => (
                                    <View key={d} className="bg-gray-100 rounded-xl px-3 py-2 mr-2">
                                        <Text className="text-dark-black text-xs font-medium capitalize">
                                            {formatDate(d, null)}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    ) : (
                        <View className="flex-row items-center mt-4">
                            <View className="w-8 h-8 bg-primary-yellow/20 rounded-full items-center justify-center mr-3">
                                <Ionicons name="calendar" size={16} color="#202020" />
                            </View>
                            <Text className="text-dark-black text-sm capitalize">
                                {formatDate(event.date, event.time)}
                            </Text>
                        </View>
                    )}

                    {/* Venue */}
                    {event.venue && (
                        <View className="flex-row items-start mt-3">
                            <View className="w-8 h-8 bg-primary-yellow/20 rounded-full items-center justify-center mr-3 mt-0.5">
                                <Ionicons name="location" size={16} color="#202020" />
                            </View>
                            <View className="flex-1">
                                {event.venue.name && (
                                    <Text className="text-dark-black text-sm font-semibold">{event.venue.name}</Text>
                                )}
                                <Text className="text-gray-500 text-sm">
                                    {[event.venue.address, event.venue.city, event.venue.country]
                                        .filter(Boolean)
                                        .join(', ')}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Precio */}
                    <View className="flex-row items-center mt-3">
                        <View className="w-8 h-8 bg-primary-yellow/20 rounded-full items-center justify-center mr-3">
                            <Ionicons name="ticket" size={16} color="#202020" />
                        </View>
                        <Text className="text-dark-black text-sm">
                            {formatPrice(event.priceMin, event.priceMax, event.currency)}
                        </Text>
                        {event.url && (
                            <TouchableOpacity
                                className="ml-auto bg-dark-black px-3 py-1.5 rounded-full"
                                onPress={() => Linking.openURL(event.url!)}
                            >
                                <Text className="text-primary-yellow text-xs font-bold">Comprar entradas</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Botón crear viaje */}
                    <TouchableOpacity
                        className="mt-5 bg-primary-yellow rounded-2xl py-3.5 flex-row items-center justify-center"
                        activeOpacity={0.85}
                        onPress={handleCreateTrip}
                    >
                        <Ionicons name="map" size={18} color="#202020" />
                        <Text className="text-dark-black font-bold text-base ml-2">
                            Crear viaje a este evento
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Chat — compact preview */}
                <View className="mt-3 bg-white px-4 pt-4 pb-2">
                    <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-base font-bold text-dark-black">Chat del evento</Text>
                        {messages.length > 0 && (
                            <Text className="text-xs text-gray-400">{messages.length} mensajes</Text>
                        )}
                    </View>
                    <Text className="text-xs text-gray-400 mb-3">
                        Habla con otros fans que van a este evento
                    </Text>

                    {loadingMessages ? (
                        <View className="items-center py-4">
                            <ActivityIndicator color="#FFD54D" />
                        </View>
                    ) : messages.length === 0 ? (
                        <View className="items-center py-6">
                            <Ionicons name="chatbubbles-outline" size={32} color="#ccc" />
                            <Text className="text-gray-400 text-sm mt-2">
                                Sé el primero en comentar este evento
                            </Text>
                        </View>
                    ) : (
                        // Show last 3 messages as a non-scrollable preview
                        <View className="mb-1">
                            {previewMessages.map((msg) => (
                                <ChatBubble key={msg.id} msg={msg} isOwn={msg.user_id === user?.id} />
                            ))}
                            {messages.length > 3 && (
                                <Text className="text-xs text-gray-400 text-center mb-2">
                                    y {messages.length - 3} mensajes más…
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Open full chat button */}
                    <TouchableOpacity
                        className="flex-row items-center justify-center bg-gray-100 rounded-2xl py-3 mt-1 mb-2"
                        onPress={() => setChatModalVisible(true)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={16} color="#202020" />
                        <Text className="text-dark-black font-semibold text-sm ml-2">
                            {user ? 'Abrir chat completo' : 'Ver chat'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Full chat modal */}
            <ChatModal
                visible={chatModalVisible}
                onClose={() => setChatModalVisible(false)}
                messages={messages}
                loadingMessages={loadingMessages}
                text={text}
                setText={setText}
                sending={sending}
                onSend={handleSend}
                userId={user?.id ?? undefined}
            />
        </>
    );
}
