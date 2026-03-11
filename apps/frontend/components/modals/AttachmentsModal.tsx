import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Image,
    Alert,
    Linking,
    ActivityIndicator,
    Dimensions,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stop } from '@planmyroute/types';
import { useStopAttachments, useDeleteAttachment } from '@/hooks/useAttachments';

interface AttachmentsModalProps {
    visible: boolean;
    stop: Stop | null;
    onClose: () => void;
}

interface ImageViewerProps {
    visible: boolean;
    imageUrl: string;
    fileName: string;
    onClose: () => void;
}

// Componente para visualizar imágenes en pantalla completa
const ImageViewer: React.FC<ImageViewerProps> = ({ visible, imageUrl, fileName, onClose }) => {
    const { width, height } = Dimensions.get('window');
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    React.useEffect(() => {
        if (visible) {
            console.log('🖼️ ImageViewer - Mostrando imagen:', imageUrl);
            setImageLoading(true);
            setImageError(false);
        }
    }, [visible, imageUrl]);

    return (
        <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
            <StatusBar hidden />
            <View className="flex-1 bg-black">
                {/* Header */}
                <View className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between p-4" style={{ paddingTop: 50, backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <Text className="text-white text-base font-medium flex-1 mr-4" numberOfLines={1}>
                        {fileName}
                    </Text>
                    <TouchableOpacity onPress={onClose} className="p-2">
                        <Ionicons name="close" size={28} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Imagen */}
                <View className="flex-1 items-center justify-center">
                    {imageLoading && !imageError && (
                        <View className="absolute z-5">
                            <ActivityIndicator size="large" color="#FFF" />
                            <Text className="text-white mt-2">Cargando imagen...</Text>
                        </View>
                    )}
                    {imageError ? (
                        <View className="items-center">
                            <Ionicons name="image-outline" size={64} color="#888" />
                            <Text className="text-white mt-4">Error al cargar la imagen</Text>
                        </View>
                    ) : (
                        <Image
                            source={{ uri: imageUrl }}
                            style={{ width, height }}
                            resizeMode="contain"
                            onLoad={() => {
                                console.log('✅ Imagen cargada correctamente');
                                setImageLoading(false);
                            }}
                            onError={(e) => {
                                console.error('❌ Error al cargar imagen:', e.nativeEvent.error);
                                setImageError(true);
                                setImageLoading(false);
                            }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

export const AttachmentsModal: React.FC<AttachmentsModalProps> = ({ visible, stop, onClose }) => {
    const { data: attachments, isLoading } = useStopAttachments(stop ? String(stop.id) : undefined);
    const deleteAttachment = useDeleteAttachment(stop ? String(stop.id) : '');

    // Log cuando cambian los attachments
    React.useEffect(() => {
        if (attachments) {
            console.log('📎 Attachments actualizados:', {
                count: attachments.length,
                items: attachments.map(a => ({
                    name: a.file_name,
                    type: a.file_type,
                    hasUrl: !!a.url,
                    urlPreview: a.url?.substring(0, 80)
                }))
            });
        }
    }, [attachments]);

    // Estado para el visor de imágenes
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);

    const handleOpenFile = (url: string, fileName: string, fileType: string) => {
        console.log('📂 Abriendo archivo:', fileName, 'Tipo:', fileType);
        console.log('🔗 URL:', url);

        const isImage = fileType.startsWith('image/');

        if (isImage) {
            // Para imágenes, mostrar el visor interno
            console.log('🖼️ Abriendo imagen en visor interno');
            setSelectedImage({ url, name: fileName });
            setImageViewerVisible(true);
        } else {
            // Para PDFs y otros archivos, abrir en app externa
            console.log('📄 Abriendo en app externa');
            Linking.openURL(url).catch((error) => {
                console.error('❌ Error al abrir archivo:', error);
                Alert.alert('Error', 'No se pudo abrir el archivo');
            });
        }
    };

    const handleDeleteAttachment = (attachmentId: string, fileName: string) => {
        Alert.alert(
            'Eliminar archivo',
            `¿Estás seguro de que quieres eliminar "${fileName}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => deleteAttachment.mutate(attachmentId),
                },
            ]
        );
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const renderAttachment = ({ item }: { item: any }) => {
        const isImage = item.file_type.startsWith('image/');
        const isPdf = item.file_type === 'application/pdf';

        console.log('🎨 Renderizando attachment:', {
            name: item.file_name,
            type: item.file_type,
            isImage,
            hasUrl: !!item.url,
            url: item.url?.substring(0, 100) + '...'
        });

        return (
            <TouchableOpacity
                onPress={() => handleOpenFile(item.url, item.file_name, item.file_type)}
                activeOpacity={0.7}
            >
                <View className="bg-white rounded-lg p-4 mb-3 border border-gray-200">
                    <View className="flex-row items-center">
                        {/* Vista previa o icono */}
                        <View className="mr-3">
                            {isImage ? (
                                <View>
                                    <Image
                                        source={{ uri: item.url }}
                                        className="w-16 h-16 rounded"
                                        resizeMode="cover"
                                        onError={(e) => {
                                            console.error('❌ Error en miniatura:', e.nativeEvent.error);
                                        }}
                                        onLoad={() => {
                                            console.log('✅ Miniatura cargada');
                                        }}
                                    />
                                </View>
                            ) : isPdf ? (
                                <View className="w-16 h-16 bg-red-100 rounded items-center justify-center">
                                    <Ionicons name="document-text" size={32} color="#DC2626" />
                                </View>
                            ) : (
                                <View className="w-16 h-16 bg-gray-100 rounded items-center justify-center">
                                    <Ionicons name="document" size={32} color="#6B7280" />
                                </View>
                            )}
                        </View>

                        {/* Información del archivo */}
                        <View className="flex-1">
                            <Text className="text-sm font-semibold text-gray-800" numberOfLines={2}>
                                {item.file_name}
                            </Text>
                            <Text className="text-xs text-gray-500 mt-1">
                                {formatFileSize(item.file_size)}
                            </Text>
                            <Text className="text-xs text-gray-400 mt-1">
                                {new Date(item.created_at).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                })}
                            </Text>
                            {/* Indicador de tipo */}
                            <View className="mt-2">
                                <Text className="text-xs text-indigo-600 font-medium">
                                    {isImage ? '📷 Toca para ver' : isPdf ? '📄 Toca para abrir' : '📎 Toca para abrir'}
                                </Text>
                            </View>
                        </View>

                        {/* Botones de acción */}
                        <View className="flex-row items-center ml-2">
                            {/* Botón abrir en externa */}
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    Linking.openURL(item.url);
                                }}
                                className="bg-indigo-100 p-2 rounded-lg mr-2"
                            >
                                <Ionicons name="open-outline" size={20} color="#4F46E5" />
                            </TouchableOpacity>

                            {/* Botón eliminar */}
                            <TouchableOpacity
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAttachment(item.id, item.file_name);
                                }}
                                className="bg-red-100 p-2 rounded-lg"
                                disabled={deleteAttachment.isPending}
                            >
                                {deleteAttachment.isPending ? (
                                    <ActivityIndicator size="small" color="#DC2626" />
                                ) : (
                                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <>
            <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
                <View className="flex-1 bg-black/50">
                    <View className="flex-1 mt-20 bg-white rounded-t-3xl">
                        {/* Header */}
                        <View className="flex-row items-center justify-between p-5 border-b border-gray-200">
                            <View className="flex-1">
                                <Text className="text-xl font-bold text-gray-800">Archivos de reserva</Text>
                                {stop && (
                                    <Text className="text-sm text-gray-500 mt-1" numberOfLines={1}>
                                        {stop.name}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity onPress={onClose} className="ml-3">
                                <Ionicons name="close-circle" size={32} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        {/* Contenido */}
                        <View className="flex-1 p-5">
                            {isLoading ? (
                                <View className="flex-1 items-center justify-center">
                                    <ActivityIndicator size="large" color="#4F46E5" />
                                    <Text className="text-gray-500 mt-4">Cargando archivos...</Text>
                                </View>
                            ) : !attachments || attachments.length === 0 ? (
                                <View className="flex-1 items-center justify-center">
                                    <Ionicons name="folder-open-outline" size={64} color="#D1D5DB" />
                                    <Text className="text-gray-500 mt-4 text-center">
                                        No hay archivos adjuntos en esta parada
                                    </Text>
                                </View>
                            ) : (
                                <FlatList
                                    data={attachments}
                                    renderItem={renderAttachment}
                                    keyExtractor={(item) => item.id}
                                    showsVerticalScrollIndicator={false}
                                />
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Visor de imágenes */}
            {selectedImage && (
                <ImageViewer
                    visible={imageViewerVisible}
                    imageUrl={selectedImage.url}
                    fileName={selectedImage.name}
                    onClose={() => {
                        setImageViewerVisible(false);
                        setSelectedImage(null);
                    }}
                />
            )}
        </>
    );
};
