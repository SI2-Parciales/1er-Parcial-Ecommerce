import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migración CU-36', () => {
  it('agrega pagos y salidas por venta sin eliminar datos', async () => {
    const enumMigration = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260922090000_cu36_extender_enums/migration.sql',
      ),
      'utf8',
    );
    const migration = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260922100000_cu36_pagos_caja/migration.sql',
      ),
      'utf8',
    );

    expect(enumMigration).toMatch(
      /ALTER TYPE "EstadoVenta" ADD VALUE 'PAGADA'/i,
    );
    expect(enumMigration).toMatch(
      /ALTER TYPE "TipoMovimiento" ADD VALUE 'VENTA'/i,
    );
    expect(migration).toMatch(/CREATE TYPE "MetodoPago"/i);
    expect(migration).toMatch(/'EFECTIVO'[\s\S]*'TARJETA'[\s\S]*'QR'/i);
    expect(migration).toMatch(/CREATE TABLE "pagos"/i);
    expect(migration).toMatch(/"monto" DECIMAL\(14,2\)/i);
    expect(migration).toMatch(/"simulado" BOOLEAN NOT NULL DEFAULT true/i);
    expect(migration).toMatch(/"monto_recibido" >= "monto"/i);
    expect(migration).toMatch(/"cambio" = "monto_recibido" - "monto"/i);
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "pagos_venta_confirmada_key"[\s\S]*WHERE "estado" = 'CONFIRMADO'/i,
    );
    expect(migration).toMatch(/ADD COLUMN "venta_id" INTEGER/i);
    expect(migration).toMatch(/"tipo" = 'VENTA'[\s\S]*"venta_id" IS NOT NULL/i);
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "movimientos_inventario_venta_variante_key"/i,
    );
    expect(migration).not.toMatch(
      /DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/i,
    );
    expect(enumMigration).not.toMatch(
      /DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/i,
    );
  });
});
