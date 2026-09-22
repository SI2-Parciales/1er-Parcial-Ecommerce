CREATE TYPE "CanalVenta" AS ENUM (
    'PRESENCIAL',
    'DIGITAL'
);

CREATE TYPE "EstadoVenta" AS ENUM (
    'PENDIENTE_PAGO'
);

CREATE TABLE "ventas" (
    "id" SERIAL NOT NULL,
    "canal" "CanalVenta" NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "cajero_id" INTEGER,
    "cliente_id" INTEGER,
    "nombre_facturacion" VARCHAR(200) NOT NULL,
    "documento_facturacion" VARCHAR(50) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total" DECIMAL(14,2) NOT NULL,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'PENDIENTE_PAGO',

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ventas_cajero_presencial_check" CHECK (
        "canal" <> 'PRESENCIAL' OR "cajero_id" IS NOT NULL
    ),
    CONSTRAINT "ventas_nombre_facturacion_check" CHECK (
        btrim("nombre_facturacion") <> ''
    ),
    CONSTRAINT "ventas_documento_facturacion_check" CHECK (
        btrim("documento_facturacion") <> ''
    ),
    CONSTRAINT "ventas_total_check" CHECK ("total" >= 0)
);

CREATE TABLE "detalles_venta" (
    "id" SERIAL NOT NULL,
    "venta_id" INTEGER NOT NULL,
    "variante_producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "detalles_venta_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "detalles_venta_cantidad_check" CHECK ("cantidad" > 0),
    CONSTRAINT "detalles_venta_precio_unitario_check" CHECK ("precio_unitario" >= 0),
    CONSTRAINT "detalles_venta_subtotal_check" CHECK ("subtotal" >= 0)
);

CREATE INDEX "ventas_sucursal_id_idx" ON "ventas"("sucursal_id");
CREATE INDEX "ventas_cajero_id_idx" ON "ventas"("cajero_id");
CREATE INDEX "ventas_cliente_id_idx" ON "ventas"("cliente_id");
CREATE INDEX "ventas_estado_fecha_id_idx" ON "ventas"("estado", "fecha", "id");
CREATE UNIQUE INDEX "detalles_venta_venta_variante_key"
ON "detalles_venta"("venta_id", "variante_producto_id");
CREATE INDEX "detalles_venta_variante_producto_id_idx"
ON "detalles_venta"("variante_producto_id");

ALTER TABLE "ventas"
ADD CONSTRAINT "ventas_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ventas"
ADD CONSTRAINT "ventas_cajero_id_fkey"
FOREIGN KEY ("cajero_id") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ventas"
ADD CONSTRAINT "ventas_cliente_id_fkey"
FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "detalles_venta"
ADD CONSTRAINT "detalles_venta_venta_id_fkey"
FOREIGN KEY ("venta_id") REFERENCES "ventas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "detalles_venta"
ADD CONSTRAINT "detalles_venta_variante_producto_id_fkey"
FOREIGN KEY ("variante_producto_id") REFERENCES "variantes_producto"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
