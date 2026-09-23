import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, 
  PackagePlus, 
  CalendarRange, 
  CheckCircle2, 
  Boxes, 
  X
} from 'lucide-react';
import { mockDb } from '@core/mock/mock-db';
import type { SeasonCode, GarmentCategory } from '@core/types';

export const SupplierPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'SHIRTS' as GarmentCategory,
    season: 'SPRING_SUMMER' as SeasonCode,
    collection: 'Colección Verano 2026',
    basePrice: 59.99,
    initialBatchStock: 50,
  });

  const providerId = 'prov-1'; // Proveedor asignado al usuario
  const providerName = 'Confecciones del Valle S.A.';

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['supplier-products', providerId],
    queryFn: () => mockDb.getSupplierProducts(providerId),
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => mockDb.getSeasons(),
  });

  const createProductMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      // Registrar producto nuevo con variantes y asignar a temporada
      return mockDb.createProduct({
        name: payload.name,
        description: payload.description,
        category: payload.category,
        collection: payload.collection,
        season: payload.season,
        providerId: providerId,
        basePrice: payload.basePrice,
        images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60'],
        variants: [
          {
            sizeId: 'size-m',
            colorId: 'col-black',
            sku: `${payload.name.substring(0, 3).toUpperCase()}-M-NEG`,
            barcode: `${Math.floor(77000000000 + Math.random() * 99999999)}`,
            price: payload.basePrice,
            costPrice: Math.round(payload.basePrice * 0.5 * 100) / 100,
            isActive: true,
          },
          {
            sizeId: 'size-l',
            colorId: 'col-black',
            sku: `${payload.name.substring(0, 3).toUpperCase()}-L-NEG`,
            barcode: `${Math.floor(77000000000 + Math.random() * 99999999)}`,
            price: payload.basePrice,
            costPrice: Math.round(payload.basePrice * 0.5 * 100) / 100,
            isActive: true,
          },
        ],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      setIsModalOpen(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                Portal de Proveedores B2B
              </h1>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                {providerName}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Envío de información de productos, reporte de disponibilidad de lotes y vinculación a temporadas retail.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-xs cursor-pointer"
        >
          <PackagePlus className="w-4 h-4" />
          Registrar Nueva Prenda
        </button>
      </div>

      {/* Supplier Products List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/70">
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              Catálogo de Prendas Suministradas
            </h3>
            <p className="text-xs text-gray-500">
              Lotes informados para aprovisionamiento de las tiendas físicas FashionStore.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            {products.length} prendas registradas
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">Cargando productos de proveedor...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">No hay prendas registradas por este proveedor.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.map(prod => (
              <div key={prod.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/70 transition">
                <div className="flex items-start gap-4">
                  <img
                    src={prod.images[0] || 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200'}
                    alt={prod.name}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{prod.name}</h4>
                    <p className="text-xs text-gray-500 line-clamp-1 max-w-md">{prod.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-medium border border-gray-200">
                        Categoría: {prod.category}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-medium flex items-center gap-1 border border-purple-100">
                        <CalendarRange className="w-3 h-3" /> Temporada: {prod.season}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px] font-medium flex items-center gap-1 border border-emerald-100">
                        <Boxes className="w-3 h-3" /> {prod.variants.length} variantes con disponibilidad
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-gray-900">
                    Bs. {prod.basePrice.toFixed(2)}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Disponible para despacho
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Registrar Prenda / Asociar Temporada */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-lg shadow-xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-gray-900">
                  Registrar Información de Producto
                </h3>
                <p className="text-xs text-gray-500">Enviar ficha y asociar a temporada comercial</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre de la Prenda
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Blusa de Lino Manga Corta"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Descripción Técnica y Materiales
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Composición 100% lino natural, botones de nácar..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as GarmentCategory })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SHIRTS">Camisas & Blusas</option>
                    <option value="PANTS">Pantalones</option>
                    <option value="DRESSES">Vestidos</option>
                    <option value="JACKETS">Chaquetas</option>
                    <option value="FOOTWEAR">Calzado</option>
                    <option value="ACCESSORIES">Accesorios</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Temporada Asociada
                  </label>
                  <select
                    value={formData.season}
                    onChange={(e) => setFormData({ ...formData, season: e.target.value as SeasonCode })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500"
                  >
                    {seasons.map(s => (
                      <option key={s.id} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Precio Sugerido (Bs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Lote Disponible
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.initialBatchStock}
                    onChange={(e) => setFormData({ ...formData, initialBatchStock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-xs cursor-pointer"
                >
                  Enviar Información a FashionStore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
