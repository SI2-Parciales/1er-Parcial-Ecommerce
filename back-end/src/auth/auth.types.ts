export interface UserWithRole {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  passwordHash: string;
  estado: string;
  rol: {
    nombre: string;
  };
}

export interface PublicUser {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  estado: string;
  rol: string;
}

export interface AuthResponse {
  message: string;
  user: PublicUser;
  accessToken: string;
}
