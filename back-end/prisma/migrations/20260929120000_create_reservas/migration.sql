CREATE TYPE "EstadoReserva" AS ENUM (
    'PENDIENTE',
    'EN_PROCESO',
    'FINALIZADA',
    'CANCELADA'
);

CREATE TABLE "reservas" (
    "id" SERIAL NOT NULL,
    "cliente_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'PENDIENTE',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "detalles_reserva" (
    "id" SERIAL NOT NULL,
    "reserva_id" INTEGER NOT NULL,
    "variante_producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "detalles_reserva_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "detalles_reserva_cantidad_check" CHECK ("cantidad" > 0)
);

CREATE INDEX "reservas_cliente_creado_id_idx"
ON "reservas"("cliente_id", "creado_en", "id");

CREATE INDEX "reservas_sucursal_fecha_id_idx"
ON "reservas"("sucursal_id", "fecha_hora", "id");

CREATE INDEX "reservas_estado_fecha_id_idx"
ON "reservas"("estado", "fecha_hora", "id");

CREATE UNIQUE INDEX "detalles_reserva_reserva_variante_key"
ON "detalles_reserva"("reserva_id", "variante_producto_id");

CREATE INDEX "detalles_reserva_variante_producto_id_idx"
ON "detalles_reserva"("variante_producto_id");

ALTER TABLE "reservas"
ADD CONSTRAINT "reservas_cliente_id_fkey"
FOREIGN KEY ("cliente_id") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reservas"
ADD CONSTRAINT "reservas_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "detalles_reserva"
ADD CONSTRAINT "detalles_reserva_reserva_id_fkey"
FOREIGN KEY ("reserva_id") REFERENCES "reservas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "detalles_reserva"
ADD CONSTRAINT "detalles_reserva_variante_producto_id_fkey"
FOREIGN KEY ("variante_producto_id") REFERENCES "variantes_producto"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
