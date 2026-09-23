/**
 * Formatea un monto numérico a formato de moneda (BOB por defecto o USD).
 *
 * @param amount Monto numérico a formatear
 * @param currency Código de moneda ISO (BOB, USD, etc.)
 * @returns Cadena formateada de moneda
 */
export const formatCurrency = (amount: number, currency: string = 'BOB'): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const upperCurrency = currency.toUpperCase();

  try {
    const locale = upperCurrency === 'BOB' ? 'es-BO' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: upperCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    // Fallback manual si Intl falla con algún código de moneda
    return `${upperCurrency} ${safeAmount.toFixed(2)}`;
  }
};

/**
 * Formatea una fecha en formato estándar DD/MM/YYYY.
 *
 * @param date Fecha en formato string ISO, timestamp numérico o instancia Date
 * @returns Cadena de fecha en formato DD/MM/YYYY
 */
export const formatDate = (date: string | Date | number): string => {
  try {
    const d = typeof date === 'object' && date instanceof Date ? date : new Date(date);

    if (isNaN(d.getTime())) {
      return '--/--/----';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return '--/--/----';
  }
};
