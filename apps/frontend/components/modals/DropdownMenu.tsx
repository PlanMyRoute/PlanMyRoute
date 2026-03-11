import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

export interface DropdownMenuItem {
    id: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    variant?: 'default' | 'destructive';
    show?: boolean; // Permite ocultar items condicionalmente
}

interface DropdownMenuProps {
    visible: boolean;
    onClose: () => void;
    items: DropdownMenuItem[];
    position?: 'top-right' | 'center' | 'top-left';
    anchorPosition?: { x: number; y: number }; // Para posicionamiento absoluto
    useModal?: boolean; // Si es false, se renderiza inline sin Modal
}

export function DropdownMenu({
    visible,
    onClose,
    items,
    position = 'top-right',
    anchorPosition,
    useModal = true,
}: DropdownMenuProps) {
    // Filtrar items que no deben mostrarse
    const visibleItems = items.filter(item => item.show !== false);

    if (!visible) return null;

    // Determinar estilo de posicionamiento
    const getPositionStyle = () => {
        if (anchorPosition) {
            return {
                position: 'absolute' as const,
                top: anchorPosition.y,
                right: anchorPosition.x,
            };
        }

        switch (position) {
            case 'top-right':
                return {
                    flex: 1,
                    alignItems: 'flex-end' as const,
                    paddingTop: 64,
                    paddingRight: 16,
                };
            case 'top-left':
                return {
                    flex: 1,
                    alignItems: 'flex-start' as const,
                    paddingTop: 64,
                    paddingLeft: 16,
                };
            case 'center':
            default:
                return {
                    flex: 1,
                    justifyContent: 'center' as const,
                    alignItems: 'center' as const,
                    padding: 16,
                };
        }
    };

    // Renderizar el contenido del menú
    const menuContent = (
        <View
            onStartShouldSetResponder={() => true}
            onResponderRelease={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-neutral-gray/20"
            style={{ minWidth: 280, maxWidth: 320 }}
        >
            {visibleItems.map((item, index) => {
                const isDestructive = item.variant === 'destructive';
                return (
                    <TouchableOpacity
                        key={item.label}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderBottomWidth: index !== visibleItems.length - 1 ? 1 : 0,
                            borderBottomColor: '#E5E7EB',
                            backgroundColor: 'white',
                        }}
                        onPress={() => {
                            item.onPress();
                            onClose();
                        }}
                    >
                        {item.icon && (
                            <Ionicons
                                name={item.icon}
                                size={22}
                                color={isDestructive ? '#EF4444' : '#202020'}
                                style={{ marginRight: 12 }}
                            />
                        )}
                        <Text
                            style={{
                                fontSize: 16,
                                fontWeight: '500',
                                color: isDestructive ? '#EF4444' : '#202020',
                            }}
                            numberOfLines={1}
                        >
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );

    // Si useModal es false, renderizar inline (para TripCard)
    if (!useModal) {
        return (
            <View
                style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 1000,
                }}
            >
                {menuContent}
            </View>
        );
    }

    // Renderizado con Modal (para menús de pantalla completa)
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                onPress={onClose}
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                }}
            >
                <View style={getPositionStyle()}>
                    {menuContent}
                </View>
            </Pressable>
        </Modal>
    );
}
