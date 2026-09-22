ALTER TABLE "inventarios"
ADD COLUMN "cantidad_no_disponible" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "inventarios"
DROP CONSTRAINT "inventarios_reservada_fisica_check";

ALTER TABLE "inventarios"
ADD CONSTRAINT "inventarios_cantidad_no_disponible_check"
CHECK ("cantidad_no_disponible" >= 0);

ALTER TABLE "inventarios"
ADD CONSTRAINT "inventarios_cantidades_disponibles_check"
CHECK (
    "cantidad_reservada" + "cantidad_no_disponible"
    <= "cantidad_fisica"
);
