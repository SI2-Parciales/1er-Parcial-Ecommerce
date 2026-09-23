import { useState, useEffect, useRef } from 'react';
import { usePosStore } from '../almacen/pos.store';
import { posService } from '../servicios/pos.service';
import { useNetworkSync } from '../ganchos/useNetworkSync';
import type { PaymentMethod, SaleReceipt } from '../tipos/pos.types';
import { 
  X, 
  Banknote, 
  CreditCard, 
  QrCode, 
  CheckCircle, 
  Loader2, 
  AlertTriangle
} from 'lucide-react';
import { cn } from '@shared/lib/utils';

interface PosCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  cashierId: string;
  onSaleSuccess: (receipt: SaleReceipt) => void;
}

export function PosCheckoutModal({
  isOpen,
  onClose,
  branchId,
  cashierId,
  onSaleSuccess,
}: PosCheckoutModalProps) {
  const { isOnline } = useNetworkSync();
  const {
    cart,
    customer,
    activeReservationId,
    paymentMethod,
    amountTendered,
    setPaymentMethod,
    setAmountTendered,
    getSubtotal,
    getTaxAmount,
    getTotalAmount,
    getChangeDue,
    setLastCompletedSale,
    resetSaleSession,
  } = usePosStore();

  const totalAmount = getTotalAmount();
  const subtotal = getSubtotal();
  const taxAmount = getTaxAmount();
  const changeDue = getChangeDue();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardVoucher, setCardVoucher] = useState('');
  const cashInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (paymentMethod === 'CASH') {
        // Por defecto sugerir monto exacto si amountTendered es 0
        if (amountTendered === 0) {
          setAmountTendered(totalAmount);
        }
        setTimeout(() => {
          cashInputRef.current?.focus();
          cashInputRef.current?.select();
        }, 100);
      } else {
        setAmountTendered(totalAmount);
      }
    }
  }, [isOpen, paymentMethod, totalAmount, amountTendered, setAmountTendered]);

  if (!isOpen) return null;

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method !== 'CASH') {
      setAmountTendered(totalAmount);
    }
  };

  const handleAddBill = (amountToAdd: number) => {
    const current = amountTendered || 0;
    setAmountTendered(current + amountToAdd);
  };

  const handleExactAmount = () => {
    setAmountTendered(totalAmount);
  };

  const isCashInsufficient = paymentMethod === 'CASH' && amountTendered < totalAmount;
  const isSubmitDisabled = isProcessing || cart.length === 0 || isCashInsufficient;

  const handleProcessSale = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitDisabled) return;

    setIsProcessing(true);
    setError(null);

    try {
      const payload = {
        branchId,
        cashierId,
        reservationId: activeReservationId || undefined,
        customer,
        items: cart.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          isFromReservation: item.isFromReservation,
        })),
        paymentMethod,
        amountTendered,
        changeDue: paymentMethod === 'CASH' ? changeDue : 0,
        subtotal,
        taxAmount,
        totalAmount,
      };

      const receipt = await posService.processSale(payload);
      setLastCompletedSale(receipt);
      resetSaleSession();
      onSaleSuccess(receipt);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al registrar la transacción de cobro');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
          <div>
            <h3 className="font-bold text-lg text-gray-900">
              Liquidación y Cobro
            </h3>
            <p className="text-xs text-gray-500">
              {cart.length} prendas · Cliente: {customer.businessName} (NIT: {customer.taxId})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Banner de Total Destacado */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 text-white flex items-center justify-between shadow-md">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
                Total a Cobrar
              </p>
              <h2 className="text-3xl font-black font-mono tracking-tight mt-0.5">
                Bs. {totalAmount.toFixed(2)}
              </h2>
            </div>
            <div className="text-right text-xs text-blue-100 space-y-0.5">
              <p>Subtotal: Bs. {subtotal.toFixed(2)}</p>
              <p>IVA 13%: Bs. {taxAmount.toFixed(2)}</p>
            </div>
          </div>

          {/* Selector de Método de Pago */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Forma de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPaymentMethod('CASH')}
                className={cn(
                  "p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-semibold text-xs transition-all cursor-pointer",
                  paymentMethod === 'CASH'
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                )}
              >
                <Banknote className="w-5 h-5" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPaymentMethod('DEBIT_CARD')}
                className={cn(
                  "p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-semibold text-xs transition-all cursor-pointer",
                  paymentMethod === 'DEBIT_CARD' || paymentMethod === 'CREDIT_CARD'
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                )}
              >
                <CreditCard className="w-5 h-5" />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPaymentMethod('QR_TRANSFER')}
                className={cn(
                  "p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-semibold text-xs transition-all cursor-pointer",
                  paymentMethod === 'QR_TRANSFER'
                    ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                    : "border-gray-200 text-gray-700 hover:bg-gray-50"
                )}
              >
                <QrCode className="w-5 h-5" />
                <span>Pago QR</span>
              </button>
            </div>
          </div>

          {/* Panel Específico: Efectivo */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Monto Recibido en Efectivo (Bs.)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                    Bs.
                  </span>
                  <input
                    ref={cashInputRef}
                    type="number"
                    step="0.50"
                    min="0"
                    value={amountTendered || ''}
                    onChange={(e) => setAmountTendered(parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSubmitDisabled) {
                        e.preventDefault();
                        handleProcessSale();
                      }
                    }}
                    className="w-full pl-11 pr-4 py-2.5 text-lg font-mono font-bold bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Botones de Denominaciones Rápidas de Billetes */}
              <div>
                <p className="text-[11px] font-medium text-gray-500 mb-1.5">
                  Billetes Rápidos:
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={handleExactAmount}
                    className="px-2 py-2 text-xs font-bold bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Exacto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBill(20)}
                    className="px-2 py-2 text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                  >
                    +Bs. 20
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBill(50)}
                    className="px-2 py-2 text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                  >
                    +Bs. 50
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBill(100)}
                    className="px-2 py-2 text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                  >
                    +Bs. 100
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddBill(200)}
                    className="px-2 py-2 text-xs font-bold bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                  >
                    +Bs. 200
                  </button>
                </div>
              </div>

              {/* Visor de Cambio de Alto Contraste */}
              {amountTendered >= totalAmount ? (
                <div className="p-3.5 bg-emerald-600 text-white rounded-xl shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-100" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-50">
                      Cambio / Vuelto a Entregar:
                    </span>
                  </div>
                  <span className="text-2xl font-black font-mono tracking-tight text-white">
                    Bs. {changeDue.toFixed(2)}
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Monto insuficiente para liquidar</span>
                  </div>
                  <span className="font-bold font-mono">
                    Faltan: Bs. {(totalAmount - amountTendered).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Panel Específico: Tarjeta */}
          {(paymentMethod === 'DEBIT_CARD' || paymentMethod === 'CREDIT_CARD') && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex gap-4 text-xs font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="cardType"
                    checked={paymentMethod === 'DEBIT_CARD'}
                    onChange={() => setPaymentMethod('DEBIT_CARD')}
                    className="text-blue-600"
                  />
                  <span className="text-gray-800">Tarjeta de Débito</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="cardType"
                    checked={paymentMethod === 'CREDIT_CARD'}
                    onChange={() => setPaymentMethod('CREDIT_CARD')}
                    className="text-blue-600"
                  />
                  <span className="text-gray-800">Tarjeta de Crédito</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  N° de Voucher o Últimos 4 Dígitos
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={cardVoucher}
                  onChange={(e) => setCardVoucher(e.target.value)}
                  placeholder="Ej: 4892 (Voucher POS físico)"
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Panel Específico: QR */}
          {paymentMethod === 'QR_TRANSFER' && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center text-center space-y-2">
              <div className="w-36 h-36 bg-white p-2 rounded-xl shadow-xs border border-gray-200 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=FASHIONSTORE-PAY-${totalAmount}-${Date.now()}`}
                  alt="QR de Pago"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="font-bold text-sm text-gray-900">
                Escanee el código QR desde su app bancaria
              </p>
              <p className="text-xs text-gray-500">
                Monto exacto codificado: Bs. {totalAmount.toFixed(2)} (Interoperable)
              </p>
            </div>
          )}

          {/* Aviso contextual de Modo Offline */}
          {!isOnline && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              <div>
                <span className="font-bold">Modo Fuera de Línea Activo: </span>
                <span>La venta se registrará de inmediato en la base de datos local IndexedDB y se enviará al servidor central cuando vuelva la conexión.</span>
              </div>
            </div>
          )}

          {/* Mensaje de Error si falla */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="p-4 border-t border-gray-200 bg-gray-50/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar (Esc)
          </button>

          <button
            type="button"
            disabled={isSubmitDisabled}
            onClick={() => handleProcessSale()}
            className={cn(
              "px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer",
              isSubmitDisabled
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : isOnline
                  ? "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-600/30"
                  : "bg-amber-600 hover:bg-amber-700 active:scale-95 shadow-amber-600/30"
            )}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isOnline ? "Registrando..." : "Guardando en Base Local..."}</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>{isOnline ? "Confirmar y Emitir Ticket" : "Guardar Venta en Base Local (Offline)"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
