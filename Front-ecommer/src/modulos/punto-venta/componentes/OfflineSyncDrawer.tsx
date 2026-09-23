import { useState, useEffect } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Radio,
  FileText,
  Layers,
  RotateCw,
} from 'lucide-react';
import { useNetworkSync } from '../ganchos/useNetworkSync';
import { offlinePosDb, type QueuedSale, type SyncAuditLog } from '../../../core/offline/offlinePosDb';
import { offlineSyncService } from '../servicios/offlineSync.service';
import type { PosCartItem } from '../tipos/pos.types';

interface OfflineSyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: number;
}

export function OfflineSyncDrawer({ isOpen, onClose, branchId = 1 }: OfflineSyncDrawerProps) {
  const {
    isOnline,
    isSimulatedOffline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    lastSyncResult,
    toggleSimulateOffline,
    syncNow,
    refreshPendingCount,
  } = useNetworkSync();

  const [activeTab, setActiveTab] = useState<'sales' | 'audit'>('sales');
  const [salesRecords, setSalesRecords] = useState<QueuedSale[]>([]);
  const [auditLogs, setAuditLogs] = useState<SyncAuditLog[]>([]);
  const [isRefreshingCatalog, setIsRefreshingCatalog] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);

  const loadLocalData = async () => {
    try {
      const [sales, logs] = await Promise.all([
        offlinePosDb.getAllSales(),
        offlinePosDb.getAuditLogs(30),
      ]);
      setSalesRecords(sales);
      setAuditLogs(logs);
      await refreshPendingCount();
    } catch (err) {
      console.error('Error cargando datos locales de IndexedDB:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLocalData();
    }
  }, [isOpen, isSyncing]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    await syncNow();
    await loadLocalData();
  };

  const handleRetrySale = async (saleId: string) => {
    await offlinePosDb.retrySale(saleId);
    await syncNow();
    await loadLocalData();
  };

  const handleExportBackup = async () => {
    await offlinePosDb.exportEmergencyBackupJson();
  };

  const handleRefreshCatalog = async () => {
    setIsRefreshingCatalog(true);
    setCatalogMessage(null);
    try {
      const count = await offlineSyncService.refreshLocalCatalogCache(branchId.toString());
      setCatalogMessage(`¡Catálogo local actualizado con ${count} productos!`);
    } catch (err) {
      setCatalogMessage('Error al actualizar catálogo. Verifique conexión.');
    } finally {
      setIsRefreshingCatalog(false);
      setTimeout(() => setCatalogMessage(null), 4000);
    }
  };

  const syncedCount = salesRecords.filter((s) => s.syncStatus === 'SYNCED').length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Cabecera del Drawer */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Base Local & Sincronización POS
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-emerald-300">
                  IndexedDB
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Almacenamiento persistente de transacciones y catálogo fuera de línea
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel de Estado de Conectividad & Simulación */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Estado de red actual */}
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold">
                  <Wifi className="w-4 h-4 text-emerald-600" />
                  <span>En Línea (Conectado)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold animate-pulse">
                  <WifiOff className="w-4 h-4 text-amber-700" />
                  <span>Modo Desconectado (Offline)</span>
                </div>
              )}

              {isSyncing && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 border border-blue-300 text-blue-800 rounded-xl text-xs font-bold">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>Sincronizando con servidor...</span>
                </div>
              )}
            </div>

            {/* Switch de Simulación de Corte de Red */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
              <span className="text-xs text-gray-600 font-medium flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-purple-600" />
                Simular corte de red:
              </span>
              <button
                type="button"
                onClick={toggleSimulateOffline}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isSimulatedOffline ? 'bg-amber-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isSimulatedOffline ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span
                className={`text-[11px] font-bold ${
                  isSimulatedOffline ? 'text-amber-700' : 'text-gray-400'
                }`}
              >
                {isSimulatedOffline ? 'OFFLINE' : 'OFF'}
              </span>
            </div>
          </div>

          {/* Tarjetas de Métricas Rápidas */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-xs">
              <p className="text-[11px] text-amber-700 font-semibold uppercase tracking-wider">
                Pendientes Local
              </p>
              <p className="text-xl font-black text-amber-600">{pendingCount}</p>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-xs">
              <p className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wider">
                Sincronizadas
              </p>
              <p className="text-xl font-black text-emerald-600">{syncedCount}</p>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
              <p className="text-[11px] text-slate-600 font-semibold uppercase tracking-wider">
                Total Registros
              </p>
              <p className="text-xl font-black text-slate-800">{salesRecords.length}</p>
            </div>
          </div>

          {/* Barra de Acciones y Sincronización Manual */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="text-[11px] text-gray-500">
              {lastSyncTime ? (
                <span>Última sincronización: {lastSyncTime}</span>
              ) : (
                <span>Sin sincronizaciones recientes</span>
              )}
              {lastSyncResult && (
                <span className="ml-1 font-semibold text-slate-700">
                  ({lastSyncResult.syncedCount} enviadas, {lastSyncResult.failedCount} fallidas)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRefreshCatalog}
                disabled={isRefreshingCatalog || !isOnline}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                title="Actualizar catálogo en memoria local IndexedDB"
              >
                <Layers className={`w-3.5 h-3.5 ${isRefreshingCatalog ? 'animate-spin' : ''}`} />
                <span>Cachear Catálogo</span>
              </button>

              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing || pendingCount === 0 || !isOnline}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sincronizar ({pendingCount})</span>
              </button>
            </div>
          </div>

          {catalogMessage && (
            <div className="text-xs p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-medium">
              {catalogMessage}
            </div>
          )}
        </div>

        {/* Pestañas de Vista */}
        <div className="flex border-b border-gray-200 px-4 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'sales'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Transacciones Locales ({salesRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Auditoría de Operaciones ({auditLogs.length})</span>
          </button>
        </div>

        {/* Contenido Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {activeTab === 'sales' ? (
            salesRecords.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <Database className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-600">No hay ventas registradas en base local</p>
                <p className="text-xs text-gray-400 mt-1">
                  Las ventas realizadas en modo offline o respaldadas se almacenarán aquí en IndexedDB.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {salesRecords.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900 font-mono">
                            {sale.offlineInvoiceNumber}
                          </span>
                          {sale.syncStatus === 'SYNCED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Sincronizado
                            </span>
                          )}
                          {sale.syncStatus === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                              <Clock className="w-3 h-3" />
                              Pendiente ({sale.attempts} reintentos)
                            </span>
                          )}
                          {sale.syncStatus === 'FAILED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <AlertTriangle className="w-3 h-3" />
                              Fallido
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Cliente: <span className="font-semibold text-gray-700">{sale.payload.customer.businessName}</span> (NIT: {sale.payload.customer.taxId})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-gray-900">
                          Bs. {sale.payload.totalAmount.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-gray-400">
                          {new Date(sale.createdAt).toLocaleTimeString('es-BO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Detalle de items */}
                    <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center justify-between">
                      <span>
                        {sale.receipt.items.length} producto(s):{' '}
                        {sale.receipt.items.map((it: PosCartItem) => `${it.garmentName} (x${it.quantity})`).join(', ')}
                      </span>
                      <span className="font-mono text-[10px] text-gray-400">
                        {sale.payload.paymentMethod}
                      </span>
                    </div>

                    {/* Acciones de reintento si está fallido o pendiente */}
                    {sale.syncStatus !== 'SYNCED' && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                        <span className="text-[10px] text-red-500 truncate max-w-[300px]">
                          {sale.errorLog || 'Pendiente de conexión central'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRetrySale(sale.id)}
                          disabled={isSyncing || !isOnline}
                          className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                        >
                          Reintentar Envío
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">No hay registros de auditoría</p>
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-white rounded-xl border border-gray-200 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.event === 'SYNC_SUCCESS'
                              ? 'bg-emerald-500'
                              : log.event === 'SYNC_FAILED'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        <span>{log.event}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('es-BO')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer con Respaldo de Emergencia */}
        <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
            title="Descarga todas las ventas locales en un archivo JSON para respaldo físico"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Exportar Copia de Seguridad JSON</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  );
}
