# Autenticación y permisos en NestJS

## El recorrido de una petición protegida

```text
HTTP request + Authorization: Bearer <token>
        ↓
JwtAuthGuard (global)
  verifica firma y vencimiento del JWT
  vuelve a leer el usuario, estado y rol actuales de PostgreSQL
        ↓
MinimumRoleGuard (global)
  compara el rol actual con @MinRole(...)
        ↓
Controller → Service → Prisma/PostgreSQL
```

Una ruta nueva requiere un JWT automáticamente. La cuenta debe existir y tener estado `ACTIVO`. La API no confía en el claim `role` del token para autorizar: obtiene el rol actual de la base de datos. Por eso un cambio de rol o la desactivación se aplica en la siguiente petición, aunque el token todavía no haya expirado.

## Jerarquía de actores

| Actor                | Nivel | Puede entrar a endpoints que requieren |
| -------------------- | ----: | -------------------------------------- |
| `CLIENTE`            |     1 | CLIENTE                                |
| `CAJERO`             |     2 | CLIENTE y CAJERO                       |
| `ENCARGADO_SUCURSAL` |     3 | CLIENTE, CAJERO y ENCARGADO_SUCURSAL   |
| `ADMINISTRADOR`      |     4 | Los cuatro niveles                     |

Un endpoint se protege indicando el nivel mínimo. Por ejemplo, todo actor puede ver el endpoint de cliente, pero un cliente no puede entrar al de cajero.

## Endpoints para aprender y probar

Los cuatro endpoints son ejemplos que devuelven un mensaje, no operaciones reales de ventas o inventario:

| Endpoint                              | Nivel mínimo         |
| ------------------------------------- | -------------------- |
| `GET /demo/acceso/cliente`            | `CLIENTE`            |
| `GET /demo/acceso/cajero`             | `CAJERO`             |
| `GET /demo/acceso/encargado-sucursal` | `ENCARGADO_SUCURSAL` |
| `GET /demo/acceso/administrador`      | `ADMINISTRADOR`      |

## Gestión administrativa de usuarios y roles

Todas las rutas de esta sección requieren JWT y rol `ADMINISTRADOR`. Un token válido de otro actor recibe `403`; una sesión ausente, inválida o inactiva recibe `401`.

| Método y ruta                | Uso                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `GET /users?page=1&limit=20` | Lista usuarios; `limit` admite de 1 a 100. Devuelve `{ data, meta: { page, limit, total } }`. |
| `GET /users/:id`             | Consulta los datos públicos de un usuario y su rol.                                           |
| `PATCH /users/:id`           | Actualiza `nombre`, `apellido`, `telefono`, `email`, `rolId` y/o `estado`.                    |
| `DELETE /users/:id`          | Marca al usuario como `INACTIVO`; no borra su identidad ni historial.                         |
| `GET /roles`                 | Lista los roles fijos disponibles para asignar.                                               |

El alta sigue siendo `POST /auth/register`: crea un cliente. El administrador puede posteriormente asignar un rol existente, por ejemplo `PATCH /users/12` con `{ "rolId": 2 }`. Los roles no se crean ni renombran desde la API. El `PATCH` también permite reactivar una cuenta con `{ "estado": "ACTIVO" }`. El email se normaliza a minúsculas y espacios recortados; un duplicado responde `409`. Las respuestas de gestión nunca incluyen `passwordHash`.

El sistema no permite degradar ni desactivar al último administrador activo. La comprobación y actualización se serializan mediante un bloqueo de base de datos compartido por las operaciones de gestión, así las actualizaciones concurrentes no pueden eludir esa regla.

En Swagger (`/api`), busca las etiquetas **Usuarios** y **Roles**. Autoriza la sesión con **Authorize** y el JWT Bearer de un administrador.

## Gestión de sucursales

Las rutas de sucursales también requieren JWT. `GET /sucursales` y `GET /sucursales/:id` exigen `ENCARGADO_SUCURSAL` o superior. Crear, actualizar y desactivar exigen `ADMINISTRADOR`.

| Método y ruta                     | Uso                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `POST /sucursales`                | Crea una sucursal; `nombre` y `ubicacion` son obligatorios. `cantidadVestidores` inicia en `0` y `estado` en `ACTIVO` si se omiten. |
| `GET /sucursales?page=1&limit=20` | Lista con paginación (máximo 100) en `{ data, meta }`. Incluye sucursales activas e inactivas.                                      |
| `GET /sucursales/:id`             | Consulta una sucursal por ID.                                                                                                       |
| `PATCH /sucursales/:id`           | Edita `nombre`, `ubicacion`, `cantidadVestidores` o `estado`. Enviar `estado: "ACTIVO"` reactiva una sucursal.                      |
| `DELETE /sucursales/:id`          | Desactiva de forma lógica (`estado: "INACTIVO"`); no elimina físicamente el registro.                                               |

