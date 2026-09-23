import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
 Building2, 
 Plus, 
 Search, 
 Mail, 
 Phone, 
 MapPin, 
 User, 
 Trash2, 
 Edit3, 
 CheckCircle2, 
 XCircle, 
 X,
 Package
} from 'lucide-react';
import { mockDb } from '@core/mock/mock-db';
import type { ProviderItem, GarmentProduct } from '@core/types';

export const ProvidersManagementPage: React.FC = () => {
 const queryClient = useQueryClient();
 const [searchTerm, setSearchTerm] = useState('');
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingProvider, setEditingProvider] = useState<ProviderItem | null>(null);

 const [formData, setFormData] = useState({
 name: '',
 code: '',
 contactName: '',
 email: '',
 phone: '',
 address: '',
 isActive: true,
 });

 const { data: providers = [] } = useQuery({
 queryKey: ['providers-detailed'],
 queryFn: () => mockDb.getProvidersDetailed(),
 });

 const { data: products } = useQuery({
 queryKey: ['products-all'],
 queryFn: () => mockDb.getProducts(),
 });

 const createMutation = useMutation({
 mutationFn: (payload: Omit<ProviderItem, 'id'>) => mockDb.createProvider(payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['providers-detailed'] });
 closeModal();
 },
 });

 const updateMutation = useMutation({
 mutationFn: ({ id, payload }: { id: string; payload: Partial<ProviderItem> }) =>
 mockDb.updateProvider(id, payload),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['providers-detailed'] });
 closeModal();
 },
 });

 const deleteMutation = useMutation({
 mutationFn: (id: string) => mockDb.deleteProvider(id),
 onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers-detailed'] }),
 });

 const openCreateModal = () => {
 setEditingProvider(null);
 setFormData({
 name: '',
 code: `PRV-0${providers.length + 1}`,
 contactName: '',
 email: '',
 phone: '+591 7',
 address: '',
 isActive: true,
 });
 setIsModalOpen(true);
 };

 const openEditModal = (provider: ProviderItem) => {
 setEditingProvider(provider);
 setFormData({
 name: provider.name,
 code: provider.code,
 contactName: provider.contactName,
 email: provider.email,
 phone: provider.phone,
 address: provider.address,
 isActive: provider.isActive,
 });
 setIsModalOpen(true);
 };

 const closeModal = () => {
 setIsModalOpen(false);
 setEditingProvider(null);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (editingProvider) {
 updateMutation.mutate({ id: editingProvider.id, payload: formData });
 } else {
 createMutation.mutate(formData);
 }
 };

 const filteredProviders = providers.filter(p =>
 p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
 p.contactName.toLowerCase().includes(searchTerm.toLowerCase())
 );

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
 <div>
 <div className="flex items-center gap-2.5">
 <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
 <Building2 className="w-5 h-5" />
 </div>
 <h1 className="text-xl font-bold text-gray-900 ">
 Gestión de Proveedores de Prendas
 </h1>
 </div>
 <p className="text-xs text-gray-500 mt-1">
 Directorio de fabricantes, distribuidores mayoristas y socios de aprovisionamiento textil.
 </p>
 </div>
 <button
 onClick={openCreateModal}
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs"
 >
 <Plus className="w-4 h-4" />
 Nuevo Proveedor
 </button>
 </div>

 {/* Search Bar */}
 <div className="relative bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
 <Search className="w-4 h-4 absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Buscar por razón social, código o persona de contacto..."
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
 />
 </div>

 {/* Providers Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {filteredProviders.map(provider => {
 const suppliedCount = products?.data ? products.data.filter((p: GarmentProduct) => p.providerId === provider.id).length : 0;
 return (
 <div
 key={provider.id}
 className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between hover:border-emerald-400 transition"
 >
 <div>
 <div className="flex justify-between items-start mb-2">
 <span className="font-mono text-xs px-2 py-0.5 bg-gray-100 rounded font-semibold text-gray-600 ">
 {provider.code}
 </span>
 {provider.isActive ? (
 <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
 <CheckCircle2 className="w-3.5 h-3.5" /> Activo
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
 <XCircle className="w-3.5 h-3.5" /> Inactivo
 </span>
 )}
 </div>

 <h3 className="text-base font-bold text-gray-900 mb-2">
 {provider.name}
 </h3>

 <div className="space-y-1.5 text-xs text-gray-600 mb-4">
 <div className="flex items-center gap-2">
 <User className="w-3.5 h-3.5 text-gray-400" />
 <span>Contacto: <strong>{provider.contactName}</strong></span>
 </div>
 <div className="flex items-center gap-2">
 <Mail className="w-3.5 h-3.5 text-gray-400" />
 <span>{provider.email}</span>
 </div>
 <div className="flex items-center gap-2">
 <Phone className="w-3.5 h-3.5 text-gray-400" />
 <span>{provider.phone}</span>
 </div>
 <div className="flex items-center gap-2">
 <MapPin className="w-3.5 h-3.5 text-gray-400" />
 <span>{provider.address}</span>
 </div>
 <div className="flex items-center gap-2 pt-1 text-emerald-600 font-medium">
 <Package className="w-3.5 h-3.5" />
 <span>{suppliedCount} prendas suministradas activas</span>
 </div>
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 ">
 <button
 onClick={() => openEditModal(provider)}
 className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-blue-600 font-medium"
 >
 <Edit3 className="w-3.5 h-3.5" /> Editar
 </button>
 <button
 onClick={() => {
 if (confirm(`¿Eliminar al proveedor ${provider.name}?`)) deleteMutation.mutate(provider.id);
 }}
 className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-red-600 font-medium"
 >
 <Trash2 className="w-3.5 h-3.5" /> Eliminar
 </button>
 </div>
 </div>
 );
 })}
 </div>

 {/* Modal Form */}
 {isModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
 <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg shadow-xl overflow-hidden p-6">
 <div className="flex justify-between items-center mb-4">
 <h3 className="font-bold text-gray-900 ">
 {editingProvider ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
 </h3>
 <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
 <X className="w-5 h-5" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Código de Proveedor
 </label>
 <input
 type="text"
 required
 value={formData.code}
 onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
 placeholder="PRV-01"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Persona de Contacto
 </label>
 <input
 type="text"
 required
 value={formData.contactName}
 onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
 placeholder="Ej. Ing. Daniel Suárez"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Razón Social / Empresa
 </label>
 <input
 type="text"
 required
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder="Ej. Confecciones Textiles del Sur S.A."
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Correo Electrónico
 </label>
 <input
 type="email"
 required
 value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 placeholder="ventas@proveedor.com"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Teléfono / Celular
 </label>
 <input
 type="text"
 required
 value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 placeholder="+591 70011223"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>
 </div>

 <div>
 <label className="block text-xs font-semibold text-gray-700 mb-1">
 Dirección de Almacenes / Oficinas
 </label>
 <input
 type="text"
 required
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 placeholder="Parque Industrial Mz. 12 Lote 4"
 className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
 />
 </div>

 <div className="flex items-center gap-2 pt-2">
 <input
 type="checkbox"
 id="provActive"
 checked={formData.isActive}
 onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
 />
 <label htmlFor="provActive" className="text-xs font-medium text-gray-700 ">
 Proveedor Habilitado para Abastecimiento
 </label>
 </div>

 <div className="flex justify-end gap-2 pt-3">
 <button type="button" onClick={closeModal} className="px-3 py-1.5 text-sm border rounded-lg">
 Cancelar
 </button>
 <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium">
 {editingProvider ? 'Guardar Cambios' : 'Registrar Proveedor'}
 </button>
 </div>
 </form>
 </div>
 </div>
 )}
 </div>
 );
};
