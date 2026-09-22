ALTER TABLE "usuarios" ADD COLUMN "sucursal_id" INTEGER;

CREATE INDEX "usuarios_sucursal_id_idx" ON "usuarios"("sucursal_id");

ALTER TABLE "usuarios"
ADD CONSTRAINT "usuarios_sucursal_id_fkey"
FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
