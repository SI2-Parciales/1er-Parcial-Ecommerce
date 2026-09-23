import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { UserRole, UserSession, Branch } from '@core/types';
import type { CreateUserPayload } from '../servicios/user.service';

export interface ModalFormularioUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  editingUser: UserSession | null;
  branches: Branch[];
  onSubmit: (data: CreateUserPayload) => void;
  isPending: boolean;
}

export const ModalFormularioUsuario: React.FC<ModalFormularioUsuarioProps> = ({
  isOpen,
  onClose,
  editingUser,
  branches,
  onSubmit,
  isPending,
}) => {
  const [formData, setFormData] = useState<CreateUserPayload>({
    name: '',
    email: '',
    role: 'CASHIER',
    assignedBranchId: branches[0]?.id || 'branch-1',
    assignedBranchName: branches[0]?.name || 'Sucursal Central',
    isActive: true,
    password: '',
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        assignedBranchId: editingUser.assignedBranchId || branches[0]?.id || '',
        assignedBranchName: editingUser.assignedBranchName || branches[0]?.name || '',
        isActive: editingUser.isActive,
        password: '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'CASHIER',
        assignedBranchId: branches[0]?.id || 'branch-1',
        assignedBranchName: branches[0]?.name || 'Sucursal Central',
        isActive: true,
        password: '',
      });
    }
  }, [editingUser, branches, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedBranch = branches.find(b => b.id === formData.assignedBranchId);
    onSubmit({
      ...formData,
      assignedBranchName: selectedBranch?.name || formData.assignedBranchName,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">
            {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nombre Completo
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. Roberto Gómez"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ejemplo@fashionstore.com"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Contraseña {editingUser && '(Dejar en blanco para no modificar)'}
            </label>
            <input
              type="password"
              required={!editingUser}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Rol del Usuario
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="ADMIN">Administrador</option>
                <option value="BRANCH_MANAGER">Encargado Sucursal</option>
                <option value="CASHIER">Cajero</option>
                <option value="SUPPLIER">Proveedor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sucursal Asignada
              </label>
              <select
                value={formData.assignedBranchId}
                onChange={(e) => {
                  const br = branches.find(b => b.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    assignedBranchId: e.target.value,
                    assignedBranchName: br?.name || ''
                  });
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-xs font-medium text-gray-700 cursor-pointer">
              Usuario Activo con Permiso de Acceso
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
