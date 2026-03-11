// src/jobs/tripStatusScheduler.ts
import cron from 'node-cron';
import { runAllChecks } from './tripStatusChecker.js';

//Varible que indica cada cuanto se ejecuta la tarea
const TASK_INTERVAL = '*/30 * * * *'; // Cada 30 minutos

// Variable para almacenar las tareas programadas
let scheduledTasks: cron.ScheduledTask[] = [];

/**
 * Inicializa y programa las tareas de verificación de estados de viaje
 */
export const initScheduler = (): void => {
    console.log('\n🚀 [TripStatusScheduler] Inicializando sistema de tareas programadas...');

    // ============================================================================
    // TAREA 1: Verificación de estados de viaje (cada 30 minutos)
    // ============================================================================

    // Expresión cron: "*/30 * * * *" = Cada 30 minutos
    const tripStatusCheckTask = cron.schedule(
        TASK_INTERVAL,
        async () => {
            try {
                await runAllChecks();
            } catch (error) {
                console.error('❌ [TripStatusScheduler] Error en tarea programada:', error);
            }
        },
        {
            timezone: 'UTC' // Usar UTC para consistencia, las conversiones se hacen en el código
        }
    );

    scheduledTasks.push(tripStatusCheckTask);
    console.log('✅ [TripStatusScheduler] Tarea programada: Verificación de estados (cada 5 minutos)');

    // ============================================================================
    // VERIFICACIÓN INICIAL AL ARRANCAR EL SERVIDOR
    // ============================================================================
    console.log('🔍 [TripStatusScheduler] Ejecutando verificación inicial al arrancar...');

    // Ejecutar verificación inmediatamente en segundo plano
    setTimeout(async () => {
        try {
            await runAllChecks();
            console.log('✅ [TripStatusScheduler] Verificación inicial completada');
        } catch (error) {
            console.error('❌ [TripStatusScheduler] Error en verificación inicial:', error);
        }
    }, 3000); // Esperar 3 segundos para que el servidor termine de inicializar

    // ============================================================================
    // INFORMACIÓN DE CONFIGURACIÓN
    // ============================================================================

    console.log('\n📋 [TripStatusScheduler] Configuración de tareas:');
    console.log('   • Frecuencia: Cada hora (en el minuto 0)');
    console.log('   • Timezone: UTC');
    console.log('   • Estado: Activo');
    console.log('   • Próxima ejecución: ' + getNextExecutionTime());

    console.log('\n✅ [TripStatusScheduler] Sistema de tareas programadas iniciado exitosamente\n');

    // Opcional: Ejecutar una verificación inmediata al iniciar (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
        console.log('🔧 [TripStatusScheduler] Modo desarrollo: Ejecutando verificación inicial...\n');
        setTimeout(() => {
            runAllChecks().catch(error => {
                console.error('❌ [TripStatusScheduler] Error en verificación inicial:', error);
            });
        }, 5000); // Esperar 5 segundos después del inicio
    }
};

/**
 * Detiene todas las tareas programadas
 */
export const stopScheduler = (): void => {
    console.log('\n🛑 [TripStatusScheduler] Deteniendo tareas programadas...');

    scheduledTasks.forEach(task => {
        task.stop();
    });

    scheduledTasks = [];
    console.log('✅ [TripStatusScheduler] Todas las tareas detenidas\n');
};

/**
 * Reinicia el scheduler (detiene y vuelve a iniciar)
 */
export const restartScheduler = (): void => {
    console.log('\n🔄 [TripStatusScheduler] Reiniciando scheduler...');
    stopScheduler();
    initScheduler();
};

/**
 * Obtiene información sobre el estado del scheduler
 */
export const getSchedulerStatus = () => {
    return {
        isRunning: scheduledTasks.length > 0,
        tasksCount: scheduledTasks.length,
        nextExecution: getNextExecutionTime(),
        timezone: 'UTC',
    };
};

/**
 * Calcula la próxima hora de ejecución
 */
function getNextExecutionTime(): string {
    const now = new Date();
    const next = new Date(now);

    // Próxima hora en punto
    next.setHours(next.getHours() + 1);
    next.setMinutes(0);
    next.setSeconds(0);
    next.setMilliseconds(0);

    return next.toISOString();
}

/**
 * Ejecuta manualmente una verificación (útil para testing o triggers manuales)
 */
export const triggerManualCheck = async (): Promise<void> => {
    console.log('\n🔧 [TripStatusScheduler] Ejecutando verificación manual...\n');
    await runAllChecks();
};

// ============================================================================
// INFORMACIÓN SOBRE EXPRESIONES CRON
// ============================================================================
/**
 * Formato de expresión cron:
 * ┌────────────── minuto (0 - 59)
 * │ ┌──────────── hora (0 - 23)
 * │ │ ┌────────── día del mes (1 - 31)
 * │ │ │ ┌──────── mes (1 - 12)
 * │ │ │ │ ┌────── día de la semana (0 - 6) (0 es domingo)
 * │ │ │ │ │
 * │ │ │ │ │
 * (asterisk) (asterisk) (asterisk) (asterisk) (asterisk)
 * 
 * Ejemplos útiles:
 * "0 (asterisk) (asterisk) (asterisk) (asterisk)" - Cada hora en el minuto 0
 * "(asterisk)/30 (asterisk) (asterisk) (asterisk) (asterisk)" - Cada 30 minutos
 * "0 (asterisk)/2 (asterisk) (asterisk) (asterisk)" - Cada 2 horas
 * "0 0 (asterisk) (asterisk) (asterisk)" - Cada día a medianoche
 * "0 9,17 (asterisk) (asterisk) (asterisk)" - Todos los días a las 9:00 y 17:00
 * "0 0 (asterisk) (asterisk) 0" - Cada domingo a medianoche
 * 
 * Más información: https://github.com/node-cron/node-cron
 */
