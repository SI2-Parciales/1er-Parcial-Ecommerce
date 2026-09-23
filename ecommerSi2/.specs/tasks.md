ARCHIVO: .specs/tasks.md

# FashionStore Mobile: Orquestador Maestro de Tareas (tasks.md)

> **Protocolo de Ejecución para el Agente / IDE de IA:**
> 1. Este archivo es el **director de orquesta central**. Las tareas deben ejecutarse en orden estrictamente secuencial de arriba hacia abajo.
> 2. Antes de iniciar una tarea, consulta el archivo `.specs/` de referencia especificado en el encabezado de cada fase.
> 3. Al concluir cada tarea, corre la validación de tipos (`npx tsc --noEmit`). No avances si existen errores de compilación o discrepancias de tipado TypeScript.
> 4. Marca la casilla correspondiente (`[x]`) únicamente cuando la tarea esté implementada, probada y sin advertencias.
> 5. Si surge una ambigüedad o falta un detalle de negocio, apégate estrictamente a las definiciones de tipos e interfaces de los contratos.

---

## Índice de Fases y Especificaciones Asociadas

* **Fase 1: Configuración Base, Infraestructura y Navegación** $\rightarrow$ `.specs/01-project-setup-and-foundations.md`
* **Fase 2: Autenticación, Sesión y Contexto de Sucursal Física** $\rightarrow$ `.specs/02-auth-and-branch-context.md`
* **Fase 3: Catálogo Inteligente, Filtros y Detalle de Prenda (PDP)** $\rightarrow$ `.specs/03-catalog-and-product-details.md`
* **Fase 4: Reservas de Probador Físico (Pick & Try) y Pase Offline** $\rightarrow$ `.specs/04-physical-reservations-pick-and-try.md`
* **Fase 5: Carrito Digital y Checkout Dual (Banco y QR Estático)** $\rightarrow$ `.specs/05-cart-and-checkout-engine.md`
* **Fase 6: Vestidor Virtual con Realidad Aumentada (AR) y Modo 2D** $\rightarrow$ `.specs/06-virtual-try-on-ar.md`
* **Fase 7: Asistente Inteligente de Estilo por Voz e IA** $\rightarrow$ `.specs/07-ai-style-assistant-and-voice.md`
* **Fase 8: Perfil, Historial, Sincronización Offline y Hardening Final** $\rightarrow$ `.specs/08-profile-orders-and-offline-sync.md`

---

## Fase 1: Configuración Base, Infraestructura y Navegación
*Referencia: `.specs/01-project-setup-and-foundations.md`*

