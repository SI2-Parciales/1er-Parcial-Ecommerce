export const PUBLIC_ROUTE_KEY = 'auth:is-public';
export const OPTIONAL_AUTH_ROUTE_KEY = 'auth:is-optional';
export const MINIMUM_ROLE_KEY = 'auth:minimum-role';

export const ACTOR_ROLE = {
  CLIENTE: 'CLIENTE',
  CAJERO: 'CAJERO',
  ENCARGADO_SUCURSAL: 'ENCARGADO_SUCURSAL',
  ADMINISTRADOR: 'ADMINISTRADOR',
} as const;

export type ActorRole = (typeof ACTOR_ROLE)[keyof typeof ACTOR_ROLE];

export const ROLE_LEVEL: Record<ActorRole, number> = {
  CLIENTE: 1,
  CAJERO: 2,
  ENCARGADO_SUCURSAL: 3,
  ADMINISTRADOR: 4,
};