La relación de personal es opcional: cada usuario puede estar en cero o una sucursal. La consulta requiere `ENCARGADO_SUCURSAL` o superior; asignar, reasignar y desasignar requiere `ADMINISTRADOR`.

| Método y ruta                                | Uso                                                                                                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /sucursales/:id/personal`               | Lista ID, nombre, apellido, email y rol del personal asignado. Una sucursal sin personal devuelve `[]`.                                                                                                               |
| `POST /sucursales/:id/personal`              | Recibe `{ "usuarioId": 12 }`. Asigna o reasigna a un usuario activo con rol `CAJERO`, `ENCARGADO_SUCURSAL` o `ADMINISTRADOR`; el destino debe estar activo. Repetir la asignación a la misma sucursal devuelve `409`. |
| `DELETE /sucursales/:id/personal/:usuarioId` | Limpia `sucursalId`; conserva la cuenta, rol y estado del usuario.                                                                                                                                                    |

El rol no cambia al trasladar una persona. `GET /users` y `GET /users/:id` incluyen `sucursalId` (`null` cuando no hay asignación) para la consulta administrativa; las respuestas de registro/login y los claims JWT no incluyen ese campo.

Los campos `id`, `creadoEn` y `actualizadoEn` los administra el backend. `cantidadVestidores` debe ser un entero mayor o igual a cero. La columna PostgreSQL correspondiente es `cantidad_vestidores`.

Abre `/api` en Swagger, usa **Authorize** y pega el `accessToken` recibido al iniciar sesión. Incluye el esquema `Bearer` solo como token; Swagger añade el encabezado HTTP.

## Gestión de categorías, tallas y colores

Estas rutas son catálogos administrativos y requieren JWT con rol `ADMINISTRADOR`. No se borran físicamente: `DELETE` cambia el estado a `INACTIVO`, y `PATCH` permite reactivarlos con `{ "estado": "ACTIVO" }`.

| Recurso    | Rutas                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| Categorías | `POST /categorias`, `GET /categorias`, `GET /categorias/:id`, `PATCH /categorias/:id`, `DELETE /categorias/:id` |
| Tallas     | `POST /tallas`, `GET /tallas`, `GET /tallas/:id`, `PATCH /tallas/:id`, `DELETE /tallas/:id`                     |
| Colores    | `POST /colores`, `GET /colores`, `GET /colores/:id`, `PATCH /colores/:id`, `DELETE /colores/:id`                |

Los `GET` de lista responden `{ data, meta }`, usan `page=1` y `limit=20` por defecto, y devuelven solo registros `ACTIVO`. Usa `includeInactive=true` para consultar también los inactivos. Los nombres se recortan, reducen espacios repetidos y son únicos sin distinguir mayúsculas/minúsculas. `Color.codigoHex` debe tener formato `#RRGGBB`, por ejemplo `#FF5733`.

## Productos y variantes

Las consultas de productos y variantes usan autenticación opcional. Sin encabezado `Authorization` devuelven solamente recursos activos cuyas categorías, tallas y colores también estén activos. Si se envía un token, debe ser válido; Swagger lo enviará después de usar **Authorize**. Solo `ADMINISTRADOR` puede consultar `estado=INACTIVO` o ver detalles inactivos.

| Método y ruta                                 | Acceso y uso                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `POST /productos`                             | Administrador; crea con `nombre`, `descripcion`, `precio` numérico y `categoriaId`. |
| `GET /productos`                              | Público; filtros `nombre`, `categoriaId`, `estado`, `page` y `limit`.               |
| `GET /productos/:id`                          | Público si está activo; incluye categoría y variantes con talla y color.            |
| `PATCH /productos/:id`                        | Administrador; modifica datos, categoría o estado.                                  |
| `DELETE /productos/:id`                       | Administrador; baja lógica sin modificar variantes.                                 |
| `PUT /productos/:id/imagen`                   | Administrador; carga o reemplaza el campo multipart `imagen`.                        |
| `DELETE /productos/:id/imagen`                | Administrador; desasocia y elimina la imagen administrada.                           |
| `POST /productos/:productoId/variantes`       | Administrador; recibe `tallaId`, `colorId` y `sku`.                                 |
| `GET /productos/:productoId/variantes`        | Público para variantes activas; admite `estado`, `page` y `limit`.                  |
| `GET /productos/:productoId/variantes/:id`    | Público si producto, variante, talla y color están activos.                         |
| `PATCH /productos/:productoId/variantes/:id`  | Administrador; actualiza talla, color, SKU o estado.                                |
| `DELETE /productos/:productoId/variantes/:id` | Administrador; desactiva sin borrar.                                                |

