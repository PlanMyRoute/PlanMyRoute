# claudeDesing

Exploración del nuevo sistema visual de PlanMyRoute hecha con Claude Design (claude.ai/design). No es código de producción — son prototipos HTML/CSS/JS exportados como "handoff bundles" para que un agente de código los reproduzca en la app real.

Cada subcarpeta es una iteración/etapa de la conversación con Claude Design:

## stage1/

Primera entrega: documento de **fundaciones visuales** (`project/Direction Foundations.html`) con 3 direcciones de marca completas (paleta, tipografía, componentes base) — Golden Hour, Wayfinding y Horizon — más dos screens de ejemplo (`TripsScreen.jsx`, `TripDetailScreen.jsx`, `AIWizardScreen.jsx`) aplicando la dirección elegida (Horizon + capa semántica de Wayfinding para tipos de parada).

## stage2/

Segunda entrega: prototipo interactivo (`project/Stage 2 Prototype.html`) con las pantallas del wizard de creación de viaje, detalle de viaje y lista de viajes, usando los tokens de `ds-tokens.js` (Direction 03 — Horizon + capa semántica de Wayfinding).

**Estado:** descartada. La paleta Horizon (índigo eléctrico + rosa + naranja) recordaba demasiado a Instagram. Se vuelve a Golden Hour como base de paleta para la siguiente iteración.

## Notas

- `project/Direction Foundations.html` y `project/export/` son el documento maestro de fundaciones (palettes, tipografía, componentes base) — se repite en cada etapa porque forma parte del bundle exportado.
- `project/screenshots/` son capturas de referencia generadas por Claude Design, no assets de la app.
- `project/*.jsx` son prototipos React de las pantallas, no componentes de la app — sirven de referencia visual para reimplementar con NativeWind/RN.
