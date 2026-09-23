# 🖥️ Web Backoffice - Sistema Retail Omnicanal 2026

Panel de administración y punto de venta web moderno para la gestión integral de tiendas de moda, control de inventario multitienda, catálogo de prendas y atención en caja (POS).

---

## 🏗️ Tecnologías Utilizadas

- **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Empaquetador y Servidor Dev:** [Vite 6](https://vitejs.dev/)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Enrutamiento:** [React Router v7](https://reactrouter.com/)
- **Manejo de Estado Global:** [Zustand](https://github.com/pmndrs/zustand)
- **Cliente HTTP:** [Axios](https://axios-http.com/) con interceptores de autenticación JWT
- **Validación de Formularios:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Iconografía:** [Lucide React](https://lucide.dev/) (iconografía minimalista y elegante)

---

## 📁 Estructura del Código Fuente (`src/`)

El proyecto sigue una arquitectura modular en español que agrupa el código según el dominio del negocio:

```
src/
├── app/                  # Configuración de rutas, proveedores y estilos globales
│   ├── routes/           # Definición de rutas protegidas y públicas
│   └── styles/           # Variables CSS globales y fuentes
├── core/                 # Infraestructura base reutilizable
│   ├── http/             # Cliente Axios con interceptor Bearer Token
│   ├── types/            # Tipos e interfaces globales del sistema
│   └── mock/             # Base de datos simulada de respaldo (Modo Offline)
├── shared/               # Componentes, utilidades y tema compartidos
│   ├── components/       # Componentes de layout (Sidebar, Header, etc.)
│   └── theme/            # 🎨 PALETA DE COLORES DINÁMICA (colores.ts)
└── modulos/              # Módulos de funcionalidad de negocio:
    ├── autenticacion/    # Inicio de sesión, roles y protección de rutas
    ├── tableros/         # Tablero ejecutivo con gráficos y KPIs
    ├── sucursales/       # Gestión de tiendas físicas con ubicación GPS
    ├── catalogo/         # Catálogo de prendas, variantes, tallas y colores
    ├── inventario/       # Matriz de stock, alertas de mínimo y transferencias
    ├── pos/              # Terminal Punto de Venta para cobro en mostrador
    ├── reservas/         # Gestión de reservas y probadores inteligentes
    ├── proveedores/      # Catálogo de proveedores de confección
    └── asistente-ia/     # Generador de reportes inteligentes y tendencias
```

---

## 🎨 Paleta de Colores Dinámica en Blanco

Todos los colores de la aplicación se controlan desde un único archivo:
👉 `src/shared/theme/colores.ts`

```typescript
export const colores = {
  fondo: '#FFFFFF',        // Fondo principal blanco puro
  fondoSecundario: '#F8FAFC', // Fondo suave para contenedores
  tarjeta: '#FFFFFF',      // Superficie de tarjetas
  textoPrimario: '#0F172A', // Texto de alto contraste
  textoSecundario: '#475569',
  primario: '#2563EB',    // Azul retail corporativo
  borde: '#E2E8F0',       // Líneas y divisores suaves
  // ...
};
```
Si deseas personalizar los colores del sistema, solo edita este archivo y toda la aplicación se actualizará automáticamente.

---

## 🔐 Módulos Principales y Permisos

1. **Autenticación Multi-Rol:**
   - **Administrador:** Acceso completo a todas las secciones.
   - **Encargado de Sucursal:** Control de inventario, stock local y catálogo.
   - **Cajero:** Enfoque prioritario en el Punto de Venta (POS) y cobro.
2. **Sucursales con GPS:**
   - Muestra las tiendas físicas con su ubicación exacta, número de probadores y coordenadas GPS (ej. `-16.5000, -68.1500 (GPS)`).
3. **Punto de Venta (POS):**
   - Búsqueda instantánea de prendas por nombre o código de barras.
   - Carrito de compra dinámico, cálculo de impuestos, métodos de pago (Efectivo, Tarjeta, QR) e impresión de recibo.
4. **Catálogo e Inventario:**
   - Mapeo automático de productos, colores, tallas y variantes con el backend NestJS y la base de datos Supabase.

---

## ⚙️ Variables de Entorno (`.env`)

El archivo `.env` en la raíz de este proyecto conecta la web con el servidor backend:

```env
VITE_API_URL=http://localhost:1234
```

---

## 🏃 Cómo Ejecutar el Proyecto

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar en modo desarrollo:
   ```bash
   npm run dev
   ```
3. Abrir en el navegador:
   `http://localhost:5173`

4. Compilar para producción (validación de tipos):
   ```bash
   npm run build
   ```
