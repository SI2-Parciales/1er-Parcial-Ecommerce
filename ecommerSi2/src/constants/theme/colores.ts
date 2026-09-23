/**
 * ============================================================================
 * PALETA DE COLORES DINÁMICA EN BLANCO (Clean White Palette)
 * ============================================================================
 * FashionStore Mobile App 2026
 * 
 * 💡 ¿CÓMO FUNCIONA ESTE ARCHIVO?
 * Este archivo centraliza el 100% de los colores de la aplicación móvil.
 * Si deseas modificar cualquier color de la app (fondos, tarjetas de prendas,
 * textos, botones, barra de pestañas inferior, estados), debes hacerlo AQUÍ.
 * 
 * Se consume dinámicamente mediante:
 * - El objeto tipado `colores` importado en cualquier pantalla o componente.
 * - Re-exportado en `src/constants/theme.ts` para retrocompatibilidad total.
 * - Sincronizado con las clases `brand.*` de Tailwind / NativeWind.
 * ============================================================================
 */

export const colores = {
  // Fondos principales en blanco puro y off-white
  fondo: '#FFFFFF',
  fondoSecundario: '#F8FAFC',
  superficie: '#FFFFFF',
  superficieElevada: '#FFFFFF',
  tarjeta: '#FFFFFF',

  // Bordes y divisores claros
  borde: '#E2E8F0',
  bordeSutil: '#F1F5F9',
  bordeFuerte: '#CBD5E1',

  // Tipografía y textos de alta legibilidad
  texto: '#0F172A',
  textoSecundario: '#475569',
  textoMuted: '#94A3B8',
  textoInvertido: '#FFFFFF',

  // Marca y Acentos
  primario: '#0F172A',
  primarioHover: '#1E293B',
  primarioClaro: '#F1F5F9',
  acento: '#2563EB',
  acentoClaro: '#EFF6FF',

  // Estados semánticos
  exito: '#059669',
  exitoFondo: '#ECFDF5',
  alerta: '#D97706',
  alertaFondo: '#FFFBEB',
  peligro: '#DC2626',
  peligroFondo: '#FEF2F2',
  info: '#2563EB',
  infoFondo: '#EFF6FF',

  // Barra de navegación inferior (Bottom Tabs)
  barraNavegacion: {
    fondo: '#FFFFFF',
    borde: '#E2E8F0',
    activo: '#2563EB',
    inactivo: '#94A3B8',
  },

  // Encabezado
  encabezado: {
    fondo: '#FFFFFF',
    borde: '#E2E8F0',
    texto: '#0F172A',
  },
} as const;

export type PaletaColores = typeof colores;
