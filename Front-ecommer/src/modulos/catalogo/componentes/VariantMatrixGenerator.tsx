import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import type { ProductFormValues } from '../esquemas/product.schema';
import type { GarmentSize, GarmentColor } from '@core/types';
import { Trash2 } from 'lucide-react';

interface Props {
 availableSizes: GarmentSize[];
 availableColors: GarmentColor[];
}

export function VariantMatrixGenerator({ availableSizes, availableColors }: Props) {
 const { control, watch, register } = useFormContext<ProductFormValues>();
 const { fields, append, remove } = useFieldArray({
 control,
 name: 'variants',
 });

 const productName = watch('name') || '';
 const basePrice = watch('basePrice') || 0;

 const [selectedSizes, setSelectedSizes] = React.useState<string[]>([]);
 const [selectedColors, setSelectedColors] = React.useState<string[]>([]);

 const handleGenerateMatrix = () => {
 // Clear existing variants or append new ones? Let's just generate new ones for the combination.
 // In a real app we'd probably merge, but for now let's just generate the missing ones.
 const newVariants = [];

 for (const sizeId of selectedSizes) {
 for (const colorId of selectedColors) {
 // Check if exists
 const exists = fields.some(f => f.sizeId === sizeId && f.colorId === colorId);
 if (!exists) {
 const size = availableSizes.find(s => s.id === sizeId);
 const color = availableColors.find(c => c.id === colorId);
 
 if (size && color) {
 const shortName = productName.substring(0, 3).toUpperCase() || 'PRD';
 const sku = `${shortName}-${color.name.substring(0,3).toUpperCase()}-${size.name}`;
 
 newVariants.push({
 sizeId,
 colorId,
 sku,
 barcode: sku, // Default to SKU
 price: basePrice,
 costPrice: 0,
 isActive: true,
 });
 }
 }
 }
 }

 if (newVariants.length > 0) {
 append(newVariants);
 }
 };

 const toggleSize = (id: string) => {
 setSelectedSizes(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
 };

 const toggleColor = (id: string) => {
 setSelectedColors(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
 };

 return (
 <div className="space-y-6">
 <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200 ">
 <h3 className="text-lg font-medium mb-4">Generador de Variantes</h3>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <h4 className="text-sm font-medium mb-2">1. Seleccionar Tallas</h4>
 <div className="flex flex-wrap gap-2">
 {availableSizes.map(size => (
 <button
 key={size.id}
 type="button"
 onClick={() => toggleSize(size.id)}
 className={`px-3 py-1 text-sm border rounded-md transition-colors ${
 selectedSizes.includes(size.id)
 ? 'bg-blue-600 text-white border-blue-600'
 : 'bg-white text-gray-700 hover:bg-gray-50 '
 }`}
 >
 {size.name}
 </button>
 ))}
 </div>
 </div>
 
 <div>
 <h4 className="text-sm font-medium mb-2">2. Seleccionar Colores</h4>
 <div className="flex flex-wrap gap-2">
 {availableColors.map(color => (
 <button
 key={color.id}
 type="button"
 onClick={() => toggleColor(color.id)}
 className={`px-3 py-1 text-sm border rounded-md flex items-center gap-2 transition-colors ${
 selectedColors.includes(color.id)
 ? 'bg-blue-600 text-white border-blue-600'
 : 'bg-white text-gray-700 hover:bg-gray-50 '
 }`}
 >
 <span 
 className="w-3 h-3 rounded-full border border-gray-300"
 style={{ backgroundColor: color.hexCode }}
 />
 {color.name}
 </button>
 ))}
 </div>
 </div>
 </div>
 
 <div className="mt-6 flex justify-end">
 <button
 type="button"
 onClick={handleGenerateMatrix}
 disabled={selectedSizes.length === 0 || selectedColors.length === 0}
 className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
 >
 Generar Matriz
 </button>
 </div>
 </div>

 {fields.length > 0 && (
 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200 ">
 <thead className="bg-gray-50 ">
 <tr>
 <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talla</th>
 <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
 <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
 <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cód. Barras</th>
 <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
 <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
 <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
 </tr>
 </thead>
 <tbody className="bg-white divide-y divide-gray-200 ">
 {fields.map((field, index) => {
 const sizeName = availableSizes.find(s => s.id === field.sizeId)?.name || field.sizeId;
 const colorName = availableColors.find(c => c.id === field.colorId)?.name || field.colorId;

 return (
 <tr key={field.id}>
 <td className="px-3 py-2 text-sm">{sizeName}</td>
 <td className="px-3 py-2 text-sm">{colorName}</td>
 <td className="px-3 py-2">
 <input
 {...register(`variants.${index}.sku` as const)}
 className="w-full text-sm border-gray-300 rounded-md px-2 py-1"
 />
 </td>
 <td className="px-3 py-2">
 <input
 {...register(`variants.${index}.barcode` as const)}
 className="w-full text-sm border-gray-300 rounded-md px-2 py-1"
 />
 </td>
 <td className="px-3 py-2">
 <input
 type="number"
 step="0.01"
 {...register(`variants.${index}.price` as const, { valueAsNumber: true })}
 className="w-24 text-sm border-gray-300 rounded-md px-2 py-1"
 />
 </td>
 <td className="px-3 py-2">
 <input
 type="number"
 step="0.01"
 {...register(`variants.${index}.costPrice` as const, { valueAsNumber: true })}
 className="w-24 text-sm border-gray-300 rounded-md px-2 py-1"
 />
 </td>
 <td className="px-3 py-2 text-right">
 <button
 type="button"
 onClick={() => remove(index)}
 className="text-red-500 hover:text-red-700"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 )}
 </div>
 );
}
