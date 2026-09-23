import { z } from 'zod';

export const stockAdjustmentSchema = z.object({
  branchId: z.string().min(1, 'Sucursal requerida'),
  variantId: z.string().min(1, 'Variante requerida'),
  newQuantity: z.number().int().nonnegative('La cantidad debe ser mayor o igual a 0'),
  reason: z.enum(['MERMA_DANIO', 'DISCREPANCIA_AUDITORIA', 'DEVOLUCION_PROVEEDOR', 'CORRECCION_INGRESO']),
  comment: z.string().min(5, 'El comentario debe tener al menos 5 caracteres'),
});

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;
