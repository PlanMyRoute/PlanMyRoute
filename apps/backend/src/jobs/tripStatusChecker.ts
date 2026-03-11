// src/jobs/tripStatusChecker.ts
import * as TripService from '../api/trips/trips.service.js';
import * as UserService from '../api/users/users.service.js';
import * as NotificationService from '../api/notifications/notifications.service.js';
import { supabase } from '../supabase.js';

/**
 * Verifica y procesa viajes que deberían comenzar
 * Se ejecuta cada hora por el cron job
 */
export const checkTripsToStart = async (): Promise<void> => {
    console.log('\n🔍 [TripStatusChecker] Iniciando verificación de viajes para empezar...');
    const startTime = Date.now();

    try {
        // Buscar viajes que deberían empezar (en la última hora)
        const tripsToStart = await TripService.getTripsReadyToStart(1);

        if (tripsToStart.length === 0) {
            console.log('✅ [TripStatusChecker] No hay viajes para empezar en este momento');
            return;
        }

        console.log(`📋 [TripStatusChecker] Encontrados ${tripsToStart.length} viaje(s) para procesar`);

        let processedCount = 0;
        let autoUpdatedCount = 0;
        let notificationsSentCount = 0;
        let errorsCount = 0;

        // Procesar cada viaje
        for (const trip of tripsToStart) {
            try {
                console.log(`\n🚗 [TripStatusChecker] Procesando viaje: "${trip.name}" (ID: ${trip.id})`);

                // Obtener el propietario del viaje
                const owner = await TripService.getTripOwner(trip.id);
                console.log(`👤 [TripStatusChecker] Owner: ${owner.username} (${owner.id})`);

                // Obtener preferencias del usuario
                const preferences = await UserService.getUserPreferences(owner.id);
                console.log(`⚙️  [TripStatusChecker] Preferencias: auto=${preferences.autoTripStatusUpdate}, tz=${preferences.timezone}`);

                if (preferences.autoTripStatusUpdate) {
                    // Actualización automática
                    console.log('🤖 [TripStatusChecker] Actualizando estado automáticamente...');

                    await TripService.updateTripStatus(
                        trip.id,
                        'going',
                        'auto',
                        'Estado actualizado automáticamente según preferencias del usuario'
                    );

                    // Crear notificación informativa
                    await NotificationService.create({
                        user_receiver_id: owner.id,
                        related_trip_id: trip.id,
                        type: 'trip_update',
                        content: `Tu viaje "${trip.name}" ha comenzado automáticamente. ¡Buen viaje! 🚗`,
                        status: 'unread',
                    });

                    console.log('✅ [TripStatusChecker] Estado actualizado automáticamente');
                    autoUpdatedCount++;
                } else {
                    // Verificar si ya existe una notificación pendiente para este viaje
                    console.log(`🔍 [TripStatusChecker] Checking for existing notifications:`, {
                        user_receiver_id: owner.id,
                        related_trip_id: trip.id,
                        type: 'trip_status_check',
                        action_status: 'pending'
                    });

                    // Buscar notificaciones pendientes de inicio para este viaje
                    // Usamos .or() en lugar de .like() para buscar en múltiples patrones
                    const { data: allPending, error: checkError } = await supabase
                        .from('notifications')
                        .select('id, action_status, content, status, type')
                        .eq('user_receiver_id', owner.id)
                        .eq('related_trip_id', trip.id)
                        .eq('type', 'trip_status_check')
                        .eq('action_status', 'pending');

                    console.log(`📊 [TripStatusChecker] Query result (all pending):`, {
                        count: allPending?.length || 0,
                        error: checkError,
                        notifications: allPending
                    });

                    // Filtrar en JS las que contienen palabras de inicio
                    const existingNotification = allPending?.find(n =>
                        n.content?.toLowerCase().includes('empezar') ||
                        n.content?.toLowerCase().includes('comenzar') ||
                        n.content?.toLowerCase().includes('partir')
                    );

                    if (existingNotification) {
                        console.log('ℹ️  [TripStatusChecker] Ya existe una notificación pendiente, no se envía duplicado');
                    } else {
                        // Enviar notificación para confirmar
                        console.log('📬 [TripStatusChecker] Enviando notificación de confirmación...');

                        await NotificationService.create({
                            user_receiver_id: owner.id,
                            related_trip_id: trip.id,
                            type: 'trip_status_check',
                            content: `¡Es hora de partir! Tu viaje "${trip.name}" está programado para comenzar ahora. ¿Ya empezaste el viaje?`,
                            status: 'unread',
                            action_status: 'pending',
                        });

                        console.log('✅ [TripStatusChecker] Notificación enviada');
                        notificationsSentCount++;
                    }
                }

                processedCount++;
            } catch (error) {
                console.error(`❌ [TripStatusChecker] Error procesando viaje ${trip.id}:`, error);
                errorsCount++;
            }
        }

        const duration = Date.now() - startTime;
        console.log('\n📊 [TripStatusChecker] Resumen de verificación de inicio:');
        console.log(`   • Total procesados: ${processedCount}/${tripsToStart.length}`);
        console.log(`   • Actualizados automáticamente: ${autoUpdatedCount}`);
        console.log(`   • Notificaciones enviadas: ${notificationsSentCount}`);
        console.log(`   • Errores: ${errorsCount}`);
        console.log(`   • Duración: ${duration}ms`);
        console.log('✅ [TripStatusChecker] Verificación de inicio completada\n');

    } catch (error) {
        console.error('❌ [TripStatusChecker] Error fatal en verificación de inicio:', error);
        throw error;
    }
};

