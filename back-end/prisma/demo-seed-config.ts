export interface DemoSeedConfig {
  databaseUrl: string;
  usersPassword: string;
  emails: {
    CLIENTE: string;
    CAJERO: string;
    ENCARGADO_SUCURSAL: string;
    ADMINISTRADOR: string;
  };
}

function requiredValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(`Falta configurar ${name}.`);
  }
  return value;
}

function databaseTarget(connectionString: string): string {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('La URL de la base demo no es válida.');
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new Error('La base demo debe usar PostgreSQL.');
  }

  return `${url.protocol}//${url.hostname.toLowerCase()}:${url.port}${url.pathname}`;
}

export function resolveDemoSeedConfig(environment: NodeJS.ProcessEnv): DemoSeedConfig {
  if (environment.NODE_ENV?.toLowerCase() === 'production') {
    throw new Error('El seed de demo está deshabilitado en producción.');
  }

  if (environment.DEMO_SEED_ENABLED !== 'true') {
    throw new Error('Define DEMO_SEED_ENABLED=true para habilitar el seed de demo.');
  }

  const databaseUrl = requiredValue(environment, 'DEMO_DATABASE_URL');
  const demoTarget = databaseTarget(databaseUrl);
  const otherDatabaseUrls = [environment.DATABASE_URL, environment.TEST_DATABASE_URL];

  for (const otherUrl of otherDatabaseUrls) {
    if (otherUrl && databaseTarget(otherUrl) === demoTarget) {
      throw new Error('DEMO_DATABASE_URL debe apuntar a una base distinta de desarrollo y pruebas.');
    }
  }

  const usersPassword = requiredValue(environment, 'DEMO_USERS_PASSWORD');
  if (usersPassword.length < 8) {
    throw new Error('DEMO_USERS_PASSWORD debe tener al menos 8 caracteres.');
  }

  const emails = {
    CLIENTE: requiredValue(environment, 'DEMO_CLIENTE_EMAIL'),
    CAJERO: requiredValue(environment, 'DEMO_CAJERO_EMAIL'),
    ENCARGADO_SUCURSAL: requiredValue(environment, 'DEMO_ENCARGADO_EMAIL'),
    ADMINISTRADOR: requiredValue(environment, 'DEMO_ADMINISTRADOR_EMAIL'),
  };

  for (const [role, email] of Object.entries(emails)) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`El correo configurado para ${role} no es válido.`);
    }
  }

  if (new Set(Object.values(emails).map((email) => email.toLowerCase())).size !== 4) {
    throw new Error('Cada actor demo debe tener un correo diferente.');
  }

  return { databaseUrl, usersPassword, emails };
}
