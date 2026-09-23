import { NavLink } from 'react-router-dom';
import { navigation } from '../../config/navigation';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { cn } from '@shared/lib/utils';
import { Menu, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { colores } from '@shared/theme';

export function Sidebar() {
  const { hasRole, user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavigation = navigation.filter((item) => hasRole(item.roles));

  // Cashiers only need POS, and they are usually locked to that screen.
  if (user?.role === 'CASHIER') {
    return null;
  }

  return (
    <aside
      style={{ backgroundColor: colores.barraLateral.fondo, borderColor: colores.barraLateral.borde }}
      className={cn("border-r text-gray-700 transition-all duration-300 flex flex-col z-20 shadow-xs", collapsed ? "w-16" : "w-64")}
    >
      <div
        style={{ borderColor: colores.bordeSutil }}
        className="h-16 flex items-center justify-between px-4 border-b"
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-black text-base text-gray-900 tracking-tight">FashionStore</span>
          </div>
        )}
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition-all",
                isActive
                  ? "bg-blue-50 text-blue-700 font-bold shadow-2xs"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )
            }
            title={collapsed ? item.name : undefined}
          >
            <item.icon className={cn("flex-shrink-0", collapsed ? "mr-0 mx-auto w-5 h-5" : "mr-3 w-4 h-4")} />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div
        style={{ borderColor: colores.bordeSutil }}
        className="p-4 border-t text-[11px] text-gray-400 flex justify-between items-center"
      >
        {!collapsed && (
          <>
            <span className="font-medium text-gray-500">Retail Core v2026</span>
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600">PROD</span>
          </>
        )}
      </div>
    </aside>
  );
}