/**
 * Verifica y procesa viajes que deberían terminar
 * Se ejecuta cada hora por el cron job
 */
export const checkTripsToComplete = async (): Promise<void> => {
    console.log('\n🔍 [TripStatusChecker] Iniciando verificación de viajes para completar...');
    const startTime = Date.now();

    try {
        // Buscar viajes que deberían terminar (24h después del end_date, en la última hora)
        const tripsToComplete = await TripService.getTripsReadyToComplete(1, 24);

        if (tripsToComplete.length === 0) {
            console.log('✅ [TripStatusChecker] No hay viajes para completar en este momento');
            return;
        }

        console.log(`📋 [TripStatusChecker] Encontrados ${tripsToComplete.length} viaje(s) para procesar`);

        let processedCount = 0;
        let autoUpdatedCount = 0;
        let notificationsSentCount = 0;
        let errorsCount = 0;

        // Procesar cada viaje
        for (const trip of tripsToComplete) {
            try {
                console.log(`\n🏠 [TripStatusChecker] Procesando viaje: "${trip.name}" (ID: ${trip.id})`);

                // Obtener el propietario del viaje
                const owner = await TripService.getTripOwner(trip.id);
                console.log(`👤 [TripStatusChecker] Owner: ${owner.username} (${owner.id})`);

                // Obtener preferencias del usuario
                const preferences = await UserService.getUserPreferences(owner.id);
                console.log(`⚙️  [TripStatusChecker] Preferencias: auto=${preferences.autoTripStatusUpdate}, tz=${preferences.timezone}`);

                if (preferences.autoTripStatusUpdate) {
                    // Actualización automática
                    console.log('🤖 [TripStatusChecker] Actualizando estado automáticamente...');

                    await TripService.updateTripStatus(
                        trip.id,
                        'completed',
                        'auto',
                        'Estado actualizado automáticamente según preferencias del usuario'
                    );

                    // Crear notificación informativa
                    await NotificationService.create({
                        user_receiver_id: owner.id,
                        related_trip_id: trip.id,
                        type: 'trip_update',
                        content: `Tu viaje "${trip.name}" ha sido marcado como completado. ¡Esperamos que hayas disfrutado! 🎉`,
                        status: 'unread',
                    });

                    console.log('✅ [TripStatusChecker] Estado actualizado automáticamente');
                    autoUpdatedCount++;
                } else {
                    // Verificar si ya existe una notificación pendiente para este viaje
                    console.log(`🔍 [TripStatusChecker] Checking for existing completion notifications:`, {
                        user_receiver_id: owner.id,
                        related_trip_id: trip.id,
                        type: 'trip_status_check',
                        action_status: 'pending'
                    });

                    // Buscar notificaciones pendientes de finalización para este viaje
                    const { data: allPending, error: checkError } = await supabase
                        .from('notifications')
                        .select('id, action_status, content, status, type')
                        .eq('user_receiver_id', owner.id)
                        .eq('related_trip_id', trip.id)
                        .eq('type', 'trip_status_check')
                        .eq('action_status', 'pending');

                    console.log(`📊 [TripStatusChecker] Query result (all pending):`, {
                        count: allPending?.length || 0,
                        error: checkError,
                        notifications: allPending
                    });

                    // Filtrar en JS las que contienen palabras de finalización
                    const existingNotification = allPending?.find(n =>
                        n.content?.toLowerCase().includes('terminado') ||
                        n.content?.toLowerCase().includes('completar') ||
                        n.content?.toLowerCase().includes('terminaste')
                    );

                    if (existingNotification) {
                        console.log('ℹ️  [TripStatusChecker] Ya existe una notificación pendiente, no se envía duplicado');
                    } else {
                        // Enviar notificación para confirmar
                        console.log('📬 [TripStatusChecker] Enviando notificación de confirmación...');

                        await NotificationService.create({
                            user_receiver_id: owner.id,
                            related_trip_id: trip.id,
                            type: 'trip_status_check',
                            content: `¡Ya llegaste! Han pasado 24 horas desde el fin programado de tu viaje "${trip.name}". ¿Ya terminaste el viaje?`,
                            status: 'unread',
                            action_status: 'pending',
                        });

                        console.log('✅ [TripStatusChecker] Notificación enviada');
                        notificationsSentCount++;
                    }
                }

                processedCount++;
            } catch (error) {
                console.error(`❌ [TripStatusChecker] Error procesando viaje ${trip.id}:`, error);
                errorsCount++;
            }
        }

        const duration = Date.now() - startTime;
        console.log('\n📊 [TripStatusChecker] Resumen de verificación de finalización:');
        console.log(`   • Total procesados: ${processedCount}/${tripsToComplete.length}`);
        console.log(`   • Actualizados automáticamente: ${autoUpdatedCount}`);
        console.log(`   • Notificaciones enviadas: ${notificationsSentCount}`);
        console.log(`   • Errores: ${errorsCount}`);
        console.log(`   • Duración: ${duration}ms`);
        console.log('✅ [TripStatusChecker] Verificación de finalización completada\n');

    } catch (error) {
        console.error('❌ [TripStatusChecker] Error fatal en verificación de finalización:', error);
        throw error;
    }
};

