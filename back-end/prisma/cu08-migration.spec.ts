import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migración CU-08', () => {
  it('crea carrito y detalles normalizados sin operaciones destructivas', async () => {
    const migration = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260922110000_cu08_carrito/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toMatch(/CREATE TABLE "carritos"/i);
    expect(migration).toMatch(/"sucursal_id" INTEGER/i);
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "carritos_usuario_id_key"/i,
    );
    expect(migration).toMatch(/CREATE TABLE "detalles_carrito"/i);
    expect(migration).toMatch(/CHECK \("cantidad" > 0\)/i);
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "detalles_carrito_carrito_variante_key"/i,
    );
    expect(migration).not.toMatch(
      /DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/i,
    );
  });
});
