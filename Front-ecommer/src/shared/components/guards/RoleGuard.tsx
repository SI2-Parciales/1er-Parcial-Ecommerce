import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import type { UserRole } from '@core/types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const hasRole = useAuthStore((state) => state.hasRole);

  if (!hasRole(allowedRoles)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
