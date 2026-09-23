import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import { appStorage } from '@shared/storage/mmkv';
import { ENDPOINTS } from './endpoints';

export interface ApiErrorResponse {
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
}

const BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:1234';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

interface CustomInternalRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Request Interceptor: inyecta Bearer token desde MMKV
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = appStorage.getString('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: maneja autorefresco de tokens ante 401 y estandariza errores
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  async (error: AxiosError): Promise<never> => {
    const originalRequest = error.config as CustomInternalRequestConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = appStorage.getString('refresh_token');

      // Evita bucle infinito si el error 401 provino del mismo endpoint de refresh o login
      const isAuthUrl =
        originalRequest.url?.includes(ENDPOINTS.AUTH.LOGIN) ||
        originalRequest.url?.includes(ENDPOINTS.AUTH.REFRESH);

      if (!refreshToken || isAuthUrl) {
        appStorage.removeItem('access_token');
        appStorage.removeItem('refresh_token');
        const standardError: ApiErrorResponse = {
          message:
            typeof error.response?.data === 'object' &&
            error.response?.data !== null &&
            'detail' in error.response.data &&
            typeof (error.response.data as { detail: unknown }).detail === 'string'
              ? (error.response.data as { detail: string }).detail
              : 'Sesión expirada o no autorizada',
          statusCode: 401,
          details: error.response?.data,
        };
        return Promise.reject(standardError);
      }

      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject: (err: unknown) => {
              reject(err);
            },
          });
        }) as unknown as Promise<never>;
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Instancia limpia para la llamada de refresh sin interceptores de reintento
        const refreshResponse = await axios.post<AuthTokens>(
          `${BASE_URL}${ENDPOINTS.AUTH.REFRESH}`,
          { refresh_token: refreshToken },
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          }
        );

        const newAccessToken = refreshResponse.data.access_token;
        const newRefreshToken = refreshResponse.data.refresh_token;

        if (newAccessToken) {
          appStorage.setString('access_token', newAccessToken);
          if (newRefreshToken) {
            appStorage.setString('refresh_token', newRefreshToken);
          }

          processQueue(null, newAccessToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          return apiClient(originalRequest) as unknown as Promise<never>;
        } else {
          throw new Error('No se recibió nuevo token de acceso');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        appStorage.removeItem('access_token');
        appStorage.removeItem('refresh_token');
        const standardError: ApiErrorResponse = {
          message: 'Error al renovar la sesión',
          statusCode: 401,
          details: refreshErr,
        };
        return Promise.reject(standardError);
      } finally {
        isRefreshing = false;
      }
    }

    // Estandarización de errores
    const responseData = error.response?.data;
    let errorMessage = 'Error en la comunicación con el servidor';

    if (responseData && typeof responseData === 'object') {
      if ('detail' in responseData) {
        const detail = (responseData as { detail: unknown }).detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          const firstDetail = detail[0] as { msg?: string };
          errorMessage = firstDetail.msg || errorMessage;
        }
      } else if ('message' in responseData && typeof (responseData as { message: unknown }).message === 'string') {
        errorMessage = (responseData as { message: string }).message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    const standardError: ApiErrorResponse = {
      message: errorMessage,
      statusCode: error.response?.status || 500,
      details: responseData,
    };

    return Promise.reject(standardError);
  }
);
