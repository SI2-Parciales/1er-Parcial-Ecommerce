import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posService } from '../servicios/pos.service';
import { reservationService } from '@modulos/reservas/servicios/reservation.service';
import { usePosStore } from '../almacen/pos.store';
import type { PosCatalogProduct } from '../tipos/pos.types';
import { Search, QrCode, Tag, X, AlertCircle } from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface PosCatalogSelectorProps {
  branchId: string;
}

export interface PosCatalogSelectorHandle {
  focusSearch: () => void;
}

export const PosCatalogSelector = forwardRef<PosCatalogSelectorHandle, PosCatalogSelectorProps>(
  ({ branchId }, ref) => {
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [reservationCode, setReservationCode] = useState('');
    const [resError, setResError] = useState<string | null>(null);
    const [isImportingRes, setIsImportingRes] = useState(false);

    // Modal de variantes
    const [selectedProduct, setSelectedProduct] = useState<PosCatalogProduct | null>(null);

    const addItem = usePosStore((state) => state.addItem);
    const loadItemsFromReservation = usePosStore((state) => state.loadItemsFromReservation);

    useImperativeHandle(ref, () => ({
      focusSearch: () => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      },
    }));

    // Query del catálogo rápido
    const { data: products = [], isLoading } = useQuery({
      queryKey: ['pos-catalog', branchId, searchQuery],
      queryFn: () => posService.getQuickCatalog(branchId, searchQuery),
    });

    const handleProductClick = (product: PosCatalogProduct) => {
      if (product.variants.length === 1) {
        // Añadir directamente la única variante
        const v = product.variants[0];
        if (v.availableStock <= 0) {
          alert(`Sin existencias disponibles de ${product.name}`);
          return;
        }
        addItem({
          variantId: v.variantId,
          sku: v.sku,
          barcode: v.barcode,
          garmentName: product.name,
          sizeName: v.sizeName,
          colorName: v.colorName,
          unitPrice: v.price,
          quantity: 1,
          maxAvailableStock: v.availableStock,
          isFromReservation: false,
        });
      } else {
        // Desplegar modal para seleccionar talla/color
        setSelectedProduct(product);
      }
    };

    const handleSelectVariant = (variant: PosCatalogProduct['variants'][0]) => {
      if (!selectedProduct) return;
      if (variant.availableStock <= 0) {
        alert(`Sin stock disponible para ${selectedProduct.name} (${variant.sizeName} - ${variant.colorName})`);
        return;
      }

      addItem({
        variantId: variant.variantId,
        sku: variant.sku,
        barcode: variant.barcode,
        garmentName: selectedProduct.name,
        sizeName: variant.sizeName,
        colorName: variant.colorName,
        unitPrice: variant.price,
        quantity: 1,
        maxAvailableStock: variant.availableStock,
        isFromReservation: false,
      });

      setSelectedProduct(null);
    };

    const handleImportReservation = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!reservationCode.trim()) return;

      setIsImportingRes(true);
      setResError(null);

      try {
        const cleanCode = reservationCode.trim().toUpperCase();
        const reservation = await reservationService.getReservationByCode(branchId, cleanCode);

        if (!reservation) {
          setResError(`No se encontró la reserva con código ${cleanCode}`);
          return;
        }

        // Mapear prendas de la reserva a items del ticket POS
        const posItems = reservation.items.map((item) => ({
          variantId: item.variantId,
          sku: item.sku,
          barcode: item.barcode,
          garmentName: item.garmentName,
          sizeName: item.sizeName,
          colorName: item.colorName,
          unitPrice: item.price,
          quantity: 1,
          maxAvailableStock: 99, // Viene de stock reservado
          isFromReservation: true,
        }));

        loadItemsFromReservation(reservation.id, posItems);
        setReservationCode('');
      } catch (err: any) {
        setResError(err.message || 'Error al recuperar la reserva');
      } finally {
        setIsImportingRes(false);
      }
    };

    return (
      <div className="flex flex-col h-full bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        {/* Barra superior de herramientas y buscador */}
        <div className="p-4 border-b border-gray-200 space-y-3 bg-gray-50/70">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Buscador de prendas con tecla F2 */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar prenda, SKU o categoría... (F2)"
                className="w-full pl-9 pr-12 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-500 bg-gray-100 border border-gray-300 rounded">
                F2
              </kbd>
            </div>

            {/* Input para jalar reserva de probador */}
            <form onSubmit={handleImportReservation} className="flex gap-2 shrink-0">
              <div className="relative">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600" />
                <input
                  type="text"
                  value={reservationCode}
                  onChange={(e) => setReservationCode(e.target.value)}
                  placeholder="Cargar RES-XXXX..."
                  className="w-44 pl-9 pr-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-purple-900"
                />
              </div>
              <button
                type="submit"
                disabled={isImportingRes || !reservationCode.trim()}
                className="px-3 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isImportingRes ? 'Cargando...' : 'Jalar Reserva'}
              </button>
            </form>
          </div>

          {resError && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{resError}</span>
            </div>
          )}
        </div>

        {/* Cuadrícula táctil de catálogo */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Cargando catálogo de venta...
            </div>
          ) : products.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm space-y-2">
              <Tag className="w-8 h-8 stroke-1" />
              <p>No se encontraron prendas con existencias para el criterio indicado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => {
                const hasStock = product.totalStockInBranch > 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleProductClick(product)}
                    className={cn(
                      "text-left p-3 rounded-xl border transition-all flex flex-col justify-between group cursor-pointer bg-white",
                      hasStock
                        ? "border-gray-200 hover:border-blue-500 hover:shadow-md"
                        : "border-gray-200/60 bg-gray-50/60 opacity-60 cursor-not-allowed"
                    )}
                  >
                    <div>
                      {/* Imagen miniatura */}
                      <div className="w-full h-28 mb-2 rounded-lg bg-gray-100 overflow-hidden relative">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                            Sin imagen
                          </div>
                        )}
                        <span
                          className={cn(
                            "absolute top-1.5 right-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full shadow-xs",
                            hasStock
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-red-100 text-red-700 border border-red-200"
                          )}
                        >
                          {hasStock ? `${product.totalStockInBranch} disp.` : 'Agotado'}
                        </span>
                      </div>

                      {/* Info de prenda */}
                      <h4 className="font-semibold text-xs sm:text-sm text-gray-900 line-clamp-2 leading-tight">
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {product.category} · {product.variants.length} {product.variants.length === 1 ? 'var.' : 'vars.'}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-600">
                        Bs. {product.basePrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-gray-400 group-hover:text-blue-600 font-medium">
                        + Agregar
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal selector de variantes Talla/Color */}
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    Seleccionar Variante
                  </h3>
                  <p className="text-xs text-gray-500">{selectedProduct.name}</p>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 max-h-80 overflow-y-auto space-y-2">
                {selectedProduct.variants.map((variant) => {
                  const hasStock = variant.availableStock > 0;
                  return (
                    <button
                      key={variant.variantId}
                      type="button"
                      disabled={!hasStock}
                      onClick={() => handleSelectVariant(variant)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors bg-white",
                        hasStock
                          ? "hover:bg-blue-50/60 hover:border-blue-300 border-gray-200 cursor-pointer"
                          : "opacity-40 bg-gray-50 border-gray-200 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1 bg-gray-100 text-gray-800 font-bold text-xs rounded-md">
                          {variant.sizeName}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            Color: {variant.colorName}
                          </p>
                          <p className="text-xs text-gray-400 font-mono">
                            SKU: {variant.sku} · Barcode: {variant.barcode}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-sm text-blue-600">
                          Bs. {variant.price.toFixed(2)}
                        </p>
                        <p className={cn("text-xs font-medium", hasStock ? "text-green-600" : "text-red-500")}>
                          {hasStock ? `${variant.availableStock} disp.` : 'Sin stock'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded-lg cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);
