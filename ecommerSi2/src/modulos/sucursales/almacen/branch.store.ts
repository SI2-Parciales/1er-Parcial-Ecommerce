/**
 * ============================================================================
 * ALMACÉN DE SUCURSALES Y GPS MÓVIL (useBranchStore)
 * ============================================================================
 * Permite al cliente seleccionar en qué tienda física desea comprar o reservar
 * probadores para probarse ropa (Smart Fitting Bag).
 * 
 * Funcionalidades:
 * 1. Tienda Activa: Almacena la sucursal seleccionada actualmente por el usuario.
 * 2. Persistencia: Guarda la sucursal preferida en `appStorage` ('active_branch').
 * 3. Coordenadas GPS: Cada tienda cuenta con coordenadas geográficas reales
 *    (latitud y longitud) para geolocalización.
 * 4. Carga Dinámica: `fetchBranches()` consulta la lista de tiendas físicas
 *    desde el backend NestJS (GET /sucursales).
 * ============================================================================
 */
import { create } from 'zustand';
import { appStorage } from '@shared/storage/mmkv';
import type { BranchItem } from '../tipos/branch.types';

// Sucursales predeterminadas con coordenadas GPS reales de Bolivia
export const DEFAULT_BRANCHES: BranchItem[] = [
  {
    id: '1',
    name: 'Sucursal Central',
    code: 'SUC-01',
    address: 'Av. Principal #12, La Paz',
    city: 'La Paz',
    phone: '+591 2 2441234',
    fittingRoomsCount: 4,
    gpsLocation: '-16.5000, -68.1500 (GPS)',
    coords: {
      latitude: -16.5000,
      longitude: -68.1500,
    },
  },
  {
    id: '2',
    name: 'Sucursal Plan 3000',
    code: 'SUC-02',
    address: 'Av. la Campana #321',
    city: 'Santa Cruz',
    phone: '+591 3 3445566',
    fittingRoomsCount: 2,
    gpsLocation: '-17.8146, -63.1561 (GPS)',
    coords: {
      latitude: -17.8146,
      longitude: -63.1561,
    },
  },
];

interface BranchState {
  activeBranch: BranchItem;
  availableBranches: BranchItem[];
  isSelectionModalOpen: boolean;
  setActiveBranch: (branch: BranchItem) => void;
  openSelectionModal: () => void;
  closeSelectionModal: () => void;
  fetchBranches: () => Promise<void>;
}

export const useBranchStore = create<BranchState>((set) => {
  const saved = appStorage.getObject<BranchItem>('active_branch');
  const initialBranch = saved || DEFAULT_BRANCHES[0];

  return {
    activeBranch: initialBranch,
    availableBranches: DEFAULT_BRANCHES,
    isSelectionModalOpen: false,
    setActiveBranch: (branch) => {
      appStorage.setObject('active_branch', branch);
      set({ activeBranch: branch, isSelectionModalOpen: false });
    },
    openSelectionModal: () => set({ isSelectionModalOpen: true }),
    closeSelectionModal: () => set({ isSelectionModalOpen: false }),
    fetchBranches: async () => {
      try {
        const { apiClient } = await import('@shared/api/apiClient');
        const res = await apiClient.get<{ data: Array<{ id: number; nombre: string; ubicacion: string; cantidadVestidores: number }> }>('/sucursales');
        if (res.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const branches: BranchItem[] = res.data.data.map((b) => {
            const isLP = b.id === 1;
            const coords = isLP
              ? { latitude: -16.5000, longitude: -68.1500 }
              : { latitude: -17.8146, longitude: -63.1561 };
            return {
              id: String(b.id),
              name: b.nombre,
              code: `SUC-0${b.id}`,
              address: b.ubicacion,
              city: isLP ? 'La Paz' : 'Santa Cruz',
              phone: isLP ? '+591 2 2441234' : '+591 3 3445566',
              fittingRoomsCount: b.cantidadVestidores,
              gpsLocation: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (GPS)`,
              coords,
            };
          });
          set({ availableBranches: branches });
        }
      } catch (err: any) {
        console.warn('Fallback al cargar sucursales en móvil:', err.message);
      }
    },
  };
});
