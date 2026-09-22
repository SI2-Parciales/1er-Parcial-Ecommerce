import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migración de imagen de producto', () => {
  it('agrega una columna nullable sin alterar los productos existentes', async () => {
    const migration = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260921090000_producto_imagen/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toMatch(
      /ALTER TABLE "productos"[\s\S]*ADD COLUMN "imagen_url" VARCHAR\(2048\)/i,
    );
    expect(migration).not.toMatch(
      /NOT NULL|DEFAULT|DROP TABLE|DELETE FROM|TRUNCATE/i,
    );
  });
});