El SKU se guarda sin espacios y en mayúsculas. No se permiten SKU duplicados ni repetir una combinación de producto, talla y color. Una variante no puede crearse o reactivarse mientras su producto, talla o color esté inactivo.

El listado y el detalle público incluyen `imagenUrl`, nullable. La carga acepta una sola imagen JPG, PNG o WebP de hasta 5 MB y comprueba extensión, MIME y firma del archivo. El backend genera el nombre UUID y guarda una URL relativa como `/imagenes/productos/<uuid>.webp`; nunca persiste la ruta local ni el nombre enviado. `PRODUCT_IMAGES_DIR` acepta una ruta absoluta o una ruta relativa a la raíz del backend y usa `uploads/productos` por defecto. En producción esa carpeta debe estar en un volumen persistente.

## Inventario global y disponibilidad

Las consultas de CU-24 y la gestión operativa de CU-31 requieren `ENCARGADO_SUCURSAL` o `ADMINISTRADOR`. CU-31 modifica solamente las unidades temporalmente no disponibles; las existencias físicas y reservadas quedan fuera de este endpoint.

| Método y ruta                           | Uso                                                                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /inventario`                       | Consolida por variante. Admite `nombre`, `sku`, `productoId`, `tallaId`, `colorId`, `sucursalId`, `agotado`, `page` y `limit` (máximo 100). |
| `GET /inventario/variantes/:varianteId` | Devuelve la variante, sus totales globales y el desglose paginado de todas las sucursales.                                                  |
| `GET /inventario/publico/variantes/:varianteId` | Consulta pública de CU-06: muestra solo sucursales activas, ubicación, unidades disponibles y agotado.                                |
| `PATCH /inventario/:id/disponibilidad`  | Aparta o habilita unidades mediante un valor absoluto y un valor anterior esperado.                                                         |

Sin `sucursalId`, el listado suma las cantidades de todas las sucursales. Con `sucursalId`, calcula solamente la sucursal indicada. `agotado=true` selecciona variantes cuya cantidad disponible es cero; `agotado=false` selecciona las que tienen unidades disponibles. `nombre` y `sku` permiten búsquedas parciales.

La API devuelve `cantidadFisica`, `cantidadReservada`, `cantidadNoDisponible` y `cantidadDisponible`. La última se calcula como `cantidadFisica - cantidadReservada - cantidadNoDisponible` y no se almacena en PostgreSQL. Una variante o una sucursal sin fila de inventario se interpreta como cero. Los estados de producto, variante, talla, color y sucursal se incluyen en la respuesta; incluso los registros inactivos se contabilizan para no ocultar existencias físicas.

La consulta pública de CU-06 no requiere token. Solo admite variantes cuyos producto, categoría, talla y color estén activos, y excluye sucursales inactivas. No expone cantidades físicas, reservadas o apartadas; una sucursal activa sin inventario aparece como agotada con disponibilidad cero.

En consultas locales, `inventarioId` identifica la fila que puede modificarse. Su valor es `null` en el consolidado global y cuando la combinación sucursal-variante todavía no tiene una fila real.

Ejemplos:

```http
GET /inventario?sku=CHAQ-NEG&agotado=false
GET /inventario?sucursalId=2&agotado=true&page=1&limit=20
GET /inventario/variantes/12?page=1&limit=20
```

Para apartar tres unidades después de observar que actualmente no hay ninguna apartada:

```http
PATCH /inventario/25/disponibilidad
Content-Type: application/json

{
  "cantidadNoDisponible": 3,
  "cantidadNoDisponibleEsperada": 0
}
```

El encargado solo puede modificar inventarios cuyo `sucursalId` coincida con su asignación actual. El servicio vuelve a consultar esa asignación y bloquea la fila de inventario dentro de una transacción. Si otra solicitud cambió el valor antes, responde `409` y el cliente debe volver a consultar. El administrador puede modificar cualquier sucursal, incluidas las inactivas.

La tabla `inventarios` garantiza una sola fila por sucursal y variante, cantidades no negativas y que `cantidadReservada + cantidadNoDisponible` nunca supere a la física. Las modificaciones de existencias físicas, movimientos y transferencias corresponden a CU-32.

## Movimientos de inventario

CU-32 reutiliza la tabla y el servicio de inventario. No permite modificar `cantidadFisica` directamente: toda entrada o salida confirmada se registra como `MOVIMIENTO_INVENTARIO` y se ejecuta en una transacción PostgreSQL.

| Método y ruta                  | Uso                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `POST /inventario/movimientos` | Registra `RECEPCION`, `TRANSFERENCIA`, `DEVOLUCION` o `MERMA`. Exige `Idempotency-Key` con UUID v4.     |
| `GET /inventario/movimientos`  | Historial con `tipo`, `sucursalId`, `varianteProductoId`, `fechaDesde`, `fechaHasta`, `page` y `limit`. |

El encargado puede recibir y reincorporar prendas en su sucursal, y registrar transferencias o mermas cuyo origen sea su sucursal. El administrador puede operar cualquier sucursal. El historial del encargado incluye únicamente movimientos donde su sucursal sea origen o destino; el administrador dispone de la vista global.

Una transferencia descuenta únicamente unidades disponibles y bloquea los inventarios de origen y destino en orden estable. Una devolución puede incrementar también `cantidadNoDisponible`. Una merma exige `origenUnidades` (`DISPONIBLE` o `NO_DISPONIBLE`) y una observación; nunca descuenta reservas. Solo la merma admite recursos inactivos.

La clave idempotente queda vinculada al usuario y al cuerpo normalizado. Repetir la misma solicitud devuelve el resultado original sin aplicar nuevamente el stock. Reutilizar la clave con otro cuerpo responde `409`.

Respuestas de seguridad:

- `401 Unauthorized`: no se envió token, el token no se verifica/expiró o la cuenta no existe/está inactiva.
- `403 Forbidden`: sesión válida, pero el actor no alcanza el nivel mínimo de la ruta.

## Cómo proteger una ruta nueva

El guard JWT ya es global; en el controller solo indicas el nivel mínimo:

```ts
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { MinRole } from '../auth/decorators/min-role.decorator.js';

