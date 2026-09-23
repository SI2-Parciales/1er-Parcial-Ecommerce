# SPEC-01: Configuración Inicial, Arquitectura Base y Fundaciones

## 1. Identificación y Metadatos
- **ID:** SPEC-01
- **Archivo:** `.specs/01-project-setup-and-foundations.md`
- **Módulo:** Arquitectura Base, Infraestructura y Navegación
- **Objetivo:** Configurar React Native con TypeScript estricto, NativeWind (Tailwind CSS), persistencia síncrona con MMKV, cliente Axios con auto-refresh de tokens JWT, TanStack Query y árbol de navegación base tipado.

---

## 2. Dependencias Requeridas
```bash
# UI y Estilos
npm install nativewind@^4.0.1 tailwindcss@^3.4.0 clsx tailwind-merge lucide-react-native react-native-svg

# Red, Caché y Almacenamiento
npm install react-native-mmkv @tanstack/react-query@^5.0.0 zustand axios zod

# Navegación y Primitivas Nativas
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
```

---

## 3. Estructura de Archivos a Crear
```text
src/
├── app/
│   ├── navigation/
│   │   ├── types.ts
│   │   ├── RootNavigator.tsx
│   │   └── BottomTabNavigator.tsx
│   └── providers/
│       ├── AppProviders.tsx
│       └── QueryProvider.tsx
├── shared/
│   ├── api/
│   │   ├── apiClient.ts
│   │   └── endpoints.ts
│   ├── components/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   └── ScreenContainer.tsx
│   ├── storage/
│   │   └── mmkv.ts
│   └── utils/
│       └── formatters.ts
```

---

## 4. Configuraciones Base

### 4.1. `tsconfig.json` (Path Aliases)
Configurar alias en `compilerOptions`:
- `@app/*` -> `src/app/*`
- `@features/*` -> `src/features/*`
- `@shared/*` -> `src/shared/*`

### 4.2. `tailwind.config.js` (Design Tokens)
Extender colores en `theme.extend.colors.brand`:
- `primary`: `#111827` (slate oscuro principal)
- `secondary`: `#F3F4F6` (gris fondo contenedores)
- `accent`: `#4F46E5` (índigo para acciones principales)
- `muted`: `#6B7280` (textos secundarios)
- `border`: `#E5E7EB` (líneas divisorias)
- `danger`: `#EF4444`, `success`: `#10B981`, `warning`: `#F59E0B`

---

## 5. Especificación de Infraestructura y Contratos

### 5.1. Almacenamiento (`src/shared/storage/mmkv.ts`)
- Instanciar `MMKV` con ID `fashionstore-mobile-storage`.
- Exportar objeto `appStorage` con métodos síncronos:
  - `getString(key)` / `setString(key, val)`
  - `getObject<T>(key)` / `setObject<T>(key, val)` (manejo con `JSON.parse` / `JSON.stringify` dentro de un try/catch)
  - `removeItem(key)` / `clearAll()`

### 5.2. Endpoints Centralizados (`src/shared/api/endpoints.ts`)
Definir constantes de ruta:
- `AUTH`: `/api/v1/auth/login`, `/register`, `/refresh`, `/me`
- `BRANCHES`: `/api/v1/branches/cities`, `/api/v1/branches?city={city}`, `/api/v1/branches/{id}`
- `CATALOG`: `/api/v1/products`, `/api/v1/products/{id}`, `/categories`, `/seasons`
- `RESERVATIONS`: `/api/v1/reservations`, `/available-slots`, `/me`, `/{id}/cancel`
- `ORDERS`: `/api/v1/orders/checkout-gateway`, `/checkout-qr`, `/me`, `/{id}`
- `PAYMENTS`: `/api/v1/payments/static-qr-info`
- `AI`: `/api/v1/ai/assistant`

### 5.3. Cliente HTTP (`src/shared/api/apiClient.ts`)
- Configurar instancia de `axios` con `baseURL` desde `EXPO_PUBLIC_API_URL` (fallback: `http://localhost:8000`).
- **Request Interceptor:** Inyectar header `Authorization: Bearer <access_token>` si existe en MMKV.
- **Response Interceptor:**
  - Si el estado es `401` y no es reintento: leer `refresh_token` de MMKV, invocar endpoint `/refresh`, actualizar tokens en MMKV y reintentar la petición original.
  - Si el refresh falla: limpiar credenciales en MMKV y rechazar la promesa.
  - Estandarizar errores en formato `{ message: string, statusCode: number }`.

### 5.4. Formateadores (`src/shared/utils/formatters.ts`)
- `formatCurrency(amount, currency = 'BOB')`: Salida formateada con `Intl.NumberFormat`.
- `formatDate(date)`: Salida `DD/MM/YYYY`.

---

## 6. Navegación y Proveedores

### 6.1. Tipos de Rutas (`src/app/navigation/types.ts`)
```typescript
export type BottomTabParamList = {
  CatalogTab: undefined;
  ReservationsTab: undefined;
  CartTab: undefined;
  AIAssistantTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  ProductDetail: { productId: string };
  VirtualTryOn: { productId: string; variantId?: string };
  FittingBag: undefined;
  ReservationPassModal: { reservationId: string };
  Checkout: undefined;
  OrderSuccess: { orderId: string; status: 'PAID' | 'PENDING_MANUAL_VERIFICATION' };
  LoginModal: undefined;
  RegisterModal: undefined;
};
```

### 6.2. Estructura de Navegación
- `BottomTabNavigator.tsx`: 5 tabs con iconos de `lucide-react-native` (`ShoppingBag`, `Calendar`, `ShoppingCart`, `Sparkles`, `User`).
- `RootNavigator.tsx`: Stack principal que aloja `MainTabs` y modales (`ProductDetail`, `VirtualTryOn`, `Checkout`, etc.).
- `AppProviders.tsx`: Envolver la app con `SafeAreaProvider` y `QueryClientProvider` (TanStack Query configurado con `staleTime: 5 min`).

---

## 7. Componentes Atómicos Compartidos
- `ScreenContainer`: Contenedor envuelto en `SafeAreaView`, con soporte para modo con scroll o vista fija, control de StatusBar y fondo blanco.
- `Button`: Variantes (`primary`, `secondary`, `outline`, `danger`), tamaños (`sm`, `md`, `lg`), estado `loading` con spinner y soporte de icono.
- `Input`: Campo con etiqueta, indicador de error inferior, iconos opcionales a la izquierda/derecha y borde enfocado en color `brand.accent`.
- `Badge`: Píldora de estado con variantes (`success`, `warning`, `danger`, `info`, `neutral`).

---

## 8. Criterios de Aceptación
- [ ] La app compila sin errores de tipado en TypeScript estricto.
- [ ] `appStorage` lee y escribe valores síncronos en MMKV.
- [ ] Peticiones HTTP adjuntan JWT automáticamente y renuevan credenciales ante error 401.
- [ ] Las 5 pestañas de `BottomTabNavigator` alternan vistas sin parpadeo.
- [ ] Componentes atómicos aplican clases de diseño de NativeWind correctamente.