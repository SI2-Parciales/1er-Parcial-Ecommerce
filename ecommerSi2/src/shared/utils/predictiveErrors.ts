/**
 * Utilidades para validación predictiva y manejo de errores con explicaciones amigables.
 */

export interface ValidationResult {
  isValid: boolean;
  message: string;
  suggestion?: string;
}

/**
 * Valida de forma predictiva el NIT o Cédula de Identidad para la factura.
 */
export const validateBillingNit = (nit: string): ValidationResult => {
  const clean = nit.trim();
  if (!clean) {
    return {
      isValid: false,
      message: 'Ingresa tu número de NIT o C.I.',
      suggestion: 'Es un requisito tributario para emitir tu factura digital oficial.',
    };
  }
  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      message: 'El NIT o C.I. debe contener únicamente números.',
      suggestion: 'Elimina letras, espacios o guiones (ejemplo: 73168919).',
    };
  }
  if (clean.length < 5 || clean.length > 12) {
    return {
      isValid: false,
      message: 'Longitud de documento inusual.',
      suggestion: 'Un NIT o C.I. boliviano suele tener entre 6 y 10 dígitos. Si no tienes NIT puedes usar tu Carnet o colocar 0.',
    };
  }
  return { isValid: true, message: 'Documento válido' };
};

/**
 * Valida el nombre o razón social.
 */
export const validateBillingName = (name: string): ValidationResult => {
  const clean = name.trim();
  if (!clean) {
    return {
      isValid: false,
      message: 'Ingresa tu Nombre Completo o Razón Social.',
      suggestion: 'Se utilizará en el encabezado de tu factura de compra.',
    };
  }
  if (clean.length < 3) {
    return {
      isValid: false,
      message: 'El nombre es demasiado corto.',
      suggestion: 'Ingresa al menos nombre y apellido para asegurar la validez legal.',
    };
  }
  return { isValid: true, message: 'Nombre válido' };
};

/**
 * Formatea y espacia un número de tarjeta en bloques de 4 dígitos.
 */
export const formatCardNumber = (input: string): string => {
  const digitsOnly = input.replace(/\D/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < digitsOnly.length; i += 4) {
    parts.push(digitsOnly.slice(i, i + 4));
  }
  return parts.join(' ');
};

/**
 * Valida de manera predictiva el número de tarjeta.
 */
export const validateCardNumber = (cardNumber: string): ValidationResult => {
  const digits = cardNumber.replace(/\D/g, '');
  if (!digits) {
    return {
      isValid: false,
      message: 'Ingresa los 16 dígitos de tu tarjeta.',
      suggestion: 'Aceptamos tarjetas de débito y crédito Visa y Mastercard.',
    };
  }
  if (digits.length < 16) {
    const missing = 16 - digits.length;
    return {
      isValid: false,
      message: `Número incompleto: faltan ${missing} ${missing === 1 ? 'dígito' : 'dígitos'}.`,
      suggestion: 'Revisa los 16 números grabados al frente de tu tarjeta.',
    };
  }
  if (digits.length === 16) {
    return { isValid: true, message: 'Número de tarjeta completo' };
  }
  return {
    isValid: false,
    message: 'El número de tarjeta no puede tener más de 16 dígitos.',
  };
};

/**
 * Formatea la fecha de expiración como MM/AA.
 */
export const formatCardExpiry = (input: string): string => {
  const digits = input.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
};

/**
 * Valida la fecha de expiración con mensaje predictivo.
 */
export const validateCardExpiry = (expiry: string): ValidationResult => {
  const clean = expiry.trim();
  if (!clean) {
    return {
      isValid: false,
      message: 'Ingresa la fecha de vencimiento (MM/AA).',
      suggestion: 'Por ejemplo: 12/28 para diciembre de 2028.',
    };
  }

  const parts = clean.split('/');
  if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) {
    return {
      isValid: false,
      message: 'Formato incompleto: utiliza MM/AA.',
      suggestion: 'Ejemplo: 08/27.',
    };
  }

  const month = parseInt(parts[0], 10);
  const year = parseInt(`20${parts[1]}`, 10);

  if (isNaN(month) || month < 1 || month > 12) {
    return {
      isValid: false,
      message: 'Mes inválido.',
      suggestion: 'El mes de vencimiento debe estar entre 01 y 12.',
    };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return {
      isValid: false,
      message: 'Esta tarjeta figura como vencida.',
      suggestion: 'Por favor utiliza una tarjeta bancaria con fecha vigente.',
    };
  }

  return { isValid: true, message: 'Fecha de vencimiento vigente' };
};

/**
 * Valida el código CVV.
 */
export const validateCardCvv = (cvv: string): ValidationResult => {
  const digits = cvv.replace(/\D/g, '');
  if (!digits) {
    return {
      isValid: false,
      message: 'Ingresa el código CVV.',
      suggestion: 'Son los 3 dígitos de seguridad ubicados al reverso de tu tarjeta.',
    };
  }
  if (digits.length < 3) {
    return {
      isValid: false,
      message: 'CVV incompleto.',
      suggestion: 'El código de seguridad consta de 3 dígitos numéricos.',
    };
  }
  return { isValid: true, message: 'Código CVV completo' };
};

/**
 * Cupones admitidos y su descuento en porcentaje.
 */
export const VALID_COUPONS: Record<string, { percent: number; label: string }> = {
  PROMO2026: { percent: 10, label: '10% OFF Colección 2026' },
  MODA10: { percent: 10, label: '10% OFF en Temporada' },
  DESCUENTO10: { percent: 10, label: '10% OFF Especial' },
  VIP15: { percent: 15, label: '15% OFF Exclusivo VIP' },
  ESTUDIANTE: { percent: 20, label: '20% OFF Tarifa Universitaria' },
};

/**
 * Valida un cupón de descuento y entrega sugerencias predictivas.
 */
export const validateCouponCode = (rawCode: string): { isValid: boolean; discountPercent: number; label: string; message: string; suggestion?: string } => {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return {
      isValid: false,
      discountPercent: 0,
      label: '',
      message: 'Escribe un código de cupón para aplicar.',
      suggestion: 'Si no tienes uno, prueba con PROMO2026 o VIP15.',
    };
  }

  if (VALID_COUPONS[code]) {
    const coupon = VALID_COUPONS[code];
    return {
      isValid: true,
      discountPercent: coupon.percent,
      label: coupon.label,
      message: `¡Cupón ${code} aplicado! ${coupon.label}`,
    };
  }

  return {
    isValid: false,
    discountPercent: 0,
    label: '',
    message: `El cupón "${code}" no existe o ya no tiene vigencia.`,
    suggestion: 'Puedes usar los códigos activos: PROMO2026 (10% OFF) o VIP15 (15% OFF).',
  };
};
