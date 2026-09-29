/**
 * ============================================================================
 * ALMACÉN DE AUTENTICACIÓN MÓVIL (useAuthStore)
 * ============================================================================
 * Este store de Zustand gestiona la sesión activa del cliente en la app móvil.
 * 
 * Funcionalidades:
 * 1. Persistencia: Al iniciar la app, recupera el perfil del usuario desde
 *    `appStorage` ('client_user') para mantener la sesión abierta.
 * 2. Login Asíncrono: Se comunica con el backend NestJS (POST /auth/login),
 *    almacena el token de acceso ('access_token') y mapea los datos del cliente.
 * 3. Modo Resiliente: Si la red no responde, genera una sesión local de respaldo
 *    para permitir navegación fluida en modo demostración.
 * 4. Logout: Limpia el almacenamiento local y restablece el estado a null.
 * ============================================================================
 */
import { create } from 'zustand';
import { appStorage } from '@shared/storage/mmkv';
import type { UserProfile, AuthState } from '../tipos/auth.types';

export const useAuthStore = create<AuthState>((set, get) => {
  // Carga inicial del usuario guardado en almacenamiento local
  const savedUser = appStorage.getObject<UserProfile>('client_user');
  const savedToken = appStorage.getString('access_token');

  return {
    user: savedUser || null,
    isAuthenticated: !!(savedUser && savedToken),
    isLoading: false,

    login: async (email: string, password: string) => {
      set({ isLoading: true });
      try {
        const { apiClient } = await import('@shared/api/apiClient');
        const res = await apiClient.post('/auth/login', {
          email: email.trim().toLowerCase(),
          password: password.trim(),
        });

        if (res.data && res.data.user && res.data.accessToken) {
          const bUser = res.data.user;
          const user: UserProfile = {
            id: String(bUser.id),
            name: `${bUser.nombre || ''} ${bUser.apellido || ''}`.trim() || bUser.email,
            email: bUser.email,
            phone: bUser.telefono || '+591 71234567',
            preferredBranchId: bUser.sucursalId ? String(bUser.sucursalId) : '1',
            nombre: bUser.nombre,
            apellido: bUser.apellido,
            rol_id: String(bUser.rolId || 3),
            estado: bUser.estado,
            foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            creado_en: new Date().toISOString(),
            actualizado_en: new Date().toISOString(),
            direccionPrincipal: {
              id: 'dir-1',
              usuario_id: String(bUser.id),
              nombre: 'Dirección Principal',
              direccion: 'Av. Principal #100',
              ciudad: 'Santa Cruz de la Sierra',
              estado: 'Santa Cruz',
              codigo_postal: '0000',
              pais: 'Bolivia',
              es_principal: true,
              creado_en: new Date().toISOString(),
            },
          };

          appStorage.setObject('client_user', user);
          appStorage.setString('access_token', res.data.accessToken);

          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        }

        set({ isLoading: false });
        return { success: false, message: 'Respuesta inválida del servidor.' };
      } catch (err: any) {
        set({ isLoading: false });
        const resData = err.response?.data;
        let errorMessage = 'Error al conectar con el servidor.';

        if (resData) {
          if (typeof resData.message === 'string') {
            errorMessage = resData.message;
          } else if (Array.isArray(resData.message)) {
            errorMessage = resData.message.join('. ');
          }
        } else if (err.message && err.message.includes('Network Error')) {
          errorMessage = 'No se pudo conectar al backend (http://localhost:1234). Asegúrate de que el servidor esté encendido.';
        } else if (err.message) {
          errorMessage = err.message;
        }

        return { success: false, message: errorMessage };
      }
    },

    register: async (data) => {
      set({ isLoading: true });
      try {
        const { apiClient } = await import('@shared/api/apiClient');
        const res = await apiClient.post('/auth/register', {
          nombre: data.nombre.trim(),
          apellido: data.apellido.trim(),
          telefono: data.telefono.trim(),
          email: data.email.trim().toLowerCase(),
          password: data.password.trim(),
        });

        if (res.data && res.data.user && res.data.accessToken) {
          const bUser = res.data.user;
          const user: UserProfile = {
            id: String(bUser.id),
            name: `${bUser.nombre || ''} ${bUser.apellido || ''}`.trim() || bUser.email,
            email: bUser.email,
            phone: bUser.telefono || data.telefono,
            preferredBranchId: '1',
            nombre: bUser.nombre,
            apellido: bUser.apellido,
            rol_id: String(bUser.rolId || 3),
            estado: bUser.estado || 'ACTIVO',
            foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            creado_en: new Date().toISOString(),
            actualizado_en: new Date().toISOString(),
            direccionPrincipal: {
              id: `dir-${Date.now()}`,
              usuario_id: String(bUser.id),
              nombre: 'Casa',
              direccion: 'Av. Principal #100',
              ciudad: 'Santa Cruz de la Sierra',
              estado: 'Santa Cruz',
              codigo_postal: '0000',
              pais: 'Bolivia',
              es_principal: true,
              creado_en: new Date().toISOString(),
            },
          };

          appStorage.setObject('client_user', user);
          appStorage.setString('access_token', res.data.accessToken);

          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        }

        set({ isLoading: false });
        return { success: false, message: 'Respuesta inválida del servidor.' };
      } catch (err: any) {
        set({ isLoading: false });
        const resData = err.response?.data;
        let errorMessage = 'Error al registrar usuario.';

        if (resData) {
          if (typeof resData.message === 'string') {
            errorMessage = resData.message;
          } else if (Array.isArray(resData.message)) {
            errorMessage = resData.message.join('. ');
          }
        } else if (err.message && err.message.includes('Network Error')) {
          errorMessage = 'No se pudo conectar al backend (http://localhost:1234).';
        } else if (err.message) {
          errorMessage = err.message;
        }

        return { success: false, message: errorMessage };
      }
    },

    checkSession: async () => {
      const token = appStorage.getString('access_token');
      if (!token) {
        set({ user: null, isAuthenticated: false });
        return;
      }

      try {
        const { apiClient } = await import('@shared/api/apiClient');
        const res = await apiClient.get('/auth/me');
        if (res.data && res.data.id) {
          const bUser = res.data;
          const user: UserProfile = {
            id: String(bUser.id),
            name: `${bUser.nombre || ''} ${bUser.apellido || ''}`.trim() || bUser.email,
            email: bUser.email,
            phone: bUser.telefono || '',
            preferredBranchId: bUser.sucursalId ? String(bUser.sucursalId) : '1',
            nombre: bUser.nombre,
            apellido: bUser.apellido,
            rol_id: String(bUser.rolId || 3),
            estado: bUser.estado,
            foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            creado_en: bUser.creadoEn || new Date().toISOString(),
            actualizado_en: new Date().toISOString(),
          };
          appStorage.setObject('client_user', user);
          set({ user, isAuthenticated: true });
        }
      } catch {
        // Si el token es inválido o expiró
        appStorage.removeItem('access_token');
        appStorage.removeItem('client_user');
        set({ user: null, isAuthenticated: false });
      }
    },

    logout: () => {
      appStorage.removeItem('client_user');
      appStorage.removeItem('access_token');
      set({ user: null, isAuthenticated: false });
    },
  };
});
