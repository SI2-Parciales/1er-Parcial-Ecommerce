import React from 'react';
import { Store, Edit3, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import type { UserRole, UserSession } from '@core/types';

export interface FilaUsuarioTablaProps {
  user: UserSession;
  onEdit: (user: UserSession) => void;
  onDelete: (id: string, name: string) => void;
}

export const FilaUsuarioTabla: React.FC<FilaUsuarioTablaProps> = ({
  user,
  onEdit,
  onDelete,
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">Administrador</span>;
      case 'BRANCH_MANAGER':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Encargado Sucursal</span>;
      case 'CASHIER':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Cajero</span>;
      case 'SUPPLIER':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Proveedor</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">{role}</span>;
    }
  };

  return (
    <tr className="hover:bg-gray-50/70 transition">
      <td className="px-6 py-4">
        <div className="font-semibold text-gray-900">{user.name}</div>
        <div className="text-xs text-gray-500">{user.email}</div>
      </td>
      <td className="px-6 py-4">
        {getRoleBadge(user.role)}
      </td>
      <td className="px-6 py-4 text-gray-700">
        <div className="flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-gray-400" />
          <span>{user.assignedBranchName || 'No asignada / Global'}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        {user.isActive ? (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Activo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold">
            <XCircle className="w-3.5 h-3.5" /> Inactivo
          </span>
        )}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(user)}
            className="p-1.5 text-gray-500 hover:text-blue-600 transition cursor-pointer"
            title="Editar usuario"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(user.id, user.name)}
            className="p-1.5 text-gray-500 hover:text-red-600 transition cursor-pointer"
            title="Eliminar usuario"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
