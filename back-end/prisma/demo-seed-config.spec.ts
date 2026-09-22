import { describe, expect, it } from 'vitest';
import { resolveDemoSeedConfig } from './demo-seed-config.js';

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: 'development',
  DEMO_SEED_ENABLED: 'true',
  DATABASE_URL: 'postgresql://dev:secret@localhost:5432/fashionstore?schema=public',
  TEST_DATABASE_URL: 'postgresql://test:secret@localhost:5432/fashionstore_test?schema=public',
  DEMO_DATABASE_URL: 'postgresql://demo:secret@localhost:5432/fashionstore_demo?schema=public',
  DEMO_USERS_PASSWORD: 'LocalDemoPassword123!',
  DEMO_CLIENTE_EMAIL: 'cliente@example.test',
  DEMO_CAJERO_EMAIL: 'cajero@example.test',
  DEMO_ENCARGADO_EMAIL: 'encargado@example.test',
  DEMO_ADMINISTRADOR_EMAIL: 'admin@example.test',
};

describe('resolveDemoSeedConfig', () => {
  it('acepta una base de demo separada y las cuatro cuentas configuradas', () => {
    expect(resolveDemoSeedConfig(validEnvironment)).toMatchObject({
      databaseUrl: validEnvironment.DEMO_DATABASE_URL,
      emails: {
        CLIENTE: validEnvironment.DEMO_CLIENTE_EMAIL,
        CAJERO: validEnvironment.DEMO_CAJERO_EMAIL,
        ENCARGADO_SUCURSAL: validEnvironment.DEMO_ENCARGADO_EMAIL,
        ADMINISTRADOR: validEnvironment.DEMO_ADMINISTRADOR_EMAIL,
      },
    });
  });

  it('requiere habilitación explícita y DEMO_DATABASE_URL, sin fallback', () => {
    expect(() =>
      resolveDemoSeedConfig({ ...validEnvironment, DEMO_SEED_ENABLED: 'false' }),
    ).toThrow(/DEMO_SEED_ENABLED/);
    expect(() => {
      const { DEMO_DATABASE_URL: _ignored, ...environment } = validEnvironment;
      resolveDemoSeedConfig(environment);
    }).toThrow(/DEMO_DATABASE_URL/);
  });

  it('rechaza producción y bases que coinciden con desarrollo o pruebas', () => {
    expect(() => resolveDemoSeedConfig({ ...validEnvironment, NODE_ENV: 'production' })).toThrow(
      /producción/,
    );
    expect(() =>
      resolveDemoSeedConfig({ ...validEnvironment, DEMO_DATABASE_URL: validEnvironment.DATABASE_URL }),
    ).toThrow(/distinta/);
    expect(() =>
      resolveDemoSeedConfig({
        ...validEnvironment,
        DEMO_DATABASE_URL: validEnvironment.TEST_DATABASE_URL,
      }),
    ).toThrow(/distinta/);
  });

  it('exige una contraseña local y correos separados válidos', () => {
    expect(() =>
      resolveDemoSeedConfig({ ...validEnvironment, DEMO_USERS_PASSWORD: 'corta' }),
    ).toThrow(/8 caracteres/);
    expect(() =>
      resolveDemoSeedConfig({ ...validEnvironment, DEMO_ADMINISTRADOR_EMAIL: 'cliente@example.test' }),
    ).toThrow(/diferente/);
    expect(() =>
      resolveDemoSeedConfig({ ...validEnvironment, DEMO_CAJERO_EMAIL: 'correo-invalido' }),
    ).toThrow(/no es válido/);
  });
});
