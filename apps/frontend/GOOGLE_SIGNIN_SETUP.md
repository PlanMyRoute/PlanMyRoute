# Configuración de Google Sign-In con Supabase

## Implementación completada ✅

Se ha implementado el inicio de sesión con Google usando Supabase Auth. Los cambios incluyen:

1. **AuthContext** - Agregada función `signInWithGoogle()`
2. **Login Screen** - Botón de Google ahora funcional
3. **Callback Handler** - Ruta `/auth/callback` para manejar el retorno de Google
4. **Deep Linking** - Configurado scheme `planmyroute://` en app.json

## Configuración requerida en Supabase Dashboard

### 1. Obtener credenciales de Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** > **OAuth consent screen**

#### Configurar pantalla de consentimiento (OAuth consent screen)

Antes de crear las credenciales, debes configurar la pantalla de consentimiento:

1. **Tipo de usuario**: Selecciona una opción:
   
   **Para tu app (RECOMENDADO)**:
   - ✅ Selecciona **"Usuarios externos"** (External)
   - Permite que cualquier persona con una Cuenta de Google use tu app
   - Puedes agregar usuarios de prueba mientras desarrollas
   - Necesitarás verificación de Google si solicitas scopes sensibles
   - Ideal para apps móviles públicas

   **Solo si tienes Google Workspace**:
   - Selecciona **"Interno"** (Internal)
   - Solo para organizaciones con Google Workspace
   - Solo usuarios de tu organización pueden usar la app
   - No necesita verificación
   - NO recomendado para apps públicas

2. Haz clic en **Crear**

3. **Información de la app**:
   - **Nombre de la app**: PlanMyRoute
   - **Email de soporte del usuario**: Tu email
   - **Logo de la app** (opcional): Puedes subir el logo de tu app
   - **Dominio de la app** (opcional): Deja en blanco por ahora
   - **Dominios autorizados**: Agrega `supabase.co`
   - **Información de contacto del desarrollador**: Tu email

4. Haz clic en **Guardar y continuar**

5. **Scopes** (Permisos):
   - Para autenticación básica, los scopes predeterminados son suficientes:
     - `openid`
     - `profile` 
     - `email`
   - Haz clic en **Guardar y continuar**

6. **Usuarios de prueba** (si seleccionaste "Usuarios externos"):
   - Agrega los emails de las cuentas de Google que usarás para testing
   - Puedes agregar hasta 100 usuarios de prueba
   - Solo estos usuarios podrán usar la app mientras esté en "Testing"
   - Haz clic en **Guardar y continuar**

7. **Resumen**: Revisa y haz clic en **Volver al panel**

#### Crear credenciales OAuth

Ahora sí, crea las credenciales:

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **OAuth 2.0 Client ID**

#### Para Web (desarrollo y testing)
- **Application type**: Web application
- **Name**: PlanMyRoute Web
- **Authorized redirect URIs**: 
  ```
  https://mqdqzygwhmrmkvuprsqp.supabase.co/auth/v1/callback
  ```

#### Para Android
- **Application type**: Android
- **Name**: PlanMyRoute Android
- **Package name**: `com.lorenbit.planmyroutefrontend`
- **SHA-1 certificate fingerprint**: 

**Si NO tienes carpeta `android/` (RECOMENDADO para Expo):**

Usa directamente el debug keystore de Android. Ejecuta en PowerShell:

```powershell
keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

Busca la línea que dice **SHA1** y copia ese valor:
```
SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0  ← COPIA ESTE
```

**Si ya tienes carpeta `android/`:**

1. Ejecuta:
   ```bash
   cd android
   ./gradlew signingReport
   ```
   
2. Busca la sección **"Variant: debug"** y copia el SHA-1:
   ```
   Variant: debug
   Config: debug
   Store: C:\Users\tu_usuario\.android\debug.keystore
   SHA1: A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0  ← COPIA ESTE
   ```

**Si keytool dice que no existe el archivo:**

El keystore se crea automáticamente la primera vez que ejecutas la app en Android. Opciones:

1. Crea la carpeta android y genera el keystore:
   ```bash
   npx expo prebuild
   npx expo run:android
   ```

2. O usa un SHA-1 temporal y actualízalo después

**Para producción** (cuando hagas `eas build`):
- Usa el SHA-1 del keystore de producción de EAS Build
- O genera tu propio keystore y extrae el SHA-1 con keytool

#### Para iOS
- **Application type**: iOS
- **Name**: PlanMyRoute iOS
- **Bundle ID**: `com.lorenbit.planmyroutefrontend`
- **App Store ID**: (si ya está en la App Store)

### 2. Configurar en Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Authentication** > **Providers**
3. Encuentra **Google** en la lista de proveedores
4. Activa **Enable Sign in with Google**
5. Ingresa las credenciales:
   - **Client ID (for OAuth)**: Tu Client ID de Google
   - **Client Secret (for OAuth)**: Tu Client Secret de Google
6. Configura el **Redirect URL** (se muestra en el panel):
   ```
   https://mqdqzygwhmrmkvuprsqp.supabase.co/auth/v1/callback
   ```
7. Haz clic en **Save**

### 3. Configurar Deep Linking en el proyecto

El deep linking ya está configurado con el scheme `planmyroute://`

