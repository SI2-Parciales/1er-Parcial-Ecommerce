# SPEC-03: Catálogo Inteligente, Filtros y Detalle de Prenda (PDP)

## 1. Identificación y Metadatos
- **ID:** SPEC-03
- **Archivo:** `.specs/03-catalog-and-product-details.md`
- **Módulo:** Catálogo de Prendas, Variantes e Inventario por Sucursal
- **Objetivo:** Implementar la exploración de prendas con paginación infinita a 60 FPS mediante `FlashList`, filtrado multicriterio, consulta de stock reactivo según la sucursal física activa, y la ficha técnica de producto (PDP) con selectores de color/talla y accesos a AR, reserva física y carrito.

---

## 2. Dependencias Requeridas
```bash
npm install @shopify/flash-list@^1.6.0
```

---

## 3. Estructura de Archivos a Crear
```text
src/features/catalog/
├── api/
│   └── catalog.service.ts
├── components/
│   ├── BranchStockBadge.tsx
│   ├── FilterDrawerModal.tsx
│   ├── ProductCard.tsx
│   ├── ProductImageCarousel.tsx
│   ├── SizeSelector.tsx
│   └── VariantColorSelector.tsx
├── hooks/
│   ├── useCatalogProducts.ts
│   └── useProductDetail.ts
├── screens/
│   ├── CatalogScreen.tsx
│   └── ProductDetailScreen.tsx
└── types/
    └── catalog.types.ts
```

---

## 4. Contratos de Datos (`catalog.types.ts`)

```typescript
export interface ProductVariant {
  id: string;
  sku: string;
  colorName: string;
  colorHex: string;
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
  stock: number;
  priceModifier?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  season: string;
  collection: string;
  images: string[];
  arTextureUrl?: string;
  arModelUrl?: string;
  variants: ProductVariant[];
}

export interface CatalogFilterParams {
  category?: string;
  season?: string;
  collection?: string;
  size?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyBranchStock?: boolean;
  branchId?: string;
  search?: string;
  page: number;
  limit: number;
}

export interface PaginatedProductsResponse {
  items: Product[];
  total: number;
  page: number;
  totalPages: number;
}
```

---

## 5. Servicio de Red (`catalog.service.ts`)

```typescript
import { apiClient } from '../../../shared/api/apiClient';
import { API_ENDPOINTS } from '../../../shared/api/endpoints';
import { CatalogFilterParams, PaginatedProductsResponse, Product } from '../types/catalog.types';

export const catalogService = {
  getProducts: async (params: CatalogFilterParams): Promise<PaginatedProductsResponse> => {
    const { data } = await apiClient.get<PaginatedProductsResponse>(
      API_ENDPOINTS.CATALOG.PRODUCTS,
      { params }
    );
    return data;
  },

  getProductById: async (id: string, branchId?: string): Promise<Product> => {
    const { data } = await apiClient.get<Product>(
      API_ENDPOINTS.CATALOG.PRODUCT_DETAIL(id),
      { params: { branchId } }
    );
    return data;
  },

  getCategories: async (): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>(API_ENDPOINTS.CATALOG.CATEGORIES);
    return data;
  },

  getSeasons: async (): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>(API_ENDPOINTS.CATALOG.SEASONS);
    return data;
  },
};
```

---

## 6. Hooks con TanStack Query

### 6.1. `useCatalogProducts.ts`
- Utiliza `useInfiniteQuery` de `@tanstack/react-query`.
- **QueryKey:** `['catalog', filters, selectedBranch?.id]`.
- **getNextPageParam:** `(lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined`.
- Devuelve `products` aplanados (`pages.flatMap(p => p.items)`), `isLoading`, `fetchNextPage`, `hasNextPage` y `refetch`.

### 6.2. `useProductDetail.ts`
- Utiliza `useQuery` de `@tanstack/react-query`.
- **QueryKey:** `['product-detail', productId, selectedBranch?.id]`.
- Consulta los datos de la prenda y el stock actualizado de sus variantes en la sucursal activa.

