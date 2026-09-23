import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
 Tag, 
 Layers, 
 Palette, 
 Ruler, 
 Plus, 
 Trash2, 
 Edit3, 
 CheckCircle2, 
 XCircle 
} from 'lucide-react';
import { catalogService } from '../servicios/catalog.service';
import type { CategoryItem, GarmentSize, GarmentColor } from '@core/types';

export const TaxonomyManagementPage: React.FC = () => {
 const queryClient = useQueryClient();
 const [activeTab, setActiveTab] = useState<'categories' | 'sizes' | 'colors'>('categories');

 // Category modal
 const [isCatModalOpen, setIsCatModalOpen] = useState(false);
 const [editingCat, setEditingCat] = useState<CategoryItem | null>(null);
 const [catForm, setCatForm] = useState({ name: '', code: '', description: '', isActive: true });

 // Size modal
 const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
 const [sizeForm, setSizeForm] = useState({ name: '', orderIndex: 1 });

 // Color modal
 const [isColorModalOpen, setIsColorModalOpen] = useState(false);
 const [colorForm, setColorForm] = useState({ name: '', hexCode: '#111827' });

 // Queries
 const { data: categories = [] } = useQuery({
 queryKey: ['categories'],
 queryFn: () => catalogService.getCategories(),
 });

 const { data: sizes = [] } = useQuery({
 queryKey: ['sizes'],
 queryFn: () => catalogService.getSizes(),
 });

 const { data: colors = [] } = useQuery({
 queryKey: ['colors'],
 queryFn: () => catalogService.getColors(),
 });

 // Mutations
 const catCreateMutation = useMutation({
 mutationFn: (payload: Omit<CategoryItem, 'id'>) => catalogService.createCategory(payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['categories'] });
 setIsCatModalOpen(false);
 },
 });

 const catUpdateMutation = useMutation({
 mutationFn: ({ id, payload }: { id: string; payload: Partial<CategoryItem> }) =>
 catalogService.updateCategory(id, payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['categories'] });
 setIsCatModalOpen(false);
 setEditingCat(null);
 },
 });

 const catDeleteMutation = useMutation({
 mutationFn: (id: string) => catalogService.deleteCategory(id),
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
 });

 const sizeCreateMutation = useMutation({
 mutationFn: (payload: Omit<GarmentSize, 'id'>) => catalogService.createSize(payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['sizes'] });
 setIsSizeModalOpen(false);
 },
 });

 const sizeDeleteMutation = useMutation({
 mutationFn: (id: string) => catalogService.deleteSize(id),
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sizes'] }),
 });

 const colorCreateMutation = useMutation({
 mutationFn: (payload: Omit<GarmentColor, 'id'>) => catalogService.createColor(payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['colors'] });
 setIsColorModalOpen(false);
 },
 });

 const colorDeleteMutation = useMutation({
 mutationFn: (id: string) => catalogService.deleteColor(id),
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['colors'] }),
 });

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
 <Tag className="w-5 h-5" />
 </div>
 <div>
 <h1 className="text-xl font-bold text-gray-900 ">
 Gestión de Categorías, Tallas y Colores
 </h1>
 <p className="text-xs text-gray-500 mt-0.5">
 Administración de la taxonomía del catálogo, escala de tallas retail y paleta de colores.
 </p>
 </div>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-gray-200 mt-6 gap-6">
 <button
 onClick={() => setActiveTab('categories')}
 className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
 activeTab === 'categories'
 ? 'border-blue-600 text-blue-600 '
 : 'border-transparent text-gray-500 hover:text-gray-700'
 }`}
 >
 <Layers className="w-4 h-4" />
 Categorías ({categories.length})
 </button>
 <button
 onClick={() => setActiveTab('sizes')}
 className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
 activeTab === 'sizes'
 ? 'border-blue-600 text-blue-600 '
 : 'border-transparent text-gray-500 hover:text-gray-700'
 }`}
 >
 <Ruler className="w-4 h-4" />
 Tallas ({sizes.length})
 </button>
 <button
 onClick={() => setActiveTab('colors')}
 className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
 activeTab === 'colors'
 ? 'border-blue-600 text-blue-600 '
 : 'border-transparent text-gray-500 hover:text-gray-700'
 }`}
 >
 <Palette className="w-4 h-4" />
 Colores ({colors.length})
 </button>
 </div>
 </div>

 {/* TAB: CATEGORÍAS */}
 {activeTab === 'categories' && (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-500">Familias de producto activas para la tienda</span>
 <button
 onClick={() => {
 setEditingCat(null);
 setCatForm({ name: '', code: '', description: '', isActive: true });
 setIsCatModalOpen(true);
 }}
 className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs"
 >
 <Plus className="w-4 h-4" /> Nueva Categoría
 </button>
 </div>

 <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
 <table className="w-full text-left text-sm">
 <thead className="bg-gray-50 text-gray-500 text-xs font-medium border-b border-gray-200 ">
 <tr>
 <th className="px-6 py-3.5">Código</th>
 <th className="px-6 py-3.5">Categoría</th>
 <th className="px-6 py-3.5">Descripción</th>
 <th className="px-6 py-3.5">Estado</th>
 <th className="px-6 py-3.5 text-right">Acciones</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-200 ">
 {categories.map(cat => (
 <tr key={cat.id} className="hover:bg-gray-50/50 transition">
 <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-600 ">
 {cat.code}
 </td>
 <td className="px-6 py-4 font-semibold text-gray-900 ">
 {cat.name}
 </td>
 <td className="px-6 py-4 text-xs text-gray-500">
 {cat.description || 'Sin descripción'}
 </td>
 <td className="px-6 py-4">
 {cat.isActive ? (
 <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
 <CheckCircle2 className="w-3.5 h-3.5" /> Visible
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
 <XCircle className="w-3.5 h-3.5" /> Oculta
 </span>
 )}
 </td>
 <td className="px-6 py-4 text-right">
 <div className="flex items-center justify-end gap-2">
 <button
 onClick={() => {
 setEditingCat(cat);
 setCatForm({
 name: cat.name,
 code: cat.code,
 description: cat.description,
 isActive: cat.isActive,
 });
 setIsCatModalOpen(true);
 }}
 className="p-1.5 text-gray-500 hover:text-blue-600"
 >
 <Edit3 className="w-4 h-4" />
 </button>
 <button
 onClick={() => {
 if (confirm(`¿Eliminar la categoría ${cat.name}?`)) {
 catDeleteMutation.mutate(cat.id);
 }
 }}
 className="p-1.5 text-gray-500 hover:text-red-600"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* TAB: TALLAS */}
 {activeTab === 'sizes' && (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-500">Escala de tallaje normalizada para prendas y calzado</span>
 <button
 onClick={() => {
 setSizeForm({ name: '', orderIndex: sizes.length + 1 });
 setIsSizeModalOpen(true);
 }}
 className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs"
 >
 <Plus className="w-4 h-4" /> Nueva Talla
 </button>
 </div>

 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
 {sizes.map(size => (
 <div
 key={size.id}
 className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs"
 >
 <div>
 <span className="text-xs text-gray-400 font-mono block">Orden #{size.orderIndex}</span>
 <strong className="text-lg font-bold text-gray-900 ">{size.name}</strong>
 </div>
 <button
 onClick={() => {
 if (confirm(`¿Eliminar talla ${size.name}?`)) sizeDeleteMutation.mutate(size.id);
 }}
 className="text-gray-400 hover:text-red-600 p-1"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* TAB: COLORES */}
 {activeTab === 'colors' && (
 <div className="space-y-4">
 <div className="flex justify-between items-center">
 <span className="text-sm text-gray-500">Paleta de colores para variantes y visualizador 3D/AR</span>
 <button
 onClick={() => {
 setColorForm({ name: '', hexCode: '#111827' });
 setIsColorModalOpen(true);
 }}
 className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs"
 >
 <Plus className="w-4 h-4" /> Nuevo Color
 </button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {colors.map(col => (
 <div
 key={col.id}
 className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-xs"
 >
 <div className="flex items-center gap-3">
 <span
 className="w-7 h-7 rounded-full border border-gray-300 shadow-inner shrink-0"
 style={{ backgroundColor: col.hexCode }}
 />
 <div>
 <h4 className="font-bold text-sm text-gray-900 ">{col.name}</h4>
 <span className="text-xs font-mono text-gray-400">{col.hexCode}</span>
 </div>
 </div>
 <button
 onClick={() => {
 if (confirm(`¿Eliminar color ${col.name}?`)) colorDeleteMutation.mutate(col.id);
 }}
 className="text-gray-400 hover:text-red-600 p-1"
 >
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* MODAL CATEGORÍA */}
 {isCatModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
 <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md shadow-xl overflow-hidden p-6">
 <h3 className="font-bold text-gray-900 text-base mb-4">
 {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
 </h3>
 <form
 onSubmit={(e) => {
 e.preventDefault();
 if (editingCat) {
 catUpdateMutation.mutate({ id: editingCat.id, payload: catForm });
 } else {
 catCreateMutation.mutate(catForm);
 }
 }}
 className="space-y-4"
 >
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre</label>
 <input
 type="text"
 required
 value={catForm.name}
 onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
 placeholder="Ej. Ropa Deportiva"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Código (Key)</label>
 <input
 type="text"
 required
 value={catForm.code}
 onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
 placeholder="SPORTSWEAR"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción</label>
 <textarea
 value={catForm.description}
 onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
 placeholder="Descripción breve..."
 rows={3}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>
 <div className="flex justify-end gap-2 pt-3">
 <button
 type="button"
 onClick={() => setIsCatModalOpen(false)}
 className="px-3 py-1.5 text-sm border rounded-lg"
 >
 Cancelar
 </button>
 <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
 Guardar
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL TALLA */}
 {isSizeModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
 <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm shadow-xl p-6">
 <h3 className="font-bold text-gray-900 text-base mb-4">Nueva Talla</h3>
 <form
 onSubmit={(e) => {
 e.preventDefault();
 sizeCreateMutation.mutate(sizeForm);
 }}
 className="space-y-4"
 >
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Talla</label>
 <input
 type="text"
 required
 value={sizeForm.name}
 onChange={(e) => setSizeForm({ ...sizeForm, name: e.target.value.toUpperCase() })}
 placeholder="Ej. XXL, 38, 42"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Posición / Orden</label>
 <input
 type="number"
 required
 value={sizeForm.orderIndex}
 onChange={(e) => setSizeForm({ ...sizeForm, orderIndex: parseInt(e.target.value) || 1 })}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>
 <div className="flex justify-end gap-2 pt-2">
 <button type="button" onClick={() => setIsSizeModalOpen(false)} className="px-3 py-1.5 text-sm border rounded-lg">
 Cancelar
 </button>
 <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
 Crear
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* MODAL COLOR */}
 {isColorModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
 <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm shadow-xl p-6">
 <h3 className="font-bold text-gray-900 text-base mb-4">Nuevo Color</h3>
 <form
 onSubmit={(e) => {
 e.preventDefault();
 colorCreateMutation.mutate(colorForm);
 }}
 className="space-y-4"
 >
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del Color</label>
 <input
 type="text"
 required
 value={colorForm.name}
 onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })}
 placeholder="Ej. Turquesa"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">Color y Código Hexadecimal</label>
 <div className="flex gap-2 items-center">
 <input
 type="color"
 value={colorForm.hexCode}
 onChange={(e) => setColorForm({ ...colorForm, hexCode: e.target.value })}
 className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
 />
 <input
 type="text"
 required
 value={colorForm.hexCode}
 onChange={(e) => setColorForm({ ...colorForm, hexCode: e.target.value })}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
 />
 </div>
 </div>
 <div className="flex justify-end gap-2 pt-2">
 <button type="button" onClick={() => setIsColorModalOpen(false)} className="px-3 py-1.5 text-sm border rounded-lg">
 Cancelar
 </button>
 <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
 Crear
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
