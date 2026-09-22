CREATE TABLE "categorias" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tallas" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "tallas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "colores" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo_hex" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',

    CONSTRAINT "colores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categorias_nombre_ci_key" ON "categorias" (LOWER("nombre"));
CREATE UNIQUE INDEX "tallas_nombre_ci_key" ON "tallas" (LOWER("nombre"));
CREATE UNIQUE INDEX "colores_nombre_ci_key" ON "colores" (LOWER("nombre"));
