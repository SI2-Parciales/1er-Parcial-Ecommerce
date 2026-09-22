ALTER TABLE "ventas"
ADD COLUMN "clave_idempotencia" UUID,
ADD COLUMN "hash_solicitud" CHAR(64);

ALTER TABLE "ventas"
DROP CONSTRAINT "ventas_cajero_presencial_check";

ALTER TABLE "ventas"
ADD CONSTRAINT "ventas_actores_canal_check" CHECK (
    (
        "canal" = 'PRESENCIAL'
        AND "cajero_id" IS NOT NULL
    )
    OR (
        "canal" = 'DIGITAL'
        AND "cajero_id" IS NULL
        AND "cliente_id" IS NOT NULL
    )
);

ALTER TABLE "ventas"
ADD CONSTRAINT "ventas_idempotencia_digital_check" CHECK (
    (
        "canal" = 'PRESENCIAL'
        AND "clave_idempotencia" IS NULL
        AND "hash_solicitud" IS NULL
    )
    OR (
        "canal" = 'DIGITAL'
        AND "clave_idempotencia" IS NOT NULL
        AND "hash_solicitud" ~ '^[0-9a-f]{64}$'
    )
);

CREATE UNIQUE INDEX "ventas_cliente_clave_idempotencia_key"
ON "ventas"("cliente_id", "clave_idempotencia")
WHERE "canal" = 'DIGITAL' AND "clave_idempotencia" IS NOT NULL;
