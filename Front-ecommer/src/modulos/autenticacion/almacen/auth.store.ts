import { create } from 'zustand';
import type { UserSession, UserRole, AuthTokens } from '@core/types';

interface AuthState {
  user: UserSession | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeBranchId: string | null;
  
  setAuth: (user: UserSession, tokens: AuthTokens) => void;
  setAccessToken: (accessToken: string) => void;
  setActiveBranchId: (branchId: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  activeBranchId: null,

  setAuth: (user, tokens) => {
    localStorage.setItem('refreshToken', tokens.refreshToken);
    set({
      user,
      accessToken: tokens.accessToken,
      isAuthenticated: true,
      activeBranchId: user.assignedBranchId || null,
    });
  },

  setAccessToken: (accessToken) => {
    set({ accessToken, isAuthenticated: true });
  },

  setActiveBranchId: (branchId) => {
    set({ activeBranchId: branchId });
  },

  clearAuth: () => {
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      activeBranchId: null,
    });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  hasRole: (allowedRoles) => {
    const { user } = get();
    if (!user) return false;
    return allowedRoles.includes(user.role);
  },
}));
