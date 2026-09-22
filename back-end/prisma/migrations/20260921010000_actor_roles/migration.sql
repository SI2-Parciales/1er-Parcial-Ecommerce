DO $migration$
DECLARE
    vendedor_id INTEGER;
    cajero_id INTEGER;
BEGIN
    SELECT "id" INTO vendedor_id FROM "roles" WHERE "nombre" = 'VENDEDOR';
    SELECT "id" INTO cajero_id FROM "roles" WHERE "nombre" = 'CAJERO';

    IF vendedor_id IS NOT NULL AND cajero_id IS NULL THEN
        UPDATE "roles"
        SET "nombre" = 'CAJERO', "descripcion" = 'Cajero de FashionStore'
        WHERE "id" = vendedor_id;
    ELSIF vendedor_id IS NOT NULL AND cajero_id IS NOT NULL THEN
        UPDATE "usuarios" SET "rol_id" = cajero_id WHERE "rol_id" = vendedor_id;
        DELETE FROM "roles" WHERE "id" = vendedor_id;
    END IF;

    UPDATE "roles"
    SET "descripcion" = 'Cajero de FashionStore'
    WHERE "nombre" = 'CAJERO';
END
$migration$;