- [x] **1.1. Inicialización y dependencias del proyecto móvil**
  - Instalar dependencias de UI y estilos: `nativewind@^4.0.1`, `tailwindcss@^3.4.0`, `clsx`, `tailwind-merge`, `lucide-react-native`, `react-native-svg`.
  - Instalar dependencias de estado y red: `react-native-mmkv`, `@tanstack/react-query@^5.0.0`, `zustand`, `axios`, `zod`.
  - Instalar dependencias de navegación: `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `react-native-screens`, `react-native-safe-area-context`.

- [x] **1.2. Paths, configuración de diseño y tipado global**
  - Configurar `tsconfig.json` con paths `@app/*`, `@features/*`, `@shared/*`, `@assets/*` y tipado estricto.
  - Configurar `tailwind.config.js` con preset de NativeWind y paleta retail (`brand.primary`, `brand.secondary`, `brand.accent`, `brand.border`, `brand.muted`, `brand.danger`, `brand.success`, `brand.warning`).
  - Crear archivo de declaraciones globales `src/types/declarations.d.ts` con tipado para NativeWind y archivos SVG.

- [x] **1.3. Persistencia síncrona y utilitarios globales**
  - Implementar wrapper síncrono de alto rendimiento `src/shared/storage/mmkv.ts` (`getString`, `setString`, `getObject`, `setObject`, `removeItem`, `clearAll`).
  - Implementar formateadores universales en `src/shared/utils/formatters.ts` (`formatCurrency` en BOB/USD y `formatDate`).

- [x] **1.4. Capa de red HTTP e interceptores JWT**
  - Crear catálogo de rutas del backend FastAPI en `src/shared/api/endpoints.ts`.
  - Configurar instancia centralizada de Axios en `src/shared/api/apiClient.ts` con inyección automática de header `Authorization: Bearer <token>`.
  - Configurar interceptor de respuesta para autorefresco transparente de sesión ante error 401 usando `refresh_token` de MMKV y manejo de errores estandarizado `ApiErrorResponse`.

- [x] **1.5. Componentes atómicos base (Design System)**
  - Implementar `src/shared/components/ScreenContainer.tsx` con soporte de SafeArea, scroll opcional y manejo de barra de estado.
  - Implementar `src/shared/components/Button.tsx` con variantes (`primary`, `secondary`, `outline`, `danger`), estados de carga (`ActivityIndicator`) y deshabilitado.
  - Implementar `src/shared/components/Input.tsx` con soporte para etiquetas, mensajes de error Zod e iconos a izquierda y derecha.
  - Implementar `src/shared/components/Badge.tsx` para indicadores de stock y estados de órdenes.

- [x] **1.6. Proveedores globales y árbol de navegación tipado**
  - Configurar `QueryProvider.tsx` con `staleTime: 5 min` y envolver en `AppProviders.tsx` con `SafeAreaProvider`.
  - Declarar contratos de rutas en `src/app/navigation/types.ts` (`BottomTabParamList` y `RootStackParamList`).
  - Implementar `BottomTabNavigator.tsx` con las 5 pestañas principales (`CatalogTab`, `ReservationsTab`, `CartTab`, `AIAssistantTab`, `ProfileTab`).
  - Implementar `RootNavigator.tsx` con stack modal tipado y conectar como raíz en `App.tsx`.
  - Validar compilación exitosa (`npx tsc --noEmit`).

---

## Fase 2: Autenticación, Sesión y Contexto de Sucursal Física
*Referencia: `.specs/02-auth-and-branch-context.md`*

- [ ] **2.1. Modelos de datos y servicios API**
  - Definir interfaces de usuario, tokens y sucursales físicas en `src/features/auth/types/auth.types.ts` y `src/features/branch-context/types/branch.types.ts`.
  - Implementar `src/features/auth/api/auth.service.ts` para login (`x-www-form-urlencoded`), registro y consulta de usuario activo (`/me`).
  - Implementar `src/features/branch-context/api/branch.service.ts` para listado de ciudades y sucursales físicas disponibles.

- [ ] **2.2. Esquemas de validación y Zustand Stores**
  - Crear esquemas de validación Zod en `src/features/auth/schemas/auth.schema.ts` para login y registro con confirmación estricta de contraseña.
  - Implementar store `useAuthStore` en `src/features/auth/store/auth.store.ts` con persistencia en MMKV y método de restauración `hydrateAuth()`.
  - Implementar store `useBranchStore` en `src/features/branch-context/store/branch.store.ts` con control de modal y método `hydrateBranchContext()`.

- [ ] **2.3. Selector en cabecera y modal bloqueante de sucursal**
  - Implementar `src/features/branch-context/components/BranchHeaderSelector.tsx` mostrando la tienda activa y ciudad con apertura táctil del selector.
  - Implementar `src/features/branch-context/components/BranchSelectionModal.tsx` con pestañas de ciudades y lista interactiva de sucursales físicas.
  - Asegurar que si no existe sucursal guardada en MMKV, el modal se presente automáticamente al inicio sin permitir navegación a ciegas.

- [ ] **2.4. Pantallas de Login y Registro**
  - Desarrollar `src/features/auth/screens/LoginScreen.tsx` con React Hook Form, zodResolver y banners para errores del backend (400, 401).
  - Desarrollar `src/features/auth/screens/RegisterScreen.tsx` con captura de nombre, correo, teléfono opcional y contraseñas.
  - Integrar hidratación de sesión y sucursal en el `useEffect` inicial de `App.tsx`.
  - Validar compilación exitosa (`npx tsc --noEmit`).

---

## Fase 3: Catálogo Inteligente, Filtros y Detalle de Prenda (PDP)
*Referencia: `.specs/03-catalog-and-product-details.md`*

- [ ] **3.1. Contratos de catálogo y servicio de consulta**
  - Modelar tipos de prendas, variantes SKU (talla, color), temporadas y filtros en `src/features/catalog/types/catalog.types.ts`.
  - Implementar `src/features/catalog/api/catalog.service.ts` conectando con `/api/v1/products` con soporte de paginación y stock local por sucursal.

- [ ] **3.2. Listado infinito optimizado y filtrado dinámico**
  - Implementar hook `src/features/catalog/hooks/useCatalogProducts.ts` con `useInfiniteQuery` de TanStack Query.
  - Construir componente optimizado `src/features/catalog/components/ProductCard.tsx` para cuadrícula de dos columnas.
  - Desarrollar `src/features/catalog/screens/CatalogScreen.tsx` con `FlashList`, barra de búsqueda debounced (400ms) y switch *"Disponible en mi sucursal"*.
  - Implementar `src/features/catalog/components/FilterDrawerModal.tsx` para filtrado por categoría, temporada, precio y talla.

- [ ] **3.3. Ficha de detalle de producto (PDP)**
  - Implementar carrusel swipeable de alta resolución `src/features/catalog/components/ProductImageCarousel.tsx`.
  - Implementar `src/features/catalog/components/VariantColorSelector.tsx` con paleta visual de colores disponibles.
  - Implementar `src/features/catalog/components/SizeSelector.tsx` deshabilitando tallas sin existencias en la sucursal activa.
  - Implementar `src/features/catalog/components/BranchStockBadge.tsx` con tres estados visuales (Disponible, Últimas unidades, Agotado localmente).
  - Ensamblar `src/features/catalog/screens/ProductDetailScreen.tsx` con barra fija inferior de 3 acciones directas: **"Probar en AR"**, **"Reservar en Tienda"** y **"Añadir a la Bolsa"**.
  - Validar compilación exitosa (`npx tsc --noEmit`).

---

## Fase 4: Reservas de Probador Físico (Pick & Try) y Pase Offline
*Referencia: `.specs/04-physical-reservations-pick-and-try.md`*

- [ ] **4.1. Store de la bolsa de reserva y control de cupo**
  - Definir tipos de ítems de probador y estados de reserva en `src/features/reservations/types/reservation.types.ts`.
  - Implementar store `src/features/reservations/store/fittingBag.store.ts` con persistencia en MMKV y restricción estricta de **máximo 5 prendas por turno**.
  - Construir componente `src/features/reservations/components/LimitCounterBadge.tsx` con barra visual de cupo (`X / 5`).

- [ ] **4.2. Agendamiento de turnos y pantalla de bolsa**
  - Implementar componente `src/features/reservations/components/FittingBagItemCard.tsx` con selector rápido de talla y botón para remover.
  - Implementar `src/features/reservations/components/TimeSlotPicker.tsx` consultando bloques disponibles de 30 minutos provistos por FastAPI para las siguientes 48 horas.
  - Desarrollar `src/features/reservations/screens/FittingBagScreen.tsx` integrando lista de prendas, selección de fecha/hora y botón de confirmación de reserva.

- [ ] **4.3. Pase de reserva digital y persistencia sin conexión**
  - Implementar `src/features/reservations/api/reservation.service.ts` para creación y consulta de turnos de vestidor.
  - Desarrollar credencial digital `src/features/reservations/components/ReservationPassModal.tsx` con generación de código QR en cliente mediante `react-native-qrcode-svg`.
  - Persistir pases confirmados en MMKV bajo `active_reservations` para garantizar su visualización completa dentro de la tienda sin cobertura de red.
  - Desarrollar `src/features/reservations/screens/ReservationListScreen.tsx` para consultar turnos activos e históricos.
  - Validar compilación exitosa (`npx tsc --noEmit`).

---

## Fase 5: Carrito Digital y Checkout Dual (Banco y QR Estático)
*Referencia: `.specs/05-cart-and-checkout-engine.md`*

- [ ] **5.1. Store del carrito de compras y desglose financiero**
  - Definir tipos del carrito y contratos de orden en `src/features/checkout/types/checkout.types.ts`.
  - Implementar store `src/features/cart/store/cart.store.ts` con persistencia en MMKV, control de stock máximo por variante y cálculo de subtotales.
  - Implementar componentes `CartItemCard.tsx` y `OrderSummaryCard.tsx` con desglose de impuestos y total.
  - Desarrollar `src/features/cart/screens/CartScreen.tsx` con selector de entrega (Recojo en sucursal o Envío a domicilio).

- [ ] **5.2. Checkout con selector segmentado de pagos**
  - Desarrollar `src/features/checkout/screens/CheckoutScreen.tsx` con pestañas segmentadas: **Tarjeta Bancaria** y **Pago por QR Institucional**.
  - Implementar `src/features/checkout/components/BankGatewaySection.tsx` con formulario seguro de tarjeta o redirección sandbox del banco.

- [ ] **5.3. Módulo de pago por QR estático y compresión de comprobante**
  - Implementar `src/features/checkout/components/StaticQrPaymentSection.tsx` consumiendo datos y QR activo subido por la administración (`/api/v1/payments/static-qr-info`).
  - Implementar `src/features/checkout/components/ZoomableQrModal.tsx` con visor ampliable y botón de descarga a galería.
  - Agregar botones de copiado rápido al portapapeles para el número de cuenta bancaria y monto total.
  - Implementar `src/features/checkout/components/FileUploadZone.tsx` integrando `react-native-image-resizer` para comprimir la fotografía del comprobante a <1.5 MB (JPEG 80%, ancho máximo 1200px) antes del envío multipart.

- [ ] **5.4. Confirmación de pedido y estados de validación**
  - Conectar servicio `src/features/checkout/api/checkout.service.ts` para envíos a `/checkout-gateway` y `/checkout-qr`.
  - Desarrollar `src/features/checkout/screens/OrderSuccessScreen.tsx` mostrando pantalla verde para compras pagadas y pantalla informativa de espera para órdenes con QR (`PENDING_MANUAL_VERIFICATION`).
  - Validar compilación exitosa (`npx tsc --noEmit`).

---

## Fase 6: Vestidor Virtual con Realidad Aumentada (AR) y Modo 2D
*Referencia: `.specs/06-virtual-try-on-ar.md`*

- [ ] **6.1. Detección de hardware y gestión de permisos**
  - Instalar y vincular `react-native-vision-camera` y `@shopify/react-native-skia`.
  - Implementar hook `src/features/virtual-fitting/hooks/useCameraPermissions.ts` gestionando permisos nativos con fallback automático si el acceso es denegado.
  - Implementar cálculos matemáticos de puntos de anclaje de torso (hombros, pecho, cadera) en `src/features/virtual-fitting/utils/landmarkCalculations.ts`.

- [ ] **6.2. Vista de cámara frontal y superposición gráfica en Skia**
  - Implementar `src/features/virtual-fitting/components/ARCameraView.tsx` utilizando la cámara frontal a 60 FPS y renderizando la textura transparente de la prenda sobre un `<Canvas>` de Skia.
  - Implementar silueta translúcida de encuadre corporal en `src/features/virtual-fitting/components/BodyGuidesOverlay.tsx`.
  - Asegurar el autoescalado de la prenda en función de la distancia del usuario al dispositivo.

- [ ] **6.3. Modo alternativo 2D por fotografía (Fallback)**
  - Implementar `src/features/virtual-fitting/components/Fallback2DFittingView.tsx` permitiendo cargar una foto estática de cuerpo entero desde la galería.
  - Implementar `src/features/virtual-fitting/components/SizeCalibrationSlider.tsx` con controles manuales deslizables para ajustar ancho de hombros, posición y escala.

- [ ] **6.4. Barra de control e integración con tienda física**
  - Implementar `src/features/virtual-fitting/components/FittingControlsBar.tsx` con selector rápido de tallas (S, M, L, XL), paleta de colores y botón directo **"Añadir a Reserva de Probador Físico"**.
  - Ensamblar `src/features/virtual-fitting/screens/VirtualTryOnScreen.tsx` con alternador manual entre AR en vivo y modo foto 2D.
  - Validar compilación exitosa (`npx tsc --noEmit`).

---

## Fase 7: Asistente Inteligente de Estilo por Voz e IA
*Referencia: `.specs/07-ai-style-assistant-and-voice.md`*

- [ ] **7.1. Entrada por voz y contratos de inteligencia artificial**
  - Instalar `@react-native-voice/voice` y configurar permisos en manifiestos nativos.
  - Implementar hook `src/features/ai-assistant/hooks/useVoiceInput.ts` con dictado continuo en español y actualización en tiempo real de la barra de texto.
  - Definir tipos de mensajes, payloads y prendas recomendadas en `src/features/ai-assistant/types/ai.types.ts`.

- [ ] **7.2. Cliente de red y servicio del asistente**
  - Implementar `src/features/ai-assistant/api/aiAssistant.service.ts` enviando mensaje del usuario, historial y el `branchId` activo para garantizar que las sugerencias tengan existencias físicas reales.

- [ ] **7.3. Interfaz conversacional y tarjetas de producto interactivas**
  - Implementar burbujas de conversación en `src/features/ai-assistant/components/ChatBubble.tsx`.
  - Desarrollar `src/features/ai-assistant/components/RecommendedProductCard.tsx` con carrusel horizontal dentro del mensaje, mostrando imagen, precio y botones de acción directa: **"Ver en AR"** y **"Reservar"**.
  - Implementar `src/features/ai-assistant/components/VoiceRecordingButton.tsx` con animación visual de ondas sonoras al dictar.
  - Implementar barra de sugerencias rápidas `src/features/ai-assistant/components/SuggestedPromptsBar.tsx`.
  - Ensamblar pantalla principal `src/features/ai-assistant/screens/AIAssistantScreen.tsx`.
  - Validar compilación exitosa (`npx tsc --noEmit`).

---

## Fase 8: Perfil, Historial, Sincronización Offline y Hardening Final
*Referencia: `.specs/08-profile-orders-and-offline-sync.md`*

- [ ] **8.1. Detección de conectividad y contingencia offline**
  - Instalar `@react-native-community/netinfo` e implementar hook `src/features/profile/hooks/useNetworkStatus.ts`.
  - Implementar banner visual superior `src/features/profile/components/OfflineStatusBar.tsx` alertando al usuario cuando navega sin conexión y habilitando acceso a datos cacheados.

- [ ] **8.2. Historial de compras y seguimiento de reservas**
  - Implementar `src/features/profile/components/ReservationStatusTimeline.tsx` con seguimiento visual de estados de probador (`PENDING`, `PREPARING`, `READY`, `ATTENDED`).
  - Desarrollar `src/features/profile/screens/ReservationTrackingScreen.tsx` con botón prioritario para abrir el Pase QR offline guardado en MMKV.
  - Desarrollar pantallas de historial de compras `OrderHistoryScreen.tsx` y `OrderDetailScreen.tsx`, mostrando miniatura del comprobante subido si el pago fue por QR estático.

- [ ] **8.3. Pantalla de cuenta y cierre de sesión seguro**
  - Desarrollar `src/features/profile/screens/ProfileScreen.tsx` mostrando datos personales del cliente, sucursal preferida y accesos directos.
  - Implementar botón de cierre de sesión con purga completa de tokens en MMKV, reseteo de stores de Zustand y redirección limpia al stack inicial.

- [ ] **8.4. Verificación final de calidad de código y compilación nativa**
  - Ejecutar `npx tsc --noEmit` y confirmar: **0 errores de tipo en modo estricto**.
  - Verificar que no existan variables sensibles quemadas en código ni llamadas a `localhost` sin soporte de variable de entorno.
  - Corroborar que las 5 pestañas de navegación, el vestidor AR, el flujo QR de pago y los pases de reserva operen de forma fluida.