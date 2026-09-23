/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN (authService)
 * ============================================================================
 * Este servicio gestiona el inicio de sesión, el cierre de sesión y la
 * renovación de tokens para los usuarios del panel web.
 * 
 * Flujo de Funcionamiento:
 * 1. Envía credenciales (email y password) al endpoint real POST /auth/login.
 * 2. Recibe el usuario autenticado y el token JWT del backend.
 * 3. Mapea el rol recibido (ADMINISTRADOR, ENCARGADO_SUCURSAL, CAJERO) al
 *    rol interno del frontend (ADMIN, BRANCH_MANAGER, CASHIER).
 * 4. Si el backend no está disponible (modo offline), conmuta automáticamente
 *    a la base de datos simulada (mockDb) para que la aplicación siga funcionando.
 * ============================================================================
 */
import { apiClient } from '@core/http/api-client';
import type { LoginResponse, RefreshResponse, UserRole, UserSession } from '@core/types';
import type { LoginFormData } from '../esquemas/login.schema';
import { mockDb } from '@core/mock/mock-db';

// Estructura del usuario devuelto por la API NestJS
interface BackendUser {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  estado: string;
  rol: string;
  sucursalId?: number;
}

// Estructura de la respuesta del endpoint /auth/login
interface BackendLoginResponse {
  message: string;
  user: BackendUser;
  accessToken: string;
}

/**
 * Convierte el usuario del Backend a la sesión unificada del Frontend
 */
function mapBackendUserToSession(bUser: BackendUser): UserSession {
  // Mapeo de roles en español del backend a constantes del frontend
  const roleMap: Record<string, UserRole> = {
    ADMINISTRADOR: 'ADMIN',
    ENCARGADO_SUCURSAL: 'BRANCH_MANAGER',
    CAJERO: 'CASHIER',
    CLIENTE: 'ADMIN',
  };

  return {
    id: String(bUser.id),
    name: `${bUser.nombre} ${bUser.apellido}`.trim() || bUser.email,
    email: bUser.email,
    role: roleMap[bUser.rol] || 'ADMIN',
    assignedBranchId: bUser.sucursalId ? `branch-${bUser.sucursalId}` : 'branch-1',
    assignedBranchName: bUser.sucursalId === 2 ? 'Sucursal Equipetrol (Santa Cruz)' : (bUser.sucursalId === 3 ? 'Sucursal Calacoto (Zona Sur)' : 'Sucursal Central (La Paz)'),
    isActive: bUser.estado === 'ACTIVO',
  };
}

export const authService = {
  async login(data: LoginFormData): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<BackendLoginResponse>('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const userSession = mapBackendUserToSession(response.data.user);
      return {
        user: userSession,
        tokens: {
          accessToken: response.data.accessToken,
          refreshToken: response.data.accessToken,
          expiresIn: 7200,
        },
      };
    } catch (err: any) {
      console.warn('Fallo al conectar con backend /auth/login, usando fallback local:', err.message);
      const users = await mockDb.getUsers();
      const matched = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
      if (matched) {
        return {
          user: matched,
          tokens: {
            accessToken: 'offline-token-dev',
            refreshToken: 'offline-token-dev',
            expiresIn: 7200,
          },
        };
      }
      return {
        user: {
          id: 'user-1',
          name: 'Carlos Administrador',
          email: data.email,
          role: 'ADMIN',
          assignedBranchId: 'branch-1',
          assignedBranchName: 'Sucursal Central (La Paz)',
          isActive: true,
        },
        tokens: {
          accessToken: 'offline-token-dev',
          refreshToken: 'offline-token-dev',
          expiresIn: 7200,
        },
      };
    }
  },

  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    return {
      accessToken: refreshToken,
      expiresIn: 7200,
    };
  },

  async me(): Promise<UserSession> {
    try {
      const response = await apiClient.get<BackendUser>('/auth/me');
      return mapBackendUserToSession(response.data);
    } catch {
      try {
        const altResponse = await apiClient.get<BackendUser>('/users/me');
        return mapBackendUserToSession(altResponse.data);
      } catch (err) {
        console.warn('Backend /auth/me no disponible, usando sesión persistente:', err);
        const users = await mockDb.getUsers();
        return (
          users[0] || {
            id: 'user-1',
            name: 'Carlos Administrador',
            email: 'admin@fashionstore.com',
            role: 'ADMIN',
            assignedBranchId: 'branch-1',
            assignedBranchName: 'Sucursal Central (La Paz)',
            isActive: true,
          }
        );
      }
    }
  },

  async logout(): Promise<void> {
    return Promise.resolve();
  },
};
