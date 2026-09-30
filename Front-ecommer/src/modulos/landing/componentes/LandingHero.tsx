import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@modulos/autenticacion/almacen/auth.store';
import { 
  Sparkles, 
  ArrowRight, 
  Camera, 
  ShieldCheck, 
  Store, 
  CheckCircle2, 
  Glasses,
  ShoppingBag,
} from 'lucide-react';
import logoClean from '@assets/logo-clean.png';

interface LandingHeroProps {
  onOpenLogin: () => void;
  onOpenArModal: () => void;
  onExploreCatalog: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onOpenLogin,
  onOpenArModal,
  onExploreCatalog,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  return (
    <section className="relative overflow-hidden pt-4 pb-8 sm:pt-6 sm:pb-10 lg:pt-8 lg:pb-10 bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center min-h-[calc(100vh-4rem)]">
      {/* Fondo de Gradientes y Patrón de Luces */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px]" 
        aria-hidden="true" 
      />
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-blue-400/15 via-indigo-400/20 to-purple-400/15 blur-3xl pointer-events-none rounded-full" 
        aria-hidden="true" 
      />

      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Columna Izquierda: Mensajes Principales y CTAs */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-center lg:text-left">
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-gray-200/90 shadow-2xs text-[11px] font-semibold text-gray-700">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              <span>Experiencia Retail FashionStore 2026</span>
              <span className="text-gray-300">|</span>
              <span className="text-blue-600 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                IA & Realidad Aumentada
              </span>
            </div>

            {/* Título Principal */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight leading-[1.12]">
              Moda de Vanguardia,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                Probadores Inteligentes
              </span>{' '}
              y Asistente con IA.
            </h1>

            {/* Bajada Descriptiva */}
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Descubre colecciones exclusivas para cada ocasión. Pruébate prendas con 
              <strong className="text-gray-900 font-semibold"> Realidad Aumentada 3D</strong>, 
              agenda tu probador VIP en tienda física y gestiona el stock de sucursales con 
              tecnología en tiempo real.
            </p>

            {/* Grupo de Acciones / CTAs */}
            <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                onClick={onExploreCatalog}
                className="px-5 py-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-md shadow-gray-900/15 flex items-center gap-2 transition transform hover:-translate-y-0.5 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Explorar Colecciones</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenArModal}
                className="px-4 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Glasses className="w-4 h-4 text-purple-600" />
                <span>Probador Virtual RA 3D</span>
              </button>

              {/* Botón condicional de Administración */}
              {isAuthenticated && user?.role === 'ADMIN' ? (
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-200" />
                  <span>Entrar al Módulo Admin</span>
                </button>
              ) : !isAuthenticated ? (
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-5 py-3.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs sm:text-sm font-bold shadow-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <span>Iniciar Sesión</span>
                </button>
              ) : null}
            </div>

            {/* Badges de Confianza Rápidos */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>3 Sucursales Activas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Probadores con Turnos QR</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Motor IA Google Gemini</span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta Visual Interactiva de la Experiencia */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-sm sm:max-w-md bg-white rounded-2xl border border-gray-200/90 shadow-xl p-3.5 sm:p-4 overflow-hidden">
              {/* Header de la tarjeta */}
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center p-1">
                    <img src={logoClean} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-gray-900 leading-tight">FashionStore Experience</h3>
                    <p className="text-[10px] text-gray-400 font-medium">Retail Inteligente v2026</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  En Línea
                </span>
              </div>

              {/* Imagen de Prenda Destacada con Realidad Aumentada */}
              <div className="relative mt-3 rounded-xl overflow-hidden bg-slate-900 h-44 sm:h-50 group">
                <img
                  src="https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80"
                  alt="Camisa Oxford Premium"
                  className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay de Realidad Aumentada */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent flex flex-col justify-between p-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 rounded-md bg-purple-600/90 text-white text-[9px] font-extrabold tracking-wider uppercase backdrop-blur-sm flex items-center gap-1 shadow-xs">
                      <Camera className="w-3 h-3" />
                      Modelo 3D AR Listo
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono backdrop-blur-sm">
                      BOB 220.00
                    </span>
                  </div>

                  <div>
                    <p className="text-white font-extrabold text-xs sm:text-sm drop-shadow-sm">Camisa Oxford Ejecutiva</p>
                    <p className="text-slate-300 text-[11px] mt-0.5 flex items-center gap-1">
                      <Store className="w-3 h-3 text-blue-400" />
                      Disponible en Sucursal Central & Calacoto
                    </p>
                  </div>
                </div>
              </div>

              {/* Controles de Vista Rápida */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenArModal}
                  className="py-2 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Glasses className="w-3.5 h-3.5" />
                  <span>Probar en 3D</span>
                </button>

                <button
                  type="button"
                  onClick={onExploreCatalog}
                  className="py-2 px-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-gray-500" />
                  <span>Ver Prenda</span>
                </button>
              </div>

              {/* Mini tarjeta de estado del Asistente IA */}
              <div className="mt-2.5 p-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-[10px]">Asistente de Estilo Gemini</p>
                    <p className="text-[9px] text-gray-500 truncate max-w-[170px]">Recomendar outfit para evento</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded-full border border-blue-200">
                  Activo
                </span>
              </div>
            </div>

            {/* Badge flotante de sucursal */}
            <div className="hidden sm:flex absolute -bottom-3 -left-3 bg-white py-2 px-3 rounded-xl border border-gray-200 shadow-lg items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Store className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-[11px] font-black text-gray-900 leading-tight">3 Tiendas Físicas</p>
                <p className="text-[9px] text-gray-500">Stock Sincronizado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
