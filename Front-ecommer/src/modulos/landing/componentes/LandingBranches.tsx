import React from 'react';
import { 
  Store, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  CalendarClock, 
} from 'lucide-react';

interface LandingBranchesProps {
  onOpenLogin: () => void;
}

export const LandingBranches: React.FC<LandingBranchesProps> = ({ onOpenLogin }) => {
  const branches = [
    {
      id: 'branch-1',
      name: 'Sucursal Central (La Paz)',
      city: 'La Paz - Sede Central',
      address: 'Av. 16 de Julio (El Prado) #1440',
      hours: 'Lun a Sáb: 09:30 - 20:30 | Dom: 10:00 - 18:00',
      phone: '+591 2 2445500',
      fittingRooms: '4 Cabinas VIP con Espejo Inteligente',
      features: [
        'Probador de Realidad Aumentada 3D',
        'Retiro de compras web inmediato',
        'Asesor de Estilo con IA en tabletas de tienda',
      ],
      tag: 'Tienda Insignia',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'branch-2',
      name: 'Sucursal Equipetrol (Santa Cruz)',
      city: 'Santa Cruz de la Sierra',
      address: 'Av. San Martín esq. Calle 4 Este #200',
      hours: 'Lun a Dom: 10:00 - 21:00 Continuo',
      phone: '+591 3 3338800',
      fittingRooms: '6 Cabinas VIP con Iluminación Ajustable',
      features: [
        'Colección de Gala y Moda Verano',
        'Reservas por Turno con Código QR',
        'Terminal de Cobro Rápido POS Offline',
      ],
      tag: 'Mayor Stock de Gala',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      id: 'branch-3',
      name: 'Sucursal Calacoto (Zona Sur)',
      city: 'La Paz - Zona Sur',
      address: 'Calle 21 de Calacoto #800 (Frente a San Miguel)',
      hours: 'Lun a Sáb: 10:00 - 20:30 | Dom: 11:00 - 17:00',
      phone: '+591 2 2779900',
      fittingRooms: '3 Cabinas Climatizadas VIP',
      features: [
        'Moda Ejecutiva y Casual Premium',
        'Atención Personalizada con Cita Previa',
        'Estacionamiento Exclusivo para Clientes',
      ],
      tag: 'Zona Residencial',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  ];

  return (
    <section id="sucursales" className="py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
            <Store className="w-3.5 h-3.5" />
            <span>Red Física Retail FashionStore</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Nuestras Sucursales Físicas en Bolivia
          </h2>
          <p className="text-sm sm:text-base text-gray-500 leading-relaxed">
            Visítanos para probarte las prendas que viste en línea, recibir asesoramiento de imagen
            y disfrutar de probadores climatizados con asistencia digital.
          </p>
        </div>

        {/* Tarjetas de Sucursal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header de la Tarjeta */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${branch.tagColor}`}>
                    {branch.tag}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                </div>

                {/* Título y Ciudad */}
                <div>
                  <h3 className="font-extrabold text-lg text-gray-900">
                    {branch.name}
                  </h3>
                  <p className="text-xs text-blue-600 font-semibold mt-0.5">
                    {branch.city}
                  </p>
                </div>

                {/* Datos de Contacto y Ubicación */}
                <div className="space-y-2.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{branch.address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <span>{branch.hours}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CalendarClock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span className="font-semibold text-gray-800">{branch.fittingRooms}</span>
                  </div>
                </div>

                {/* Lista de Servicios */}
                <div className="pt-3 border-t border-gray-100 space-y-1.5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Servicios Disponibles:
                  </p>
                  {branch.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botón Agendar Cita */}
              <div className="pt-6 mt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="w-full py-2.5 px-4 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-xl text-xs font-bold border border-gray-200 hover:border-blue-200 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CalendarClock className="w-4 h-4" />
                  <span>Reservar Probador en esta Sucursal</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
