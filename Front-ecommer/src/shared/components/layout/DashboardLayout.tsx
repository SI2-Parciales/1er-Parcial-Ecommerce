import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { colores } from '@shared/theme';

export function DashboardLayout() {
  return (
    <div
      style={{ backgroundColor: colores.fondo }}
      className="flex h-screen w-full overflow-hidden"
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main
          style={{ backgroundColor: colores.fondoSecundario }}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
