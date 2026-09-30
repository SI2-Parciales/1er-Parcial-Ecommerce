import React, { useState, useEffect, useRef } from 'react';
import { catalogService } from '@modulos/catalogo/servicios/catalog.service';
import type { GarmentProduct } from '@core/types';
import { 
  ShoppingBag, 
  Camera, 
  Glasses, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

interface LandingCatalogPreviewProps {
  onOpenArModal: (productName?: string) => void;
  onOpenLogin: () => void;
}

const formatCategoryName = (cat?: string) => {
  switch (cat) {
    case 'SHIRTS': return 'Camisas & Alta Costura';
    case 'PANTS': return 'Pantalones Formales';
    case 'DRESSES': return 'Vestidos de Gala';
    case 'JACKETS': return 'Sacos & Blazers';
    case 'FOOTWEAR': return 'Calzado de Cuero';
    case 'ACCESSORIES': return 'Accesorios';
    default: return cat || 'Alta Costura';
  }
};

export const LandingCatalogPreview: React.FC<LandingCatalogPreviewProps> = ({
  onOpenArModal,
  onOpenLogin,
}) => {
  const [products, setProducts] = useState<GarmentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const trackRef = useRef<HTMLDivElement>(null);

  // Ajustar número de tarjetas visibles según el ancho de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else if (window.innerWidth < 1280) {
        setItemsPerPage(3);
      } else {
        setItemsPerPage(4);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await catalogService.getProducts({ page: 1, pageSize: 24 });
        if (isMounted && res.data && res.data.length > 0) {
          setProducts(res.data);
        }
      } catch (err) {
        console.log('Carga catálogo landing conectada:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const categories = [
    { key: 'ALL', label: 'Todas las Colecciones' },
    { key: 'GALA', label: 'Alta Costura & Gala' },
    { key: 'CASUAL', label: 'Casual Ejecutivo' },
    { key: 'DEPORTIVA', label: 'Deportiva Tech' },
    { key: 'AR_ONLY', label: 'Probador RA 3D' },
  ];

  const filteredProducts = products.filter((p) => {
    const catName = String(p.category || '').toLowerCase();
    const prodName = (p.name || '').toLowerCase();

    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'GALA') return catName.includes('gala') || prodName.includes('corbata') || prodName.includes('pantalon') || prodName.includes('vestido');
    if (selectedCategory === 'CASUAL') return catName.includes('casual') || prodName.includes('camisa');
    if (selectedCategory === 'DEPORTIVA') return catName.includes('deportiv') || prodName.includes('short') || prodName.includes('polera');
    if (selectedCategory === 'AR_ONLY') {
      return prodName.includes('camisa') || prodName.includes('vestido') || prodName.includes('pantalon');
    }
    return true;
  });

  const maxIndex = Math.max(0, filteredProducts.length - itemsPerPage);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  // Reset index when category changes
  const handleSelectCategory = (catKey: string) => {
    setSelectedCategory(catKey);
    setCurrentIndex(0);
  };

  return (
    <section id="colecciones" className="py-16 sm:py-20 bg-slate-900 text-white relative overflow-hidden">
      {/* Luces y Gradientes de Fondo de Alta Costura */}
      <div 
        className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />
      <div 
        className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" 
        aria-hidden="true" 
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Cabecera de la Sección con Controles del Carrusel */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 text-xs font-bold border border-purple-400/30">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Alta Costura & Moda Retail 2026</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Colecciones Exclusivas de Temporada
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Explora en nuestro carrusel interactivo las prendas insignia. Cada pieza cuenta con 
              modelo 3D disponible para prueba virtual con Realidad Aumentada y stock en sucursales físicas.
            </p>
          </div>

          {/* Controles de Navegación del Carrusel */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs font-mono font-bold text-slate-400 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700">
              <span className="text-white">{Math.min(currentIndex + 1, filteredProducts.length)}</span>
              <span className="mx-1">/</span>
              <span>{Math.max(1, filteredProducts.length - itemsPerPage + 1)}</span>
            </div>

            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition border ${
                currentIndex === 0
                  ? 'bg-slate-800 text-slate-600 border-slate-800 cursor-not-allowed'
                  : 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700 hover:scale-105 cursor-pointer shadow-md'
              }`}
              title="Prenda anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition border ${
                currentIndex >= maxIndex
                  ? 'bg-slate-800 text-slate-600 border-slate-800 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 hover:from-blue-500 hover:to-indigo-500 hover:scale-105 cursor-pointer shadow-md shadow-blue-500/20'
              }`}
              title="Siguiente prenda"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros de Categorías en Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleSelectCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.key
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-blue-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/80'
              }`}
            >
              {cat.key === 'AR_ONLY' && <Glasses className="w-3.5 h-3.5 text-purple-400" />}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Carrusel de Cards Modernas */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            Cargando colecciones exclusivas de alta costura...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            No hay prendas disponibles en esta categoría actualmente.
          </div>
        ) : (
          <div className="relative overflow-hidden" ref={trackRef}>
            <div
              className="flex transition-transform duration-500 ease-out gap-5"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
              }}
            >
              {filteredProducts.map((product) => {
                const hasAr = (product.name || '').toLowerCase().includes('camisa') || 
                              (product.name || '').toLowerCase().includes('vestido') || 
                              (product.name || '').toLowerCase().includes('pantalon');

                return (
                  <div
                    key={product.id}
                    style={{ flex: `0 0 calc(${100 / itemsPerPage}% - ${(5 * (itemsPerPage - 1)) / itemsPerPage}px)` }}
                    className="group bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl hover:border-indigo-500/60 transition-all duration-300 flex flex-col justify-between select-none"
                  >
                    {/* Contenedor de Imagen con Relación de Aspecto Luxury 4:5 */}
                    <div className="relative aspect-4/5 overflow-hidden bg-slate-900">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                        loading="lazy"
                      />

                      {/* Gradiente de Sombras para Legibilidad */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                      {/* Badges Superiores */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-900/90 text-slate-200 border border-slate-700/80 backdrop-blur-md">
                          {formatCategoryName(product.category)}
                        </span>

                        {hasAr && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-purple-600/90 text-white backdrop-blur-md flex items-center gap-1 shadow-sm">
                            <Camera className="w-3 h-3" />
                            3D AR
                          </span>
                        )}
                      </div>

                      {/* Acciones Rápidas Flotantes al Hacer Hover */}
                      <div className="absolute bottom-3 inset-x-3 flex flex-col gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        {hasAr ? (
                          <button
                            type="button"
                            onClick={() => onOpenArModal(product.name)}
                            className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Glasses className="w-3.5 h-3.5" />
                            <span>Probar con Realidad Aumentada</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={onOpenLogin}
                            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold shadow-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Reservar en Tienda Física</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Información de la Prenda */}
                    <div className="p-4 space-y-3 bg-slate-950 border-t border-slate-900">
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="font-extrabold text-sm text-white truncate group-hover:text-indigo-400 transition">
                            {product.name}
                          </h3>
                          <span className="font-mono font-black text-sm text-white shrink-0">
                            BOB {Number(product.basePrice || 180).toFixed(2)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400 line-clamp-1">
                          {product.description || 'Prenda exclusiva confeccionada con estándares de alta costura retail.'}
                        </p>
                      </div>

                      {/* Tallas y Disponibilidad */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-400 font-medium">
                          <span>Tallas:</span>
                          <span className="text-white font-mono font-bold">S · M · L · XL</span>
                        </div>

                        <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          3 Sucursales
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Indicadores de Páginas / Dots Inferiores */}
        {filteredProducts.length > itemsPerPage && (
          <div className="mt-8 flex items-center justify-center gap-1.5">
            {Array.from({ length: Math.min(8, Math.ceil(filteredProducts.length / itemsPerPage)) }).map((_, idx) => {
              const active = Math.floor(currentIndex / itemsPerPage) === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx * itemsPerPage)}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    active ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                  }`}
                  title={`Página ${idx + 1}`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
