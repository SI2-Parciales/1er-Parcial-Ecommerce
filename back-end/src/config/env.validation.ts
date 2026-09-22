import { resolveCorsOrigins } from './cors.config.js';

export interface AppEnvironment {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT?: string;
  PRODUCT_IMAGES_DIR?: string;
  CORS_ORIGINS?: string;
}

function requiredString(
  config: Record<string, unknown>,
  key: keyof AppEnvironment,
): string {
  const value = config[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`La variable de entorno ${key} es obligatoria.`);
  }

  return value.trim();
}

export function validateEnvironment(
  config: Record<string, unknown>,
): AppEnvironment {
  const databaseUrl = requiredString(config, 'DATABASE_URL');
  const jwtSecret = requiredString(config, 'JWT_SECRET');
  const jwtExpiresIn = requiredString(config, 'JWT_EXPIRES_IN');

  try {
    const parsedUrl = new URL(databaseUrl);
    if (
      parsedUrl.protocol !== 'postgresql:' &&
      parsedUrl.protocol !== 'postgres:'
    ) {
      throw new Error('invalid protocol');
    }
  } catch {
    throw new Error('DATABASE_URL debe ser una URL válida de PostgreSQL.');
  }

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe contener al menos 32 caracteres.');
  }

  if (!/^\d+[smhd]$/.test(jwtExpiresIn)) {
    throw new Error(
      'JWT_EXPIRES_IN debe usar el formato 15m, 1h, 7d o similar.',
    );
  }

  const portValue = config.PORT;
  if (portValue !== undefined) {
    if (typeof portValue !== 'string') {
      throw new Error('PORT debe ser un puerto válido.');
    }

    const port = Number(portValue);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('PORT debe ser un puerto válido.');
    }
  }

  const productImagesDirectory = config.PRODUCT_IMAGES_DIR;
  if (
    productImagesDirectory !== undefined &&
    (typeof productImagesDirectory !== 'string' ||
      productImagesDirectory.trim() === '')
  ) {
    throw new Error(
      'PRODUCT_IMAGES_DIR debe ser una ruta de directorio válida.',
    );
  }

  const corsOrigins = config.CORS_ORIGINS;
  if (corsOrigins !== undefined) {
    if (typeof corsOrigins !== 'string') {
      throw new Error('CORS_ORIGINS debe ser una lista de orígenes válida.');
    }
    resolveCorsOrigins(corsOrigins);
  }

  return {
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    PORT: portValue,
    PRODUCT_IMAGES_DIR:
      typeof productImagesDirectory === 'string'
        ? productImagesDirectory.trim()
        : undefined,
    CORS_ORIGINS:
      typeof corsOrigins === 'string' ? corsOrigins.trim() : undefined,
  };
}
