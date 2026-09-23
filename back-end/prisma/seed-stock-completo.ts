import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Existencias sugeridas por variante para asegurar stock en ambas sucursales
const STOCK_MATRIX: Record<string, { central: number; plan3000: number }> = {
  // Polera Oversize (Cat: Ropa Casual)
  'POL-001': { central: 15, plan3000: 10 },
  'POL-002': { central: 18, plan3000: 12 },
  'POL-003': { central: 10, plan3000: 8 },
  'POL-004': { central: 8, plan3000: 6 },
  'POL-005': { central: 5, plan3000: 4 },

  // Camisa (Cat: Ropa de Gala)
  'CAM-001': { central: 14, plan3000: 9 },
  'CAM-002': { central: 12, plan3000: 8 },
  'CAM-003': { central: 16, plan3000: 10 },
  'CAM-004': { central: 10, plan3000: 7 },
  'CAM-005': { central: 6, plan3000: 4 },

  // Pantalón de Vestir (Cat: Ropa de Gala)
  'PAN-001': { central: 12, plan3000: 8 },
  'PAN-002': { central: 15, plan3000: 11 },
  'PAN-003': { central: 14, plan3000: 9 },
  'PAN-004': { central: 8, plan3000: 5 },

  // Corbata (Cat: Ropa de Gala)
  'COR-001': { central: 25, plan3000: 15 },
  'COR-003': { central: 20, plan3000: 12 },

  // Short (Cat: Ropa deportiva)
  'SHO-001': { central: 14, plan3000: 10 },
  'SHO-002': { central: 16, plan3000: 12 },
  'SHO-003': { central: 11, plan3000: 7 },
  'SHO-004': { central: 9, plan3000: 6 },

  // Polera (Cat: Ropa deportiva)
  'PLE-001': { central: 20, plan3000: 15 },
  'PLE-002': { central: 18, plan3000: 12 },
  'PLE-003': { central: 14, plan3000: 10 },
  'PLE-004': { central: 12, plan3000: 8 },
  'PLE-005': { central: 7, plan3000: 5 },
};

async function main() {
  console.log('--- Iniciando siembra de stock completo en PostgreSQL ---');
  
  const central = await prisma.sucursal.findFirst({ where: { id: 1 } });
  const plan3000 = await prisma.sucursal.findFirst({ where: { id: 2 } });

  if (!central || !plan3000) {
    throw new Error('No se encontraron las sucursales Central (1) y Plan 3000 (2)');
  }

  const variantes = await prisma.varianteProducto.findMany({
    include: {
      producto: true,
      talla: true,
      color: true,
    },
  });

  console.log(`Total variantes en BD: ${variantes.length}`);

  let upsertCount = 0;

  for (const v of variantes) {
    const stockConfig = STOCK_MATRIX[v.sku] || { central: 10, plan3000: 5 };

    // Sucursal Central (ID 1)
    const existingCentral = await prisma.inventario.findFirst({
      where: { sucursalId: central.id, varianteProductoId: v.id },
    });

    if (existingCentral) {
      await prisma.inventario.update({
        where: { id: existingCentral.id },
        data: {
          cantidadFisica: stockConfig.central,
          cantidadReservada: 0,
          cantidadNoDisponible: 0,
          actualizadoEn: new Date(),
        },
      });
    } else {
      await prisma.inventario.create({
        data: {
          sucursalId: central.id,
          varianteProductoId: v.id,
          cantidadFisica: stockConfig.central,
          cantidadReservada: 0,
          cantidadNoDisponible: 0,
        },
      });
    }

    // Sucursal Plan 3000 (ID 2)
    const existingPlan = await prisma.inventario.findFirst({
      where: { sucursalId: plan3000.id, varianteProductoId: v.id },
    });

    if (existingPlan) {
      await prisma.inventario.update({
        where: { id: existingPlan.id },
        data: {
          cantidadFisica: stockConfig.plan3000,
          cantidadReservada: 0,
          cantidadNoDisponible: 0,
          actualizadoEn: new Date(),
        },
      });
    } else {
      await prisma.inventario.create({
        data: {
          sucursalId: plan3000.id,
          varianteProductoId: v.id,
          cantidadFisica: stockConfig.plan3000,
          cantidadReservada: 0,
          cantidadNoDisponible: 0,
        },
      });
    }

    upsertCount += 2;
  }

  console.log(`Stock actualizado con éxito. Total registros de inventario sincronizados: ${upsertCount}`);
}

main()
  .catch((err) => {
    console.error('Error en seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
