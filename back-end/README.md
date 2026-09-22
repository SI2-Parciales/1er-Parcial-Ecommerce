<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Autenticación FashionStore

1. Copia `.env.example` a `.env` y reemplaza `DATABASE_URL` y `JWT_SECRET`.
2. Aplica el esquema sin borrar datos: `npm run prisma:migrate:deploy`.
3. Inicializa los roles `CLIENTE`, `CAJERO`, `ENCARGADO_SUCURSAL` y `ADMINISTRADOR`: `npm run prisma:seed`.
4. Inicia el servidor: `npm run start:dev`.

Para el frontend React, configura `CORS_ORIGINS` con los dominios permitidos separados por coma. En desarrollo admite por defecto `localhost:3000` y `localhost:5173`; React Native nativo no requiere CORS. En producción configura explícitamente el dominio HTTPS del frontend.

Lee [la guía de autenticación y permisos](docs/autorizacion.md) para conocer la jerarquía de actores, los guards globales, la gestión administrativa de usuarios y cómo proteger rutas nuevas.

Endpoints disponibles:

- `POST /auth/register`: recibe `nombre`, `apellido`, `telefono`, `email` y `password`.
- `POST /auth/login`: recibe `email` y `password`.

Los endpoints de demostración protegidos son `/demo/acceso/cliente`, `/demo/acceso/cajero`, `/demo/acceso/encargado-sucursal` y `/demo/acceso/administrador`. La jerarquía permite a cada rol superior entrar a los niveles inferiores.

La gestión administrativa ofrece `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id` y `GET /roles`. Solo `ADMINISTRADOR` puede usarlos. El registro público crea clientes; luego el administrador puede cambiar su `rolId`. `DELETE` desactiva sin borrar, y nunca se permite quitar al último administrador activo.

La gestión de sucursales ofrece `POST /sucursales`, `GET /sucursales`, `GET /sucursales/:id`, `PATCH /sucursales/:id` y `DELETE /sucursales/:id`. Consultar requiere `ENCARGADO_SUCURSAL` o superior; las escrituras son solo para `ADMINISTRADOR`. La baja es lógica y marca la sucursal como `INACTIVO`.

La gestión de personal ofrece `GET /sucursales/:id/personal` para encargados o administradores, `POST /sucursales/:id/personal` para que un administrador asigne o reasigne un usuario activo con rol de personal y `DELETE /sucursales/:id/personal/:usuarioId` para desasignarlo. La relación es nullable; clientes no son elegibles y las respuestas solo exponen datos públicos. Las migraciones agregan `usuarios.sucursal_id` sin cambiar los registros existentes.

Los catálogos administrativos incluyen `categorias`, `tallas` y `colores`. Cada uno ofrece `POST`, `GET`, `GET /:id`, `PATCH /:id` y `DELETE /:id`; todos requieren JWT de `ADMINISTRADOR`. Los listados usan `page`, `limit` (máximo 100) e `includeInactive=true` para incluir bajas lógicas. Los nombres se comparan sin distinguir mayúsculas/minúsculas. Un color requiere `codigoHex` en formato `#RRGGBB` y se guarda en mayúsculas.

La gestión de productos ofrece el CRUD `/productos` y las variantes anidadas en `/productos/:productoId/variantes`. Los `GET` aceptan acceso público sin token y muestran únicamente productos, variantes y catálogos activos. Cada producto incluye `imagenUrl`, que será `null` hasta que un administrador cargue un JPG, PNG o WebP de máximo 5 MB mediante `PUT /productos/:id/imagen`; `DELETE /productos/:id/imagen` desasocia y elimina la imagen administrada. La carpeta se configura con `PRODUCT_IMAGES_DIR` y se publica en `/imagenes/productos/`. Un administrador puede autorizarse y filtrar `estado=INACTIVO`. Las escrituras requieren `ADMINISTRADOR`; el precio se recibe como número con máximo dos decimales, y cada variante usa una combinación única de talla, color y SKU.

El inventario ofrece `GET /inventario` para consolidar existencias y `GET /inventario/variantes/:varianteId` para desglosarlas por sucursal. Ambos requieren `ENCARGADO_SUCURSAL` o `ADMINISTRADOR` y calculan la disponibilidad como física menos reservada y no disponible. Para CU-06, `GET /inventario/publico/variantes/:varianteId` no requiere autenticación y expone únicamente sucursales activas, su ubicación y unidades disponibles. `PATCH /inventario/:id/disponibilidad` permite apartar o habilitar unidades: el encargado solo puede modificar su sucursal y el administrador cualquiera. El cuerpo recibe `cantidadNoDisponible` y `cantidadNoDisponibleEsperada`; un valor esperado obsoleto devuelve `409`. CU-31 no modifica la existencia física ni registra movimientos de CU-32.

CU-32 agrega `POST /inventario/movimientos` para recepciones, transferencias, devoluciones y mermas, y `GET /inventario/movimientos` para el historial paginado. Cada escritura exige un encabezado `Idempotency-Key` con UUID v4, aplica las existencias y la trazabilidad en una sola transacción y nunca permite transferir o dar de baja reservas. El administrador opera cualquier sucursal; el encargado queda limitado a la sucursal que tiene asignada.

Para crear y aplicar migraciones en desarrollo ejecuta `npm run prisma:migrate:dev -- --name nombre_de_migracion`. En despliegues, después de revisar las migraciones, ejecuta `npm run prisma:migrate:deploy`. Prisma Client se genera con `npm run prisma:generate`.

Con el servidor iniciado, la documentación Swagger interactiva está disponible en `http://localhost:1234/api` (o el puerto definido mediante `PORT`).

Ambos devuelven `{ message, user, accessToken }`; el usuario nunca incluye la contraseña ni su hash. El token se configura con `JWT_SECRET` y `JWT_EXPIRES_IN` (por defecto `15m`).

Para las pruebas E2E, configura una base PostgreSQL exclusiva en `TEST_DATABASE_URL`, aplica allí la migración y el seed, y ejecuta `npm run test:e2e`. Las pruebas no se ejecutan si esa variable no está configurada para evitar tocar una base de desarrollo.

Para generar usuarios de prueba que puedas usar desde Swagger, configura las variables `DEMO_*` de `.env.example`, prepara una base separada y ejecuta `npm run prisma:seed:demo`. El comando está separado del seed normal y se niega a ejecutarse en producción. Consulta la guía enlazada arriba antes de probar.

Después del seed de usuarios demo, ejecuta `npm run prisma:seed:inventario-demo` para preparar dos sucursales, una variante con existencias y asignar el encargado demo a la sucursal central. El comando es idempotente y reutiliza las mismas protecciones de `DEMO_DATABASE_URL`.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/overview) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
