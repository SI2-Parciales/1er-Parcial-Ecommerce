import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Store, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X,
  Layers
} from 'lucide-react';
import { branchService } from '../servicios/branch.service';
import type { Branch } from '@core/types';

export const BranchesManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    city: 'Santa Cruz de la Sierra',
    fittingRooms: 4,
    isActive: true,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => branchService.getCities(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Omit<Branch, 'id'>) => branchService.createBranch(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Branch> }) =>
      branchService.updateBranch(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => branchService.deleteBranch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const openCreateModal = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: `SUC-0${branches.length + 1}`,
      address: '',
      phone: '+591 7',
      city: cities[0]?.name || 'Santa Cruz de la Sierra',
      fittingRooms: 4,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      phone: branch.phone,
      city: branch.city,
      fittingRooms: branch.fittingRooms,
      isActive: branch.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filteredBranches = branches.filter(b => {
    const matchesSearch = 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = cityFilter === 'ALL' || b.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Store className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Gestión de Ciudades y Sucursales
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Configuración de tiendas físicas, cobertura geográfica y capacidad de probadores inteligentes.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Sucursal
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar sucursal por nombre, código o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">Ciudad:</label>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todas las Ciudades</option>
            {cities.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Branches */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBranches.map(branch => (
          <div 
            key={branch.id} 
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:border-blue-300 transition relative flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-mono font-semibold">
                  {branch.code}
                </span>
                {branch.isActive ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Operativa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-red-500 font-semibold">
                    <XCircle className="w-3.5 h-3.5" /> Cerrada
                  </span>
                )}
              </div>

              <h3 className="text-base font-bold text-gray-900 mb-2">
                {branch.name}
              </h3>

              <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                  <span>{branch.address}, <strong className="text-gray-800">{branch.city}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>{branch.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Capacidad: <strong className="text-gray-900">{branch.fittingRooms} probadores</strong> habilitados</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => openEditModal(branch)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-blue-600 font-semibold cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar la sucursal ${branch.name}?`)) {
                    deleteMutation.mutate(branch.id);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-red-600 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">
                {editingBranch ? 'Editar Sucursal' : 'Registrar Nueva Sucursal'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Código Identificador
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="SUC-01"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {cities.map(c => (
                      <option key={c.id} value={c.name}>{c.name} ({c.department})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre Comercial de la Tienda
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Sucursal MegaCenter"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Dirección Física Completa
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ej. Av. Ballivián # 500, Calacoto"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Teléfono de Contacto
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+591 70011223"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cantidad de Probadores
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={formData.fittingRooms}
                    onChange={(e) => setFormData({ ...formData, fittingRooms: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="branchActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="branchActive" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Sucursal Habilitada para Operaciones y Reservas Pick & Try
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
                >
                  {editingBranch ? 'Guardar Cambios' : 'Registrar Sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
