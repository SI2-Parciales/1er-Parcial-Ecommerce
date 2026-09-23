export * from './colores';
import { colores } from './colores';

/**
 * Hook utilitario para consumir los colores dinámicos de forma tipada
 */
export function useThemeColores() {
  return colores;
}
