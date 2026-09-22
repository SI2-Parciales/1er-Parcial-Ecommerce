CREATE TABLE "inventarios" (
    "id" SERIAL NOT NULL,
    "sucursal_id" INTEGER NOT NULL,
    "variante_producto_id" INTEGER NOT NULL,
    "cantidad_fisica" INTEGER NOT NULL DEFAULT 0,
    "cantidad_reservada" INTEGER NOT NULL DEFAULT 0,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventarios_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "inventarios_cantidad_fisica_check" CHECK ("cantidad_fisica" >= 0),
    CONSTRAINT "inventarios_cantidad_reservada_check" CHECK ("cantidad_reservada" >= 0),
    CONSTRAINT "inventarios_reservada_fisica_check" CHECK ("cantidad_reservada" <= "cantidad_fisica")
);

CREATE UNIQUE INDEX "inventarios_sucursal_variante_key"
ON "inventarios"("sucursal_id", "variante_producto_id");

CREATE INDEX "inventarios_variante_producto_id_idx"
ON "inventarios"("variante_producto_id");

ALTER TABLE "inventarios"
ADD CONSTRAINT "inventarios_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventarios"
ADD CONSTRAINT "inventarios_variante_producto_id_fkey"
FOREIGN KEY ("variante_producto_id") REFERENCES "variantes_producto"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
