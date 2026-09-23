import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { authService } from '@modulos/autenticacion/servicios/auth.service';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Store } from 'lucide-react';
import { colores } from '@shared/theme';

export function Header() {
  const { user, clearAuth, activeBranchId, setActiveBranchId } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // Ignorar errores en logout
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <header
      style={{ backgroundColor: colores.encabezado.fondo, borderColor: colores.encabezado.borde }}
      className="border-b h-16 flex items-center justify-between px-4 sm:px-6 shadow-2xs z-10"
    >
      <div className="flex items-center flex-1">
        {/* Selector de sucursales */}
        {user?.role === 'ADMIN' ? (
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-blue-600" />
            <select 
              className="block w-52 pl-3 pr-8 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-xl text-gray-900 transition"
              value={activeBranchId || ''}
              onChange={(e) => setActiveBranchId(e.target.value)}
            >
              <option value="" disabled>Seleccionar Sucursal Activa</option>
              <option value="branch-1">Sucursal Central (La Paz)</option>
              <option value="branch-2">Sucursal Equipetrol (Santa Cruz)</option>
              <option value="branch-3">Sucursal Calacoto (Zona Sur)</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <Store className="w-3.5 h-3.5 text-blue-600" />
            <span>Sucursal: {user?.assignedBranchName || 'No asignada'}</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div className="hidden md:block text-left">
            <p className="font-bold text-xs text-gray-900 leading-tight">{user?.name}</p>
            <p className="text-[10px] text-gray-500 font-medium">{user?.role}</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
