import { useState, useRef } from 'react';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { usePosStore } from '../almacen/pos.store';
import { posService } from '../servicios/pos.service';
import { PosCatalogSelector, type PosCatalogSelectorHandle } from '../componentes/PosCatalogSelector';
import { PosCartTicket } from '../componentes/PosCartTicket';
import { PosCheckoutModal } from '../componentes/PosCheckoutModal';
import { PosBillingModal } from '../componentes/PosBillingModal';
import { ThermalReceipt } from '../componentes/ThermalReceipt';
import { useBarcodeScanner } from '@shared/hooks/useBarcodeScanner';
import { usePosHotkeys } from '../ganchos/usePosHotkeys';
import type { SaleReceipt } from '../tipos/pos.types';
import {
  Store,
  ScanLine,
  Printer,
  Volume2,
  VolumeX,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
} from 'lucide-react';
import { useNetworkSync } from '../ganchos/useNetworkSync';
import { OfflineSyncDrawer } from '../componentes/OfflineSyncDrawer';

export function PosTerminalPage() {
  const { user, activeBranchId } = useAuthStore();
  const currentBranchId = activeBranchId || user?.assignedBranchId || 'branch-1';
  const currentCashierId = user?.id || 'user-3';

  const cart = usePosStore((state) => state.cart);
  const addItem = usePosStore((state) => state.addItem);
  const lastCompletedSale = usePosStore((state) => state.lastCompletedSale);

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isOfflineDrawerOpen, setIsOfflineDrawerOpen] = useState(false);
  const [scanNotification, setScanNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { isOnline, isSyncing, pendingCount, syncNow } = useNetworkSync();

  const catalogRef = useRef<PosCatalogSelectorHandle>(null);

  // Reproducción sutil de sonido para escáner
  const playBeep = (isSuccess: boolean) => {
    if (!isSoundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = isSuccess ? 'sine' : 'square';
      osc.frequency.value = isSuccess ? 880 : 330;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Ignorar si el navegador bloquea AudioContext
    }
  };

  // Listener global de Escáner Físico HID
  useBarcodeScanner({
    enabled: !isCheckoutOpen && !isBillingOpen,
    onScan: async (barcode) => {
      try {
        const item = await posService.lookupBarcode(barcode, currentBranchId);
        if (item.maxAvailableStock <= 0 && !item.isFromReservation) {
          playBeep(false);
          setScanNotification({
            type: 'error',
            message: `Sin existencias de ${item.garmentName} (${barcode})`,
          });
          return;
        }

        addItem(item);
        playBeep(true);
        setScanNotification({
          type: 'success',
          message: `Escaneado: ${item.garmentName} (${item.sizeName} - ${item.colorName})`,
        });
      } catch (err: any) {
        playBeep(false);
        setScanNotification({
          type: 'error',
          message: err.message || `Código no reconocido: ${barcode}`,
        });
      } finally {
        setTimeout(() => setScanNotification(null), 3500);
      }
    },
  });

  // Listener de Atajos de Teclado (F2, F4, F8, Espacio, Escape)
  usePosHotkeys({
    onFocusSearch: () => catalogRef.current?.focusSearch(),
    onOpenBilling: () => setIsBillingOpen(true),
    onOpenCheckout: () => setIsCheckoutOpen(true),
    onCancel: () => {
      setIsCheckoutOpen(false);
      setIsBillingOpen(false);
    },
    canCheckout: cart.length > 0,
    isModalOpen: isCheckoutOpen || isBillingOpen,
  });

  const handleSaleSuccess = (receipt: SaleReceipt) => {
    // Si la venta se procesó en modo offline, NO se manda a imprimir nada.
    // Se guarda en base local y se mantiene en espera hasta que regrese el internet.
    if (receipt.isOffline) {
      setScanNotification({
        type: 'success',
        message: `Venta guardada en base local (${receipt.invoiceNumber}). En espera de conexión.`,
      });
      setTimeout(() => setScanNotification(null), 4000);
      return;
    }

    // Disparar ventana de impresión térmica nativa únicamente para ventas online
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const handleReprintLastReceipt = () => {
    if (lastCompletedSale) {
      window.print();
    }
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col space-y-3">
      {/* Barra Superior de Estado del POS */}
      <div className="flex items-center justify-between px-2 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700">
            <Store className="w-3.5 h-3.5" />
            <span>Terminal Caja #{currentBranchId}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 rounded-lg text-xs font-semibold text-green-700">
            <ScanLine className="w-3.5 h-3.5 animate-pulse" />
            <span>Lector HID Activo</span>
          </div>

          {/* Indicador de Conectividad & Base Local */}
          {!isOnline ? (
            <button
              type="button"
              onClick={() => setIsOfflineDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer animate-pulse"
              title="Modo Offline activo. Haga clic para ver detalles y cola de sincronización."
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Modo Offline ({pendingCount} en cola)</span>
            </button>
          ) : isSyncing ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Sincronizando...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsOfflineDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              title="Conectado al servidor central. Clic para ver base local IndexedDB."
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span>En Línea {pendingCount > 0 ? `(${pendingCount} pend.)` : ''}</span>
            </button>
          )}

          {/* Botón rápido de sincronizar si hay ventas pendientes y hay red */}
          {pendingCount > 0 && isOnline && !isSyncing && (
            <button
              type="button"
              onClick={syncNow}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="Sincronizar ventas locales pendientes con el servidor"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sincronizar ({pendingCount})</span>
            </button>
          )}

          {/* Notificación flotante de escaneo */}
          {scanNotification && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all animate-in fade-in ${
                scanNotification.type === 'success'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {scanNotification.type === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              )}
              <span>{scanNotification.message}</span>
            </div>
          )}
        </div>

        {/* Acciones Rápidas de Barra Superior */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOfflineDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer border border-gray-200"
            title="Abrir monitor de Base Local IndexedDB y Sincronización"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Base Local</span>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          {lastCompletedSale && (
            <button
              type="button"
              onClick={handleReprintLastReceipt}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer border border-gray-200"
              title="Reimprimir último ticket térmico"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Reimprimir ({lastCompletedSale.invoiceNumber})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer border border-gray-200"
            title={isSoundEnabled ? 'Silenciar lector' : 'Activar sonido de escaneo'}
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Área Principal de Trabajo: Catálogo (65%) y Ticket (35%) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Catálogo Táctil y Búsqueda (65% ~ 8 cols) */}
        <div className="lg:col-span-8 h-full min-h-0">
          <PosCatalogSelector ref={catalogRef} branchId={currentBranchId} />
        </div>

        {/* Ticket de Venta Activo y Totales (35% ~ 4 cols) */}
        <div className="lg:col-span-4 h-full min-h-0">
          <PosCartTicket
            onOpenCheckout={() => setIsCheckoutOpen(true)}
            onOpenBilling={() => setIsBillingOpen(true)}
          />
        </div>
      </div>

      {/* Modal de Cobro */}
      <PosCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        branchId={currentBranchId}
        cashierId={currentCashierId}
        onSaleSuccess={handleSaleSuccess}
      />

      {/* Modal de Datos Fiscales (F4) */}
      <PosBillingModal
        isOpen={isBillingOpen}
        onClose={() => setIsBillingOpen(false)}
      />

      {/* Drawer de Base Local y Sincronización Offline */}
      <OfflineSyncDrawer
        isOpen={isOfflineDrawerOpen}
        onClose={() => setIsOfflineDrawerOpen(false)}
        branchId={typeof currentBranchId === 'number' ? currentBranchId : 1}
      />

      {/* Plantilla oculta para Impresión Térmica (@media print) */}
      <ThermalReceipt receipt={lastCompletedSale} paperWidth="80mm" />
    </div>
  );
}
