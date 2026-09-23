import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../servicios/catalog.service';
import { 
 useReactTable, 
 getCoreRowModel, 
 flexRender, 
 createColumnHelper 
} from '@tanstack/react-table';
import type { GarmentProduct } from '@core/types';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { Plus, Edit, Eye, Search } from 'lucide-react';
import { cn } from '@shared/lib/utils';

const columnHelper = createColumnHelper<GarmentProduct>();

export function ProductListPage() {
 const { hasRole, activeBranchId } = useAuthStore();
 const isAdmin = hasRole(['ADMIN']);
 
 const [search, setSearch] = React.useState('');

 const { data, isLoading } = useQuery({
 queryKey: ['catalog', 'products', { search }],
 queryFn: () => catalogService.getProducts({ search, page: 1, pageSize: 50 }),
 });

 const targetSucursalId = React.useMemo(() => {
   if (!activeBranchId) return null;
   const num = parseInt(String(activeBranchId).replace(/\D/g, ''), 10);
   return isNaN(num) ? null : num;
 }, [activeBranchId]);

 const branchHeaderLabel = React.useMemo(() => {
   if (targetSucursalId === 1) return 'Stock Central';
   if (targetSucursalId === 2) return 'Stock Plan 3000';
   return 'Stock Total';
 }, [targetSucursalId]);

 const columns = React.useMemo(() => [
 columnHelper.accessor('name', {
 header: 'Prenda',
 cell: (info) => (
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
 {info.row.original.images?.[0] && (
 <img src={info.row.original.images[0]} alt={info.getValue()} className="w-full h-full object-cover" />
 )}
 </div>
 <div>
 <p className="font-medium text-sm text-foreground">{info.getValue()}</p>
 <p className="text-xs text-gray-500">{info.row.original.category}</p>
 </div>
 </div>
 ),
 }),
 columnHelper.accessor('season', {
 header: 'Temporada',
 cell: info => <span className="text-sm">{info.getValue()}</span>,
 }),
 columnHelper.accessor('basePrice', {
 header: 'Precio Base',
 cell: info => <span className="text-sm font-medium">Bs. {info.getValue().toFixed(2)}</span>,
 }),
 columnHelper.accessor('variants', {
 header: 'Variantes',
 cell: info => <span className="text-sm text-gray-500">{info.getValue().length} vars</span>,
 }),
 columnHelper.display({
 id: 'stock',
 header: branchHeaderLabel,
 cell: (info) => {
   const vars = info.row.original.variants || [];

   // Total consolidado nacional
   const totalGlobalStock = vars.reduce((acc: number, v: any) => {
     if (Array.isArray(v.inventarios) && v.inventarios.length > 0) {
       return acc + v.inventarios.reduce((sum: number, inv: any) => sum + (inv.cantidadFisica || 0), 0);
     }
     return acc + (v.stock || 0);
   }, 0);

   // Si hay una sucursal activa seleccionada
   if (targetSucursalId !== null) {
     const branchStock = vars.reduce((acc: number, v: any) => {
       if (Array.isArray(v.inventarios) && v.inventarios.length > 0) {
         const invMatch = v.inventarios.find(
           (inv: any) => inv.sucursalId === targetSucursalId || inv.branchId === activeBranchId
         );
         return acc + (invMatch ? (invMatch.cantidadFisica || 0) : 0);
       }
       return acc + (v.stock || 0);
     }, 0);

     return (
       <div className="flex flex-col">
         <span className="font-semibold text-sm text-blue-600">
           {branchStock} uds.
         </span>
         <span className="text-[11px] text-gray-400">
           ({totalGlobalStock} uds. global)
         </span>
       </div>
     );
   }

   return (
     <div className="flex flex-col">
       <span className="font-semibold text-sm text-blue-600">
         {totalGlobalStock} uds.
       </span>
       <span className="text-[11px] text-gray-400">
         (Consolidado nacional)
       </span>
     </div>
   );
 },
 }),
 columnHelper.accessor('isActive', {
 header: 'Estado',
 cell: info => (
 <span className={cn(
 "px-2 py-1 text-xs rounded-full font-medium",
 info.getValue() ? "bg-green-100 text-green-800 " : "bg-gray-100 text-gray-800 "
 )}>
 {info.getValue() ? 'Activo' : 'Inactivo'}
 </span>
 ),
 }),
 columnHelper.display({
 id: 'actions',
 header: 'Acciones',
 cell: (info) => (
 <div className="flex justify-end gap-2">
 <button className="p-1 text-gray-500 hover:text-blue-600 transition-colors" title="Ver Variantes">
 <Eye className="w-4 h-4" />
 </button>
 {isAdmin && (
 <Link to={`/catalog/${info.row.original.id}/edit`} className="p-1 text-gray-500 hover:text-blue-600 transition-colors" title="Editar">
 <Edit className="w-4 h-4" />
 </Link>
 )}
 </div>
 ),
 }),
 ], [isAdmin, targetSucursalId, branchHeaderLabel, activeBranchId]);

 const table = useReactTable({
 data: data?.data || [],
 columns,
 getCoreRowModel: getCoreRowModel(),
 });

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <h1 className="text-2xl font-bold text-foreground">Catálogo de Prendas</h1>
 
 {isAdmin && (
 <Link
 to="/catalog/new"
 className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
 >
 <Plus className="w-4 h-4" /> Nueva Prenda
 </Link>
 )}
 </div>

 <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
 <div className="p-4 border-b border-gray-200 flex gap-4">
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
 <input
 type="text"
 placeholder="Buscar por nombre o SKU..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 text-sm border-gray-300 rounded-md "
 />
 </div>
 {/* More filters can go here */}
 </div>

 <div className="overflow-x-auto">
 <table className="min-w-full divide-y divide-gray-200 ">
 <thead className="bg-gray-50 ">
 {table.getHeaderGroups().map(headerGroup => (
 <tr key={headerGroup.id}>
 {headerGroup.headers.map(header => (
 <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
 {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
 </th>
 ))}
 </tr>
 ))}
 </thead>
 <tbody className="bg-white divide-y divide-gray-200 ">
 {isLoading ? (
 <tr>
 <td colSpan={columns.length} className="px-6 py-8 text-center text-sm text-gray-500">
 Cargando catálogo...
 </td>
 </tr>
 ) : table.getRowModel().rows.length === 0 ? (
 <tr>
 <td colSpan={columns.length} className="px-6 py-8 text-center text-sm text-gray-500">
 No se encontraron prendas.
 </td>
 </tr>
 ) : (
 table.getRowModel().rows.map(row => (
 <tr key={row.id} className="hover:bg-gray-50 transition-colors">
 {row.getVisibleCells().map(cell => (
 <td key={cell.id} className="px-6 py-4 whitespace-nowrap">
 {flexRender(cell.column.columnDef.cell, cell.getContext())}
 </td>
 ))}
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
