# 🕐 Sistema de Tareas Programadas - Trip Status Management

## 📋 Descripción

Este módulo implementa un sistema de tareas programadas (cron jobs) que verifica automáticamente los estados de los viajes y los actualiza según las fechas de inicio y fin configuradas.

---

## 🏗️ Arquitectura

```
src/jobs/
├── tripStatusChecker.ts      # Lógica de verificación de estados
└── tripStatusScheduler.ts    # Configuración de tareas programadas
```

### Flujo de Ejecución

```
Cada hora (minuto 0)
    ↓
tripStatusScheduler ejecuta
    ↓
runAllChecks()
    ↓
    ├─→ checkTripsToStart()
    │   ├─→ getTripsReadyToStart()
    │   ├─→ Para cada viaje:
    │   │   ├─→ getTripOwner()
    │   │   ├─→ getUserPreferences()
    │   │   └─→ Si auto: updateTripStatus()
    │   │       Si manual: crear notificación
    │   └─→ Log de resultados
    │
    └─→ checkTripsToComplete()
        └─→ (mismo flujo que arriba)
```

---

## ⚙️ Configuración

### Frecuencia de Ejecución

Por defecto, el sistema ejecuta verificaciones **cada hora en el minuto 0** (00:00, 01:00, 02:00, etc.).

Para cambiar la frecuencia, edita `tripStatusScheduler.ts`:

```typescript
// Cada hora (por defecto)
const task = cron.schedule('0 * * * *', async () => { ... });

// Cada 30 minutos
const task = cron.schedule('*/30 * * * *', async () => { ... });

// Cada 2 horas
const task = cron.schedule('0 */2 * * *', async () => { ... });

// Solo a las 9:00 y 17:00
const task = cron.schedule('0 9,17 * * *', async () => { ... });
```

### Timezone

El sistema usa **UTC** por defecto. Las conversiones de timezone se manejan a nivel de preferencias de usuario.

---

## 🚀 Uso

### Inicio Automático

El scheduler se inicia automáticamente cuando arrancas el servidor:

```bash
npm run dev
# o
npm start
```

**Salida esperada:**
```
🚀 Servidor corriendo en http://localhost:3000

🚀 [TripStatusScheduler] Inicializando sistema de tareas programadas...
✅ [TripStatusScheduler] Tarea programada: Verificación de estados (cada hora)

📋 [TripStatusScheduler] Configuración de tareas:
   • Frecuencia: Cada hora (en el minuto 0)
   • Timezone: UTC
   • Estado: Activo
   • Próxima ejecución: 2025-12-08T15:00:00.000Z

✅ [TripStatusScheduler] Sistema de tareas programadas iniciado exitosamente
```

### Ejecución Manual

Puedes ejecutar manualmente las verificaciones sin esperar al cron:

```typescript
import { triggerManualCheck } from './jobs/tripStatusScheduler';

// Ejecutar verificación manual
await triggerManualCheck();
```

### Detener el Scheduler

```typescript
import { stopScheduler } from './jobs/tripStatusScheduler';

stopScheduler();
```

### Reiniciar el Scheduler

```typescript
import { restartScheduler } from './jobs/tripStatusScheduler';

restartScheduler();
```

### Obtener Estado del Scheduler

```typescript
import { getSchedulerStatus } from './jobs/tripStatusScheduler';

const status = getSchedulerStatus();
console.log(status);
// {
//   isRunning: true,
//   tasksCount: 1,
//   nextExecution: "2025-12-08T15:00:00.000Z",
//   timezone: "UTC"
// }
```

---

## 📊 Logs y Monitoring

### Logs de Ejecución

Cada vez que se ejecuta el cron, se generan logs detallados:

```
================================================================================
🕐 [TripStatusChecker] Ejecutando verificación periódica de estados de viaje
   Hora: 2025-12-08T14:00:00.000Z
================================================================================

🔍 [TripStatusChecker] Iniciando verificación de viajes para empezar...
📋 [TripStatusChecker] Encontrados 2 viaje(s) para procesar

🚗 [TripStatusChecker] Procesando viaje: "Viaje a Barcelona" (ID: 123)
👤 [TripStatusChecker] Owner: juan_perez (abc-123-def)
⚙️  [TripStatusChecker] Preferencias: auto=true, tz=Europe/Madrid
🤖 [TripStatusChecker] Actualizando estado automáticamente...
✅ [TripStatusChecker] Estado actualizado automáticamente

📊 [TripStatusChecker] Resumen de verificación de inicio:
   • Total procesados: 2/2
   • Actualizados automáticamente: 1
   • Notificaciones enviadas: 1
   • Errores: 0
   • Duración: 245ms
✅ [TripStatusChecker] Verificación de inicio completada
```

