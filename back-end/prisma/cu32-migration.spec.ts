import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migración CU-32', () => {
  it('crea únicamente movimientos de inventario con trazabilidad e integridad', async () => {
    const migration = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260921080000_cu32_movimientos_inventario/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toMatch(/CREATE TYPE "TipoMovimiento"/i);
    expect(migration).toMatch(
      /'RECEPCION'[\s\S]*'TRANSFERENCIA'[\s\S]*'DEVOLUCION'[\s\S]*'MERMA'/i,
    );
    expect(migration).toMatch(/CREATE TABLE "movimientos_inventario"/i);
    expect(migration).toMatch(/CHECK \("cantidad" > 0\)/i);
    expect(migration).toMatch(/"sucursal_origen_id" <> "sucursal_destino_id"/i);
    expect(migration).toMatch(/btrim\("observacion"\) <> ''/i);
    expect(migration).toMatch(/"usuario_id"[\s\S]*"clave_idempotencia"/i);
    expect(migration).toMatch(/"resultado_idempotente" JSONB NOT NULL/i);
    expect(migration.match(/FOREIGN KEY/g)).toHaveLength(4);
    expect(migration).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE/i);
  });
});
