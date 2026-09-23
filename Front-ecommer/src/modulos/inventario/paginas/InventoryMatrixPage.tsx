import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper 
} from '@tanstack/react-table';
import { inventoryService } from '../servicios/inventory.service';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { StockAdjustmentModal } from '../componentes/StockAdjustmentModal';
import { StockTransferModal } from '../componentes/StockTransferModal';
import type { BranchStockItem } from '@core/types';
import { Search, AlertTriangle, ArrowRightLeft, Edit2 } from 'lucide-react';
import { cn } from '@shared/lib/utils';

const columnHelper = createColumnHelper<BranchStockItem>();

export function InventoryMatrixPage() {
  const { user, hasRole, activeBranchId, setActiveBranchId } = useAuthStore();
  const isAdmin = hasRole(['ADMIN']);
  
  // Si es BRANCH_MANAGER, la sucursal es fija, si es ADMIN, puede cambiarla
  const currentBranchId = isAdmin ? (activeBranchId || 'branch-1') : (user?.assignedBranchId || 'branch-1');

  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  
  // Modals state
  const [adjModalItem, setAdjModalItem] = useState<BranchStockItem | null>(null);
  const [transferModalItems, setTransferModalItems] = useState<BranchStockItem[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', 'stock', currentBranchId, { search, lowStockOnly }],
    queryFn: () => inventoryService.getStock(currentBranchId, { search, lowStockOnly, page: 1, pageSize: 50 }),
  });

  const handleOpenAdjustment = (item: BranchStockItem) => {
    setAdjModalItem(item);
  };

  const handleOpenTransfer = (item: BranchStockItem) => {
    setTransferModalItems([item]);
    setIsTransferModalOpen(true);
  };

  const columns = useMemo(() => [
    columnHelper.accessor('sku', {
      header: 'SKU / Código',
      cell: info => (
        <div>
          <p className="font-medium text-sm">{info.getValue()}</p>
          <p className="text-xs text-gray-500">{info.row.original.barcode}</p>
        </div>
      ),
    }),
    columnHelper.accessor('garmentName', {
      header: 'Prenda',
      cell: info => (
        <div>
          <p className="font-medium text-sm text-foreground">{info.getValue()}</p>
          <p className="text-xs text-gray-500">{info.row.original.category}</p>
        </div>
      ),
    }),
    columnHelper.accessor('sizeName', {
      header: 'Talla',
      cell: info => <span className="text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('colorName', {
      header: 'Color',
      cell: info => <span className="text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('availableStock', {
      header: 'Disponible',
      cell: info => {
        const val = info.getValue();
        const min = info.row.original.minAlertThreshold;
        const isCritical = val <= min;
        
        return (
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-bold text-sm",
              isCritical ? "text-red-600" : "text-green-600"
            )}>
              {val}
            </span>
            {isCritical && (
              <span title="Stock por debajo del umbral mínimo">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </span>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('reservedStock', {
      header: 'Reservado',
      cell: info => <span className="text-sm font-semibold text-amber-600">{info.getValue()}</span>,
    }),
    columnHelper.accessor('totalStock', {
      header: 'Total',
      cell: info => <span className="text-sm font-bold text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: (info) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => handleOpenAdjustment(info.row.original)}
            className="p-1 text-gray-500 hover:text-amber-600 transition-colors bg-gray-100 hover:bg-amber-50 border border-gray-200 rounded-lg cursor-pointer" 
            title="Ajuste Manual"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleOpenTransfer(info.row.original)}
            className="p-1 text-gray-500 hover:text-blue-600 transition-colors bg-gray-100 hover:bg-blue-50 border border-gray-200 rounded-lg cursor-pointer" 
            title="Trasladar"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>
      ),
    }),
  ], []);

  const table = useReactTable({
    data: data?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventario por Sucursal</h1>
        
        {isAdmin && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-600">Sucursal:</label>
            <select
              value={currentBranchId}
              onChange={(e) => setActiveBranchId(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg bg-white text-gray-900 px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
            >
              <option value="branch-1">Sucursal Central (La Paz)</option>
              <option value="branch-2">Sucursal Equipetrol (Santa Cruz)</option>
              <option value="branch-3">Sucursal Calacoto (Zona Sur)</option>
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center bg-gray-50/70">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <label className="flex items-center gap-2 text-sm text-gray-700 font-medium cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Solo stock crítico
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-sm text-gray-500">
                    Consultando inventario...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-sm text-gray-500">
                    No se encontraron existencias.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => {
                  const isCritical = row.original.availableStock <= row.original.minAlertThreshold;
                  return (
                    <tr 
                      key={row.id} 
                      className={cn(
                        "transition-colors",
                        isCritical ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-gray-50/70"
                      )}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-3 whitespace-nowrap text-gray-800">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {adjModalItem && (
        <StockAdjustmentModal 
          isOpen={true} 
          onClose={() => setAdjModalItem(null)} 
          stockItem={adjModalItem} 
        />
      )}

      {isTransferModalOpen && (
        <StockTransferModal 
          isOpen={true} 
          onClose={() => setIsTransferModalOpen(false)} 
          sourceItems={transferModalItems} 
          originBranchId={currentBranchId}
        />
      )}
    </div>
  );
}