### Métricas Importantes

Cada ejecución reporta:
- **Total procesados**: Número de viajes verificados
- **Actualizados automáticamente**: Viajes actualizados sin intervención del usuario
- **Notificaciones enviadas**: Notificaciones creadas para confirmación manual
- **Errores**: Número de errores encontrados
- **Duración**: Tiempo de ejecución en milisegundos

---

## 🧪 Testing

### Ejecutar Tests

```bash
npm test -- tripStatusScheduler.test.ts
```

### Tests Disponibles

- ✅ Verificación de importación de módulos
- ✅ Validación de funciones del scheduler
- ✅ Validación de funciones del checker
- ✅ Estado del scheduler
- 📝 Tests de integración (comentados)

---

## 🔧 Desarrollo

### Modo Desarrollo

En modo desarrollo, el sistema ejecuta una verificación inicial 5 segundos después de iniciar:

```typescript
if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
        runAllChecks();
    }, 5000);
}
```

Para activar modo desarrollo:

```bash
# En .env
NODE_ENV=development
```

### Debug

Para ver logs más detallados, puedes agregar `console.log` en:
- `tripStatusChecker.ts` - Lógica de verificación
- `tripStatusScheduler.ts` - Configuración de tareas

---

## ⚠️ Consideraciones Importantes

### 1. Ventana de Tiempo

El sistema busca viajes en una **ventana de 1 hora**:
- Si un viaje debía empezar a las 14:30 y el cron se ejecuta a las 15:00, **SÍ** lo detectará
- Si pasaron más de 1 hora, **NO** lo detectará (requiere ejecución manual)

### 2. Gracia de 24 Horas

Para la finalización de viajes:
- El sistema espera **24 horas** después del `end_date`
- Ejemplo: Si el viaje termina el 10/12/25, se verifica el 11/12/25

### 3. Preferencias de Usuario

El sistema respeta las preferencias de cada usuario:
- `auto_trip_status_update = true`: Actualización automática
- `auto_trip_status_update = false`: Envía notificación para confirmación

### 4. Manejo de Errores

Si un viaje falla al procesarse:
- Se registra el error en los logs
- Se continúa con el siguiente viaje
- No se detiene toda la ejecución

### 5. Shutdown Graceful

El sistema maneja correctamente el cierre del servidor:
- `SIGTERM` (kill)
- `SIGINT` (Ctrl+C)
- Detiene todas las tareas antes de cerrar

---

## 🐛 Troubleshooting

### El cron no se ejecuta

**Verificar:**
1. ¿El servidor está corriendo?
2. ¿Aparece el log de inicio del scheduler?
3. ¿La expresión cron es correcta?

**Solución:**
```typescript
// Verificar estado
const status = getSchedulerStatus();
console.log(status);
```

### No detecta viajes

**Verificar:**
1. ¿Los viajes tienen fechas correctas?
2. ¿Están en el estado correcto (planning/going)?
3. ¿Están dentro de la ventana de 1 hora?

**Solución:**
```typescript
// Ejecutar manualmente para ver logs
await triggerManualCheck();
```

### Errores en la ejecución

**Verificar:**
1. ¿La conexión a Supabase está activa?
2. ¿Los servicios están importados correctamente?
3. ¿Los tipos de Shared están actualizados?

**Solución:**
- Revisar logs detallados en consola
- Verificar que todos los servicios funcionan individualmente

---

## 📚 Referencias

### Expresiones Cron

```
┌────────────── minuto (0 - 59)
│ ┌──────────── hora (0 - 23)
│ │ ┌────────── día del mes (1 - 31)
│ │ │ ┌──────── mes (1 - 12)
│ │ │ │ ┌────── día de la semana (0 - 6) (0 es domingo)
│ │ │ │ │
* * * * *
```

**Ejemplos:**
- `0 * * * *` - Cada hora
- `*/15 * * * *` - Cada 15 minutos
- `0 0 * * *` - Cada día a medianoche
- `0 9-17 * * 1-5` - Lunes a viernes, 9am-5pm

### node-cron

Documentación oficial: https://github.com/node-cron/node-cron

---

## 🔜 Próximas Mejoras (Fase 4 y 5)

- [ ] Sistema de recordatorios si el usuario no responde
- [ ] Endpoints para responder a notificaciones
- [ ] UI para configurar preferencias
- [ ] Soporte multi-timezone mejorado
- [ ] Dashboard de métricas del cron
- [ ] Alertas si el cron falla múltiples veces

---

**Autor:** GitHub Copilot  
**Fecha:** 8 de diciembre de 2025  
**Fase:** 3 de 5
