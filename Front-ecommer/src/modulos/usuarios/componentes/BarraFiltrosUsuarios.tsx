import React from 'react';
import { Search } from 'lucide-react';

export interface BarraFiltrosUsuariosProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
}

export const BarraFiltrosUsuarios: React.FC<BarraFiltrosUsuariosProps> = ({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
      <div className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o correo electrónico..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-500">Rol:</label>
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">Todos los Roles</option>
          <option value="ADMIN">Administrador</option>
          <option value="BRANCH_MANAGER">Encargado Sucursal</option>
          <option value="CASHIER">Cajero</option>
          <option value="SUPPLIER">Proveedor</option>
        </select>
      </div>
    </div>
  );
};
