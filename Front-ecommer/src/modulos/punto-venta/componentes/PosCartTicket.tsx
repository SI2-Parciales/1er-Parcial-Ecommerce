import { usePosStore } from '../almacen/pos.store';
import { ShoppingBag, Trash2, Plus, Minus, UserCheck, Sparkles, CreditCard } from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface PosCartTicketProps {
  onOpenCheckout: () => void;
  onOpenBilling: () => void;
}

export function PosCartTicket({ onOpenCheckout, onOpenBilling }: PosCartTicketProps) {
  const {
    cart,
    customer,
    activeReservationId,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTaxAmount,
    getTotalAmount,
  } = usePosStore();

  const subtotal = getSubtotal();
  const taxAmount = getTaxAmount();
  const totalAmount = getTotalAmount();
  const isCartEmpty = cart.length === 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
      {/* Cabecera del Ticket */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-base text-gray-900">
            Ticket de Venta
          </h2>
          <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
            {cart.reduce((acc, it) => acc + it.quantity, 0)} ítems
          </span>
        </div>

        {!isCartEmpty && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-gray-400 hover:text-red-600 transition-colors cursor-pointer flex items-center gap-1"
            title="Vaciar ticket"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar</span>
          </button>
        )}
      </div>

      {/* Pill de Datos del Cliente / Facturación */}
      <div className="px-4 py-2.5 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="truncate">
            <span className="font-bold text-gray-900">
              {customer.businessName || 'Sin Nombre'}
            </span>
            <span className="text-gray-500 ml-1">
              (NIT/CI: {customer.taxId || '0'})
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenBilling}
          className="px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 rounded transition-colors shrink-0 cursor-pointer"
        >
          Editar (F4)
        </button>
      </div>

      {/* Notificación de Reserva Activa */}
      {activeReservationId && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-200 flex items-center justify-between text-xs text-purple-700">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prendas cargadas desde probador físico</span>
          </div>
        </div>
      )}

      {/* Lista de Prendas del Carrito */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100">
        {isCartEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <p className="font-semibold text-sm text-gray-700">
              El ticket está vacío
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
              Escanea con el lector de código de barras o selecciona prendas del catálogo táctil.
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.variantId} className="pt-3 first:pt-0 flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-semibold text-sm text-gray-900 truncate">
                    {item.garmentName}
                  </h4>
                  {item.isFromReservation && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded">
                      Probador
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <span className="font-medium">{item.sizeName}</span>
                  <span>·</span>
                  <span>{item.colorName}</span>
                  <span>·</span>
                  <span className="font-mono text-[11px]">Bs. {item.unitPrice.toFixed(2)} c/u</span>
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2.5 text-xs font-bold text-gray-900 min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxAvailableStock && !item.isFromReservation}
                      className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Remover prenda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subtotal del ítem */}
              <div className="text-right">
                <span className="font-bold text-sm text-gray-900">
                  Bs. {item.subtotal.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desglose de Totales y Liquidación */}
      <div className="p-4 bg-gray-50/80 border-t border-gray-200 space-y-3">
        <div className="space-y-1.5 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-mono font-medium">Bs. {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>IVA (13% discriminado):</span>
            <span className="font-mono">Bs. {taxAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Total General con tipografía destacada */}
        <div className="pt-2 border-t border-gray-200 flex justify-between items-baseline">
          <span className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Total General:
          </span>
          <span className="text-3xl font-black text-blue-600 font-mono tracking-tight">
            Bs. {totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Botón Principal de Cobro */}
        <button
          type="button"
          disabled={isCartEmpty}
          onClick={onOpenCheckout}
          className={cn(
            "w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer",
            isCartEmpty
              ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
              : "bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-600/25 hover:shadow-blue-600/40"
          )}
        >
          <CreditCard className="w-5 h-5" />
          <span>Cobrar (F8 / Espacio)</span>
        </button>
      </div>
    </div>
  );
}
