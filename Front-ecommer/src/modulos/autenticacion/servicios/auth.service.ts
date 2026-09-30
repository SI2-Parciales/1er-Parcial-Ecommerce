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
    assignedBranchName: bUser.sucursalId === 2 ? 'Sucursal Plan 3000' : 'Sucursal Central',
    isActive: bUser.estado === 'ACTIVO',
  };
}

export const authService = {
  async login(data: LoginFormData): Promise<LoginResponse> {
    const response = await apiClient.post<BackendLoginResponse>('/auth/login', {
      email: data.email.trim(),
      password: data.password,
    });

    const userSession = mapBackendUserToSession(response.data.user);
    return {
      user: userSession,
      tokens: {
        accessToken: response.data.accessToken,
        refreshToken: response.data.accessToken,
        expiresIn: 3600,
      },
    };
  },

  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await apiClient.post<BackendLoginResponse>('/auth/refresh', {
      refreshToken,
    });
    return {
      accessToken: response.data.accessToken,
      expiresIn: 3600,
    };
  },

  async me(): Promise<UserSession> {
    const response = await apiClient.get<BackendUser>('/auth/me');
    return mapBackendUserToSession(response.data);
  },

  async logout(): Promise<void> {
    return Promise.resolve();
  },
};
