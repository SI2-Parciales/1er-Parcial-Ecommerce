export const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
] as const;

export function resolveCorsOrigins(configured?: string): string[] {
  if (configured === undefined) return [...DEFAULT_CORS_ORIGINS];

  const values = configured
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '');
  if (values.length === 0) {
    throw new Error('CORS_ORIGINS debe contener al menos un origen válido.');
  }

  return [...new Set(values.map(normalizeOrigin))];
}

function normalizeOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`CORS_ORIGINS contiene un origen inválido: ${value}`);
  }

  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`CORS_ORIGINS contiene un origen inválido: ${value}`);
  }

  return url.origin;
}
