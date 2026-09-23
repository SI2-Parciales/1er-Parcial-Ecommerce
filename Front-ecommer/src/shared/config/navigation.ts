import { 
  LayoutDashboard, 
  Store, 
  ShoppingBag, 
  CalendarClock, 
  Box, 
  PackageMinus, 
  Users, 
  Sparkles, 
  Receipt, 
  Tag, 
  CalendarRange, 
  Percent, 
  Building2, 
  PackagePlus 
} from 'lucide-react';
import type { UserRole } from '@core/types';

export interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: UserRole[];
}

export const navigation: NavItem[] = [
  { name: 'Dashboard Global', href: '/', icon: LayoutDashboard, roles: ['ADMIN'] },
  { name: 'Dashboard Sucursal', href: '/branch-dashboard', icon: Store, roles: ['ADMIN', 'BRANCH_MANAGER'] },
  { name: 'Punto de Venta', href: '/pos', icon: ShoppingBag, roles: ['ADMIN', 'BRANCH_MANAGER', 'CASHIER'] },
  { name: 'Reservas Probador', href: '/reservations', icon: CalendarClock, roles: ['ADMIN', 'BRANCH_MANAGER', 'CASHIER'] },
  { name: 'Auditoría Ventas', href: '/sales-history', icon: Receipt, roles: ['ADMIN', 'BRANCH_MANAGER'] },
  { name: 'Catálogo de Prendas', href: '/catalog', icon: Box, roles: ['ADMIN', 'BRANCH_MANAGER'] },
  { name: 'Taxonomía', href: '/taxonomy', icon: Tag, roles: ['ADMIN'] },
  { name: 'Temporadas', href: '/seasons', icon: CalendarRange, roles: ['ADMIN'] },
  { name: 'Inventario Global', href: '/inventory', icon: PackageMinus, roles: ['ADMIN', 'BRANCH_MANAGER'] },
  { name: 'Promociones', href: '/promotions', icon: Percent, roles: ['ADMIN'] },
  { name: 'Proveedores', href: '/providers', icon: Building2, roles: ['ADMIN'] },
  { name: 'Sucursales', href: '/branches', icon: Store, roles: ['ADMIN'] },
  { name: 'Usuarios y Roles', href: '/users', icon: Users, roles: ['ADMIN'] },
  { name: 'Asistente IA', href: '/ai-assistant', icon: Sparkles, roles: ['ADMIN', 'BRANCH_MANAGER'] },
  { name: 'Portal Proveedor', href: '/supplier-portal', icon: PackagePlus, roles: ['ADMIN', 'SUPPLIER'] },
];
