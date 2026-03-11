import { FileInfo } from '@/components/trip/FilePicker';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Image, Linking, Text, TouchableOpacity, View } from 'react-native';

interface AttachmentBadgeProps {
    file: FileInfo;
    onPress?: () => void;
    compact?: boolean;
}

export const AttachmentBadge: React.FC<AttachmentBadgeProps> = ({
    file,
    onPress,
    compact = false
}) => {
    const isImage = file.mimeType.startsWith('image/');
    const isPDF = file.mimeType === 'application/pdf';

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else {
            // Intentar abrir el archivo
            if (file.uri) {
                Linking.openURL(file.uri).catch(() => {
                    Alert.alert('Error', 'No se pudo abrir el archivo');
                });
            }
        }
    };

    if (compact) {
        // Vista compacta - solo icono y nombre
        return (
            <TouchableOpacity
                onPress={handlePress}
                className="flex-row items-center bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200"
                activeOpacity={0.7}
            >
                {isImage ? (
                    <View className="w-6 h-6 rounded overflow-hidden mr-2">
                        <Image
                            source={{ uri: file.uri }}
                            className="w-full h-full"
                            resizeMode="cover"
                        />
                    </View>
                ) : (
                    <Ionicons
                        name={isPDF ? "document-text" : "document"}
                        size={20}
                        color="#4F46E5"
                        style={{ marginRight: 8 }}
                    />
                )}
                <Text className="text-xs font-medium text-indigo-700 flex-1" numberOfLines={1}>
                    {file.name}
                </Text>
                <Ionicons name="eye-outline" size={16} color="#6366F1" />
            </TouchableOpacity>
        );
    }

    // Vista expandida - con preview
    return (
        <TouchableOpacity
            onPress={handlePress}
            className="bg-white border border-gray-200 rounded-xl p-3 flex-row items-center"
            activeOpacity={0.7}
        >
            {isImage ? (
                <Image
                    source={{ uri: file.uri }}
                    className="w-16 h-16 rounded-lg mr-3"
                    resizeMode="cover"
                />
            ) : (
                <View className="w-16 h-16 bg-red-50 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="document-text" size={32} color="#DC2626" />
                </View>
            )}
            <View className="flex-1">
                <View className="flex-row items-center mb-1">
                    <Ionicons name="attach" size={14} color="#6B7280" />
                    <Text className="text-xs text-gray-500 ml-1">Adjunto</Text>
                </View>
                <Text className="text-sm font-semibold text-gray-800" numberOfLines={1}>
                    {file.name}
                </Text>
                {file.size && (
                    <Text className="text-xs text-gray-500 mt-0.5">
                        {formatFileSize(file.size)}
                    </Text>
                )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );
};

const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
