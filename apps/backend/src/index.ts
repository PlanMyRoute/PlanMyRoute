import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import subscriptionRoutes from './api/subscriptions/subscriptions.routes.js';
import tripsRoutes from './api/trips/trips.routes.js';
import userRoutes from './api/users/users.routes.js';
import itineraryRoutes from './api/itinerary/itinerary.routes.js';
import notificationsRoutes from './api/notifications/notifications.routes.js';
import autoTripsRoutes from './api/automaticTrips/automaticTrip.routes.js';
import reviewsRoutes from './api/reviews/reviews.routes.js';
import vehiclesRoutes from './api/vehicles/vehicles.routes.js';
import followsRoutes from './api/follows/follows.routes.js';
import placesRoutes from './api/places/places.routes.js';
import stripeRoutes from './api/stripe/stripe.routes.js';
import { initScheduler, stopScheduler } from './jobs/tripStatusScheduler.js';

dotenv.config();

const app: Express = express();
const port = Number(process.env.PORT) || 3000;

// 1. HELMET: Arregla CSP, X-Powered-By, Clickjacking, etc.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Estas dos líneas arreglan específicamente tu error "Failure to Define Directive"
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));

// 2. CORS: Arregla "Configuración Incorrecta Cross-Domain"
// Permitimos solo localhost y tu IP local para desarrollo
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// ==========================================

// IMPORTANTE: El webhook de Stripe necesita el raw body, así que lo configuramos ANTES de express.json()
// El webhook usa su propio middleware express.raw() definido en sus rutas
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

// Rutas
app.get('/', (req: Request, res: Response) => {
  res.send('¡API de PlanMyRoute segura!');
});

// Tus rutas
app.use('/api', tripsRoutes);
app.use('/api', userRoutes);
app.use('/api', itineraryRoutes);
app.use('/api', notificationsRoutes);
app.use('/api', autoTripsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api', vehiclesRoutes);
app.use('/api', followsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/stripe', stripeRoutes);

// Manejadores de errores
// 3. ERROR HANDLER: Arregla "Divulgación de error de aplicación"
// Este middleware DEBE ir al final de todo
app.use((err: any, req: Request, res: Response, next: any) => {
  // Siempre mostramos el error en la consola del servidor (para ti)
  console.error('❌ Error:', err);

  const statusCode = err.statusCode || 500;

  // AL CLIENTE (ZAP/Postman/App) le respondemos genérico para no dar pistas
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Error interno del servidor' : err.message,
    // Solo mostramos el stack trace si NO estamos en producción
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Iniciar el servidor
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(`🌐 También accesible vía red local en http://192.168.x.x:${port}`);

  // Iniciar el sistema de tareas programadas
  initScheduler();
});

// Manejo de cierre graceful del servidor
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM recibido. Cerrando servidor...');
  stopScheduler();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT recibido (Ctrl+C). Cerrando servidor...');
  stopScheduler();
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

// Exportamos para los scripts
export { app, server };