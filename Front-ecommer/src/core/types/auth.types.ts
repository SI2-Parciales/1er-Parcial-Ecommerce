export type UserRole = 'ADMIN' | 'BRANCH_MANAGER' | 'CASHIER' | 'SUPPLIER';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedBranchId?: string;
  assignedBranchName?: string;
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: UserSession;
  tokens: AuthTokens;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}
