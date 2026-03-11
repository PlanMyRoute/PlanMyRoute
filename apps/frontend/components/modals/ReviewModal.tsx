import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ReviewModalProps {
    visible: boolean;
    tripId: number;
    tripName: string;
    onClose: () => void;
    onSubmit: (rating: number, comment: string, isPublic: boolean) => void;
    loading?: boolean;
    existingReview?: {
        rating: number;
        comment: string | null;
        is_public: boolean;
    } | null;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
    visible,
    tripId,
    tripName,
    onClose,
    onSubmit,
    loading = false,
    existingReview,
}) => {
    const [rating, setRating] = useState(existingReview?.rating || 0);
    const [comment, setComment] = useState(existingReview?.comment || '');
    const [isPublic, setIsPublic] = useState(existingReview?.is_public ?? true);

    const handleSubmit = () => {
        if (rating === 0) return;
        onSubmit(rating, comment, isPublic);
    };

    const getRatingText = () => {
        switch (rating) {
            case 1: return '😞 Muy malo';
            case 2: return '😕 Malo';
            case 3: return '😐 Regular';
            case 4: return '😊 Bueno';
            case 5: return '🤩 Excelente';
            default: return '👆 Toca las estrellas';
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <Text style={styles.title}>
                                {existingReview ? 'Editar reseña' : 'Valora tu viaje'}
                            </Text>
                            <Text style={styles.subtitle}>{tripName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close-circle" size={32} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Rating Section */}
                        <View style={styles.section}>
                            <Text style={styles.ratingTitle}>{getRatingText()}</Text>

                            {/* Stars */}
                            <View style={styles.starsContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <TouchableOpacity
                                        key={star}
                                        onPress={() => {
                                            console.log('Star pressed:', star);
                                            setRating(star);
                                        }}
                                        activeOpacity={0.7}
                                        style={styles.starButton}
                                    >
                                        <Ionicons
                                            name={star <= rating ? 'star' : 'star-outline'}
                                            size={44}
                                            color={star <= rating ? '#FFD54D' : '#D1D5DB'}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {rating === 0 && (
                                <View style={styles.warningBox}>
                                    <Text style={styles.warningText}>
                                        ⚠️ Selecciona una calificación para continuar
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Comment */}
                        <View style={styles.section}>
                            <Text style={styles.label}>Cuéntanos tu experiencia (opcional)</Text>
                            <TextInput
                                value={comment}
                                onChangeText={setComment}
                                placeholder="Escribe tu opinión sobre el viaje..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                maxLength={500}
                                style={styles.textInput}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCount}>{comment.length}/500</Text>
                        </View>

                        {/* Public Toggle */}
                        <TouchableOpacity
                            onPress={() => setIsPublic(!isPublic)}
                            style={styles.toggleContainer}
                            activeOpacity={0.7}
                        >
                            <View style={styles.toggleContent}>
                                <Text style={styles.toggleTitle}>Hacer pública mi reseña</Text>
                                <Text style={styles.toggleSubtitle}>
                                    Aparecerá en el feed de la comunidad
                                </Text>
                            </View>
                            <View style={[styles.switch, isPublic && styles.switchActive]}>
                                <View style={[styles.switchThumb, isPublic && styles.switchThumbActive]} />
                            </View>
                        </TouchableOpacity>

                        {/* Info */}
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={20} color="#3B82F6" />
                            <Text style={styles.infoText}>
                                Tienes 14 días desde la finalización del viaje para crear o editar tu reseña
                            </Text>
                        </View>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={handleSubmit}
                            disabled={rating === 0 || loading}
                            style={[
                                styles.submitButton,
                                (rating === 0 || loading) && styles.submitButtonDisabled
                            ]}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={[
                                    styles.submitButtonText,
                                    rating === 0 && styles.submitButtonTextDisabled
                                ]}>
                                    {rating === 0
                                        ? 'Selecciona una calificación'
                                        : existingReview
                                            ? 'Guardar cambios'
                                            : 'Publicar reseña'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 0,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
        fontFamily: 'Poppins-Bold',
    },
    subtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
        fontFamily: 'Poppins-Regular',
    },
    closeButton: {
        marginLeft: 12,
        padding: 4,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 16,
    },
    section: {
        marginBottom: 20,
    },
    ratingTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        gap: 4,
    },
    starButton: {
        padding: 6,
    },
    warningBox: {
        backgroundColor: '#FFF4E5',
        borderWidth: 1.5,
        borderColor: '#FFD54D',
        borderRadius: 12,
        padding: 10,
    },
    warningText: {
        color: '#92400E',
        textAlign: 'center',
        fontSize: 13,
        fontFamily: 'Poppins-Medium',
    },
    label: {
        fontSize: 14,
        color: '#374151',
        marginBottom: 8,
        fontFamily: 'Poppins-Medium',
    },
    textInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 12,
        color: '#111827',
        minHeight: 100,
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
    charCount: {
        fontSize: 12,
        color: '#6B7280',
        textAlign: 'right',
        marginTop: 4,
        fontFamily: 'Poppins-Regular',
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    toggleContent: {
        flex: 1,
        marginRight: 12,
    },
    toggleTitle: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '500',
        fontFamily: 'Poppins-Medium',
    },
    toggleSubtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
        fontFamily: 'Poppins-Regular',
    },
    switch: {
        width: 48,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#D1D5DB',
        justifyContent: 'center',
    },
    switchActive: {
        backgroundColor: '#FBBF24',
    },
    switchThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'white',
        marginLeft: 2,
    },
    switchThumbActive: {
        marginLeft: 26,
    },
    infoBox: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoText: {
        fontSize: 12,
        color: '#1E40AF',
        marginLeft: 8,
        flex: 1,
        fontFamily: 'Poppins-Regular',
    },
    footer: {
        padding: 20,
        paddingTop: 16,
        borderTopWidth: 0,
    },
    submitButton: {
        backgroundColor: '#FFD54D',
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    submitButtonDisabled: {
        backgroundColor: '#E5E7EB',
        shadowOpacity: 0,
        elevation: 0,
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        fontFamily: 'Poppins-SemiBold',
    },
    submitButtonTextDisabled: {
        color: '#9CA3AF',
    },
});
