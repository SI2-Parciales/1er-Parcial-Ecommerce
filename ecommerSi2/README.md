# 📱 Aplicación Móvil - FashionStore Retail 2026

Aplicación móvil de compras y probador inteligente para clientes, desarrollada con **React Native** y **Expo**, compatible con dispositivos Android, iOS y Web.

---

## 🌟 Funcionalidades Destacadas

1. **Catálogo de Prendas en Tiempo Real:**
   - Consulta de productos y variantes (tallas, colores y precios) sincronizados con la base de datos Supabase.
   - Filtrado por categorías y verificación de disponibilidad en la sucursal seleccionada.
2. **Selección de Sucursal con Coordenadas GPS:**
   - Selector en la cabecera para cambiar de tienda (`Sucursal Central - La Paz` o `Sucursal Plan 3000 - Santa Cruz`).
   - Muestra dirección física, número de probadores y coordenadas GPS reales (`lat, lng`).
3. **Probador Virtual 3D y Bolsa de Prueba (Smart Fitting Bag):**
   - Agrega prendas a una bolsa de prueba para probárselas físicamente al llegar a la tienda o visualizarlas en 3D/AR.
4. **Asistente de Estilo con Inteligencia Artificial:**
   - Recomendaciones de moda personalizadas basadas en ocasión (gala, casual, deportivo), clima y colores de temporada.
5. **Carrito de Compra y Checkout:**
   - Gestión de prendas deseadas y finalización de pedido.
6. **Autenticación de Clientes:**
   - Conexión con el backend para inicio de sesión seguro con tokens JWT.

---

## 🏗️ Arquitectura y Tecnologías

- **Plataforma:** [React Native](https://reactnative.dev/) con [Expo SDK 52](https://expo.dev/)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [NativeWind](https://www.nativewind.dev/) (Tailwind CSS adaptado a React Native)
- **Navegación:** [React Navigation v7](https://reactnavigation.org/) (Bottom Tabs + Stack Navigator)
- **Manejo de Estado Global:** [Zustand](https://github.com/pmndrs/zustand)
- **Iconos:** [Lucide React Native](https://lucide.dev/)
- **Almacenamiento Local Seguro:** Motor universal en `src/shared/storage/mmkv.ts` que previene errores de módulos nativos C++ en Expo Go o emuladores.

---

## 📁 Estructura del Código Fuente (`src/`)

```
src/
├── app/                  # Configuración de navegación y rutas principales
│   └── navigation/       # Navegadores Stack y BottomTabs
├── constants/            # Constantes de diseño
│   └── theme/            # 🎨 PALETA DE COLORES DINÁMICA (colores.ts)
├── shared/               # Componentes y utilidades compartidas
│   ├── api/              # Cliente HTTP Axios configurado para Expo
│   ├── components/       # Contenedores de pantalla y componentes visuales
│   └── storage/          # Almacenamiento local universal y síncrono
└── modulos/              # Módulos de funcionalidad en español:
    ├── autenticacion/    # Inicio de sesión, estado del cliente y almacenamiento de token
    ├── catalogo/         # Catálogo de prendas y detalle de producto
    ├── sucursales/       # Selector de tiendas y coordenadas GPS
    ├── reservas/         # Bolsa de prueba (Fitting Bag)
    ├── probador-virtual/ # Probador interactivo 3D
    ├── asistente-ia/     # Asistente de moda inteligente
    └── carrito/          # Carrito de compra y checkout
```

---

## 🎨 Paleta de Colores Dinámica en Blanco

Todos los colores de la aplicación móvil se configuran en un único archivo:
👉 `src/constants/theme/colores.ts`

```typescript
export const colores = {
  fondo: '#FFFFFF',        // Fondo blanco luminoso
  fondoSecundario: '#F8FAFC',
  tarjeta: '#FFFFFF',      // Tarjetas de prendas
  textoPrimario: '#0F172A',
  textoSecundario: '#475569',
  primario: '#2563EB',    // Azul vibrante de acento
  borde: '#E2E8F0',
  // ...
};
```

---

## ⚙️ Conexión con el Backend (`.env`)

El archivo `.env` en la raíz de `ecommerSi2` configura la URL del backend:

```env
EXPO_PUBLIC_API_URL=http://localhost:1234
```

> **Nota para dispositivos físicos:** Si pruebas la app en un teléfono físico con Expo Go conectado a la misma red Wi-Fi, cambia `localhost` por la IP local de tu computadora (por ejemplo: `http://192.168.1.50:1234`).

---

## 🚀 Cómo Ejecutar la Aplicación

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor Metro:
   ```bash
   npm start
   ```
3. Opciones de ejecución:
   - Presiona `a` para abrir en el emulador de Android.
   - Presiona `w` para abrir en el navegador web.
   - Escanea el código QR con la app **Expo Go** desde tu teléfono.

4. Verificar que no haya errores de TypeScript:
   ```bash
   npx tsc --noEmit
   ```
