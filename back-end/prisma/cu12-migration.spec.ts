import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migración CU-12', () => {
  it('extiende ventas digitales con idempotencia sin operaciones destructivas', async () => {
    const migration = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260922120000_cu12_compra_digital/migration.sql',
      ),
      'utf8',
    );

    expect(migration).toMatch(/ADD COLUMN "clave_idempotencia" UUID/i);
    expect(migration).toMatch(/ADD COLUMN "hash_solicitud" CHAR\(64\)/i);
    expect(migration).toMatch(
      /"canal" = 'DIGITAL'[\s\S]*"cajero_id" IS NULL[\s\S]*"cliente_id" IS NOT NULL/i,
    );
    expect(migration).toMatch(
      /CREATE UNIQUE INDEX "ventas_cliente_clave_idempotencia_key"[\s\S]*WHERE "canal" = 'DIGITAL'/i,
    );
    expect(migration).not.toMatch(
      /DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE/i,
    );
  });
});
