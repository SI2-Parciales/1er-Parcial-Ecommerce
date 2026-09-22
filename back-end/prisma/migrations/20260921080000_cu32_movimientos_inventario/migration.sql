CREATE TYPE "TipoMovimiento" AS ENUM (
    'RECEPCION',
    'TRANSFERENCIA',
    'DEVOLUCION',
    'MERMA'
);

CREATE TABLE "movimientos_inventario" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" VARCHAR(500),
    "usuario_id" INTEGER NOT NULL,
    "variante_producto_id" INTEGER NOT NULL,
    "sucursal_origen_id" INTEGER,
    "sucursal_destino_id" INTEGER,
    "clave_idempotencia" UUID NOT NULL,
    "hash_solicitud" CHAR(64) NOT NULL,
    "resultado_idempotente" JSONB NOT NULL,

    CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "movimientos_inventario_cantidad_check" CHECK ("cantidad" > 0),
    CONSTRAINT "movimientos_inventario_sucursales_check" CHECK (
        ("tipo" = 'RECEPCION' AND "sucursal_origen_id" IS NULL AND "sucursal_destino_id" IS NOT NULL)
        OR ("tipo" = 'DEVOLUCION' AND "sucursal_origen_id" IS NULL AND "sucursal_destino_id" IS NOT NULL)
        OR (
            "tipo" = 'TRANSFERENCIA'
            AND "sucursal_origen_id" IS NOT NULL
            AND "sucursal_destino_id" IS NOT NULL
            AND "sucursal_origen_id" <> "sucursal_destino_id"
        )
        OR ("tipo" = 'MERMA' AND "sucursal_origen_id" IS NOT NULL AND "sucursal_destino_id" IS NULL)
    ),
    CONSTRAINT "movimientos_inventario_merma_observacion_check" CHECK (
        "tipo" <> 'MERMA'
        OR ("observacion" IS NOT NULL AND btrim("observacion") <> '')
    )
);

CREATE UNIQUE INDEX "movimientos_inventario_usuario_clave_key"
ON "movimientos_inventario"("usuario_id", "clave_idempotencia");

CREATE INDEX "movimientos_inventario_tipo_fecha_idx"
ON "movimientos_inventario"("tipo", "fecha", "id");

CREATE INDEX "movimientos_inventario_variante_fecha_idx"
ON "movimientos_inventario"("variante_producto_id", "fecha", "id");

CREATE INDEX "movimientos_inventario_origen_fecha_idx"
ON "movimientos_inventario"("sucursal_origen_id", "fecha", "id");

CREATE INDEX "movimientos_inventario_destino_fecha_idx"
ON "movimientos_inventario"("sucursal_destino_id", "fecha", "id");

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "movimientos_inventario_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "movimientos_inventario_variante_producto_id_fkey"
FOREIGN KEY ("variante_producto_id") REFERENCES "variantes_producto"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "movimientos_inventario_sucursal_origen_id_fkey"
FOREIGN KEY ("sucursal_origen_id") REFERENCES "sucursales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "movimientos_inventario_sucursal_destino_id_fkey"
FOREIGN KEY ("sucursal_destino_id") REFERENCES "sucursales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
