import { apiClient } from '@core/http/api-client';
import type { 
  CategoryItem,
  GarmentProduct, 
  GarmentSize, 
  GarmentColor, 
  PaginatedResponse, 
  CatalogFilterParams 
} from '@core/types';
import type { ProductFormValues } from '../esquemas/product.schema';
import { mockDb } from '@core/mock/mock-db';

const mapBackendProduct = (p: any): GarmentProduct => {
  const images = p.imagenUrl
    ? [p.imagenUrl]
    : [
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500&auto=format&fit=crop&q=60',
      ];

  const variants = (p.variantes || []).map((v: any) => {
    const stockTotal = (v.inventarios || []).reduce(
      (acc: number, inv: any) => acc + (inv.cantidadFisica || 0),
      0
    );
    return {
      id: String(v.id),
      garmentId: String(p.id),
      sku: v.sku || `SKU-${v.id}`,
      barcode: `777000${v.id}`,
      size: {
        id: String(v.talla?.id || '1'),
        name: v.talla?.nombre || 'M',
        orderIndex: v.talla?.id || 1,
      },
      color: {
        id: String(v.color?.id || '1'),
        name: v.color?.nombre || 'Predeterminado',
        hexCode: v.color?.codigoHex || '#333333',
      },
      price: Number(p.precio) || 0,
      costPrice: Number(p.precio) * 0.6 || 0,
      isActive: v.estado === 'ACTIVO',
      stock: stockTotal,
      inventarios: v.inventarios || [],
    };
  });

  return {
    id: String(p.id),
    name: p.nombre,
    description: p.descripcion || 'Prenda de alta calidad confeccionada con estándares internacionales.',
    category: (p.categoria?.nombre || 'Ropa Casual').toUpperCase().includes('DEPORTIV')
      ? 'PANTS'
      : (p.categoria?.nombre || '').toUpperCase().includes('GALA')
      ? 'DRESSES'
      : 'SHIRTS',
    collection: 'Colección 2026',
    season: 'SPRING_SUMMER',
    providerId: 'prov-1',
    providerName: 'Textiles Bolivia S.A.',
    basePrice: Number(p.precio) || 0,
    images,
    variants: variants.length > 0 ? variants : [
      {
        id: `var-${p.id}-1`,
        garmentId: String(p.id),
        sku: `SKU-${p.id}`,
        barcode: `777000${p.id}`,
        size: { id: '1', name: 'M', orderIndex: 1 },
        color: { id: '1', name: 'Original', hexCode: '#1e293b' },
        price: Number(p.precio) || 0,
        costPrice: Number(p.precio) * 0.6 || 0,
        isActive: true,
      }
    ],
    isActive: p.estado === 'ACTIVO',
    createdAt: p.creadoEn || new Date().toISOString(),
    updatedAt: p.actualizadoEn || new Date().toISOString(),
  };
};

