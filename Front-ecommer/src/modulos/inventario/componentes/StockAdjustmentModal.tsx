import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../servicios/inventory.service';
import { stockAdjustmentSchema, type StockAdjustmentValues } from '../esquemas/inventory.schema';
import type { BranchStockItem } from '@core/types';
import { X, Save, Loader2, AlertTriangle } from 'lucide-react';

interface Props {
 isOpen: boolean;
 onClose: () => void;
 stockItem: BranchStockItem;
}

export function StockAdjustmentModal({ isOpen, onClose, stockItem }: Props) {
 const queryClient = useQueryClient();
 const [error, setError] = useState<string | null>(null);

 const {
 register,
 handleSubmit,
 reset,
 formState: { errors, isSubmitting },
 } = useForm<StockAdjustmentValues>({
 resolver: zodResolver(stockAdjustmentSchema),
 defaultValues: {
 branchId: stockItem.branchId,
 variantId: stockItem.variantId,
 newQuantity: stockItem.availableStock,
 reason: 'MERMA_DANIO',
 comment: '',
 },
 });

 const mutation = useMutation({
 mutationFn: inventoryService.createAdjustment,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['inventory', 'stock', stockItem.branchId] });
 reset();
 onClose();
 },
 onError: (err: any) => {
 setError(err.message || 'Error al procesar el ajuste');
 }
 });

 if (!isOpen) return null;

 const onSubmit = (data: StockAdjustmentValues) => {
 mutation.mutate(data);
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
 <div className="flex items-center justify-between p-4 border-b ">
 <h2 className="text-lg font-bold flex items-center gap-2">
 <AlertTriangle className="w-5 h-5 text-amber-500" />
 Ajuste Manual de Inventario
 </h2>
 <button onClick={onClose} className="text-gray-500 hover:text-gray-700 ">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <form onSubmit={handleSubmit(onSubmit)} className="p-4 overflow-y-auto space-y-4">
 {error && (
 <div className="p-3 rounded bg-red-50 text-red-600 text-sm">
 {error}
 </div>
 )}

 <div className="bg-gray-50 p-3 rounded-md space-y-1">
 <p className="text-sm font-medium">{stockItem.garmentName}</p>
 <p className="text-xs text-gray-500">SKU: {stockItem.sku}</p>
 <div className="flex gap-4 mt-2 text-sm">
 <span>Talla: <span className="font-medium">{stockItem.sizeName}</span></span>
 <span>Color: <span className="font-medium">{stockItem.colorName}</span></span>
 </div>
 <p className="text-xs text-gray-500 mt-2">
 Stock actual disponible: <span className="font-bold text-foreground">{stockItem.availableStock}</span>
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium mb-1">Nueva Cantidad Física</label>
 <input
 type="number"
 {...register('newQuantity', { valueAsNumber: true })}
 className="w-full text-sm border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
 />
 {errors.newQuantity && <p className="text-red-500 text-xs mt-1">{errors.newQuantity.message}</p>}
 </div>

 <div>
 <label className="block text-sm font-medium mb-1">Motivo del Ajuste</label>
 <select
 {...register('reason')}
 className="w-full text-sm border-gray-300 rounded-md px-3 py-2"
 >
 <option value="MERMA_DANIO">Merma o Daño</option>
 <option value="DISCREPANCIA_AUDITORIA">Discrepancia de Auditoría</option>
 <option value="DEVOLUCION_PROVEEDOR">Devolución a Proveedor</option>
 <option value="CORRECCION_INGRESO">Corrección de Ingreso</option>
 </select>
 {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
 </div>

 <div>
 <label className="block text-sm font-medium mb-1">Comentario / Justificación</label>
 <textarea
 {...register('comment')}
 rows={3}
 placeholder="Explique el motivo del ajuste detalladamente..."
 className="w-full text-sm border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
 />
 {errors.comment && <p className="text-red-500 text-xs mt-1">{errors.comment.message}</p>}
 </div>
 </form>

 <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 "
 >
 Cancelar
 </button>
 <button
 onClick={handleSubmit(onSubmit)}
 disabled={isSubmitting || mutation.isPending}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
 >
 {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
 Confirmar Ajuste
 </button>
 </div>
 </div>
 </div>
 );
}
