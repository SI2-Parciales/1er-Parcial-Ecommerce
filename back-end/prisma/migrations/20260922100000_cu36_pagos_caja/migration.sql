CREATE TYPE "MetodoPago" AS ENUM (
    'EFECTIVO',
    'TARJETA',
    'QR'
);

CREATE TYPE "EstadoPago" AS ENUM (
    'CONFIRMADO'
);

CREATE TABLE "pagos" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "monto" DECIMAL(14,2) NOT NULL,
    "monto_recibido" DECIMAL(14,2),
    "cambio" DECIMAL(14,2),
    "referencia" VARCHAR(100),
    "simulado" BOOLEAN NOT NULL DEFAULT true,
    "estado" "EstadoPago" NOT NULL DEFAULT 'CONFIRMADO',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pagos_monto_check" CHECK ("monto" > 0),
    CONSTRAINT "pagos_referencia_check" CHECK (
        "referencia" IS NULL OR btrim("referencia") <> ''
    ),
    CONSTRAINT "pagos_metodo_importes_check" CHECK (
        (
            "metodo" = 'EFECTIVO'
            AND "monto_recibido" IS NOT NULL
            AND "cambio" IS NOT NULL
            AND "monto_recibido" >= "monto"
            AND "cambio" = "monto_recibido" - "monto"
            AND "referencia" IS NULL
        )
        OR (
            "metodo" IN ('TARJETA', 'QR')
            AND "monto_recibido" IS NULL
            AND "cambio" IS NULL
        )
    )
);

CREATE INDEX "pagos_venta_id_idx" ON "pagos"("venta_id");
CREATE INDEX "pagos_metodo_fecha_id_idx" ON "pagos"("metodo", "fecha", "id");
CREATE UNIQUE INDEX "pagos_venta_confirmada_key"
ON "pagos"("venta_id")
WHERE "estado" = 'CONFIRMADO';

ALTER TABLE "pagos"
ADD CONSTRAINT "pagos_venta_id_fkey"
FOREIGN KEY ("venta_id") REFERENCES "ventas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_inventario"
ADD COLUMN "venta_id" INTEGER;

ALTER TABLE "movimientos_inventario"
DROP CONSTRAINT "movimientos_inventario_sucursales_check";

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "movimientos_inventario_sucursales_check" CHECK (
    ("tipo" = 'RECEPCION' AND "sucursal_origen_id" IS NULL AND "sucursal_destino_id" IS NOT NULL)
    OR ("tipo" = 'DEVOLUCION' AND "sucursal_origen_id" IS NULL AND "sucursal_destino_id" IS NOT NULL)
    OR (
        "tipo" = 'TRANSFERENCIA'
        AND "sucursal_origen_id" IS NOT NULL
        AND "sucursal_destino_id" IS NOT NULL
        AND "sucursal_origen_id" <> "sucursal_destino_id"
    )
    OR ("tipo" = 'MERMA' AND "sucursal_origen_id" IS NOT NULL AND "sucursal_destino_id" IS NULL)
    OR ("tipo" = 'VENTA' AND "sucursal_origen_id" IS NOT NULL AND "sucursal_destino_id" IS NULL)
);

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "movimientos_inventario_venta_check" CHECK (
    ("tipo" = 'VENTA' AND "venta_id" IS NOT NULL)
    OR ("tipo" <> 'VENTA' AND "venta_id" IS NULL)
);

CREATE INDEX "movimientos_inventario_venta_id_idx"
ON "movimientos_inventario"("venta_id");

CREATE UNIQUE INDEX "movimientos_inventario_venta_variante_key"
ON "movimientos_inventario"("venta_id", "variante_producto_id")
WHERE "tipo" = 'VENTA';

ALTER TABLE "movimientos_inventario"
ADD CONSTRAINT "movimientos_inventario_venta_id_fkey"
FOREIGN KEY ("venta_id") REFERENCES "ventas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
