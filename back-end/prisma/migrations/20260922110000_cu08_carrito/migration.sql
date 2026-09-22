CREATE TABLE "carritos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "sucursal_id" INTEGER,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carritos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "detalles_carrito" (
    "id" SERIAL NOT NULL,
    "carrito_id" INTEGER NOT NULL,
    "variante_producto_id" INTEGER NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "detalles_carrito_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "detalles_carrito_cantidad_check" CHECK ("cantidad" > 0)
);

CREATE UNIQUE INDEX "carritos_usuario_id_key"
ON "carritos"("usuario_id");

CREATE INDEX "carritos_sucursal_id_idx"
ON "carritos"("sucursal_id");

CREATE UNIQUE INDEX "detalles_carrito_carrito_variante_key"
ON "detalles_carrito"("carrito_id", "variante_producto_id");

CREATE INDEX "detalles_carrito_variante_producto_id_idx"
ON "detalles_carrito"("variante_producto_id");

ALTER TABLE "carritos"
ADD CONSTRAINT "carritos_usuario_id_fkey"
FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "carritos"
ADD CONSTRAINT "carritos_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "detalles_carrito"
ADD CONSTRAINT "detalles_carrito_carrito_id_fkey"
FOREIGN KEY ("carrito_id") REFERENCES "carritos"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "detalles_carrito"
ADD CONSTRAINT "detalles_carrito_variante_producto_id_fkey"
FOREIGN KEY ("variante_producto_id") REFERENCES "variantes_producto"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
