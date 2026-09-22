import { PrismaClient } from '@prisma/client';
import { ROLE_SEEDS } from './roles.js';

const prisma = new PrismaClient();

async function main() {
  await Promise.all(
    ROLE_SEEDS.map((rol) =>
      prisma.rol.upsert({
        where: { nombre: rol.nombre },
        create: rol,
        update: { descripcion: rol.descripcion },
      }),
    ),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async () => {
    console.error('No fue posible inicializar los roles.');
    await prisma.$disconnect();
    process.exitCode = 1;
  });
