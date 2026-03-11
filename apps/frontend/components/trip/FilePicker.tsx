import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Text, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';

interface FilePickerProps {
    onFileSelected: (file: FileInfo) => void;
    currentFile?: FileInfo | null;
    label?: string;
}

export interface FileInfo {
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
}

export default function FilePicker({ onFileSelected, currentFile, label = 'Adjuntar reserva' }: FilePickerProps) {
    const [isLoading, setIsLoading] = useState(false);

    const pickDocument = async () => {
        try {
            setIsLoading(true);
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                onFileSelected({
                    uri: file.uri,
                    name: file.name,
                    mimeType: file.mimeType || 'application/octet-stream',
                    size: file.size,
                });
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'No se pudo seleccionar el archivo');
        } finally {
            setIsLoading(false);
        }
    };

    const pickImage = async () => {
        try {
            setIsLoading(true);
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (!permissionResult.granted) {
                Alert.alert('Permiso denegado', 'Necesitamos permiso para acceder a tus fotos');
                setIsLoading(false);
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const image = result.assets[0];
                onFileSelected({
                    uri: image.uri,
                    name: `imagen_${Date.now()}.jpg`,
                    mimeType: 'image/jpeg',
                });
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'No se pudo seleccionar la imagen');
        } finally {
            setIsLoading(false);
        }
    };

    const showOptions = () => {
        Alert.alert(
            'Seleccionar archivo',
            'Elige cómo quieres adjuntar tu reserva',
            [
                {
                    text: 'Foto de galería',
                    onPress: pickImage,
                },
                {
                    text: 'Documento PDF',
                    onPress: pickDocument,
                },
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
            ]
        );
    };

    const removeFile = () => {
        Alert.alert(
            'Eliminar archivo',
            '¿Estás seguro de que quieres eliminar este archivo?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => onFileSelected(null as any),
                },
            ]
        );
    };

    const getFileIcon = () => {
        if (!currentFile) return null;
        
        if (currentFile.mimeType.startsWith('image/')) {
            return (
                <Image
                    source={{ uri: currentFile.uri }}
                    className="w-16 h-16 rounded-lg"
                    resizeMode="cover"
                />
            );
        }
        
        return (
            <View className="w-16 h-16 bg-red-100 rounded-lg items-center justify-center">
                <Ionicons name="document-text" size={32} color="#DC2626" />
            </View>
        );
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    if (currentFile) {
        return (
            <View className="bg-green-50 border border-green-200 rounded-xl p-4">
                <Text className="text-xs font-semibold text-gray-700 mb-2">{label}</Text>
                <View className="flex-row items-center">
                    {getFileIcon()}
                    <View className="flex-1 ml-3">
                        <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
                            {currentFile.name}
                        </Text>
                        {currentFile.size && (
                            <Text className="text-xs text-gray-500 mt-0.5">
                                {formatFileSize(currentFile.size)}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity
                        onPress={removeFile}
                        className="bg-red-100 w-8 h-8 rounded-full items-center justify-center"
                    >
                        <Ionicons name="trash" size={16} color="#DC2626" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View>
            <Text className="text-xs font-semibold text-gray-700 mb-2">{label}</Text>
            <TouchableOpacity
                onPress={showOptions}
                disabled={isLoading}
                className="bg-white border-2 border-dashed border-indigo-300 rounded-xl p-4 items-center"
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                    <>
                        <Ionicons name="cloud-upload-outline" size={32} color="#6366F1" />
                        <Text className="text-sm font-semibold text-indigo-600 mt-2">
                            Adjuntar PDF o imagen
                        </Text>
                        <Text className="text-xs text-gray-500 mt-1">
                            Toca para seleccionar archivo
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}