@ApiTags('Inventario')
@ApiBearerAuth('bearerAuth')
@Controller('inventario')
export class InventarioController {
  @Get()
  @MinRole(ACTOR_ROLE.ENCARGADO_SUCURSAL)
  listar() {
    return {
      message: 'ENCARGADO_SUCURSAL o ADMINISTRADOR pueden entrar.',
    };
  }
}
```

`@MinRole(ACTOR_ROLE.ENCARGADO_SUCURSAL)` restringe a encargado y administrador. `@MinRole(ACTOR_ROLE.ADMINISTRADOR)` restringe solo al administrador. Si no pones `@MinRole`, cualquier actor autenticado y activo puede entrar.

`@Public()` evita la autenticación global. Se usa en `POST /auth/register` y `POST /auth/login`; no se debe poner en rutas de negocio.

Para obtener de forma tipada la identidad ya validada en un controller se puede usar `@CurrentUser()`. Los guards no reemplazan la autorización sobre cada recurso: por ejemplo, al consultar una orden, el service debe comprobar que la orden pertenece al cliente actual, salvo que el nivel del actor le permita consultar órdenes ajenas.

## Cuentas de demostración

El registro público siempre crea `CLIENTE`. Para tener tokens de los cuatro niveles en Swagger, configura en tu `.env`:

- `DEMO_SEED_ENABLED=true`
- `DEMO_DATABASE_URL` apuntando a una base de demostración distinta de `DATABASE_URL` y `TEST_DATABASE_URL`.
- `DEMO_USERS_PASSWORD` y los cuatro correos `DEMO_CLIENTE_EMAIL`, `DEMO_CAJERO_EMAIL`, `DEMO_ENCARGADO_EMAIL`, `DEMO_ADMINISTRADOR_EMAIL`.

La base demo debe tener aplicadas las migraciones. Durante la migración, apunta `DATABASE_URL` a `DEMO_DATABASE_URL`; luego restaura `DATABASE_URL` a tu base normal y ejecuta `npm run prisma:seed:demo`. El seed se conecta directamente a `DEMO_DATABASE_URL`, exige la habilitación explícita y rechaza producción o coincidencias con las bases de desarrollo/pruebas. No usa `DATABASE_URL` como sustituto. Los cuatro usuarios comparten la contraseña demo configurada y sus hashes se generan con Argon2.

Para iniciar la API y probarlas, configura `DATABASE_URL` con el mismo valor de `DEMO_DATABASE_URL` solo en la sesión de terminal donde ejecutes `npm run start:dev`. Luego inicia sesión por `POST /auth/login` con cada correo, copia el token de cada respuesta y úsalo en Swagger. No vuelvas a ejecutar el seed demo mientras ambas variables apunten a la misma base; restaura primero la base normal. No reutilices usuarios ni contraseñas demo en producción.

Para probar CU-31, después de crear los usuarios ejecuta `npm run prisma:seed:inventario-demo`. Este segundo seed prepara dos sucursales, inventario conocido y asigna el encargado demo a la sucursal central. Volver a ejecutarlo restaura las cantidades demo previstas.

## Migración del rol anterior

La migración nueva convierte `VENDEDOR` en `CAJERO` manteniendo los usuarios asociados. Si ambos roles existían, reasigna los usuarios de `VENDEDOR` al rol `CAJERO` existente y elimina la fila antigua. El seed normal deja disponibles `CLIENTE`, `CAJERO`, `ENCARGADO_SUCURSAL` y `ADMINISTRADOR`.