export const catalogService = {
  async getProducts(params: CatalogFilterParams): Promise<PaginatedResponse<GarmentProduct>> {
    try {
      const response = await apiClient.get<any>('/productos', {
        params: {
          pagina: params.page || 1,
          limite: params.pageSize || 20,
          buscar: params.search || undefined,
        }
      });
      if (response.data && Array.isArray(response.data.data)) {
        const mapped = response.data.data.map(mapBackendProduct);
        const totalItems = response.data.meta?.total ?? mapped.length;
        const itemsPerPage = response.data.meta?.limit ?? 20;
        const currentPage = response.data.meta?.page ?? 1;
        return {
          data: mapped,
          meta: {
            totalItems,
            itemCount: mapped.length,
            itemsPerPage,
            totalPages: Math.ceil(totalItems / itemsPerPage) || 1,
            currentPage,
          },
        };
      }
    } catch (err) {
      console.warn('Backend /productos no disponible, usando mockDb:', err);
    }
    return mockDb.getProducts(params);
  },

  async getProductById(id: string): Promise<GarmentProduct> {
    try {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        const response = await apiClient.get<any>(`/productos/${numericId}`);
        if (response.data && response.data.id) {
          return mapBackendProduct(response.data);
        }
      }
    } catch (err) {
      console.warn(`Backend /productos/${id} no disponible, usando mockDb:`, err);
    }
    return mockDb.getProductById(id);
  },

  async createProduct(payload: ProductFormValues): Promise<GarmentProduct> {
    try {
      let categoriaId = 1;
      const catUpper = (payload.category || '').toUpperCase();
      if (catUpper.includes('PANTS') || catUpper.includes('DEPORTIV') || catUpper.includes('FOOTWEAR')) {
        categoriaId = 3;
      } else if (catUpper.includes('DRESS') || catUpper.includes('GALA')) {
        categoriaId = 2;
      }

      const response = await apiClient.post<any>('/productos', {
        nombre: payload.name,
        descripcion: payload.description,
        categoriaId,
        precio: payload.basePrice,
      });

      if (response.data && response.data.id) {
        const prodId = response.data.id;

        // Crear variantes en el backend si fueron proporcionadas
        if (Array.isArray(payload.variants) && payload.variants.length > 0) {
          for (const v of payload.variants) {
            try {
              const tallaId = parseInt(v.sizeId.replace(/\D/g, ''), 10) || 1;
              const colorId = parseInt(v.colorId.replace(/\D/g, ''), 10) || 1;
              await apiClient.post(`/productos/${prodId}/variantes`, {
                tallaId,
                colorId,
                sku: v.sku,
              });
            } catch (varErr) {
              console.warn(`No se pudo crear variante ${v.sku} para producto ${prodId}:`, varErr);
            }
          }
        }

        if (payload.images && payload.images[0]) {
          try {
            await apiClient.patch(`/productos/${prodId}`, {
              imagenUrl: payload.images[0],
            });
          } catch {}
        }

        const fullProd = await apiClient.get(`/productos/${prodId}`);
        return mapBackendProduct(fullProd.data);
      }
    } catch (err) {
      console.warn('Backend POST /productos no disponible, guardando en mockDb:', err);
    }
    return mockDb.createProduct(payload);
  },

  async updateProduct(id: string, payload: ProductFormValues): Promise<GarmentProduct> {
    try {
      const numericId = parseInt(id, 10);
      if (!isNaN(numericId)) {
        const response = await apiClient.patch<any>(`/productos/${numericId}`, {
          nombre: payload.name,
          descripcion: payload.description,
          precio: payload.basePrice,
        });
        if (response.data && response.data.id) {
          return mapBackendProduct(response.data);
        }
      }
    } catch (err) {
      console.warn(`Backend PATCH /productos/${id} no disponible, usando mockDb:`, err);
    }
    return mockDb.updateProduct(id, payload);
  },

  async uploadAsset(file: File): Promise<{ url: string; fileSizeBytes: number }> {
    return mockDb.uploadAsset(file);
  },

  async getCategories(): Promise<CategoryItem[]> {
    try {
      const response = await apiClient.get<any>('/categorias');
      const list = response.data?.data || response.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((cat: any) => ({
          id: String(cat.id),
          name: cat.nombre,
          code: `CAT-${cat.id}`,
          description: cat.descripcion || '',
          isActive: cat.estado === 'ACTIVO',
        }));
      }
    } catch (err) {
      console.warn('Backend /categorias no disponible, usando mockDb:', err);
    }
    return mockDb.getCategories();
  },

  async createCategory(payload: Omit<CategoryItem, 'id'>): Promise<CategoryItem> {
    try {
      const response = await apiClient.post<any>('/categorias', {
        nombre: payload.name,
        descripcion: payload.description,
      });
      if (response.data && response.data.id) {
        return {
          id: String(response.data.id),
          name: response.data.nombre,
          code: `CAT-${response.data.id}`,
          description: response.data.descripcion || '',
          isActive: response.data.estado === 'ACTIVO',
        };
      }
    } catch (err) {
      console.warn('Backend POST /categorias falló, usando mockDb:', err);
    }
    return mockDb.createCategory(payload);
  },

  async updateCategory(id: string, payload: Partial<CategoryItem>): Promise<CategoryItem> {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        const updateData: Record<string, any> = {};
        if (payload.name) updateData.nombre = payload.name;
        if (payload.description !== undefined) updateData.descripcion = payload.description;
        if (payload.isActive !== undefined) updateData.estado = payload.isActive ? 'ACTIVO' : 'INACTIVO';

        const response = await apiClient.patch<any>(`/categorias/${numId}`, updateData);
        if (response.data && response.data.id) {
          return {
            id: String(response.data.id),
            name: response.data.nombre,
            code: `CAT-${response.data.id}`,
            description: response.data.descripcion || '',
            isActive: response.data.estado === 'ACTIVO',
          };
        }
      }
    } catch (err) {
      console.warn(`Backend PATCH /categorias/${id} falló:`, err);
    }
    return mockDb.updateCategory(id, payload);
  },

  async deleteCategory(id: string): Promise<void> {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiClient.delete(`/categorias/${numId}`);
        return;
      }
    } catch (err) {
      console.warn(`Backend DELETE /categorias/${id} falló:`, err);
    }
    return mockDb.deleteCategory(id);
  },

  async getSizes(): Promise<GarmentSize[]> {
    try {
      const response = await apiClient.get<any>('/tallas');
      const list = response.data?.data || response.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((t: any, idx: number) => ({
          id: String(t.id),
          name: t.nombre,
          orderIndex: idx + 1,
        }));
      }
    } catch (err) {
      console.warn('Backend /tallas no disponible, usando mockDb:', err);
    }
    return mockDb.getSizes();
  },

  async createSize(payload: Omit<GarmentSize, 'id'>): Promise<GarmentSize> {
    try {
      const response = await apiClient.post<any>('/tallas', {
        nombre: payload.name,
      });
      if (response.data && response.data.id) {
        return {
          id: String(response.data.id),
          name: response.data.nombre,
          orderIndex: payload.orderIndex || 1,
        };
      }
    } catch (err) {
      console.warn('Backend POST /tallas falló, usando mockDb:', err);
    }
    return mockDb.createSize(payload);
  },

  async deleteSize(id: string): Promise<void> {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiClient.delete(`/tallas/${numId}`);
        return;
      }
    } catch (err) {
      console.warn(`Backend DELETE /tallas/${id} falló:`, err);
    }
    return mockDb.deleteSize(id);
  },

  async getColors(): Promise<GarmentColor[]> {
    try {
      const response = await apiClient.get<any>('/colores');
      const list = response.data?.data || response.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((c: any) => ({
          id: String(c.id),
          name: c.nombre,
          hexCode: c.codigoHex || '#000000',
        }));
      }
    } catch (err) {
      console.warn('Backend /colores no disponible, usando mockDb:', err);
    }
    return mockDb.getColors();
  },

  async createColor(payload: Omit<GarmentColor, 'id'>): Promise<GarmentColor> {
    try {
      const response = await apiClient.post<any>('/colores', {
        nombre: payload.name,
        codigoHex: payload.hexCode,
      });
      if (response.data && response.data.id) {
        return {
          id: String(response.data.id),
          name: response.data.nombre,
          hexCode: response.data.codigoHex,
        };
      }
    } catch (err) {
      console.warn('Backend POST /colores falló, usando mockDb:', err);
    }
    return mockDb.createColor(payload);
  },

  async deleteColor(id: string): Promise<void> {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiClient.delete(`/colores/${numId}`);
        return;
      }
    } catch (err) {
      console.warn(`Backend DELETE /colores/${id} falló:`, err);
    }
    return mockDb.deleteColor(id);
  },

  async getProviders(): Promise<Array<{ id: string; name: string }>> {
    return mockDb.getProviders();
  }
};
