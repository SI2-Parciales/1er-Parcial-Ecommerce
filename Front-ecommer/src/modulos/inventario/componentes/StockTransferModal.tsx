import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../servicios/inventory.service';
import type { BranchStockItem, StockTransferPayload } from '@core/types';
import { X, Send, Loader2, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface Props {
 isOpen: boolean;
 onClose: () => void;
 sourceItems: BranchStockItem[];
 originBranchId: string;
}

const getTransferSchema = (maxQuantities: Record<string, number>) => z.object({
 destinationBranchId: z.string().min(1, 'Sucursal de destino requerida'),
 notes: z.string().optional(),
 items: z.array(z.object({
 variantId: z.string(),
 quantity: z.number().min(1, 'Mínimo 1'),
 sku: z.string(),
 })).min(1, 'Debe incluir al menos un artículo')
 .superRefine((items, ctx) => {
 items.forEach((item, index) => {
 const maxAllowed = maxQuantities[item.variantId] || 0;
 if (item.quantity > maxAllowed) {
 ctx.addIssue({
 code: z.ZodIssueCode.custom,
 message: `La cantidad supera el stock disponible (${maxAllowed})`,
 path: [index, 'quantity'],
 });
 }
 });
 }),
});

export function StockTransferModal({ isOpen, onClose, sourceItems, originBranchId }: Props) {
 const queryClient = useQueryClient();
 const [error, setError] = useState<string | null>(null);

 // Map to hold max quantities for validation
 const maxQuantities = React.useMemo(() => {
 const map: Record<string, number> = {};
 sourceItems.forEach(item => {
 map[item.variantId] = item.availableStock;
 });
 return map;
 }, [sourceItems]);

 const {
 register,
 handleSubmit,
 control,
 reset,
 formState: { errors, isSubmitting },
 } = useForm<z.infer<ReturnType<typeof getTransferSchema>>>({
 resolver: zodResolver(getTransferSchema(maxQuantities)),
 defaultValues: {
 destinationBranchId: '',
 notes: '',
 items: sourceItems.map(item => ({
 variantId: item.variantId,
 quantity: 0,
 sku: item.sku,
 }))
 }
 });

 const { fields, remove } = useFieldArray({
 control,
 name: 'items'
 });

 const mutation = useMutation({
 mutationFn: (data: z.infer<ReturnType<typeof getTransferSchema>>) => {
 const payload: StockTransferPayload = {
 originBranchId,
 destinationBranchId: data.destinationBranchId,
 notes: data.notes,
 items: data.items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
 };
 return inventoryService.createTransfer(payload);
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['inventory', 'stock', originBranchId] });
 reset();
 onClose();
 },
 onError: (err: any) => {
 setError(err.message || 'Error al procesar el traslado');
 }
 });

 if (!isOpen) return null;

 const onSubmit = (data: any) => {
 // Filtrar items con cantidad > 0
 const filteredItems = data.items.filter((i: any) => i.quantity > 0);
 if (filteredItems.length === 0) {
 setError('Debe incluir al menos un artículo con cantidad mayor a 0');
 return;
 }
 mutation.mutate({ ...data, items: filteredItems });
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
 <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
 <div className="flex items-center justify-between p-4 border-b ">
 <h2 className="text-lg font-bold flex items-center gap-2">
 <Send className="w-5 h-5 text-blue-500" />
 Traslado de Mercancía
 </h2>
 <button onClick={onClose} className="text-gray-500 hover:text-gray-700 ">
 <X className="w-5 h-5" />
 </button>
 </div>
 
 <form onSubmit={handleSubmit(onSubmit)} className="p-4 overflow-y-auto space-y-6">
 {error && (
 <div className="p-3 rounded bg-red-50 text-red-600 text-sm flex items-center gap-2">
 <AlertCircle className="w-4 h-4" />
 {error}
 </div>
 )}

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium mb-1">Sucursal Origen</label>
 <input
 type="text"
 disabled
 value={originBranchId}
 className="w-full text-sm border-gray-300 rounded-md bg-gray-100 px-3 py-2 cursor-not-allowed"
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-1">Sucursal Destino</label>
 <select
 {...register('destinationBranchId')}
 className="w-full text-sm border-gray-300 rounded-md px-3 py-2"
 >
 <option value="">Seleccione destino...</option>
            <option value="branch-1">Sucursal Central (La Paz)</option>
            <option value="branch-2">Sucursal Equipetrol (Santa Cruz)</option>
            <option value="branch-3">Sucursal Calacoto (Zona Sur)</option>
          </select>
 {errors.destinationBranchId && <p className="text-red-500 text-xs mt-1">{errors.destinationBranchId.message}</p>}
 </div>
 </div>

 <div>
 <h3 className="text-sm font-medium mb-3">Artículos a Transferir</h3>
 <div className="border rounded-md overflow-hidden">
 <table className="min-w-full divide-y divide-gray-200 ">
 <thead className="bg-gray-50 ">
 <tr>
 <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
 <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disp.</th>
 <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cant. a Enviar</th>
 <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quitar</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200 ">
 {fields.map((field, index) => {
 const itemError = errors.items?.[index]?.quantity;
 const maxAllowed = maxQuantities[field.variantId] || 0;
 
 return (
 <tr key={field.id}>
 <td className="px-4 py-2 text-sm">{field.sku}</td>
 <td className="px-4 py-2 text-sm font-medium text-gray-600 ">
 {maxAllowed}
 </td>
 <td className="px-4 py-2">
 <input
 type="number"
 min="0"
 max={maxAllowed}
 {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
 className={`w-24 text-sm border rounded-md px-2 py-1 ${
 itemError ? 'border-red-500' : 'border-gray-300 '
 }`}
 />
 {itemError && <p className="text-red-500 text-xs mt-1">{itemError.message}</p>}
 </td>
 <td className="px-4 py-2 text-right">
 <button
 type="button"
 onClick={() => remove(index)}
 className="text-red-500 hover:text-red-700"
 >
 <X className="w-4 h-4 ml-auto" />
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 {fields.length === 0 && (
 <div className="p-4 text-center text-sm text-gray-500">
 No hay artículos seleccionados
 </div>
 )}
 </div>
 {errors.items?.message && <p className="text-red-500 text-xs mt-1">{errors.items.message}</p>}
 </div>

 <div>
 <label className="block text-sm font-medium mb-1">Notas Opcionales</label>
 <textarea
 {...register('notes')}
 rows={2}
 className="w-full text-sm border-gray-300 rounded-md px-3 py-2"
 />
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
 disabled={isSubmitting || mutation.isPending || fields.length === 0}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
 >
 {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
 Iniciar Traslado
 </button>
 </div>
 </div>
 </div>
 );
}
