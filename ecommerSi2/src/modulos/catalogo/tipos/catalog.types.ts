import type { ProductoEntity, ImagenProductoEntity, CategoriaEntity } from '@/types/database.types';

export interface ProductVariant {
  id: string;
  sku: string;
  barcode: string;
  sizeName: string;
  colorName: string;
  colorHex: string;
  price: number;
  availableStock: number;
}

export interface ProductItem {
  id: string; // UUID productos.id
  name: string; // productos.nombre
  description: string; // productos.descripcion
  category: 'SHIRTS' | 'PANTS' | 'DRESSES' | 'JACKETS' | 'FOOTWEAR' | 'ACCESSORIES';
  categoryLabel: string;
  season: string;
  seasonLabel: string;
  basePrice: number; // productos.precio
  rating: number;
  images: string[]; // imagenes_productos.url
  model3dUrl?: string;
  hasArTryOn?: boolean;
  arGarmentType?: 'SHIRT' | 'SHORTS';
  targetRegion?: 'TORSO' | 'WAIST';
  gender?: 'WOMEN';
  variants: ProductVariant[];
  branchStocks: Record<string, number>; // branchId -> stock total

  // Campos directos de tabla 'productos' (.specs/back-docs)
  categoria_id?: string;
  precio?: number;
  stock?: number;
  imagen_url?: string;
  estado?: string;
  creado_en?: string;
  actualizado_en?: string;
}

export type { ProductoEntity, ImagenProductoEntity, CategoriaEntity };