/**
 * Verifica notificaciones pendientes sin respuesta y envía recordatorios
 * Se ejecuta cada hora por el cron job
 * Envía máximo 2 recordatorios por notificación antes de actualizar automáticamente
 */
export const checkPendingNotifications = async (): Promise<void> => {
    console.log('\n🔍 [TripStatusChecker] Iniciando verificación de recordatorios...');
    const startTime = Date.now();

    try {
        // Buscar notificaciones de tipo trip_status_check que:
        // 1. Estén pendientes (action_status = 'pending')
        // 2. Tengan más de 24 horas de antigüedad
        // 3. Tengan menos de 2 recordatorios enviados
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const { data: pendingNotifications, error } = await supabase
            .from('notifications')
            .select('*, trip:related_trip_id(*)')
            .eq('type', 'trip_status_check')
            .eq('action_status', 'pending')
            .lt('created_at', twentyFourHoursAgo.toISOString())
            .lt('reminder_count', 2)
            .order('created_at', { ascending: true });

        if (error) {
            throw new Error(`Error al obtener notificaciones pendientes: ${error.message}`);
        }

        if (!pendingNotifications || pendingNotifications.length === 0) {
            console.log('✅ [TripStatusChecker] No hay notificaciones pendientes para recordar');
            return;
        }

        console.log(`📋 [TripStatusChecker] Encontradas ${pendingNotifications.length} notificación(es) pendientes`);

        let remindersSentCount = 0;
        let autoUpdatedCount = 0;
        let errorsCount = 0;

        // Procesar cada notificación
        for (const notification of pendingNotifications) {
            try {
                const trip = Array.isArray(notification.trip) ? notification.trip[0] : notification.trip;

                if (!trip) {
                    console.warn(`⚠️ [TripStatusChecker] Viaje no encontrado para notificación ${notification.id}`);
                    continue;
                }

                console.log(`\n📬 [TripStatusChecker] Procesando notificación ${notification.id} (viaje: "${trip.name}")`);
                console.log(`   Recordatorios previos: ${notification.reminder_count}/2`);

                const currentReminderCount = notification.reminder_count || 0;

                if (currentReminderCount < 2) {
                    // Enviar recordatorio
                    const reminderNumber = currentReminderCount + 1;
                    console.log(`📨 [TripStatusChecker] Enviando recordatorio ${reminderNumber}/2...`);

                    // Determinar el tipo de recordatorio según el contenido
                    const isStartNotification = notification.content?.includes('comenzar') ||
                        notification.content?.includes('empezar') ||
                        notification.content?.includes('partir');

                    const reminderContent = isStartNotification
                        ? `🔔 Recordatorio ${reminderNumber}/2: ¿Ya empezó tu viaje "${trip.name}"? Por favor confirma el estado.`
                        : `🔔 Recordatorio ${reminderNumber}/2: ¿Ya terminó tu viaje "${trip.name}"? Por favor confirma el estado.`;

                    // Crear nuevo recordatorio
                    await NotificationService.create({
                        user_receiver_id: notification.user_receiver_id,
                        related_trip_id: trip.id,
                        type: 'trip_status_check',
                        content: reminderContent,
                        status: 'unread',
                        action_status: 'pending',
                    });

                    // Actualizar contador de recordatorios en la notificación original
                    const { error: updateError } = await supabase
                        .from('notifications')
                        .update({ reminder_count: reminderNumber })
                        .eq('id', notification.id);

                    if (updateError) {
                        console.error(`❌ Error actualizando contador:`, updateError);
                    } else {
                        console.log(`✅ [TripStatusChecker] Recordatorio ${reminderNumber} enviado`);
                        remindersSentCount++;
                    }
                } else {
                    // Ya se enviaron 2 recordatorios, actualizar automáticamente
                    console.log(`🤖 [TripStatusChecker] Límite de recordatorios alcanzado. Actualizando automáticamente...`);

                    const isStartNotification = notification.content?.includes('comenzar') ||
                        notification.content?.includes('empezar') ||
                        notification.content?.includes('partir');

                    const newStatus = isStartNotification ? 'going' : 'completed';

                    await TripService.updateTripStatus(
                        trip.id,
                        newStatus,
                        'auto',
                        'Estado actualizado automáticamente después de 2 recordatorios sin respuesta',
                        notification.user_receiver_id
                    );

                    // Marcar notificación como procesada
                    await supabase
                        .from('notifications')
                        .update({
                            status: 'read',
                            action_status: 'accepted',
                        })
                        .eq('id', notification.id);

                    // Enviar notificación informativa
                    await NotificationService.create({
                        user_receiver_id: notification.user_receiver_id,
                        related_trip_id: trip.id,
                        type: 'trip_update',
                        content: `Tu viaje "${trip.name}" ha sido actualizado automáticamente a "${newStatus}" después de no recibir respuesta. 🤖`,
                        status: 'unread',
                    });

                    console.log(`✅ [TripStatusChecker] Viaje actualizado automáticamente a "${newStatus}"`);
                    autoUpdatedCount++;
                }

            } catch (error) {
                console.error(`❌ [TripStatusChecker] Error procesando notificación ${notification.id}:`, error);
                errorsCount++;
            }
        }

        const duration = Date.now() - startTime;
        console.log('\n📊 [TripStatusChecker] Resumen de verificación de recordatorios:');
        console.log(`   • Total procesadas: ${pendingNotifications.length}`);
        console.log(`   • Recordatorios enviados: ${remindersSentCount}`);
        console.log(`   • Actualizaciones automáticas: ${autoUpdatedCount}`);
        console.log(`   • Errores: ${errorsCount}`);
        console.log(`   • Duración: ${duration}ms`);
        console.log('✅ [TripStatusChecker] Verificación de recordatorios completada\n');

    } catch (error) {
        console.error('❌ [TripStatusChecker] Error fatal en verificación de recordatorios:', error);
        throw error;
    }
};

/**
 * Ejecuta todas las verificaciones (inicio, fin y recordatorios)
 * Función principal llamada por el cron job
 */
export const runAllChecks = async (): Promise<void> => {
    console.log('\n' + '='.repeat(80));
    console.log('🕐 [TripStatusChecker] Ejecutando verificación periódica de estados de viaje');
    console.log('   Hora: ' + new Date().toISOString());
    console.log('='.repeat(80));

    try {
        // Ejecutar todas las verificaciones
        await checkTripsToStart();
        await checkTripsToComplete();
        await checkPendingNotifications();

        console.log('='.repeat(80));
        console.log('✅ [TripStatusChecker] Todas las verificaciones completadas exitosamente');
        console.log('='.repeat(80) + '\n');
    } catch (error) {
        console.error('❌ [TripStatusChecker] Error en las verificaciones:', error);
        console.log('='.repeat(80) + '\n');
        // No lanzamos el error para que el cron continúe en la siguiente ejecución
    }
};
