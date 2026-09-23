import { z } from 'zod';

export const variantItemSchema = z.object({
  id: z.string().optional(),
  sizeId: z.string().min(1, 'La talla es requerida'),
  colorId: z.string().min(1, 'El color es requerido'),
  sku: z.string().min(3, 'SKU requerido'),
  barcode: z.string().min(3, 'Código de barras requerido'),
  price: z.number().positive('El precio debe ser mayor a 0'),
  costPrice: z.number().nonnegative('El costo no puede ser negativo'),
  isActive: z.boolean(),
});

export const productFormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().min(10, 'Descripción mínima de 10 caracteres'),
  category: z.enum(['SHIRTS', 'PANTS', 'DRESSES', 'JACKETS', 'FOOTWEAR', 'ACCESSORIES']),
  collection: z.string().min(2, 'Colección requerida'),
  season: z.enum(['SPRING_SUMMER', 'AUTUMN_WINTER', 'BACK_TO_SCHOOL', 'SPECIAL_PROMO']),
  providerId: z.string().min(1, 'Debe asociar un proveedor'),
  basePrice: z.number().positive('Precio base debe ser mayor a 0'),
  images: z.array(z.string().url()).min(1, 'Debe incluir al menos una imagen'),
  asset3D: z.object({
    modelUrl: z.string().url('URL del modelo inválida'),
    fileSizeBytes: z.number().max(25 * 1024 * 1024, 'El archivo 3D no debe superar 25MB'),
    scaleFactor: z.number().min(0.1).max(5.0),
  }).optional(),
  variants: z.array(variantItemSchema).min(1, 'Debe generar al menos una variante'),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;