Para testing en desarrollo:

#### iOS
```bash
npx uri-scheme open planmyroute://auth/callback --ios
```

#### Android
```bash
npx uri-scheme open planmyroute://auth/callback --android
```

### 4. Testing

#### En Expo Go (desarrollo)
```bash
# En PlanMyRoute_Frontend
npm start
```

**Nota**: Expo Go tiene limitaciones con OAuth. Para testing completo, usa:

#### Development Build
```bash
# Crear build de desarrollo
npx expo run:android
# o
npx expo run:ios
```

#### Testing en Web
```bash
npm run web
```

### 5. Flujo de autenticación

1. Usuario hace clic en "Inicia sesión con Google"
2. Se abre el navegador con la pantalla de login de Google
3. Usuario selecciona su cuenta de Google
4. Google redirige a Supabase callback
5. Supabase valida y redirige a `planmyroute://auth/callback`
6. La app procesa el callback y obtiene la sesión
7. Usuario es redirigido a la pantalla principal

### 6. Verificación de configuración

Para verificar que todo está configurado correctamente:

1. **Verifica que el provider está habilitado**:
   - Dashboard > Authentication > Providers > Google debe estar en verde

2. **Verifica el redirect URL en Google Console**:
   - Debe incluir: `https://mqdqzygwhmrmkvuprsqp.supabase.co/auth/v1/callback`

3. **Verifica el scheme en app.json**:
   - Debe ser: `"scheme": "planmyroute"`

### 7. Troubleshooting

#### Error: "redirect_uri_mismatch"
- Verifica que el redirect URI en Google Console coincida exactamente con el de Supabase
- No olvides incluir `https://` al principio

#### Error: "invalid_client"
- Verifica que Client ID y Client Secret estén correctos en Supabase
- Asegúrate de no tener espacios extra al copiar/pegar

#### La app no abre después del login
- Verifica que el scheme `planmyroute://` esté configurado en app.json
- Reconstruye la app después de cambiar app.json
- En iOS, limpia la build: `npx expo run:ios --clear`

#### Funciona en web pero no en móvil
- Necesitas crear OAuth clients separados para iOS y Android
- Asegúrate de tener los SHA-1 correctos para Android
- Reconstruye la app después de cambios en Google Console

### 8. Consideraciones de seguridad

- **No compartas** tus Client ID y Client Secret públicamente
- **Usa variables de entorno** para credenciales sensibles
- **Restringe** las API keys de Google a dominios/apps específicos
- **Habilita** la verificación de correo en Supabase si es necesario

### 9. Modo Testing vs Production (Usuarios externos)

Si seleccionaste "Usuarios externos", tu app empieza en modo **Testing**:

#### Modo Testing (Estado actual)
- ✅ Solo usuarios de prueba pueden acceder
- ✅ No requiere verificación de Google
- ✅ Ideal para desarrollo
- ⏰ Máximo 100 usuarios de prueba
- ⚠️ La app puede mostrar "Google hasn't verified this app"

#### Publicar a Production

Cuando estés listo para lanzar públicamente:

1. Ve a **OAuth consent screen** en Google Cloud Console
2. Haz clic en **PUBLISH APP**
3. Si solo usas scopes básicos (email, profile), la app se publicará inmediatamente
4. Si usas scopes sensibles, necesitarás:
   - Completar el formulario de verificación
   - Esperar aprobación de Google (puede tomar días/semanas)
   - Proporcionar videos de demostración
   - Explicar por qué necesitas cada scope

Para PlanMyRoute (solo email y profile), **no necesitarás verificación** - puedes publicar directamente.

### 10. Siguiente paso: Completar perfil

Cuando un usuario inicia sesión con Google por primera vez, es posible que quieras:

1. Verificar si ya existe en tu tabla `user`
2. Crear un registro automáticamente con los datos de Google:
   - email
   - nombre (de Google profile)
   - foto de perfil (de Google profile)
3. Redirigir a `/complete-profile` si falta información

Esto se puede hacer en el `AuthContext` escuchando el evento `SIGNED_IN`:

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // Verificar si el usuario existe en la tabla user
    // Si no existe, crear con datos de Google
    // Si existe pero falta info, redirigir a complete-profile
  }
});
```

## Archivos modificados

- ✅ `context/AuthContext.tsx` - Agregada función `signInWithGoogle()`
- ✅ `app/(auth)/login.tsx` - Botón de Google funcional
- ✅ `app/(auth)/callback.tsx` - Nueva ruta para callback
- ✅ `app.json` - Actualizado scheme a `planmyroute`
- ✅ Este documento de configuración

## Estado actual

- ✅ Código implementado
- ⏳ **Pendiente**: Configurar OAuth en Google Cloud Console
- ⏳ **Pendiente**: Configurar provider en Supabase Dashboard
- ⏳ **Pendiente**: Testing en dispositivo real o development build
