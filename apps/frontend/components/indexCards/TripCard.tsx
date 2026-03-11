import CustomAlert from '@/components/customElements/CustomAlert';
import { MicrotextDark, SubtitleSemibold, TextRegular, Title2Semibold } from '@/components/customElements/CustomText';
import { DropdownMenu, DropdownMenuItem } from '@/components/modals/DropdownMenu';
import { TripStatusBadge } from '@/components/trip/TripStatusBadge';
import { useTripAccess } from '@/hooks/useTripAccess';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '@planmyroute/types';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ImageBackground, Pressable, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTripContext } from '../../context/TripContext';
import { useStops } from '../../hooks/useItinerary';
import { useTripPermissions } from '../../hooks/useTripPermissions';
import { useDeleteTrip, useLeaveTrip, useTripStopsCount } from '../../hooks/useTrips';

interface TripCardProps {
  trip: Trip;
}

export const TripCard = ({ trip }: TripCardProps) => {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cardLayout, setCardLayout] = useState({ y: 0, height: 0 });
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);
  const [leaveAlertVisible, setLeaveAlertVisible] = useState(false);
  const { count: stopsCount, isLoading: stopsLoading } = useTripStopsCount(trip.id.toString());
  const { stops } = useStops(trip.id.toString(), { enabled: trip.status === 'going' });
  const { setCurrentTrip, setTripId } = useTripContext();
  const deleteTripMutation = useDeleteTrip();
  const leaveTripMutation = useLeaveTrip();

  // Usar el nuevo hook del servidor para permisos reales
  const access = useTripAccess(trip.id.toString());
  // Mantener el antiguo para retrocompatibilidad
  const { canEdit, canDelete, canLeave, role, isOwner, isEditor, isViewer } = useTripPermissions(trip.id.toString());

  const imageUri = (trip as any).cover_image_url
    ? (trip as any).cover_image_url
    : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800';

  const formatDateRange = (startInput: string | Date | null | undefined, endInput: string | Date | null | undefined) => {
    if (!startInput) return '';
    const start = typeof startInput === 'string' ? new Date(startInput) : startInput;
    const end = endInput ? (typeof endInput === 'string' ? new Date(endInput) : endInput) : null;

    const startDay = start.getDate().toString().padStart(2, '0');
    const startMonth = start.toLocaleDateString('es-ES', { month: 'short' });

    if (end) {
      const endDay = end.getDate().toString().padStart(2, '0');
      const endMonth = end.toLocaleDateString('es-ES', { month: 'short' });

      if (start.getMonth() === end.getMonth()) {
        return `${startDay} ${startMonth} - ${endDay} ${startMonth}`;
      } else {
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
      }
    }

    return `${startDay} ${startMonth}`;
  };

  const handleDeleteTrip = () => {
    deleteTripMutation.mutate(trip.id.toString(), {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: 'Viaje Eliminado',
          text2: `"${trip.name}" ha sido eliminado.`,
        });
      },
      onError: (error: any) => {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error?.message || 'No se pudo eliminar el viaje.',
        });
      },
    });
  };

  const confirmDelete = () => {
    setMenuOpen(false);
    // Pequeño delay para dar tiempo a que el menú se cierre antes de abrir la alerta
    setTimeout(() => setDeleteAlertVisible(true), 100);
  };

  const handleLeaveTrip = () => {
    leaveTripMutation.mutate(trip.id.toString(), {
      onSuccess: () => {
        Toast.show({
          type: 'success',
          text1: 'Has salido del viaje',
          text2: `Ya no formas parte de "${trip.name}".`,
        });
      },
      onError: (error: any) => {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error?.message || 'No se pudo salir del viaje.',
        });
      },
    });
  };

  const confirmLeave = () => {
    setMenuOpen(false);
    // Pequeño delay para dar tiempo a que el menú se cierre antes de abrir la alerta
    setTimeout(() => setLeaveAlertVisible(true), 100);
  };

  const handleLongPress = () => {
    setMenuOpen(!menuOpen);
  };

  const handlePress = () => {
    if (!menuOpen) {
      router.push(`/trip/${trip.id}`);
    }
  };

  const handleEdit = () => {
    setTripId(trip.id.toString());
    setCurrentTrip(trip);
    router.push(`/trip/edit?tripId=${trip.id}`);
  };

  const handleDelete = () => {
    confirmDelete();
  };

  const handleLeave = () => {
    confirmLeave();
  };

  // Configurar items del menú basado en permisos
  const menuItems: DropdownMenuItem[] = useMemo(() => {
    const items: DropdownMenuItem[] = [];

    // Editar - Solo owners y editors, y no si está completado o es guest
    if (access.canEdit && !access.isCompleted && !access.isGuest) {
      items.push({
        id: 'edit',
        label: 'Editar viaje',
        icon: 'create-outline',
        onPress: handleEdit,
      });
    }

    // Eliminar viaje - Solo owner (permitido incluso si está completado)
    if (access.canDelete) {
      items.push({
        id: 'delete',
        label: 'Eliminar viaje',
        icon: 'trash-outline',
        onPress: handleDelete,
        variant: 'destructive',
      });
    }

    // Salir del viaje - Editors y viewers (no guests)
    if (access.canLeave && !access.isGuest) {
      items.push({
        id: 'leave',
        label: 'Salir del viaje',
        icon: 'exit-outline',
        onPress: handleLeave,
        variant: 'destructive',
      });
    }

    return items;
  }, [access, trip.id]);

  // Determinar si es un viaje "en curso" para cambiar el estilo
  const isOngoingTrip = trip.status === 'going';

  // Calcular el día actual del viaje si está en marcha
  const getCurrentTripDay = () => {
    if (!isOngoingTrip || !trip.start_date) return null;

    const start = new Date(trip.start_date);
    const today = new Date();
    start.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, daysDiff + 1);
  };

  const currentDay = getCurrentTripDay();

  // Obtener la próxima parada basándose en el día actual
  const getNextStop = () => {
    if (!stops || stops.length === 0) return null;

    // Filtrar paradas del día actual (el campo 'day' es agregado dinámicamente por el backend)
    const todayStops = stops.filter((stop: any) => stop.day === currentDay);

    if (todayStops.length === 0) {
      // Si no hay paradas hoy, devolver la última parada del viaje
      return stops[stops.length - 1];
    }

    // Ordenar por estimated_arrival
    const sortedStops = todayStops.sort((a: any, b: any) => {
      if (!a.estimated_arrival) return 1;
      if (!b.estimated_arrival) return -1;
      return new Date(a.estimated_arrival).getTime() - new Date(b.estimated_arrival).getTime();
    });

    // Buscar la próxima parada que aún no ha llegado
    const now = new Date();
    for (const stop of sortedStops) {
      if (stop.estimated_arrival) {
        const arrivalTime = new Date(stop.estimated_arrival);
        if (arrivalTime > now) {
          return stop;
        }
      }
    }

    // Si todas las paradas de hoy ya pasaron, devolver la última del día
    return sortedStops[sortedStops.length - 1];
  };

  const nextStop = isOngoingTrip ? getNextStop() : null;

  return (
    <View
      className="mb-6"
      style={{ position: 'relative' }}
      onLayout={(event) => {
        const { y, height } = event.nativeEvent.layout;
        setCardLayout({ y, height });
      }}
    >
      {/* Overlay transparente para cerrar el menú */}
      {menuOpen && (
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{
            position: 'absolute',
            top: -10000,
            left: -10000,
            right: -10000,
            bottom: -10000,
            zIndex: 998,
          }}
        />
      )}

      {/* Título fuera de la card para viajes going */}
      {isOngoingTrip && currentDay && (
        <View className="mb-2">
          <Title2Semibold className="text-dark-black">
            {trip.name} - Día {currentDay}
          </Title2Semibold>
        </View>
      )}

      <View style={{ position: 'relative' }}>
        <Pressable
          className="rounded-3xl overflow-hidden"
          style={({ pressed }) =>
            pressed
              ? { opacity: 0.95, transform: [{ scale: 0.98 }] }
              : undefined
          }
          onPress={handlePress}
          onLongPress={handleLongPress}
        >
          {/* Imagen del viaje */}
          <ImageBackground
            source={{ uri: imageUri }}
            className="w-full"
            style={{ height: isOngoingTrip ? 200 : 160 }}
          >
            <View className="flex-1 p-5">
              {/* Para viajes en planificación: fecha arriba y flecha */}
              {!isOngoingTrip && (
                <View className="flex-row justify-between items-start">
                  <View className="bg-white rounded-full px-5 py-2.5">
                    <TextRegular className="text-dark-black">
                      {formatDateRange(trip.start_date, trip.end_date)}
                    </TextRegular>
                  </View>

                  <TouchableOpacity
                    className="bg-white rounded-full w-14 h-14 items-center justify-center"
                    onPress={handlePress}
                  >
                    <Ionicons name="arrow-forward" size={24} color="#202020" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Para viajes en curso: mostrar día del viaje y botón de itinerario */}
              {isOngoingTrip && (
                <View className="flex-row justify-between items-start">
                  {currentDay && (
                    <View className="bg-white rounded-full px-5 py-2.5">
                      <TextRegular className="text-dark-black">
                        {formatDateRange(trip.start_date, trip.end_date)}
                      </TextRegular>
                    </View>
                  )}
                  <TouchableOpacity
                    className="bg-primary-yellow rounded-full px-6 py-3 flex-row items-center gap-2"
                    onPress={handlePress}
                  >
                    <TextRegular className="text-dark-black">
                      Itinerario
                    </TextRegular>
                    <Ionicons name="arrow-forward" size={20} color="#202020" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ImageBackground>

          {/* Panel de información debajo de la imagen */}
          <View className={`p-5 border-2 border-neutral-gray/20 rounded-b-3xl ${isOngoingTrip ? 'bg-primary-yellow' : 'bg-white'}`}>
            {isOngoingTrip && nextStop ? (
              /* Diseño especial para viajes going */
              <>
                {/* Próxima parada */}
                <View className="mb-3">
                  <MicrotextDark className="text-dark-black/60 uppercase tracking-wide mb-1">
                    Próxima parada
                  </MicrotextDark>
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="location" size={18} color="#202020" />
                    <SubtitleSemibold className="text-dark-black">
                      {nextStop.name}
                    </SubtitleSemibold>
                  </View>
                </View>

                {/* Hora de llegada estimada */}
                {nextStop.estimated_arrival && (
                  <View className="flex-row items-center gap-4 pt-3 border-t border-dark-black/20">
                    <View className="flex-row items-center gap-2">
                      <Ionicons name="time-outline" size={16} color="#202020" />
                      <MicrotextDark className="text-dark-black">
                        {new Date(nextStop.estimated_arrival).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </MicrotextDark>
                    </View>
                  </View>
                )}
              </>
            ) : (
              /* Diseño para viajes planning */
              <>
                <View className="flex-row items-center justify-between mb-2">
                  <Title2Semibold className="text-dark-black flex-1" numberOfLines={1}>
                    {trip.name}
                  </Title2Semibold>
                  <TripStatusBadge
                    isGuest={access.isGuest}
                    isCompleted={access.isCompleted}
                    variant="compact"
                  />
                </View>

                {/* Descripción o ubicación */}
                {trip.description && (
                  <View className="flex-row items-start mb-3">
                    <Ionicons name="location" size={18} color="#202020" style={{ marginTop: 2, marginRight: 6 }} />
                    <TextRegular className="text-dark-black flex-1" numberOfLines={2}>
                      {trip.description}
                    </TextRegular>
                  </View>
                )}

                {/* Información adicional */}
                {stopsCount !== null && stopsCount > 0 && (
                  <View className="flex-row items-center gap-4 pt-3">
                    <MicrotextDark className="text-dark-black">
                      {stopsCount} {stopsCount === 1 ? 'parada' : 'paradas'}
                    </MicrotextDark>
                  </View>
                )}
              </>
            )}
          </View>
        </Pressable>

        {/* Menú desplegable con permisos - Anclado a la esquina superior derecha de la card */}
        {menuItems.length > 0 && (
          <DropdownMenu
            visible={menuOpen}
            onClose={() => setMenuOpen(false)}
            items={menuItems}
            useModal={false}
          />
        )}
      </View>

      {/* Alert de confirmación para eliminar viaje */}
      <CustomAlert
        visible={deleteAlertVisible}
        title="Confirmar Eliminación"
        message={`¿Estás seguro de que quieres eliminar "${trip.name}"? Esta acción no se puede deshacer.`}
        type="warning"
        actions={[
          {
            text: 'Cancelar',
            onPress: () => setDeleteAlertVisible(false),
            variant: 'outline'
          },
          {
            text: 'Eliminar Definitivamente',
            onPress: () => {
              setDeleteAlertVisible(false);
              handleDeleteTrip();
            },
            variant: 'dark'
          }
        ]}
        onClose={() => setDeleteAlertVisible(false)}
      />

      {/* Alert de confirmación para salir del viaje */}
      <CustomAlert
        visible={leaveAlertVisible}
        title="Salir del Viaje"
        message={`¿Estás seguro de que quieres salir de "${trip.name}"? Ya no tendrás acceso a este viaje.`}
        type="warning"
        actions={[
          {
            text: 'Cancelar',
            onPress: () => setLeaveAlertVisible(false),
            variant: 'outline'
          },
          {
            text: 'Salir del Viaje',
            onPress: () => {
              setLeaveAlertVisible(false);
              handleLeaveTrip();
            },
            variant: 'dark'
          }
        ]}
        onClose={() => setLeaveAlertVisible(false)}
      />
    </View>
  );
};