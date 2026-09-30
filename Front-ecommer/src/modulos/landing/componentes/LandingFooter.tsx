import React from 'react';
import { 
  MapPin, 
  Clock,
  Phone,
  CalendarClock
} from 'lucide-react';
import logoClean from '@assets/logo-clean.png';

export const LandingFooter: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-900 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-900">
          {/* Columna Marca */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center">
                <img src={logoClean} alt="FashionStore" className="w-full h-full object-contain" />
              </div>
              <span className="font-black text-lg text-white tracking-tight">FashionStore</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                v2026
              </span>
            </div>

            <p className="text-slate-400 leading-relaxed">
              Plataforma de moda de alta costura y retail omnicanal en Bolivia. Conectamos boutiques 
              físicas, probadores de Realidad Aumentada 3D y asistencia personalizada con Inteligencia Artificial.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-400 font-semibold">Boutiques & Sucursales Abiertas</span>
            </div>
          </div>

          {/* Columna Navegación */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Explorar</h4>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => scrollTo('colecciones')} 
                  className="hover:text-white transition cursor-pointer"
                >
                  Colecciones de Alta Costura
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollTo('probador-ra')} 
                  className="hover:text-white transition cursor-pointer"
                >
                  Probador Virtual 3D
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollTo('asistente-ia')} 
                  className="hover:text-white transition cursor-pointer"
                >
                  Asistente de Estilo Gemini
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollTo('sucursales')} 
                  className="hover:text-white transition cursor-pointer"
                >
                  Boutiques Físicas
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollTo('tecnologia')} 
                  className="hover:text-white transition cursor-pointer"
                >
                  Punto de Venta POS
                </button>
              </li>
            </ul>
          </div>

          {/* Columna Sucursales */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Nuestras Boutiques</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>La Paz - Av. 16 de Julio #1440</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                <span>Santa Cruz - Equipetrol #200</span>
              </li>
              <li className="flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Calacoto - Calle 21 #800</span>
              </li>
            </ul>
          </div>

          {/* Columna Atención & Citas */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Atención & Citas VIP</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>Lunes a Domingo: 09:30 - 21:00</span>
              </li>
              <li className="flex items-start gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>Reserva de probadores sin fila con QR</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Atención al Cliente: +591 2 2445500</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra Inferior de Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 FashionStore Bolivia. Todos los derechos reservados.</p>
          <div className="flex items-center gap-1">
            <span>Experiencia de Moda de Vanguardia & Boutique Exclusiva</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
