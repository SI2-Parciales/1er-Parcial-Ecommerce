import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { ROLE_SEEDS } from './roles.js';
import { resolveDemoSeedConfig } from './demo-seed-config.js';

async function main(): Promise<void> {
  const config = resolveDemoSeedConfig(process.env);
  const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });

  try {
    const roles = await Promise.all(
      ROLE_SEEDS.map((role) =>
        prisma.rol.upsert({
          where: { nombre: role.nombre },
          create: role,
          update: { descripcion: role.descripcion },
        }),
      ),
    );
    const roleIds = new Map(roles.map((role) => [role.nombre, role.id]));
    const passwordHash = await argon2.hash(config.usersPassword, { type: argon2.argon2id });

    for (const role of ROLE_SEEDS) {
      const roleId = roleIds.get(role.nombre);
      if (!roleId) {
        throw new Error('No fue posible preparar los roles de demostración.');
      }

      const email = config.emails[role.nombre];
      await prisma.usuario.upsert({
        where: { email },
        create: {
          nombre: `Usuario ${role.nombre}`,
          apellido: 'Demo',
          telefono: '0000000000',
          email,
          passwordHash,
          estado: 'ACTIVO',
          rolId: roleId,
        },
        update: {
          nombre: `Usuario ${role.nombre}`,
          apellido: 'Demo',
          telefono: '0000000000',
          passwordHash,
          estado: 'ACTIVO',
          rolId: roleId,
        },
      });
    }

    console.info('Se prepararon los cuatro usuarios de demostración en la base DEMO_DATABASE_URL.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('No fue posible preparar los usuarios de demostración. Revisa la configuración local.');
  process.exitCode = 1;
});
