export type SeasonCode = 'SPRING_SUMMER' | 'AUTUMN_WINTER' | 'BACK_TO_SCHOOL' | 'SPECIAL_PROMO';
export type GarmentCategory = 'SHIRTS' | 'PANTS' | 'DRESSES' | 'JACKETS' | 'FOOTWEAR' | 'ACCESSORIES';

export interface GarmentSize {
  id: string;
  name: string;
  orderIndex: number;
}

export interface GarmentColor {
  id: string;
  name: string;
  hexCode: string;
}

export interface Garment3DAsset {
  id: string;
  modelUrl: string;
  fileSizeBytes: number;
  scaleFactor: number;
  uploadedAt: string;
}

export interface GarmentVariant {
  id: string;
  garmentId: string;
  sku: string;
  barcode: string;
  size: GarmentSize;
  color: GarmentColor;
  price: number;
  costPrice: number;
  isActive: boolean;
  stock?: number;
  inventarios?: any[];
}

export interface GarmentProduct {
  id: string;
  name: string;
  description: string;
  category: GarmentCategory;
  collection: string;
  season: SeasonCode;
  providerId: string;
  providerName: string;
  basePrice: number;
  images: string[];
  asset3D?: Garment3DAsset;
  variants: GarmentVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: GarmentCategory;
  season?: SeasonCode;
  providerId?: string;
  isActive?: boolean;
}
