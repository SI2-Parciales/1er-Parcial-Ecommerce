import { Prisma, PrismaClient } from '@prisma/client';
import { resolveDemoSeedConfig } from './demo-seed-config.js';

const CENTRAL_BRANCH = 'Sucursal Central Demo CU31';
const NORTH_BRANCH = 'Sucursal Norte Demo CU31';
const CATEGORY_NAME = 'Inventario Demo CU31';
const PRODUCT_NAME = 'Chaqueta Demo CU31';
const SIZE_NAME = 'M Demo CU31';
const COLOR_NAME = 'Negro Demo CU31';
const DEMO_SKU = 'DEMO-CU31-CHAQ-M-NEG';

async function ensureBranch(
  transaction: Prisma.TransactionClient,
  nombre: string,
  ubicacion: string,
) {
  const current = await transaction.sucursal.findFirst({ where: { nombre } });
  if (current) {
    return transaction.sucursal.update({
      where: { id: current.id },
      data: { ubicacion, estado: 'ACTIVO' },
    });
  }
  return transaction.sucursal.create({
    data: { nombre, ubicacion, estado: 'ACTIVO' },
  });
}

async function main(): Promise<void> {
  const config = resolveDemoSeedConfig(process.env);
  const prisma = new PrismaClient({
    datasources: { db: { url: config.databaseUrl } },
  });

  try {
    const manager = await prisma.usuario.findUnique({
      where: { email: config.emails.ENCARGADO_SUCURSAL },
      include: { rol: true },
    });
    if (!manager || manager.rol.nombre !== 'ENCARGADO_SUCURSAL') {
      throw new Error(
        'Ejecuta primero npm run prisma:seed:demo para crear el encargado demo.',
      );
    }

    await prisma.$transaction(async (transaction) => {
      const central = await ensureBranch(
        transaction,
        CENTRAL_BRANCH,
        'Zona Central Demo',
      );
      const north = await ensureBranch(
        transaction,
        NORTH_BRANCH,
        'Zona Norte Demo',
      );

      const currentCategory = await transaction.categoria.findFirst({
        where: { nombre: { equals: CATEGORY_NAME, mode: 'insensitive' } },
      });
      const category = currentCategory
        ? await transaction.categoria.update({
            where: { id: currentCategory.id },
            data: { nombre: CATEGORY_NAME, estado: 'ACTIVO' },
          })
        : await transaction.categoria.create({
            data: { nombre: CATEGORY_NAME, estado: 'ACTIVO' },
          });

      const currentSize = await transaction.talla.findFirst({
        where: { nombre: { equals: SIZE_NAME, mode: 'insensitive' } },
      });
      const size = currentSize
        ? await transaction.talla.update({
            where: { id: currentSize.id },
            data: { nombre: SIZE_NAME, estado: 'ACTIVO' },
          })
        : await transaction.talla.create({
            data: { nombre: SIZE_NAME, estado: 'ACTIVO' },
          });

      const currentColor = await transaction.color.findFirst({
        where: { nombre: { equals: COLOR_NAME, mode: 'insensitive' } },
      });
      const color = currentColor
        ? await transaction.color.update({
            where: { id: currentColor.id },
            data: {
              nombre: COLOR_NAME,
              codigoHex: '#111111',
              estado: 'ACTIVO',
            },
          })
        : await transaction.color.create({
            data: {
              nombre: COLOR_NAME,
              codigoHex: '#111111',
              estado: 'ACTIVO',
            },
          });

      const currentProduct = await transaction.producto.findFirst({
        where: { nombre: PRODUCT_NAME, categoriaId: category.id },
      });
      const product = currentProduct
        ? await transaction.producto.update({
            where: { id: currentProduct.id },
            data: {
              descripcion: 'Producto de demostración para disponibilidad.',
              precio: new Prisma.Decimal('250.00'),
              estado: 'ACTIVO',
            },
          })
        : await transaction.producto.create({
            data: {
              nombre: PRODUCT_NAME,
              descripcion: 'Producto de demostración para disponibilidad.',
              precio: new Prisma.Decimal('250.00'),
              categoriaId: category.id,
              estado: 'ACTIVO',
            },
          });

      const variant = await transaction.varianteProducto.upsert({
        where: { sku: DEMO_SKU },
        create: {
          productoId: product.id,
          tallaId: size.id,
          colorId: color.id,
          sku: DEMO_SKU,
          estado: 'ACTIVO',
        },
        update: {
          productoId: product.id,
          tallaId: size.id,
          colorId: color.id,
          estado: 'ACTIVO',
        },
      });

      await transaction.inventario.upsert({
        where: {
          sucursalId_varianteProductoId: {
            sucursalId: central.id,
            varianteProductoId: variant.id,
          },
        },
        create: {
          sucursalId: central.id,
          varianteProductoId: variant.id,
          cantidadFisica: 10,
          cantidadReservada: 2,
          cantidadNoDisponible: 2,
        },
        update: {
          cantidadFisica: 10,
          cantidadReservada: 2,
          cantidadNoDisponible: 2,
        },
      });
      await transaction.inventario.upsert({
        where: {
          sucursalId_varianteProductoId: {
            sucursalId: north.id,
            varianteProductoId: variant.id,
          },
        },
        create: {
          sucursalId: north.id,
          varianteProductoId: variant.id,
          cantidadFisica: 5,
          cantidadReservada: 1,
          cantidadNoDisponible: 1,
        },
        update: {
          cantidadFisica: 5,
          cantidadReservada: 1,
          cantidadNoDisponible: 1,
        },
      });

      await transaction.usuario.update({
        where: { id: manager.id },
        data: { sucursalId: central.id },
      });
    });

    console.info(
      'Se preparó el inventario demo y el encargado fue asignado a la sucursal central.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error(
    'No fue posible preparar el inventario demo. Revisa las migraciones y ejecuta primero el seed de usuarios demo.',
  );
  process.exitCode = 1;
});
