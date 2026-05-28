# Guía de Diseño — PlanMyRoute

Documento de referencia para todo el equipo (desarrollo y diseño). Define decisiones de diseño, tokens del sistema, guía de componentes y patrones de pantalla. Si hay conflicto entre este documento y el Figma, este documento es la fuente de verdad para la implementación. Para aplicar los estilos de la web siempre hay que usar Tailwind, en este caso NativeWdind ya que estamos en React Native.

---

## Índice

1. [Principios](#1-principios)
2. [Tokens de diseño](#2-tokens-de-diseño)
3. [Componentes](#3-componentes)
4. [Patrones de pantalla](#4-patrones-de-pantalla)
5. [Estados de carga](#5-estados-de-carga)
6. [Personalidad visual](#6-personalidad-visual)
7. [Iconografía](#7-iconografía)
8. [Backlog de inconsistencias](#8-backlog-de-inconsistencias)

---

## 1. Principios

**Funcionalidad primero, personalidad siempre.**

PlanMyRoute es una app de viajes por carretera para un público joven. La base minimalista es correcta, pero debe tener carácter propio: uso audaz del amarillo de marca, tipografía expresiva, estados vacíos con voz propia. La regla es: nunca sacrificar claridad por estética, pero tampoco conformarse con lo genérico.

| Principio | Qué significa en la práctica |
|---|---|
| **Claridad ante todo** | Jerarquía tipográfica clara, acciones primarias evidentes, cero ambigüedad |
| **Amarillo como energía** | No solo botones — también fondos hero, highlights, ilustraciones de estado vacío |
| **Tipografía expresiva** | Urbanist aguanta 32px con carácter — usar tamaños grandes para momentos de impacto |
| **Movimiento con propósito** | Micro-animaciones solo cuando refuerzan una acción o narrativa, nunca decorativas |
| **Mobile-first siempre** | Elementos táctiles mínimo 44×44px, padding generoso, scroll natural |

---

## 2. Tokens de diseño

### 2.1 Colores

La paleta es de **4 colores**. Fuera de ella solo se permite `red-500` de Tailwind para acciones destructivas.

| Token NativeWind | Hex | Uso |
|---|---|---|
| `bg-primary` / `text-primary` | `#FFD54D` | Acciones primarias, estados activos, highlights, fondos de sección hero |
| `bg-dark` / `text-dark` | `#202020` | Texto principal, fondos oscuros, botones dark |
| `text-neutral` / `border-neutral` | `#999999` | Texto secundario, bordes inactivos, placeholders |
| `bg-white` / `text-white` | `#FFFFFF` | Fondo de pantalla, tarjetas, texto sobre fondos oscuros |

**Colores derivados aceptados** (usando opacidad de Tailwind):
- `bg-primary/20` — fondo suave de alerta informativa o banner
- `border-primary` — borde de elemento con énfasis de marca
- `bg-dark/60` — overlay semitransparente sobre imágenes
- `border-neutral/20` — separador sutil entre elementos

**Colores PROHIBIDOS** (no pertenecen a la paleta del sistema):
- `#FEF3C7`, `#F59E0B`, `#92400E` — amber/naranja. Actualmente en el banner de perfil. **A eliminar.**
- `#10B981` — verde éxito genérico. Reemplazar por `dark` + check.
- `#3B82F6` — azul info genérico. Reemplazar por `primary`.
- `#2f95dc` — el azul legado de `Colors.ts`. No usar.

### 2.2 Tipografía

**Siempre usar los componentes de `CustomText.tsx`.** Nunca `<Text>` nativo con `fontSize` o `fontFamily` manuales.

```typescript
import { Title1, Title2Semibold, TextRegular, MicrotextDark } from '@/components/customElements/CustomText';
```

| Componente | Tamaño / Peso | Cuándo usarlo |
|---|---|---|
| `Title1` | 32px SemiBold | Saludo principal de pantalla, títulos hero de sección |
| `Title2Semibold` | 24px SemiBold | Encabezado de sección con énfasis, nombres de viaje |
| `Title2` | 24px Regular | Encabezado de sección secundario |
| `Title3Semibold` | 20px SemiBold | Subtítulo de tarjeta, título de modal — **usar este** |
| `Title3` | 20px Regular | Subtítulo secundario de tarjeta |
| `SubtitleSemibold` | 18px SemiBold | Etiqueta destacada, nombre de campo de formulario |
| `SubtitleMedium` | 18px Medium | Texto de cuerpo para bloques largos |
| `Subtitle` | 18px Regular | Subtítulo normal |
| `TextRegular` | 15px Medium | Texto de cuerpo estándar |
| `TextBold` | 15px SemiBold | Dato destacado dentro de cuerpo de texto |
| `MicrotextDark` | 12px Regular | Labels, timestamps, contadores sobre fondo claro |
| `MicrotextLight` | 12px Regular | Labels sobre fondo oscuro o amarillo |

> **Nota sobre `Title3Bold`**: es sinónimo exacto de `Title3Semibold` (la fuente Bold no existe en los assets). En código nuevo usar siempre `Title3Semibold`; `Title3Bold` se mantiene por compatibilidad.

**Combinar pesos para impacto visual:**
```tsx
<View className="flex-row flex-wrap">
  <Title2Semibold>3 días</Title2Semibold>
  <Title2> por la costa</Title2>
</View>
```

### 2.3 Espaciado

| Uso | Clase | Valor |
|---|---|---|
| Padding horizontal de pantalla | `px-6` | 24px — estándar en todas las pantallas |
| Separación entre secciones | `mb-8` | 32px |
| Padding interno de tarjeta | `p-4` | 16px |
| Gap entre elementos inline | `gap-2` | 8px |
| Separación entre elementos de lista | `mb-4` | 16px |
| Tamaño mínimo elemento táctil | `w-11 h-11` | 44×44px |

### 2.4 Border radius

| Uso | Clase | Valor aprox. |
|---|---|---|
| Tarjetas principales | `rounded-3xl` | 24px (≈ 25px del Figma) |
| Inputs / etiquetas anchas / alertas inline | `rounded-2xl` | 16px |
| Botones rectangulares | `rounded-full` | pill |
| Badges / etiquetas horizontales pequeñas | `rounded-full` | pill |
| Bottom sheets / modales que suben desde abajo | `rounded-t-3xl` | 24px solo arriba |

### 2.5 Sombras

Diseño plano. Sin sombras. La separación visual se logra mediante bordes y fondos:

```tsx
// Separación sutil entre elementos
<View className="border border-neutral/20" />

// Fondo alternativo para diferencia de nivel
<View className="bg-neutral/5 rounded-2xl p-4" />
```

---

## 3. Componentes

### 3.1 CustomButton

```typescript
import { CustomButton } from '@/components/customElements/CustomButton';
```

#### Cuándo usar cada variante

| Variante | Cuándo usarla | Ejemplo de label |
|---|---|---|
| `primary` | Acción principal de pantalla — solo una por vista | "Crear viaje", "Guardar cambios" |
| `dark` | Acción secundaria importante, CTAs de autenticación | "Continuar", "Iniciar sesión" |
| `outline` | Alternativa o cancelación | "Volver", "Editar", "Cancelar" |
| `danger` | Acciones destructivas irreversibles | "Eliminar viaje", "Borrar parada" |
| `round` | FAB o acción compacta flotante | Añadir parada, adjuntar foto |
| `round-outline` | Contador interactivo o badge presionable | Número de parada |

#### Regla de jerarquía por pantalla
- Máximo **un botón `primary`** por pantalla.
- Si hay dos acciones, usar `primary` + `outline` o `primary` + `dark`.
- `danger` solo aparece dentro de `CustomAlert`, no como CTA principal de pantalla.

#### Bug conocido (a corregir)
`CustomButton` usa `MicrotextDark/Light` (12px) para todos los tamaños. Los tamaños `medium` y `large` deberían usar `TextRegular` (15px). Pendiente de corrección en `CustomButton.tsx:83-93`.

### 3.2 CustomInput

```typescript
import { CustomInput } from '@/components/customElements/CustomInput';
```

- **Siempre `CustomInput`** para campos de formulario. Nunca `TextInput` nativo.
- El borde amarillo en focus está implementado y es la interacción de marca — mantener.
- Los inputs usan `rounded-2xl` — no `rounded-full`.

### 3.3 CustomAlert

```typescript
import CustomAlert from '@/components/customElements/CustomAlert';
```

**Regla absoluta: nunca `Alert.alert` ni `window.confirm`.** Siempre `CustomAlert`.

Los flujos que todavía usan alertas nativas (borrar viaje, abandonar viaje) deben migrarse progresivamente.

#### Cuándo usar cada tipo

| Tipo | Cuándo | Botones |
|---|---|---|
| `error` | Fallo de red, error de validación crítico | Un botón "Cerrar" (dark) |
| `warning` | Acción destructiva — borrar, abandonar | "Cancelar" (outline) + "Confirmar" (danger) |
| `success` | Confirmación que requiere atención explícita | Un botón "Entendido" (dark) |
| `info` | Mensaje informativo importante que requiere lectura | Un botón "Cerrar" (dark) |

**Diferencia con toasts**: `CustomAlert` interrumpe el flujo (es modal). Úsalo solo cuando el usuario DEBE leer y confirmar. Para feedback silencioso de acciones completadas → usar Toast (ver sección siguiente).

#### Colores pendientes de alinear
Los iconos de `CustomAlert` usan colores fuera de paleta (`#F59E0B`, `#10B981`, `#3B82F6`). Pendiente de actualizar en `CustomAlert.tsx:51-68`:
- `warning` → `#FFD54D` (primary)
- `success` → `#202020` (dark) con check
- `info` → `#FFD54D` (primary)
- `error` → `#EF4444` (red-500, se mantiene)

### 3.4 Toast — PENDIENTE DE IMPLEMENTAR

Para acciones completadas sin necesidad de confirmación explícita: parada guardada, foto subida, usuario seguido, enlace copiado.

#### Especificación

- Aparece desde abajo (encima del tab bar) o desde arriba (debajo del header)
- Desaparece automáticamente tras **2.5 segundos**
- Opción de cerrar manualmente con swipe o botón ×
- Un solo toast visible a la vez; uno nuevo reemplaza al anterior
- No interrumpe la interacción — el usuario puede seguir tocando

#### Variantes

| Variante | Fondo | Icono | Texto | Cuándo |
|---|---|---|---|---|
| `success` | `#202020` | check `#FFD54D` | blanco | Acción completada: guardar, añadir, subir |
| `error` | `#202020` | × `red-400` | blanco | Error no crítico: fallo de red silencioso |
| `neutral` | `#202020` | — | blanco | Información sin connotación: enlace copiado |

#### Arquitectura implementada

Usa `react-native-toast-message` con un renderer custom (`ToastCard`) montado en `app/_layout.tsx`.

```typescript
// Opción A — hook (recomendado para código nuevo):
import { useToast } from '@/hooks/useToast';
const { showToast } = useToast();
showToast({ message: 'Parada guardada', variant: 'success' });
showToast({ message: 'Error de red', description: 'Comprueba tu conexión', variant: 'error' });

// Opción B — llamada directa (para código existente, compatible):
import Toast from 'react-native-toast-message';
Toast.show({ type: 'success', text1: 'Guardado', text2: 'Descripción opcional' });
```

### 3.5 Tarjetas

- `rounded-3xl` siempre
- Padding interno `p-4`
- Sin sombra — separar con `mb-4` entre tarjetas
- Fondo blanco para estado planning, fondo `primary` para estado going (patrón ya implementado en `TripCard`)

### 3.6 Banners informativos en pantalla (no modal)

Para alertas inline dentro de la pantalla (no modales):

```tsx
// Informativo / brand
<TouchableOpacity className="bg-primary/20 border border-primary rounded-2xl p-4 flex-row items-center gap-3">
  <Ionicons name="information-circle-outline" size={24} color="#202020" />
  <View className="flex-1">
    <TextBold className="text-dark">Título del banner</TextBold>
    <TextRegular className="text-dark/70">Descripción breve.</TextRegular>
  </View>
  <Ionicons name="chevron-forward" size={20} color="#202020" />
</TouchableOpacity>

// Error inline (validación de formulario, etc.)
<View className="bg-red-50 border border-red-300 rounded-2xl p-4">
  <TextRegular className="text-red-700">Mensaje de error.</TextRegular>
</View>
```

**Nunca colores amber (`#FEF3C7`, `#F59E0B`, `#92400E`) en banners.** El banner de perfil en `index.tsx:103` debe actualizarse.

---

## 4. Patrones de pantalla

### 4.1 Estructura estándar

```tsx
export default function MiPantalla() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4">
          {/* Header */}
          <View className="mb-6">
            <Title1>Título principal</Title1>
            <TextRegular className="text-neutral mt-1">Subtítulo o descripción</TextRegular>
          </View>

          {/* Contenido */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 4.2 Estados vacíos

Los estados vacíos son oportunidades de marca. Nunca texto gris genérico.

```tsx
// Patrón de estado vacío
<View className="items-center py-12 px-8">
  {/* Icono o ilustración en amarillo */}
  <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-4">
    <Ionicons name="map-outline" size={36} color="#202020" />
  </View>

  {/* Mensaje con voz */}
  <Title3Semibold className="text-center mb-2">Aún no hay viajes</Title3Semibold>
  <TextRegular className="text-neutral text-center mb-6">
    Crea tu primer viaje y empieza a planificar la aventura.
  </TextRegular>

  {/* CTA */}
  <CustomButton title="Crear viaje" variant="primary" size="large" onPress={...} />
</View>
```

### 4.3 Confirmaciones destructivas

```tsx
// Siempre CustomAlert, nunca Alert.alert
<CustomAlert
  visible={showDeleteAlert}
  title="¿Eliminar viaje?"
  message="Esta acción no se puede deshacer. Se perderán todas las paradas y datos del viaje."
  type="warning"
  actions={[
    { text: 'Cancelar', variant: 'outline', onPress: () => setShowDeleteAlert(false) },
    { text: 'Eliminar', variant: 'danger', onPress: handleDelete },
  ]}
  onClose={() => setShowDeleteAlert(false)}
/>
```

---

## 5. Estados de carga

### Situación actual

Pantalla en blanco + `ActivityIndicator` amarillo centrado. Funcional pero genérico.

### Por qué importa la psicología de la carga

Los usuarios toleran la espera mejor cuando **perciben progreso activo** y cuando la UI no desaparece completamente. Las pantallas en blanco generan ansiedad y sensación de error. El **skeleton screen** — una representación en gris de la estructura que se cargará — demuestra que la app conoce el contenido que viene, transmite confianza y reduce la percepción del tiempo de espera hasta un 30%.

### Reglas actuales (mientras no se implementen skeletons)

- `ActivityIndicator` **siempre** en color `#FFD54D`, tamaño `large`
- Centrado en pantalla completa (`flex-1 justify-center items-center`)
- No usar en la mitad superior solamente

```tsx
if (isLoading) {
  return (
    <SafeAreaView className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#FFD54D" />
    </SafeAreaView>
  );
}
```

### Plan de implementación de skeletons — mejora prioritaria

**Componentes a crear:**

```typescript
// components/customElements/SkeletonBox.tsx
// Caja gris con animación pulse (opacity 0.3 → 0.8 → 0.3 en loop)
// Props: width, height, borderRadius, className

// Skeletons específicos:
// components/indexCards/TripCardSkeleton.tsx
// components/profile/ProfileHeaderSkeleton.tsx
// components/trip/StopListSkeleton.tsx
```

**Regla de uso:**
- Skeletons → estados de carga de pantalla completa (primera carga de datos)
- `ActivityIndicator` → acciones puntuales (submit de formulario, botón con `loading={true}`, refresh en background)

---

## 6. Personalidad visual

### 6.1 Uso del amarillo más allá de los botones

`#FFD54D` es el color de la marca. Debe aparecer en más contextos:

| Contexto | Uso del amarillo |
|---|---|
| Header/hero de pantalla | Fondo `bg-primary` con texto `text-dark` para secciones de bienvenida |
| Tarjetas de viaje activo | Ya implementado en `TripCard` — el referente correcto |
| Iconos de FAB y acciones compactas | `round` variant ya en amarillo |
| Estados vacíos | Icono en círculo `bg-primary` |
| Notificación bell en header | Ya implementado — mantener |
| Skeletons (a implementar) | El "brillo" del skeleton puede usar un tinte amarillo muy suave en lugar de gris puro |

### 6.2 Voz de los textos

La app tiene que sonar como un compañero de aventuras, no como un software empresarial.

| Tipo de texto | ❌ Genérico | ✅ Con voz |
|---|---|---|
| Estado vacío | "No hay viajes" | "¿Preparado para empezar a viajar?" |
| Carga | "Cargando..." | Skeleton (sin texto) |
| Error de red | "Error al cargar" | "Algo salió mal. Toca para reintentar." |
| Éxito al guardar | "Guardado" | Toast: "Parada guardada ✓" |
| Confirmación borrar | "¿Confirmar?" | "¿Eliminar este viaje?" + descripción de consecuencias |

### 6.3 Micro-interacciones

| Interacción | Estado actual | Objetivo |
|---|---|---|
| Press en botón | `activeOpacity={0.7}` | Mantener — correcto |
| Press en tarjeta | Solo navigación | Añadir `activeOpacity={0.9}` o escala sutil |
| Pull to refresh | Spinner nativo | Personalizado con color `#FFD54D` |
| Transición entre tabs | Instantánea | Explorar fade suave (Expo Router) |

---

## 7. Iconografía

### Cuándo usar cada sistema

| Sistema | Cuándo | Importación |
|---|---|---|
| **Ionicons** | Iconos funcionales de UI: navegación, acciones, estados | `import { Ionicons } from '@expo/vector-icons'` |
| **SVGs custom** | Logotipo, iconos de tabs, iconos de marca propios | `import { TabHomeIcon } from '@/components/assets/TabsIcons'` |

### Tamaños estándar

| Contexto | Tamaño |
|---|---|
| Header / botones principales | 24px |
| Inline con texto de cuerpo | 20px |
| Inline con microtexto | 16px |
| Hero / estado vacío | 32-48px |

### Colores de icono

| Contexto | Color |
|---|---|
| Sobre fondo blanco | `#202020` |
| Sobre fondo oscuro / dark | `#FFFFFF` |
| Activo / seleccionado | `#FFD54D` |
| Inactivo / deshabilitado | `#999999` |
| Destructivo / error | `#EF4444` (`red-500`) |

---

## 8. Backlog de inconsistencias

Ordenado por impacto visual. Marcar como resuelto al corregir.

| # | Prioridad | Descripción | Archivo | Línea | Solución |
|---|---|---|---|---|---|
| 1 | ✅ Resuelto | Banner de perfil con colores amber fuera de paleta | `app/(app)/(tabs)/index.tsx` | 103 | `bg-primary/20 border-primary text-dark` |
| 2 | 🔴 Alta | `Alert.alert` nativo en flujos destructivos | varios screens | — | Migrar a `CustomAlert` con tipo `warning` |
| 3 | ✅ Resuelto | Toast system con estilos fuera de paleta | `app/_layout.tsx` + nuevo `hooks/useToast.ts` | — | `ToastCard` dark con Urbanist; hook `useToast()` para API uniforme |
| 4 | ✅ Resuelto | `CustomAlert` iconos con colores fuera de paleta | `components/customElements/CustomAlert.tsx` | 51–68 | warning/info → `#FFD54D`, success → `#202020`, error → `#EF4444` |
| 5 | ✅ Resuelto | Botones usan 12px en todos los tamaños | `components/customElements/CustomButton.tsx` | 83–93 | `small` → 12px, `medium`/`large` → `TextRegular` (15px) |
| 6 | ✅ Resuelto | Skeletons en lugar de `ActivityIndicator` de pantalla | home + perfil | — | `SkeletonBox` + `TripCardSkeleton` + `ProfileHeaderSkeleton` |
| 7 | ✅ Resuelto | `Colors.ts` vacío / legacy (azul `#2f95dc`) | `constants/Colors.ts` | — | Actualizar con tokens del sistema o eliminar |
| 8 | ✅ Resuelto | `TextRegular` sin color por defecto | `components/customElements/CustomText.tsx` | 97 | Añadir `color: '#202020'` al style base |

---

*Última actualización: mayo 2026*
