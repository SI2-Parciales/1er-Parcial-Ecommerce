import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migración CU-31', () => {
  it('agrega cantidad_no_disponible conservando la tabla y los registros existentes', async () => {
    const migration = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260921070000_cu31_disponibilidad/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toMatch(
      /ADD COLUMN "cantidad_no_disponible" INTEGER NOT NULL DEFAULT 0/i,
    );
    expect(migration).toMatch(/"cantidad_no_disponible" >= 0/i);
    expect(migration).toMatch(
      /"cantidad_reservada" \+ "cantidad_no_disponible"[\s\S]*<= "cantidad_fisica"/i,
    );
    expect(migration).not.toMatch(/DROP TABLE|DELETE FROM|TRUNCATE/i);
  });
});
