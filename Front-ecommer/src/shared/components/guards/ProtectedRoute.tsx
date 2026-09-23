import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { authService } from '@modulos/autenticacion/servicios/auth.service';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
  const { isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const [isHydrating, setIsHydrating] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const hydrateAuth = async () => {
      if (isAuthenticated) {
        setIsHydrating(false);
        return;
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        clearAuth();
        setIsHydrating(false);
        return;
      }

      try {
        const { accessToken } = await authService.refreshToken(refreshToken);
        const user = await authService.me();
        
        // Use the original refreshToken to persist it in the store
        setAuth(user, { accessToken, refreshToken, expiresIn: 3600 });
      } catch (error) {
        clearAuth();
      } finally {
        setIsHydrating(false);
      }
    };

    hydrateAuth();
  }, [isAuthenticated, setAuth, clearAuth]);

  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
