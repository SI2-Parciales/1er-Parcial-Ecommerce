export const ACTIVE_STATUS = 'ACTIVO';
export const INACTIVE_STATUS = 'INACTIVO';

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeOptionalText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined || value === null) return value;

  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized === '' ? null : normalized;
}

export function normalizeHex(value: string): string {
  return value.trim().toUpperCase();
}

export function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}
