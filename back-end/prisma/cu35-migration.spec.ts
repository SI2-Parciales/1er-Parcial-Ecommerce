import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migración CU-35', () => {
  it('crea ventas y detalles sin modificar estructuras existentes', async () => {
    const migration = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260922050000_cu35_ventas/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toMatch(/CREATE TYPE "CanalVenta"/i);
    expect(migration).toMatch(/'PRESENCIAL'[\s\S]*'DIGITAL'/i);
    expect(migration).toMatch(/CREATE TYPE "EstadoVenta"/i);
    expect(migration).toMatch(/'PENDIENTE_PAGO'/i);
    expect(migration).toMatch(/CREATE TABLE "ventas"/i);
    expect(migration).toMatch(/CREATE TABLE "detalles_venta"/i);
    expect(migration).toMatch(
      /"canal" <> 'PRESENCIAL'[\s\S]*"cajero_id" IS NOT NULL/i,
    );
    expect(migration).toMatch(/CHECK \("cantidad" > 0\)/i);
    expect(migration).toMatch(/"precio_unitario" DECIMAL\(12,2\)/i);
    expect(migration).toMatch(/"subtotal" DECIMAL\(14,2\)/i);
    expect(migration.match(/FOREIGN KEY/g)).toHaveLength(5);
    expect(migration).not.toMatch(
      /DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/i,
    );
  });
});