---

## 7. Componentes de UI

### 7.1. Tarjeta de Prenda (`ProductCard.tsx`)
- Renderiza imagen optimizada, nombre en 1 línea, precio formateado con `formatCurrency`, badge de temporada y disponibilidad rápida en la sucursal actual.
- Al pulsar, navega a `ProductDetail` con `{ productId: item.id }`.

### 7.2. Selector de Talla y Color (`SizeSelector.tsx` & `VariantColorSelector.tsx`)
- `VariantColorSelector`: Renderiza círculos con el color hexadecimal (`colorHex`), borde activo en la selección y tooltip del nombre de color.
- `SizeSelector`: Renderiza chips de tallas (`XS`, `S`, `M`, `L`, `XL`). Si una talla tiene `stock === 0` en la sucursal activa, se muestra deshabilitada con opacidad reducida y línea tachada.

### 7.3. Indicador de Stock Físico (`BranchStockBadge.tsx`)
- **Reglas de visualización basadas en la variante seleccionada:**
  - `stock >= 3`: Badge verde `Disponible en [Nombre Sucursal]`.
  - `1 <= stock < 3`: Badge ámbar `¡Últimas [N] unidades en tienda!`.
  - `stock === 0`: Badge gris `Sin stock en esta sucursal (Disponible para envío)`.

### 7.4. Carrusel de Imágenes (`ProductImageCarousel.tsx`)
- Carrusel horizontal con paginación por puntos (*dots indicator*).

### 7.5. Filtros Desplegables (`FilterDrawerModal.tsx`)
- Modal lateral/inferior para filtrar por Temporada, Categoría, Rango de Precios y Tallas.
- Botones: *"Limpiar Filtros"* y *"Aplicar Filtros"*.

---

## 8. Pantallas Principales

### 8.1. Pantalla de Exploración (`CatalogScreen.tsx`)
- **Cabecera:** `BranchHeaderSelector` a la izquierda y botón de filtros a la derecha.
- **Búsqueda:** `Input` con icono de lupa y debounce de 400ms para no saturar la API.
- **Filtro Rápido:** Fila horizontal con switch: *"Solo stock en mi tienda"* (`onlyBranchStock`).
- **Lista:** `<FlashList>` con `numColumns={2}`, `estimatedItemSize={260}`, `onEndReached` enlazado a `fetchNextPage` y `RefreshControl` para recarga manual.

### 8.2. Ficha de Detalle de Prenda (`ProductDetailScreen.tsx`)
- Header con botón para retroceder y compartir.
- Renderizado de `ProductImageCarousel`, título, categoría, colección y precio base.
- Selector de color activo y selector de talla activa.
- Renderizado contextual de `BranchStockBadge`.
- Descripción completa y composición de la prenda.
- **Barra de Acciones Fija Inferior (Fixed Bottom Bar):**
  - Botón icono: **"Probar en AR"** $\rightarrow$ Navega a `VirtualTryOn` con `{ productId, variantId }`.
  - Botón secundario: **"Reservar en Tienda"** $\rightarrow$ Agrega la variante a la bolsa de probador (máximo 5) y abre `FittingBag`.
  - Botón principal: **"Comprar"** $\rightarrow$ Agrega al carrito digital con validación de stock disponible.

---

## 9. Criterios de Aceptación
- [ ] La lista de productos se renderiza en cuadrícula de dos columnas a 60 FPS con scroll infinito.
- [ ] El switch *"Solo stock en mi tienda"* filtra de inmediato los productos sin existencias en la sucursal activa.
- [ ] Al seleccionar un color y una talla en el PDP, el stock y el SKU activo se actualizan de forma reactiva.
- [ ] Las tallas agotadas en la sucursal seleccionada se muestran visualmente deshabilitadas.
- [ ] Los botones "Probar en AR", "Reservar en Tienda" y "Comprar" exigen tener seleccionada una talla válida antes de disparar la acción.