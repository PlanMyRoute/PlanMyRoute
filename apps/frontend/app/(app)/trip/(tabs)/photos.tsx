import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  Dimensions,
  StatusBar,
  Share,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTripContext } from '@/context/TripContext';
import { getPhotos, uploadPhoto, deletePhoto } from '@/services/photoService';
import { useLocalSearchParams } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Photo {
  id: string;
  url: string;
  path: string;
  created_at: string;
}

interface UploadingPhoto {
  uri: string;
  progress: number;
  error?: string;
}

// Skeleton loader component
const PhotoSkeleton = () => (
  <Animated.View
    entering={FadeIn}
    className="bg-gray-200 rounded-lg"
    style={{ width: '100%', aspectRatio: 1 }}
  >
    <View className="w-full h-full animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
  </Animated.View>
);

// Photo grid item
const PhotoGridItem = ({
  item,
  onPress,
  onLongPress,
}: {
  item: Photo;
  onPress: () => void;
  onLongPress: () => void;
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  return (
    <Animated.View entering={ZoomIn.delay(100)} className="p-1" style={{ width: '33.333%' }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onLongPress={onLongPress}
        className="relative"
      >
        {imageLoading && !imageError && (
          <View
            className="absolute inset-0 bg-gray-200 rounded-lg items-center justify-center"
            style={{ zIndex: 1 }}
          >
            <ActivityIndicator size="small" color="#FFD64F" />
          </View>
        )}

        {imageError ? (
          <View className="w-full aspect-square bg-gray-200 rounded-lg items-center justify-center">
            <Ionicons name="image-outline" size={32} color="#9CA3AF" />
            <Text className="text-xs text-gray-400 mt-1">Error</Text>
          </View>
        ) : (
          <Image
            source={{ uri: item.url }}
            style={{ width: '100%', aspectRatio: 1, borderRadius: 8 }}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />
        )}

        {/* Subtle overlay on press */}
        <View className="absolute inset-0 bg-black/5 rounded-lg" />
      </TouchableOpacity>
    </Animated.View>
  );
};

// Uploading photo item
const UploadingPhotoItem = ({ item }: { item: UploadingPhoto }) => (
  <Animated.View entering={FadeIn} exiting={FadeOut} className="p-1" style={{ width: '33.333%' }}>
    <View className="relative">
      <Image
        source={{ uri: item.uri }}
        style={{ width: '100%', aspectRatio: 1, borderRadius: 8, opacity: 0.6 }}
      />

      {/* Upload progress overlay */}
      <View className="absolute inset-0 bg-black/40 rounded-lg items-center justify-center">
        {item.error ? (
          <>
            <Ionicons name="close-circle" size={32} color="#EF4444" />
            <Text className="text-white text-xs mt-1">Error</Text>
          </>
        ) : (
          <>
            <ActivityIndicator size="small" color="#FFD64F" />
            <Text className="text-white text-xs mt-2">{Math.round(item.progress)}%</Text>
          </>
        )}
      </View>
    </View>
  </Animated.View>
);

// Full screen image viewer
const ImageViewer = ({
  visible,
  photos,
  initialIndex,
  onClose,
  onDelete,
  onShare,
}: {
  visible: boolean;
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (photo: Photo) => void;
  onShare: (photo: Photo) => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleClose = () => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    onClose();
  };

  if (!visible || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <StatusBar hidden />
      <View className="flex-1 bg-black">
        {/* Header */}
        <Animated.View
          entering={SlideInDown}
          className="absolute top-0 left-0 right-0 z-10 pt-12 pb-4 px-4 flex-row items-center justify-between"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <TouchableOpacity onPress={handleClose} className="p-2">
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          <Text className="text-white font-semibold">
            {currentIndex + 1} / {photos.length}
          </Text>

          <View className="flex-row">
            <TouchableOpacity onPress={() => onShare(currentPhoto)} className="p-2 mr-2">
              <Ionicons name="share-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(currentPhoto)} className="p-2">
              <Ionicons name="trash-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Image with gestures */}
        <View className="flex-1 items-center justify-center">
          <GestureDetector gesture={composed}>
            <Animated.Image
              source={{ uri: currentPhoto.url }}
              style={[
                {
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT,
                },
                animatedStyle,
              ]}
              resizeMode="contain"
            />
          </GestureDetector>
        </View>

        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <Animated.View
            entering={FadeIn}
            className="absolute left-4 top-1/2"
            style={{ transform: [{ translateY: -20 }] }}
          >
            <TouchableOpacity
              onPress={() => setCurrentIndex(currentIndex - 1)}
              className="bg-black/50 p-3 rounded-full"
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {currentIndex < photos.length - 1 && (
          <Animated.View
            entering={FadeIn}
            className="absolute right-4 top-1/2"
            style={{ transform: [{ translateY: -20 }] }}
          >
            <TouchableOpacity
              onPress={() => setCurrentIndex(currentIndex + 1)}
              className="bg-black/50 p-3 rounded-full"
            >
              <Ionicons name="chevron-forward" size={24} color="white" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

export default function TripPhotosTab() {
  const params = useLocalSearchParams();
  const tripContext = useTripContext();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState<UploadingPhoto[]>([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [tripId] = useState<string | null>(() => {
    const id = (params.tripId as string) || tripContext.tripId;
    console.log('🆔 TripPhotosTab - Initial tripId:', id);
    return id;
  });

  // Cargar fotos una sola vez cuando el componente monta
  useEffect(() => {
    if (!tripId) {
      console.log('⚠️ No tripId available, skipping photo load');
      setLoading(false);
      return;
    }

    console.log('📸 Loading photos for tripId:', tripId);
    let cancelled = false;
    
    const loadPhotos = async () => {
      setLoading(true);
      try {
        const res = await getPhotos(tripId);
        if (!cancelled) {
          console.log('✅ Photos loaded:', res?.length || 0);
          setPhotos(res || []);
        }
      } catch (error) {
        console.error('❌ Error loading photos:', error);
        if (!cancelled && Platform.OS !== 'web') {
          Alert.alert('Error', 'No se pudieron cargar las fotos');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPhotos();

    return () => {
      cancelled = true;
    };
  }, []); // Array vacío - solo cargar al montar

  // Función para recargar fotos (usada después de subir)
  const reloadPhotos = async () => {
    if (!tripId) return;
    console.log('🔄 Reloading photos for tripId:', tripId);
    try {
      const res = await getPhotos(tripId);
      setPhotos(res || []);
    } catch (error) {
      console.error('Error reloading photos:', error);
    }
  };

  const handleImagePick = async (fromCamera = false) => {
    try {
      console.log('📸 Iniciando selección de imagen...', { fromCamera });
      
      // Request permissions
      console.log('🔐 Solicitando permisos...');
      const permission = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      console.log('🔐 Permisos obtenidos:', permission);

      if (permission.status !== 'granted' && permission.granted !== true) {
        console.log('❌ Permisos denegados');
        return Alert.alert(
          'Permiso denegado',
          `Necesitamos permiso para acceder a ${fromCamera ? 'la cámara' : 'tus fotos'}.`
        );
      }

      console.log('✅ Permisos concedidos, abriendo selector...');

      // Prefer the new API `ImagePicker.MediaType` (MediaTypeOptions is deprecated)
      const mediaType = (ImagePicker as any).MediaType
        ? (ImagePicker as any).MediaType.Images
        : (ImagePicker as any).MediaTypeOptions
        ? (ImagePicker as any).MediaTypeOptions.Images
        : undefined;

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: mediaType,
            quality: 0.8,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: mediaType,
            quality: 0.8,
            allowsMultipleSelection: true,
          });

      console.log('📷 Resultado del picker:', result);

      const canceled = (result as any).cancelled ?? (result as any).canceled ?? false;
      if (canceled) {
        console.log('ℹ️ Usuario canceló la selección');
        return;
      }

      // Handle multiple or single image robustly
      let assets: any[] = [];
      if ((result as any).assets && Array.isArray((result as any).assets) && (result as any).assets.length > 0) {
        assets = (result as any).assets;
      } else if ((result as any).uri) {
        assets = [{ uri: (result as any).uri }];
      }

      console.log('🖼️ Assets seleccionados:', assets.length);

      if (assets.length === 0) {
        console.log('❌ No se obtuvieron imágenes');
        return Alert.alert('Error', 'No se obtuvieron imágenes.');
      }

      // Validar que tripId existe
      if (!tripId) {
        console.log('❌ No hay tripId disponible');
        return Alert.alert('Error', 'No se pudo identificar el viaje. Recarga la página.');
      }

      // Upload all selected images
      console.log('📤 Iniciando subida de', assets.length, 'imágenes a tripId:', tripId);
      await uploadMultiplePhotos(assets.map((a: any) => a.uri));
    } catch (error) {
      console.error('❌ Error en handleImagePick:', error);
      Alert.alert('Error', 'Ocurrió un error al seleccionar la imagen: ' + (error as Error).message);
    }
  };

  const uploadMultiplePhotos = async (uris: string[]) => {
    // Validar tripId de nuevo
    if (!tripId) {
      console.error('❌ tripId es null en uploadMultiplePhotos');
      Alert.alert('Error', 'No se puede subir la foto: ID de viaje no disponible');
      return;
    }

    console.log('📸 uploadMultiplePhotos - tripId:', tripId, 'uris:', uris.length);
    // Add to uploading state
    const newUploading: UploadingPhoto[] = uris.map((uri) => ({
      uri,
      progress: 0,
    }));
    setUploadingPhotos((prev) => [...prev, ...newUploading]);

    // Upload each photo
    for (let i = 0; i < uris.length; i++) {
      const uri = uris[i];
      try {
        // Simulate progress (since we don't have real progress from the service)
        setUploadingPhotos((prev) =>
          prev.map((p) => (p.uri === uri ? { ...p, progress: 50 } : p))
        );

        await uploadPhoto(tripId as string, uri);

        // Mark as complete
        setUploadingPhotos((prev) =>
          prev.map((p) => (p.uri === uri ? { ...p, progress: 100 } : p))
        );

        // Remove from uploading after a short delay
        setTimeout(() => {
          setUploadingPhotos((prev) => prev.filter((p) => p.uri !== uri));
        }, 500);
      } catch (e: any) {
        console.error('Upload error:', e);
        setUploadingPhotos((prev) =>
          prev.map((p) => (p.uri === uri ? { ...p, error: e?.message || 'Error' } : p))
        );

        // Remove failed upload after delay
        setTimeout(() => {
          setUploadingPhotos((prev) => prev.filter((p) => p.uri !== uri));
        }, 2000);
      }
    }

    // Reload photos
    await reloadPhotos();
  };

  const handleDelete = useCallback(
    (item: Photo) => {
      Alert.alert('Eliminar foto', '¿Estás seguro de que quieres eliminar esta foto?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhoto(item.id, item.path);
              setPhotos((prev) => prev.filter((p) => p.id !== item.id));
              setViewerVisible(false);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la foto.');
            }
          },
        },
      ]);
    },
    []
  );

  const handleShare = useCallback(async (item: Photo) => {
    try {
      await Share.share({
        message: 'Mira esta foto de mi viaje!',
        url: item.url,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, []);

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  }, []);

  const showUploadOptions = () => {
    console.log('🎬 showUploadOptions llamado, platform:', Platform.OS);
    try {
      // En web, ir directamente a la galería (Alert.alert no funciona bien en web)
      if (Platform.OS === 'web') {
        console.log('🌐 Detectado web, abriendo galería directamente...');
        handleImagePick(false);
        return;
      }

      // En móvil, mostrar opciones
      Alert.alert('Agregar fotos', 'Elige una opción', [
        {
          text: 'Tomar foto',
          onPress: () => {
            console.log('📷 Usuario eligió "Tomar foto"');
            handleImagePick(true);
          },
        },
        {
          text: 'Elegir de galería',
          onPress: () => {
            console.log('🖼️ Usuario eligió "Elegir de galería"');
            handleImagePick(false);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    } catch (error) {
      console.error('❌ Error en showUploadOptions:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'No se pudo abrir el selector: ' + (error as Error).message);
      }
    }
  };

  // Mostrar mensaje si no hay tripId
  if (!tripId) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 mt-4">No se pudo cargar el viaje</Text>
      </View>
    );
  }

  const allItems = [...uploadingPhotos, ...photos];

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if ('progress' in item) {
      return <UploadingPhotoItem item={item as UploadingPhoto} />;
    }

    const photoIndex = index - uploadingPhotos.length;
    return (
      <PhotoGridItem
        item={item as Photo}
        onPress={() => openViewer(photoIndex)}
        onLongPress={() => handleDelete(item as Photo)}
      />
    );
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 flex-row items-center justify-between border-b border-gray-100 bg-white shadow-sm">
        <View>
          <Text className="text-xl font-bold text-gray-900">Fotos</Text>
          <Text className="text-sm text-gray-500">{photos.length} fotos</Text>
        </View>

        <TouchableOpacity
          onPress={showUploadOptions}
          disabled={uploadingPhotos.length > 0}
          className="bg-[#FFD64F] px-4 py-2.5 rounded-full flex-row items-center shadow-sm"
          style={{
            shadowColor: '#FFD64F',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {uploadingPhotos.length > 0 ? (
            <>
              <ActivityIndicator size="small" color="#1D1D1B" />
              <Text className="ml-2 text-sm font-semibold text-gray-900">
                Subiendo {uploadingPhotos.length}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="add" size={20} color="#1D1D1B" />
              <Text className="ml-1 text-sm font-semibold text-gray-900">Agregar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && photos.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FFD64F" />
          <Text className="text-gray-500 mt-4">Cargando fotos...</Text>
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={(item, index) =>
            'progress' in item ? `uploading-${index}` : (item as Photo).id
          }
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={{ padding: 4 }}
          ListEmptyComponent={
            <Animated.View entering={FadeIn} className="flex-1 items-center justify-center p-8">
              <View className="bg-gray-100 rounded-full p-6 mb-4">
                <Ionicons name="images-outline" size={48} color="#9CA3AF" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                No hay fotos aún
              </Text>
              <Text className="text-center text-gray-500 mb-6">
                Comienza a capturar los momentos especiales de tu viaje
              </Text>
              <TouchableOpacity
                onPress={showUploadOptions}
                className="bg-[#FFD64F] px-6 py-3 rounded-full flex-row items-center"
              >
                <Ionicons name="camera-outline" size={20} color="#1D1D1B" />
                <Text className="ml-2 text-sm font-semibold text-gray-900">
                  Agregar primera foto
                </Text>
              </TouchableOpacity>
            </Animated.View>
          }
        />
      )}

      {/* Image Viewer Modal */}
      <ImageViewer
        visible={viewerVisible}
        photos={photos}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
        onDelete={handleDelete}
        onShare={handleShare}
      />
    </View>
  );
}