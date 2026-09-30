export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  BRANCHES: {
    CITIES: '/sucursales',
    BY_CITY: (city: string): string => `/sucursales?city=${encodeURIComponent(city)}`,
    BY_ID: (id: string): string => `/sucursales/${id}`,
  },
  CATALOG: {
    PRODUCTS: '/productos',
    PRODUCT_BY_ID: (id: string): string => `/productos/${id}`,
    CATEGORIES: '/categorias',
    SEASONS: '/temporadas',
  },
  CART: {
    BASE: '/carrito',
    BRANCH: '/carrito/sucursal',
    DETAILS: '/carrito/detalles',
    DETAIL_BY_ID: (id: number | string): string => `/carrito/detalles/${id}`,
  },
  VENTAS: {
    PRESENCIALES: '/ventas/presenciales',
    DIGITALES: '/ventas/digitales',
  },
  PAYMENTS: {
    ELECTRONIC: (ventaId: number | string): string => `/ventas/${ventaId}/pagos/electronico`,
    CAJA: (ventaId: number | string): string => `/ventas/${ventaId}/pagos/caja`,
  },
  INVENTORY: {
    PUBLIC_VARIANT: (varianteId: number | string): string => `/inventario/publico/variantes/${varianteId}`,
  },
  RESERVAS: {
    BASE: '/reservas',
    BY_ID: (id: number | string): string => `/reservas/${id}`,
    UPDATE_DETAIL: (id: number | string, detailId: number | string): string => `/reservas/${id}/detalles/${detailId}`,
    REMOVE_DETAIL: (id: number | string, detailId: number | string): string => `/reservas/${id}/detalles/${detailId}`,
    CANCEL: (id: number | string): string => `/reservas/${id}`,
    START_PREPARATION: (id: number | string): string => `/reservas/${id}/iniciar-preparacion`,
    FINALIZE: (id: number | string): string => `/reservas/${id}/finalizar`,
  },
  RESERVATIONS: {
    BASE: '/reservas',
    AVAILABLE_SLOTS: '/reservas',
    MY_RESERVATIONS: '/reservas',
    CANCEL: (id: string | number): string => `/reservas/${id}`,
  },
  ORDERS: {
    CHECKOUT_GATEWAY: '/ventas/digitales',
    CHECKOUT_QR: '/ventas/digitales',
    MY_ORDERS: '/ventas/mis-compras',
    BY_ID: (id: string): string => `/ventas/${id}`,
  },
  AI: {
    ASSISTANT: '/ai/assistant',
  },
} as const;
