import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
 Percent, 
 Plus, 
 Calendar, 
 Trash2, 
 Edit3, 
 CheckCircle2, 
 XCircle, 
 X
} from 'lucide-react';
import { mockDb } from '@core/mock/mock-db';
import type { PromotionItem } from '@core/types';

export const PromotionsManagementPage: React.FC = () => {
 const queryClient = useQueryClient();
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingPromo, setEditingPromo] = useState<PromotionItem | null>(null);

 const [formData, setFormData] = useState({
 code: '',
 title: '',
 description: '',
 discountPercentage: 15,
 startDate: '',
 endDate: '',
 isActive: true,
 });

 const { data: promotions = [] } = useQuery({
 queryKey: ['promotions'],
 queryFn: () => mockDb.getPromotions(),
 });

 const createMutation = useMutation({
 mutationFn: (payload: Omit<PromotionItem, 'id'>) => mockDb.createPromotion(payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['promotions'] });
 closeModal();
 },
 });

 const updateMutation = useMutation({
 mutationFn: ({ id, payload }: { id: string; payload: Partial<PromotionItem> }) =>
 mockDb.updatePromotion(id, payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['promotions'] });
 closeModal();
 },
 });

 const deleteMutation = useMutation({
 mutationFn: (id: string) => mockDb.deletePromotion(id),
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions'] }),
 });

 const openCreateModal = () => {
 setEditingPromo(null);
 setFormData({
 code: '',
 title: '',
 description: '',
 discountPercentage: 15,
 startDate: new Date().toISOString().split('T')[0],
 endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
 isActive: true,
 });
 setIsModalOpen(true);
 };

 const openEditModal = (promo: PromotionItem) => {
 setEditingPromo(promo);
 setFormData({
 code: promo.code,
 title: promo.title,
 description: promo.description,
 discountPercentage: promo.discountPercentage,
 startDate: promo.startDate,
 endDate: promo.endDate,
 isActive: promo.isActive,
 });
 setIsModalOpen(true);
 };

 const closeModal = () => {
 setIsModalOpen(false);
 setEditingPromo(null);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (editingPromo) {
 updateMutation.mutate({ id: editingPromo.id, payload: formData });
 } else {
 createMutation.mutate(formData);
 }
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
 <div>
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
 <Percent className="w-5 h-5" />
 </div>
 <h1 className="text-xl font-bold text-gray-900 ">
 Gestión de Promociones y Cupones
 </h1>
 </div>
 <p className="text-xs text-gray-500 mt-1">
 Configuración de campañas de descuento, cupones de fidelización y ofertas comerciales retail.
 </p>
 </div>
 <button
 onClick={openCreateModal}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs"
 >
 <Plus className="w-4 h-4" />
 Nueva Promoción
 </button>
 </div>

 {/* Grid of Promotions */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {promotions.map(promo => (
 <div
 key={promo.id}
 className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between hover:border-rose-400 transition"
 >
 <div>
 <div className="flex justify-between items-start mb-3">
 <span className="font-mono text-xs px-2.5 py-1 bg-rose-50 text-rose-700 rounded font-bold">
 {promo.code}
 </span>
 {promo.isActive ? (
 <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
 <CheckCircle2 className="w-3.5 h-3.5" /> Vigente
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
 <XCircle className="w-3.5 h-3.5" /> Expirada
 </span>
 )}
 </div>

 <div className="flex items-baseline gap-2 mb-2">
 <span className="text-3xl font-extrabold text-gray-900 ">
 {promo.discountPercentage}%
 </span>
 <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">OFF</span>
 </div>

 <h3 className="text-base font-bold text-gray-900 mb-1">
 {promo.title}
 </h3>
 <p className="text-xs text-gray-500 mb-4 leading-relaxed">
 {promo.description}
 </p>

 <div className="bg-gray-50 rounded-lg p-2.5 space-y-1 text-xs text-gray-600 mb-4">
 <div className="flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5 text-gray-400" />
 <span>Vigencia: {promo.startDate} al {promo.endDate}</span>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 ">
 <button
 onClick={() => openEditModal(promo)}
 className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-blue-600 font-medium"
 >
 <Edit3 className="w-3.5 h-3.5" /> Editar
 </button>
 <button
 onClick={() => {
 if (confirm(`¿Eliminar la promoción ${promo.title}?`)) deleteMutation.mutate(promo.id);
 }}
 className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-red-600 font-medium"
 >
 <Trash2 className="w-3.5 h-3.5" /> Eliminar
 </button>
 </div>
 </div>
 ))}
 </div>

 {/* Modal Form */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
 <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md shadow-xl overflow-hidden p-6">
 <div className="flex justify-between items-center mb-4">
 <h3 className="font-bold text-gray-900 ">
 {editingPromo ? 'Editar Promoción' : 'Crear Promoción / Descuento'}
 </h3>
 <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Código del Cupón
 </label>
 <input
 type="text"
 required
 value={formData.code}
 onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
 placeholder="VERANO20"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono font-bold"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 % de Descuento
 </label>
 <input
 type="number"
 min="1"
 max="90"
 required
 value={formData.discountPercentage}
 onChange={(e) => setFormData({ ...formData, discountPercentage: parseInt(e.target.value) || 0 })}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Título de la Campaña
 </label>
 <input
 type="text"
 required
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 placeholder="Ej. Liquidación de Temporada"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Condiciones / Descripción
 </label>
 <textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder="Aplica en compras mayores a Bs. 150..."
 rows={2}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Vigente Desde
 </label>
 <input
 type="date"
 required
 value={formData.startDate}
 onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Vigente Hasta
 </label>
 <input
 type="date"
 required
 value={formData.endDate}
 onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>
 </div>

 <div className="flex items-center gap-2 pt-2">
 <input
 type="checkbox"
 id="promoActive"
 checked={formData.isActive}
 onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
 />
 <label htmlFor="promoActive" className="text-xs font-medium text-gray-700 ">
 Promoción Activa en Carrito y Caja POS
 </label>
 </div>

 <div className="flex justify-end gap-2 pt-3">
 <button type="button" onClick={closeModal} className="px-3 py-1.5 text-sm border rounded-lg">
 Cancelar
 </button>
 <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
 {editingPromo ? 'Guardar Cambios' : 'Registrar Promoción'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
