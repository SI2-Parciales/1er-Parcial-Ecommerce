CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "descripcion" VARCHAR(2000),
    "precio" DECIMAL(12,2) NOT NULL,
    "categoria_id" INTEGER NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "productos_precio_positivo_check" CHECK ("precio" > 0),
    CONSTRAINT "productos_estado_check" CHECK ("estado" IN ('ACTIVO', 'INACTIVO'))
);

CREATE TABLE "variantes_producto" (
    "id" SERIAL NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "talla_id" INTEGER NOT NULL,
    "color_id" INTEGER NOT NULL,
    "sku" VARCHAR(100) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variantes_producto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "variantes_producto_estado_check" CHECK ("estado" IN ('ACTIVO', 'INACTIVO'))
);

CREATE INDEX "productos_categoria_id_idx" ON "productos"("categoria_id");
CREATE UNIQUE INDEX "variantes_producto_sku_key" ON "variantes_producto"("sku");
CREATE UNIQUE INDEX "variantes_producto_combinacion_key" ON "variantes_producto"("producto_id", "talla_id", "color_id");
CREATE INDEX "variantes_producto_producto_id_idx" ON "variantes_producto"("producto_id");
CREATE INDEX "variantes_producto_talla_id_idx" ON "variantes_producto"("talla_id");
CREATE INDEX "variantes_producto_color_id_idx" ON "variantes_producto"("color_id");

ALTER TABLE "productos"
ADD CONSTRAINT "productos_categoria_id_fkey"
FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "variantes_producto"
ADD CONSTRAINT "variantes_producto_producto_id_fkey"
FOREIGN KEY ("producto_id") REFERENCES "productos"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "variantes_producto"
ADD CONSTRAINT "variantes_producto_talla_id_fkey"
FOREIGN KEY ("talla_id") REFERENCES "tallas"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "variantes_producto"
ADD CONSTRAINT "variantes_producto_color_id_fkey"
FOREIGN KEY ("color_id") REFERENCES "colores"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
