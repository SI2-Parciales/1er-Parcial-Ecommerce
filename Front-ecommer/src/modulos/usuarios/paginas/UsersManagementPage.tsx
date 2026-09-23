import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus } from 'lucide-react';
import { userService } from '../servicios/user.service';
import type { CreateUserPayload } from '../servicios/user.service';
import { branchService } from '@modulos/sucursales/servicios/branch.service';
import type { UserSession } from '@core/types';
import { BarraFiltrosUsuarios } from '../componentes/BarraFiltrosUsuarios';
import { FilaUsuarioTabla } from '../componentes/FilaUsuarioTabla';
import { ModalFormularioUsuario } from '../componentes/ModalFormularioUsuario';

export const UsersManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSession | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => userService.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateUserPayload> }) =>
      userService.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setEditingUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleOpenCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserSession) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Eliminar al usuario ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (payload: CreateUserPayload) => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Gestión de Usuarios y Roles
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Administra cuentas de acceso, roles del sistema y asignación de personal a sucursales.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Filters Modular Bar */}
      <BarraFiltrosUsuarios
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
      />

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando usuarios...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No se encontraron usuarios registrados con los criterios seleccionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-semibold text-xs border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5">Usuario</th>
                  <th className="px-6 py-3.5">Rol de Acceso</th>
                  <th className="px-6 py-3.5">Sucursal Asignada</th>
                  <th className="px-6 py-3.5">Estado</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <FilaUsuarioTabla
                    key={user.id}
                    user={user}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Component */}
      <ModalFormularioUsuario
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingUser={editingUser}
        branches={branches}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
};
