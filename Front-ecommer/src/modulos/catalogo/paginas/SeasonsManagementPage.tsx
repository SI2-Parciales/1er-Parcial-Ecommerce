import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
 CalendarRange, 
 Plus, 
 Calendar, 
 Trash2, 
 Edit3, 
 CheckCircle2, 
 XCircle, 
 X
} from 'lucide-react';
import { mockDb } from '@core/mock/mock-db';
import type { SeasonItem } from '@core/types';

export const SeasonsManagementPage: React.FC = () => {
 const queryClient = useQueryClient();
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingSeason, setEditingSeason] = useState<SeasonItem | null>(null);

 const [formData, setFormData] = useState({
 name: '',
 code: '',
 startDate: '',
 endDate: '',
 isActive: true,
 });

 const { data: seasons = [] } = useQuery({
 queryKey: ['seasons'],
 queryFn: () => mockDb.getSeasons(),
 });

 const createMutation = useMutation({
 mutationFn: (payload: Omit<SeasonItem, 'id'>) => mockDb.createSeason(payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['seasons'] });
 closeModal();
 },
 });

 const updateMutation = useMutation({
 mutationFn: ({ id, payload }: { id: string; payload: Partial<SeasonItem> }) =>
 mockDb.updateSeason(id, payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['seasons'] });
 closeModal();
 },
 });

 const deleteMutation = useMutation({
 mutationFn: (id: string) => mockDb.deleteSeason(id),
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seasons'] }),
 });

 const openCreateModal = () => {
 setEditingSeason(null);
 setFormData({
 name: '',
 code: '',
 startDate: new Date().toISOString().split('T')[0],
 endDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
 isActive: true,
 });
 setIsModalOpen(true);
 };

 const openEditModal = (season: SeasonItem) => {
 setEditingSeason(season);
 setFormData({
 name: season.name,
 code: season.code,
 startDate: season.startDate,
 endDate: season.endDate,
 isActive: season.isActive,
 });
 setIsModalOpen(true);
 };

 const closeModal = () => {
 setIsModalOpen(false);
 setEditingSeason(null);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (editingSeason) {
 updateMutation.mutate({ id: editingSeason.id, payload: formData });
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
 <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
 <CalendarRange className="w-5 h-5" />
 </div>
 <h1 className="text-xl font-bold text-gray-900 ">
 Gestión de Temporadas y Colecciones
 </h1>
 </div>
 <p className="text-xs text-gray-500 mt-1">
 Planificación y programación de calendarios de moda comercial, lanzamientos y vigencias de catálogo.
 </p>
 </div>
 <button
 onClick={openCreateModal}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs"
 >
 <Plus className="w-4 h-4" />
 Nueva Temporada
 </button>
 </div>

 {/* Grid of Seasons */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {seasons.map(season => (
 <div
 key={season.id}
 className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between hover:border-amber-400 transition"
 >
 <div>
 <div className="flex justify-between items-start mb-3">
 <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 rounded font-semibold text-gray-600 ">
 {season.code}
 </span>
 {season.isActive ? (
 <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
 <CheckCircle2 className="w-3.5 h-3.5" /> Temporada Activa
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
 <XCircle className="w-3.5 h-3.5" /> Fuera de Temporada
 </span>
 )}
 </div>

 <h3 className="text-base font-bold text-gray-900 mb-3">
 {season.name}
 </h3>

 <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs mb-4">
 <div className="flex items-center gap-2 text-gray-600 ">
 <Calendar className="w-3.5 h-3.5 text-amber-500" />
 <span>Inicio: <strong>{season.startDate}</strong></span>
 </div>
 <div className="flex items-center gap-2 text-gray-600 ">
 <Calendar className="w-3.5 h-3.5 text-amber-500" />
 <span>Conclusión: <strong>{season.endDate}</strong></span>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 ">
 <button
 onClick={() => openEditModal(season)}
 className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-blue-600 font-medium"
 >
 <Edit3 className="w-3.5 h-3.5" /> Editar
 </button>
 <button
 onClick={() => {
 if (confirm(`¿Eliminar la temporada ${season.name}?`)) deleteMutation.mutate(season.id);
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
 {editingSeason ? 'Editar Temporada' : 'Crear Temporada de Moda'}
 </h3>
 <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Nombre Comercial de la Temporada
 </label>
 <input
 type="text"
 required
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder="Ej. Invierno 2026 Alta Costura"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Código de Temporada (Enum / Key)
 </label>
 <input
 type="text"
 required
 value={formData.code}
 onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
 placeholder="WINTER_2026"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Fecha Inicio
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
 Fecha Fin
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
 id="seasonActive"
 checked={formData.isActive}
 onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
 />
 <label htmlFor="seasonActive" className="text-xs font-medium text-gray-700 ">
 Temporada Activa para Filtros y Promociones
 </label>
 </div>

 <div className="flex justify-end gap-2 pt-3">
 <button type="button" onClick={closeModal} className="px-3 py-1.5 text-sm border rounded-lg">
 Cancelar
 </button>
 <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
 {editingSeason ? 'Guardar Cambios' : 'Registrar Temporada'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
