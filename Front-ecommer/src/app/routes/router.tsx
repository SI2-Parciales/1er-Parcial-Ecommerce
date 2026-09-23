import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@shared/components/guards/ProtectedRoute';
import { RoleGuard } from '@shared/components/guards/RoleGuard';
import { DashboardLayout } from '@shared/components/layout/DashboardLayout';
import { LoginPage } from '@modulos/autenticacion/paginas/LoginPage';
import { ForbiddenPage } from '@shared/pages/ForbiddenPage';

// Lazy loading para optimización de bundle y partición de rutas
const DashboardGlobalPage = lazy(() =>
  import('@modulos/tableros/paginas/DashboardGlobalPage').then((m) => ({ default: m.DashboardGlobalPage }))
);
const BranchDashboardPage = lazy(() =>
  import('@modulos/tableros/paginas/BranchDashboardPage').then((m) => ({ default: m.BranchDashboardPage }))
);
const PosTerminalPage = lazy(() =>
  import('@modulos/punto-venta/paginas/PosTerminalPage').then((m) => ({ default: m.PosTerminalPage }))
);
const SalesHistoryPage = lazy(() =>
  import('@modulos/punto-venta/paginas/SalesHistoryPage').then((m) => ({ default: m.SalesHistoryPage }))
);
const ReservationsKanbanPage = lazy(() =>
  import('@modulos/reservas/paginas/ReservationsKanbanPage').then((m) => ({
    default: m.ReservationsKanbanPage,
  }))
);
const ProductListPage = lazy(() =>
  import('@modulos/catalogo/paginas/ProductListPage').then((m) => ({ default: m.ProductListPage }))
);
const ProductFormPage = lazy(() =>
  import('@modulos/catalogo/paginas/ProductFormPage').then((m) => ({ default: m.ProductFormPage }))
);
const TaxonomyManagementPage = lazy(() =>
  import('@modulos/catalogo/paginas/TaxonomyManagementPage').then((m) => ({ default: m.TaxonomyManagementPage }))
);
const SeasonsManagementPage = lazy(() =>
  import('@modulos/catalogo/paginas/SeasonsManagementPage').then((m) => ({ default: m.SeasonsManagementPage }))
);
const ProvidersManagementPage = lazy(() =>
  import('@modulos/catalogo/paginas/ProvidersManagementPage').then((m) => ({ default: m.ProvidersManagementPage }))
);
const PromotionsManagementPage = lazy(() =>
  import('@modulos/catalogo/paginas/PromotionsManagementPage').then((m) => ({ default: m.PromotionsManagementPage }))
);
const InventoryMatrixPage = lazy(() =>
  import('@modulos/inventario/paginas/InventoryMatrixPage').then((m) => ({
    default: m.InventoryMatrixPage,
  }))
);
const BranchesManagementPage = lazy(() =>
  import('@modulos/sucursales/paginas/BranchesManagementPage').then((m) => ({ default: m.BranchesManagementPage }))
);
const UsersManagementPage = lazy(() =>
  import('@modulos/usuarios/paginas/UsersManagementPage').then((m) => ({ default: m.UsersManagementPage }))
);
const AiReportsPage = lazy(() =>
  import('@modulos/asistente-ia/paginas/AiReportsPage').then((m) => ({ default: m.AiReportsPage }))
);
const SupplierPortalPage = lazy(() =>
  import('@modulos/proveedor/paginas/SupplierPortalPage').then((m) => ({ default: m.SupplierPortalPage }))
);

// Indicador de carga ligero para transiciones de ruta
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[350px] w-full">
      <div className="flex flex-col items-center gap-2.5">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-gray-500 font-medium">Cargando módulo...</span>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forbidden',
    element: <ForbiddenPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: (
              <RoleGuard allowedRoles={['ADMIN']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <DashboardGlobalPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'branch-dashboard',
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'BRANCH_MANAGER']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <BranchDashboardPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'pos',
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'BRANCH_MANAGER', 'CASHIER']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <PosTerminalPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'sales-history',
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'BRANCH_MANAGER']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <SalesHistoryPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'reservations',
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'BRANCH_MANAGER', 'CASHIER']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ReservationsKanbanPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'catalog',
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'BRANCH_MANAGER']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ProductListPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'catalog/new',
            element: (
              <RoleGuard allowedRoles={['ADMIN']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ProductFormPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'catalog/:id/edit',
            element: (
              <RoleGuard allowedRoles={['ADMIN']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ProductFormPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'taxonomy',
            element: (
              <RoleGuard allowedRoles={['ADMIN']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <TaxonomyManagementPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'seasons',
            element: (
              <RoleGuard allowedRoles={['ADMIN']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <SeasonsManagementPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'inventory',
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'BRANCH_MANAGER']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <InventoryMatrixPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'promotions',
            element: (
              <RoleGuard allowedRoles={['ADMIN']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <PromotionsManagementPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'providers',
            element: (
              <RoleGuard allowedRoles={['ADMIN']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ProvidersManagementPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'branches',
            element: (
              <RoleGuard allowedRoles={['ADMIN']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <BranchesManagementPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'users',
            element: (
              <RoleGuard allowedRoles={['ADMIN']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <UsersManagementPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'ai-assistant',
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'BRANCH_MANAGER']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <AiReportsPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'supplier-portal',
            element: (
              <RoleGuard allowedRoles={['ADMIN', 'SUPPLIER']}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <SupplierPortalPage />
                </Suspense>
              </RoleGuard>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
