/**
 * ============================================================================
 * PALETA DE COLORES DINÁMICA EN BLANCO (Clean Luxury White Palette)
 * ============================================================================
 * FashionStore Retail Core 2026
 * 
 * 💡 ¿CÓMO FUNCIONA ESTE ARCHIVO?
 * Este archivo centraliza el 100% de los colores de la aplicación web.
 * Cualquier cambio que desees realizar en los colores de la interfaz (fondos,
 * textos, botones, barra lateral, encabezado, tarjetas) debes hacerlo AQUÍ.
 * 
 * Se consume dinámicamente mediante:
 * - El objeto tipado `colores` importado en cualquier componente.
 * - El hook utilitario `useThemeColores()`.
 * - Las variables CSS `:root` sincronizadas en `src/app/styles/globals.css`.
 * ============================================================================
 */

export const colores = {
  // Fondos principales en blanco puro y sutil
  fondo: '#FFFFFF',
  fondoSecundario: '#F8FAFC',
  superficie: '#FFFFFF',
  superficieElevada: '#FFFFFF',

  // Bordes y divisores claros
  borde: '#E2E8F0',
  bordeSutil: '#F1F5F9',
  bordeFuerte: '#CBD5E1',

  // Tipografía y textos de alta legibilidad
  textoPrincipal: '#0F172A',
  textoSecundario: '#475569',
  textoMuted: '#94A3B8',
  textoInvertido: '#FFFFFF',

  // Marca y Acentos
  primario: '#0F172A',
  primarioHover: '#1E293B',
  primarioClaro: '#F1F5F9',
  acento: '#2563EB',
  acentoHover: '#1D4ED8',
  acentoClaro: '#EFF6FF',

  // Estados semánticos
  exito: '#059669',
  exitoFondo: '#ECFDF5',
  exitoBorde: '#A7F3D0',

  alerta: '#D97706',
  alertaFondo: '#FFFBEB',
  alertaBorde: '#FDE68A',

  peligro: '#DC2626',
  peligroFondo: '#FEF2F2',
  peligroBorde: '#FECACA',

  info: '#2563EB',
  infoFondo: '#EFF6FF',
  infoBorde: '#BFDBFE',

  // Elementos estructurales
  barraLateral: {
    fondo: '#FFFFFF',
    borde: '#E2E8F0',
    texto: '#475569',
    textoHover: '#0F172A',
    hoverFondo: '#F8FAFC',
    activoFondo: '#F1F5F9',
    activoTexto: '#0F172A',
    activoBorde: '#0F172A',
  },

  encabezado: {
    fondo: '#FFFFFF',
    borde: '#E2E8F0',
    texto: '#0F172A',
  },

  tarjeta: {
    fondo: '#FFFFFF',
    borde: '#E2E8F0',
    sombra: 'rgba(0, 0, 0, 0.04) 0px 1px 3px, rgba(0, 0, 0, 0.02) 0px 1px 2px',
  },
} as const;

export type PaletaColores = typeof colores;
