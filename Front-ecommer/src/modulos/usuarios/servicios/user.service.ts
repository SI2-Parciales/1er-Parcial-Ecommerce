import { apiClient } from '@core/http/api-client';
import { mockDb } from '@core/mock/mock-db';
import type { UserRole, UserSession } from '@core/types';

export interface CreateUserPayload extends Omit<UserSession, 'id'> {
  password?: string;
}

export interface BackendRoleItem {
  id: number;
  nombre: string;
  descripcion: string;
}

const roleMapBackendToFrontend: Record<string, UserRole> = {
  ADMINISTRADOR: 'ADMIN',
  ENCARGADO_SUCURSAL: 'BRANCH_MANAGER',
  CAJERO: 'CASHIER',
  CLIENTE: 'ADMIN',
};

const roleMapFrontendToBackendId: Record<UserRole, number> = {
  ADMIN: 4,
  BRANCH_MANAGER: 3,
  CASHIER: 2,
  SUPPLIER: 1,
};

function mapBackendUserToUserSession(u: any): UserSession {
  const roleName = u.rol?.nombre || u.rol || 'CLIENTE';
  const role = roleMapBackendToFrontend[roleName] || 'ADMIN';
  const branchId = u.sucursalId ? `branch-${u.sucursalId}` : undefined;
  const branchName = u.sucursalId === 2 
    ? 'Sucursal Plan 3000' 
    : (u.sucursalId === 1 ? 'Sucursal Central' : undefined);

  return {
    id: String(u.id),
    email: u.email,
    name: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email,
    role,
    assignedBranchId: branchId,
    assignedBranchName: branchName,
    isActive: u.estado === 'ACTIVO',
  };
}

export const userService = {
  async getUsers(): Promise<UserSession[]> {
    try {
      const response = await apiClient.get<any>('/users', { params: { limit: 100 } });
      const rawList = response.data?.data || response.data;
      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList.map(mapBackendUserToUserSession);
      }
    } catch (err: any) {
      console.warn('Backend /users no disponible, usando fallback:', err.message);
    }
    return mockDb.getUsers();
  },

  async getRoles(): Promise<BackendRoleItem[]> {
    try {
      const response = await apiClient.get<BackendRoleItem[]>('/roles');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
    } catch {
      // Fallback
    }
    return [
      { id: 4, nombre: 'ADMINISTRADOR', descripcion: 'Acceso total y configuración de la tienda' },
      { id: 3, nombre: 'ENCARGADO_SUCURSAL', descripcion: 'Gestión operativa y movimientos de sucursal' },
      { id: 2, nombre: 'CAJERO', descripcion: 'Terminal táctil de cobro y punto de venta' },
      { id: 1, nombre: 'CLIENTE', descripcion: 'Comprador digital' },
    ];
  },

  async createUser(payload: CreateUserPayload): Promise<UserSession> {
    try {
      const nameParts = (payload.name || '').trim().split(' ');
      const nombre = nameParts[0] || 'Usuario';
      const apellido = nameParts.slice(1).join(' ') || 'Retail';
      const rolId = roleMapFrontendToBackendId[payload.role] || 2;
      const sucursalNum = payload.assignedBranchId 
        ? parseInt(payload.assignedBranchId.replace(/\D/g, ''), 10) 
        : null;

      const response = await apiClient.post<any>('/users', {
        nombre,
        apellido,
        telefono: '70000000',
        email: payload.email,
        password: payload.password || 'Admin123,',
        rolId,
        sucursalId: !isNaN(sucursalNum as number) && (sucursalNum as number) > 0 ? sucursalNum : null,
        estado: payload.isActive !== false ? 'ACTIVO' : 'INACTIVO',
      });

      if (response.data && response.data.id) {
        return mapBackendUserToUserSession(response.data);
      }
    } catch (err: any) {
      console.warn('Backend POST /users falló, guardando en fallback local:', err.message);
    }
    return mockDb.createUser(payload);
  },

  async updateUser(id: string, payload: Partial<CreateUserPayload>): Promise<UserSession> {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        const updateData: Record<string, any> = {};
        if (payload.name) {
          const parts = payload.name.trim().split(' ');
          updateData.nombre = parts[0];
          updateData.apellido = parts.slice(1).join(' ') || parts[0];
        }
        if (payload.email) updateData.email = payload.email;
        if (payload.role) updateData.rolId = roleMapFrontendToBackendId[payload.role] || 2;
        if (payload.isActive !== undefined) {
          updateData.estado = payload.isActive ? 'ACTIVO' : 'INACTIVO';
        }

        const response = await apiClient.patch<any>(`/users/${numId}`, updateData);
        if (response.data && response.data.id) {
          return mapBackendUserToUserSession(response.data);
        }
      }
    } catch (err: any) {
      console.warn(`Backend PATCH /users/${id} falló:`, err.message);
    }
    return mockDb.updateUser(id, payload);
  },

  async deleteUser(id: string): Promise<void> {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiClient.delete(`/users/${numId}`);
        return;
      }
    } catch (err: any) {
      console.warn(`Backend DELETE /users/${id} falló:`, err.message);
    }
    return mockDb.deleteUser(id);
  },
};

