/**
 * ============================================================================
 * SERVICIO DE SUCURSALES Y GPS (branchService)
 * ============================================================================
 * Este servicio gestiona las tiendas físicas (sucursales) de la empresa.
 * Se encarga de:
 * 1. Consultar las sucursales reales registradas en la base de datos (GET /sucursales).
 * 2. Enriquecer los datos con coordenadas geográficas GPS (latitud y longitud).
 * 3. Crear, actualizar y eliminar sucursales (POST/PATCH/DELETE /sucursales).
 * 4. Controlar el número de vestidores/probadores físicos disponibles por tienda.
 * ============================================================================
 */
import { apiClient } from '@core/http/api-client';
import { mockDb } from '@core/mock/mock-db';
import type { Branch, City } from '@core/types';

// Representación de la sucursal tal como la entrega el backend NestJS / Prisma
interface BackendSucursal {
  id: number;
  nombre: string;
  ubicacion: string;
  cantidadVestidores: number;
  estado: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

// Estructura de respuesta paginada de sucursales
interface SucursalListResponse {
  data: BackendSucursal[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

// Coordenadas geográficas GPS de referencia por sucursal
const GPS_PRESETS: Record<number, { lat: number; lng: number; city: string }> = {
  1: { lat: -16.5000, lng: -68.1500, city: 'La Paz' },
  2: { lat: -17.8146, lng: -63.1561, city: 'Santa Cruz' },
};

function mapBackendSucursalToBranch(s: BackendSucursal): Branch {
  const preset = GPS_PRESETS[s.id] || { lat: -16.5000, lng: -68.1500, city: 'La Paz' };
  
  // Extraer GPS si está contenido en la ubicación
  let gps = preset;
  const match = s.ubicacion.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (match) {
    gps = { lat: parseFloat(match[1]), lng: parseFloat(match[2]), city: preset.city };
  }

  return {
    id: String(s.id),
    name: s.nombre,
    code: `SUC-00${s.id}`,
    address: s.ubicacion,
    phone: '+591 2 2441234',
    city: preset.city,
    fittingRooms: s.cantidadVestidores,
    location: `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)} (GPS)`,
    isActive: s.estado === 'ACTIVO',
  };
}

export const branchService = {
  async getBranches(): Promise<Branch[]> {
    try {
      const response = await apiClient.get<SucursalListResponse>('/sucursales');
      if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data.map(mapBackendSucursalToBranch);
      }
    } catch (err: any) {
      console.warn('Fallo al conectar con /sucursales, usando fallback:', err.message);
    }
    return mockDb.getBranches();
  },

  async getCities(): Promise<City[]> {
    return [
      { id: 'city-1', name: 'La Paz', department: 'La Paz' },
      { id: 'city-2', name: 'Santa Cruz de la Sierra', department: 'Santa Cruz' },
      { id: 'city-3', name: 'Cochabamba', department: 'Cochabamba' },
    ];
  },

  async createBranch(payload: Omit<Branch, 'id'>): Promise<Branch> {
    try {
      const response = await apiClient.post<BackendSucursal>('/sucursales', {
        nombre: payload.name,
        ubicacion: payload.location || payload.address,
        cantidadVestidores: payload.fittingRooms,
      });
      return mapBackendSucursalToBranch(response.data);
    } catch {
      return mockDb.createBranch(payload);
    }
  },

  async updateBranch(id: string, payload: Partial<Branch>): Promise<Branch> {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        const response = await apiClient.patch<BackendSucursal>(`/sucursales/${numId}`, {
          ...(payload.name ? { nombre: payload.name } : {}),
          ...(payload.address || payload.location ? { ubicacion: payload.location || payload.address } : {}),
          ...(payload.fittingRooms !== undefined ? { cantidadVestidores: payload.fittingRooms } : {}),
          ...(payload.isActive !== undefined ? { estado: payload.isActive ? 'ACTIVO' : 'INACTIVO' } : {}),
        });
        return mapBackendSucursalToBranch(response.data);
      }
    } catch {
      // Fallback
    }
    return mockDb.updateBranch(id, payload);
  },

  async deleteBranch(id: string): Promise<void> {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiClient.delete(`/sucursales/${numId}`);
        return;
      }
    } catch {
      // Fallback
    }
    return mockDb.deleteBranch(id);
  },
};
