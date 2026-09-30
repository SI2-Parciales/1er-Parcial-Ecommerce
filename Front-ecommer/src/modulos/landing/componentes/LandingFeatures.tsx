import React from 'react';
import { 
  Glasses, 
  Sparkles, 
  CalendarClock, 
  CreditCard, 
  CheckCircle2,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface LandingFeaturesProps {
  onOpenArModal: () => void;
  onOpenAssistant: () => void;
}

export const LandingFeatures: React.FC<LandingFeaturesProps> = ({
  onOpenArModal,
  onOpenAssistant,
}) => {
  const pillars = [
    {
      number: '01',
      icon: Glasses,
      title: 'Probador Virtual 3D',
      subtitle: 'Realidad Aumentada en Vivo',
      description:
        'Proyecta las prendas en 3D sobre tu postura corporal desde tu navegador o celular. Observa la caída de tela y combinación de colores antes de comprar.',
      actionText: 'Probar Simulador 3D',
      onAction: onOpenArModal,
      benefits: [
        'Alineación anatómica en tiempo real',
        'Modelos tridimensionales de alta fidelidad',
        'Prueba disponible en web y app móvil',
      ],
    },
    {
      number: '02',
      icon: Sparkles,
      title: 'Asesoría con Inteligencia Artificial',
      subtitle: 'Motor Google Gemini 2.5',
      description:
        'Un asesor personal de estilo disponible en todo momento. Analiza la ocasión, el clima y te sugiere el atuendo perfecto disponible en tu sucursal más cercana.',
      actionText: 'Consultar Asistente IA',
      onAction: onOpenAssistant,
      benefits: [
        'Recomendaciones según código de vestimenta',
        'Comprobación de stock en sucursales físicas',
        'Consultas por texto o dictado de voz',
      ],
    },
    {
      number: '03',
      icon: CalendarClock,
      title: 'Reserva de Cabinas VIP con QR',
      description:
        'Agenda tu cita en la sucursal de tu preferencia. Al llegar a la tienda, escanea tu código QR y encontrarás tus prendas seleccionadas listas en el probador.',
      subtitle: 'Cero Filas en Tienda Física',
      actionText: 'Ver Sucursales',
      onAction: () => {
        document.getElementById('sucursales')?.scrollIntoView({ behavior: 'smooth' });
      },
      benefits: [
        'Turnos exclusivos de 20 minutos',
        'Prendas apartadas y preparadas con anticipación',
        'Check-in automático en mostrador',
      ],
    },
    {
      number: '04',
      icon: CreditCard,
      title: 'Punto de Venta POS Offline',
      subtitle: 'Sincronización Continua',
      description:
        'Terminal de venta rápida y facturación para nuestras tiendas físicas. El sistema continúa operando sin interrupciones incluso si se pierde la conexión a internet.',
      actionText: 'Conocer Tecnología',
      onAction: () => {
        document.getElementById('sucursales')?.scrollIntoView({ behavior: 'smooth' });
      },
      benefits: [
        'Sincronización en segundo plano con IndexedDB',
        'Control de inventario centralizado',
        'Lectura de código de barras y emisión de recibos',
      ],
    },
  ];

  return (
    <section id="tecnologia" className="py-20 bg-slate-50 border-t border-gray-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Encabezado Clásico & Refinado */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-gray-800 text-xs font-bold border border-gray-200 shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>Innovación Retail Intuitiva</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Tecnología al Servicio de una Experiencia Clásica & Elegante
          </h2>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
            Cuatro pilares esenciales concebidos para que comprar moda sea un proceso ágil, 
            intuitivo y placentero, tanto en el mundo digital como en nuestras tiendas físicas.
          </p>
        </div>

        {/* 4 Columnas Clásicas y Limpias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.number}
                className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-xs hover:shadow-lg hover:border-gray-300 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Encabezado de la Tarjeta con Número Clásico */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-2xl font-black text-slate-300 group-hover:text-blue-600 transition-colors">
                      {pillar.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Títulos */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
                      {pillar.subtitle}
                    </span>
                    <h3 className="text-base font-bold text-gray-900 leading-snug">
                      {pillar.title}
                    </h3>
                  </div>

                  {/* Descripción */}
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {pillar.description}
                  </p>

                  {/* Beneficios Intuitivos */}
                  <ul className="space-y-2 pt-2 border-t border-gray-100">
                    {pillar.benefits.map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px] text-gray-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botón de Acción Estilo Clásico */}
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={pillar.onAction}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-900 hover:text-blue-600 transition cursor-pointer"
                  >
                    <span>{pillar.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
