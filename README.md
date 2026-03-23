<div align="center">
  <h1>🗺️ PlanMyRoute</h1>
  <p><strong>La app todo-en-uno para planificar, gestionar y compartir road trips</strong></p>
  <p>
    <a href="https://planmyroute.es">planmyroute.es</a> ·
    iOS · Android · Web
  </p>
</div>

---

## ¿Qué es PlanMyRoute?

PlanMyRoute es una aplicación multiplataforma (iOS, Android y Web) pensada para viajeros que hacen road trips. Combina cuatro grandes bloques en un solo producto:

- **Planificación de itinerarios** — Crea viajes paso a paso añadiendo paradas de actividad, alojamiento y repostaje, con fechas, horarios, presupuesto y archivos adjuntos.
- **IA generativa** — Delega la planificación a Google Gemini: genera un itinerario completo y personalizado (nombre, descripción, paradas, alojamientos, actividades y repostajes) a partir del origen, destino, viajeros, vehículo, presupuesto e intereses.
- **Colaboración en tiempo real** — Invita a otros viajeros con roles (owner / editor / viewer) y gestionad el viaje juntos.
- **Red social** — Sigue a otros viajeros, comparte reseñas con valoración, descubre rutas en el feed y consulta perfiles públicos.

---

## Stack tecnológico

### Frontend
| Tecnología | Uso |
|---|---|
| React Native + Expo SDK 54 | App multiplataforma (iOS, Android, Web) |
| Expo Router | Navegación file-based |
| NativeWind (TailwindCSS) | Estilos utility-first |
| React Query | Gestión de estado del servidor y caché |
| Supabase JS Client | Autenticación, storage y real-time |
| React Native Reanimated | Animaciones fluidas |
| Google Maps + OSRM | Mapas y cálculo de rutas por carretera |
| GSAP | Animaciones scroll-triggered en la landing web |
| Expo Notifications | Push notifications nativas |

### Backend
| Tecnología | Uso |
|---|---|
| Node.js + Express 5 + TypeScript | API REST |
| Supabase (PostgreSQL) | Base de datos, auth y storage |
| Stripe | Pagos y suscripciones |
| Google Gemini (gemini-2.5-flash) | Generación de itinerarios por IA |
| Google Places API | Autocomplete, fotos y precios de lugares |
| node-cron | Scheduler para automatización de estados de viaje |
| Expo Push Notifications API | Envío de push notifications |
| Helmet + CORS | Seguridad HTTP |

### Infraestructura y monorepo
| Componente | Detalle |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Paquete de tipos compartidos | `@planmyroute/types` (workspace package) |
| CI / Análisis estático | SonarQube |
| Testing | Jest + ts-jest + Supertest |
| Builds de app stores | Expo EAS |

---

## Estructura del repositorio

```
planmyroute/
├── apps/
│   ├── frontend/        # App React Native + Expo
│   └── backend/         # API REST Node.js + Express
└── packages/
    ├── types/           # Tipos TypeScript compartidos (@planmyroute/types)
    ├── eslint-config/   # Configuración ESLint compartida
    └── typescript-config/ # tsconfig base compartida
```

---

## Funcionalidades principales

### 🗺️ Planificación de viajes
- Wizard multi-paso: origen/destino, fechas, viajeros, vehículos, intereses y colaboradores
- Paradas especializadas: **actividad**, **alojamiento** y **repostaje**
- Mapa interactivo con ruta calculada por OSRM
- Geocodificación automática y fotos de paradas vía Google Places / Foursquare

### 🤖 Generación automática con IA
- Genera el itinerario completo con un solo clic
- Personalizado por perfil de viajeros (niños, bebés, mascotas…), presupuesto y estilo de viaje
- Basado en Google Gemini 2.5 Flash
- Usuarios free: 1 viaje IA/mes · Premium: ilimitado

### 👥 Colaboración
- Roles RBAC: owner / editor / viewer
- Invitaciones por notificación (aceptar / rechazar)
- Gestión de viajeros y vehículos del grupo

### 💰 Seguimiento de gastos
- Resumen por categoría: combustible, alojamiento y actividades
- Costes por usuario y por viaje

### 🔄 Ciclo de vida automatizado
- Cron cada 30 min que detecta cambios de estado (`planning → going → completed`)
- El usuario puede activar la actualización automática o confirmarla manualmente
- Historial completo de cambios de estado

### 📸 Galería y adjuntos
- Upload de fotos del viaje a Supabase Storage
- Visor a pantalla completa con pinch-to-zoom
- Archivos adjuntos por parada (reservas, documentos…)

### 🔔 Notificaciones
- Push notifications nativas (Expo)
- Centro de notificaciones con agrupación temporal y filtros
- Swipe para eliminar

### 👤 Red social
- Perfiles con foto, intereses y badge Premium verificado
- Sistema de follows y feed de reviews
- Búsqueda de usuarios por username

---

## Modelo de negocio

PlanMyRoute sigue un modelo **freemium**:

| Característica | Free | Premium |
|---|---|---|
| Viajes manuales | ✅ Ilimitados | ✅ Ilimitados |
| Viajes generados con IA | 1/mes | ✅ Ilimitados |
| Red social, reviews y fotos | ✅ | ✅ |
| Colaboración en viajes | ✅ | ✅ |
| Perfil verificado (badge) | ❌ | ✅ |
| Garaje infinito de vehículos | ❌ | ✅ |

**Precios:**
- Mensual: **€4,99/mes**
- Anual: **€49,99/año** (~€4,17/mes · 17% descuento)
- Trial gratuito de **14 días** sin tarjeta

**Canales de adquisición Premium:**
- Pago directo con Stripe (web y móvil)
- Sistema de **referidos win-win** (14 o 30 días gratis según plan)
- **Códigos promocionales** con expiración, límite de usos y tracking

---

## Primeros pasos

### Requisitos
- Node.js ≥ 18
- pnpm ≥ 9
- Cuenta Supabase con las tablas creadas
- Cuenta Stripe (para pagos)
- API keys de Google (Places, Maps, Gemini)

### Instalación

```bash
# Clona el repositorio
git clone https://github.com/tu-org/planmyroute.git
cd planmyroute

# Instala todas las dependencias del monorepo
pnpm install
```

### Variables de entorno

Copia los ficheros de ejemplo y rellena tus credenciales:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

### Desarrollo

```bash
# Arrancar frontend y backend en paralelo
pnpm dev

# Solo frontend
pnpm -C apps/frontend run dev

# Solo backend
pnpm -C apps/backend run dev
```

### Tests

```bash
# Todos los tests
pnpm test

# Solo backend
pnpm -C apps/backend test

# Solo frontend
pnpm -C apps/frontend test
```

---

## Contribuir

1. Crea una rama: `git checkout -b feature/nombre-de-la-feature`
2. Haz tus cambios y añade tests si aplica
3. Abre un Pull Request describiendo qué cambia y por qué

---

## Licencia

Propietaria — © 2026 PlanMyTeam. Todos los derechos reservados.
