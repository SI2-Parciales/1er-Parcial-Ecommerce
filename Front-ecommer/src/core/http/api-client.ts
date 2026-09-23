/**
 * ============================================================================
 * CLIENTE HTTP PRINCIPAL (apiClient)
 * ============================================================================
 * Este archivo configura la instancia central de Axios que utiliza toda la
 * aplicación Web para comunicarse con el servidor Backend (NestJS).
 * 
 * Funcionalidades clave:
 * 1. Configura la URL base desde las variables de entorno (por defecto http://localhost:1234).
 * 2. Interceptor de Peticiones: Agrega automáticamente el encabezado "Authorization: Bearer <token>"
 *    a todas las llamadas si el usuario ha iniciado sesión.
 * 3. Interceptor de Respuestas: Detecta errores 401 (token expirado) e intenta renovarlo
 *    de manera transparente antes de fallar.
 * ============================================================================
 */
import axios, { type InternalAxiosRequestConfig, type AxiosError } from 'axios';
import { env } from '../config/env';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { authService } from '@modulos/autenticacion/servicios/auth.service';

// Instancia de Axios con URL base y tiempo límite de 10 segundos
export const apiClient = axios.create({
  baseURL: env.VITE_API_URL,
  timeout: 10000,
});

// Control para evitar llamadas duplicadas de refresco de token simultáneas
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

/**
 * Interceptor de Petición:
 * Lee el token del almacén global Zustand (useAuthStore) y lo añade a la cabecera.
 */
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Avoid intercepting refresh or profile endpoints to prevent loops
      if (
        originalRequest.url === '/auth/refresh' ||
        originalRequest.url?.includes('/auth/me') ||
        originalRequest.url?.includes('/users/me')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      }

      try {
        const { accessToken } = await authService.refreshToken(refreshToken);
        useAuthStore.getState().setAccessToken(accessToken);
        processQueue(null, accessToken);
        
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
