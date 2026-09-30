import React, { useState } from 'react';
import { 
  X, 
  Glasses, 
  Camera, 
  RotateCw, 
  Smartphone, 
  CheckCircle2,
} from 'lucide-react';

interface LandingArModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGarment?: string;
}

export const LandingArModal: React.FC<LandingArModalProps> = ({
  isOpen,
  onClose,
  initialGarment,
}) => {
  const [selectedGarment, setSelectedGarment] = useState<'camisa' | 'vestido' | 'pantalon'>(
    initialGarment?.toLowerCase().includes('vestido')
      ? 'vestido'
      : initialGarment?.toLowerCase().includes('pantalon')
      ? 'pantalon'
      : 'camisa'
  );

  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('Azul Marino');
  const [isRotating, setIsRotating] = useState(false);

  if (!isOpen) return null;

  const garmentData = {
    camisa: {
      name: 'Camisa Oxford Ejecutiva 3D',
      price: 'BOB 220.00',
      category: 'Ropa Casual / Ejecutiva',
      image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=80',
      arFeatures: ['Detección de hombros y torso', 'Caída de tela con física realista', 'Ajuste de cuello formal'],
      colors: ['Azul Marino', 'Blanco Puro', 'Celeste Cielo'],
    },
    vestido: {
      name: 'Vestido de Gala Escarlata 3D',
      price: 'BOB 380.00',
      category: 'Ropa de Gala',
      image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&auto=format&fit=crop&q=80',
      arFeatures: ['Simulación de caída de satín', 'Ajuste a curvas y postura', 'Brillo reflectante dinámico'],
      colors: ['Rojo Rubí', 'Negro Obsidiana', 'Verde Esmeralda'],
    },
    pantalon: {
      name: 'Pantalón Formal Slim Fit 3D',
      price: 'BOB 210.00',
      category: 'Ropa de Gala / Casual',
      image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=80',
      arFeatures: ['Alineación con cadera y piernas', 'Longitud de basta ajustable', 'Detección de calzado'],
      colors: ['Gris Plomo', 'Azul Marino', 'Negro Mate'],
    },
  };

  const current = garmentData[selectedGarment];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Barra Superior del Modal */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Glasses className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white tracking-tight">
                Simulador del Probador Virtual RA 3D
              </h3>
              <p className="text-[11px] text-purple-200">
                Tecnología de Realidad Aumentada FashionStore Retail 2026
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido en 2 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto">
          {/* Columna Izquierda: Vista Previa 3D / Cámara */}
          <div className="md:col-span-7 p-6 bg-slate-950 flex flex-col justify-between text-white relative">
            {/* Badges Flotantes en el Canvas */}
            <div className="flex items-center justify-between z-10">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1.5">
                <Camera className="w-3 h-3" />
                Malla 3D Interactiva
              </span>
              <button
                type="button"
                onClick={() => setIsRotating(!isRotating)}
                className={`p-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isRotating 
                    ? 'bg-purple-600 text-white border-purple-500' 
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title="Girar modelo 360 grados"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                <span className="text-[11px]">Rotar 360°</span>
              </button>
            </div>

            {/* Imagen Principal Simulada con Iluminación Virtual */}
            <div className="relative my-4 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 aspect-4/3 flex items-center justify-center">
              <img
                src={current.image}
                alt={current.name}
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  isRotating ? 'scale-105 rotate-1' : ''
                }`}
              />

              {/* Guías de Pose en Realidad Aumentada */}
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-purple-400/30 m-4 rounded-xl flex items-center justify-center">
                <div className="text-center p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                  <Glasses className="w-8 h-8 text-purple-400 mx-auto mb-1 animate-pulse" />
                  <p className="text-xs font-bold text-white">Sensor de Postura Activo</p>
                  <p className="text-[10px] text-purple-200">Ajuste de talla: {selectedSize} | Color: {selectedColor}</p>
                </div>
              </div>
            </div>

            {/* Selector de Prenda Rápido */}
            <div className="z-10 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedGarment('camisa')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  selectedGarment === 'camisa'
                    ? 'bg-purple-600 text-white border-purple-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <p className="text-[11px]">Camisa Oxford</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedGarment('vestido')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  selectedGarment === 'vestido'
                    ? 'bg-purple-600 text-white border-purple-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <p className="text-[11px]">Vestido Gala</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedGarment('pantalon')}
                className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                  selectedGarment === 'pantalon'
                    ? 'bg-purple-600 text-white border-purple-500 font-bold'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <p className="text-[11px]">Pantalón Slim</p>
              </button>
            </div>
          </div>

          {/* Columna Derecha: Configuración y Experiencia Móvil */}
          <div className="md:col-span-5 p-6 bg-white flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
                  {current.category}
                </span>
                <h4 className="text-lg font-black text-gray-900">{current.name}</h4>
                <p className="text-sm font-mono font-extrabold text-blue-600 mt-1">
                  {current.price}
                </p>
              </div>

              {/* Selector de Tallas */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Selecciona tu Talla Retail:
                </label>
                <div className="flex gap-2">
                  {['S', 'M', 'L', 'XL'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedSize === size
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selector de Colores */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Paleta de Color:
                </label>
                <div className="flex flex-wrap gap-2">
                  {current.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        selectedColor === color
                          ? 'bg-purple-100 text-purple-800 border border-purple-300 font-bold'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Características AR */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Tecnología de Simulación:
                </p>
                {current.arFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Tarjeta de Aplicación Móvil */}
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-gray-900">Disponible en la App Móvil</p>
                  <p className="text-gray-500 text-[11px]">
                    Abre la app ecommerSi2 para probarte con la cámara en vivo.
                  </p>
                </div>
              </div>
            </div>

            {/* Botón Final */}
            <div className="pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
              >
                Volver a la Tienda
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
