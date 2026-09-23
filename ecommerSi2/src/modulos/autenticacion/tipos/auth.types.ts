import type {
  UsuarioEntity,
  DireccionEntity,
  RoleEntity,
} from '@/types/database.types';

export interface UserProfile {
  id: string; // UUID usuarios.id
  name: string; // Nombre compuesto o usuarios.nombre
  email: string; // usuarios.email
  phone?: string;
  preferredBranchId?: string;

  // Atributos directos de tabla 'usuarios'
  nombre?: string;
  apellido?: string;
  rol_id?: string;
  estado?: string;
  foto_url?: string;
  creado_en?: string;
  actualizado_en?: string;

  // Dirección principal asociada (tabla 'direcciones')
  direccionPrincipal?: DireccionEntity;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, name?: string) => void;
  register: (name: string, email: string, phone?: string) => void;
  logout: () => void;
}

export type { UsuarioEntity, DireccionEntity, RoleEntity };
