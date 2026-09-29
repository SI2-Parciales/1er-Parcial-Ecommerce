import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as argon2 from 'argon2';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase('Reservas e2e', () => {
  const prisma = new PrismaClient();
  let app: NestExpressApplication;
  let tokenCliente: string;
  let tokenOtroCliente: string;
  let tokenEncargado: string;
  let tokenAdministrador: string;
  let varianteProductoId: number;
  let inventarioId: number;
  let sucursalId: number;
  let sucursalOtraId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    await app.init();
  });

  beforeEach(async () => {
    await prisma.detalleReserva.deleteMany();
    await prisma.reserva.deleteMany();
    await prisma.detalleCarrito.deleteMany();
    await prisma.carrito.deleteMany();
    await prisma.pago.deleteMany();
    await prisma.movimientoInventario.deleteMany();
    await prisma.detalleVenta.deleteMany();
    await prisma.venta.deleteMany();
    await prisma.inventario.deleteMany();
    await prisma.varianteProducto.deleteMany();
    await prisma.producto.deleteMany();
    await prisma.color.deleteMany();
    await prisma.talla.deleteMany();
    await prisma.categoria.deleteMany();
    await prisma.sucursal.deleteMany();
    await prisma.usuario.deleteMany();

    const role = await prisma.rol.upsert({
      where: { nombre: 'CLIENTE' },
      create: { nombre: 'CLIENTE', descripcion: 'Cliente de prueba' },
      update: {},
    });
    const managerRole = await prisma.rol.upsert({
      where: { nombre: 'ENCARGADO_SUCURSAL' },
      create: {
        nombre: 'ENCARGADO_SUCURSAL',
        descripcion: 'Encargado de sucursal de prueba',
      },
      update: {},
    });
    const administratorRole = await prisma.rol.upsert({
      where: { nombre: 'ADMINISTRADOR' },
      create: {
        nombre: 'ADMINISTRADOR',
        descripcion: 'Administrador de prueba',
      },
      update: {},
    });
    const passwordHash = await argon2.hash('unused-password');
    const branch = await prisma.sucursal.create({
      data: { nombre: 'Central Reservas', ubicacion: 'Centro' },
    });
    const otherBranch = await prisma.sucursal.create({
      data: { nombre: 'Norte Reservas', ubicacion: 'Norte' },
    });
    sucursalId = branch.id;
    sucursalOtraId = otherBranch.id;
    const [customer, otherCustomer, manager, administrator] = await Promise.all(
      [
        prisma.usuario.create({
          data: {
            nombre: 'Cliente',
            apellido: 'Uno',
            telefono: '70000001',
            email: 'reservas-cliente@example.test',
            passwordHash,
            estado: 'ACTIVO',
            rolId: role.id,
          },
        }),
        prisma.usuario.create({
          data: {
            nombre: 'Cliente',
            apellido: 'Dos',
            telefono: '70000002',
            email: 'reservas-otro@example.test',
            passwordHash,
            estado: 'ACTIVO',
            rolId: role.id,
          },
        }),
        prisma.usuario.create({
          data: {
            nombre: 'Encargado',
            apellido: 'Central',
            telefono: '70000003',
            email: 'reservas-encargado@example.test',
            passwordHash,
            estado: 'ACTIVO',
            rolId: managerRole.id,
            sucursalId: branch.id,
          },
        }),
        prisma.usuario.create({
          data: {
            nombre: 'Administrador',
            apellido: 'Global',
            telefono: '70000004',
            email: 'reservas-admin@example.test',
            passwordHash,
            estado: 'ACTIVO',
            rolId: administratorRole.id,
          },
        }),
      ],
    );
    const category = await prisma.categoria.create({
      data: { nombre: 'Prueba', descripcion: 'Catálogo e2e' },
    });
    const talla = await prisma.talla.create({ data: { nombre: 'M' } });
    const color = await prisma.color.create({
      data: { nombre: 'Negro', codigoHex: '#000000' },
    });
    const product = await prisma.producto.create({
      data: { nombre: 'Polera e2e', precio: '10.00', categoriaId: category.id },
    });
    const variant = await prisma.varianteProducto.create({
      data: {
        productoId: product.id,
        tallaId: talla.id,
        colorId: color.id,
        sku: `RESERVA-${Date.now()}`,
      },
    });
    const inventory = await prisma.inventario.create({
      data: {
        sucursalId: branch.id,
        varianteProductoId: variant.id,
        cantidadFisica: 1,
      },
    });
    await prisma.inventario.create({
      data: {
        sucursalId: otherBranch.id,
        varianteProductoId: variant.id,
        cantidadFisica: 1,
      },
    });
    varianteProductoId = variant.id;
    inventarioId = inventory.id;
    const jwt = app.get(JwtService);
    tokenCliente = jwt.sign({ sub: customer.id });
    tokenOtroCliente = jwt.sign({ sub: otherCustomer.id });
    tokenEncargado = jwt.sign({ sub: manager.id });
    tokenAdministrador = jwt.sign({ sub: administrator.id });
  });

  afterAll(async () => {
    await app?.close();
    await prisma.$disconnect();
  });

  it('serializa reservas concurrentes para impedir vender la misma última unidad', async () => {
    const body = {
      sucursalId: (
        await prisma.inventario.findUniqueOrThrow({
          where: { id: inventarioId },
        })
      ).sucursalId,
      fechaHora: '2026-10-15T14:30:00-04:00',
      items: [{ varianteProductoId, cantidad: 1 }],
    };
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${tokenCliente}`)
        .send(body),
      request(app.getHttpServer())
        .post('/reservas')
        .set('Authorization', `Bearer ${tokenOtroCliente}`)
        .send(body),
    ]);

    expect(responses.map(({ status }) => status).sort((a, b) => a - b)).toEqual(
      [201, 409],
    );
    expect(await prisma.reserva.count()).toBe(1);
    expect(
      (
        await prisma.inventario.findUniqueOrThrow({
          where: { id: inventarioId },
        })
      ).cantidadReservada,
    ).toBe(1);
  });

  it('oculta reservas ajenas y libera stock una sola vez al cancelar', async () => {
    await prisma.inventario.update({
      where: { id: inventarioId },
      data: { cantidadFisica: 2 },
    });
    const inventory = await prisma.inventario.findUniqueOrThrow({
      where: { id: inventarioId },
    });
    const created = await request(app.getHttpServer())
      .post('/reservas')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        sucursalId: inventory.sucursalId,
        fechaHora: '2026-10-15T14:30:00-04:00',
        items: [
          { varianteProductoId, cantidad: 1 },
          { varianteProductoId, cantidad: 1 },
        ],
      })
      .expect(201);

    expect(created.body.detalles).toHaveLength(1);
    expect(created.body.detalles[0].cantidad).toBe(2);

    await request(app.getHttpServer())
      .get(`/reservas/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenOtroCliente}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/reservas/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/reservas/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(200);

    expect(await prisma.reserva.count()).toBe(1);
    expect(
      (
        await prisma.reserva.findUniqueOrThrow({
          where: { id: created.body.id },
        })
      ).estado,
    ).toBe('CANCELADA');
    expect(
      (
        await prisma.inventario.findUniqueOrThrow({
          where: { id: inventarioId },
        })
      ).cantidadReservada,
    ).toBe(0);
  });

  it('limita al encargado a su sucursal y permite consulta global al administrador', async () => {
    const first = await request(app.getHttpServer())
      .post('/reservas')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        sucursalId,
        fechaHora: '2026-10-15T14:30:00-04:00',
        items: [{ varianteProductoId, cantidad: 1 }],
      })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/reservas')
      .set('Authorization', `Bearer ${tokenOtroCliente}`)
      .send({
        sucursalId: sucursalOtraId,
        fechaHora: '2026-10-15T14:30:00-04:00',
        items: [{ varianteProductoId, cantidad: 1 }],
      })
      .expect(201);

    const managerList = await request(app.getHttpServer())
      .get('/reservas')
      .set('Authorization', `Bearer ${tokenEncargado}`)
      .expect(200);
    expect(managerList.body.meta.total).toBe(1);
    expect(managerList.body.data[0].id).toBe(first.body.id);
    await request(app.getHttpServer())
      .get(`/reservas/${second.body.id}`)
      .set('Authorization', `Bearer ${tokenEncargado}`)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/reservas?sucursalId=${sucursalOtraId}`)
      .set('Authorization', `Bearer ${tokenEncargado}`)
      .expect(403);

    const globalList = await request(app.getHttpServer())
      .get('/reservas')
      .set('Authorization', `Bearer ${tokenAdministrador}`)
      .expect(200);
    expect(globalList.body.meta.total).toBe(2);
    await request(app.getHttpServer())
      .get(`/reservas/${second.body.id}`)
      .set('Authorization', `Bearer ${tokenAdministrador}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/reservas/${first.body.id}/iniciar-preparacion`)
      .set('Authorization', `Bearer ${tokenAdministrador}`)
      .expect(403);
  });

  it('aplica transiciones secuenciales y libera inventario solo al finalizar', async () => {
    const created = await request(app.getHttpServer())
      .post('/reservas')
      .set('Authorization', `Bearer ${tokenCliente}`)
      .send({
        sucursalId,
        fechaHora: '2026-10-15T14:30:00-04:00',
        items: [{ varianteProductoId, cantidad: 1 }],
      })
      .expect(201);
    const [first, competing] = await Promise.all([
      request(app.getHttpServer())
        .patch(`/reservas/${created.body.id}/iniciar-preparacion`)
        .set('Authorization', `Bearer ${tokenEncargado}`),
      request(app.getHttpServer())
        .patch(`/reservas/${created.body.id}/iniciar-preparacion`)
        .set('Authorization', `Bearer ${tokenEncargado}`),
    ]);
    expect([first.status, competing.status].sort((a, b) => a - b)).toEqual([
      200, 409,
    ]);
    expect(
      (
        await prisma.inventario.findUniqueOrThrow({
          where: { id: inventarioId },
        })
      ).cantidadReservada,
    ).toBe(1);
    await request(app.getHttpServer())
      .delete(`/reservas/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenCliente}`)
      .expect(409);

    await request(app.getHttpServer())
      .patch(`/reservas/${created.body.id}/finalizar`)
      .set('Authorization', `Bearer ${tokenEncargado}`)
      .expect(200)
      .expect(({ body }) => expect(body.estado).toBe('FINALIZADA'));
    await request(app.getHttpServer())
      .patch(`/reservas/${created.body.id}/finalizar`)
      .set('Authorization', `Bearer ${tokenEncargado}`)
      .expect(409);
    expect(
      (
        await prisma.inventario.findUniqueOrThrow({
          where: { id: inventarioId },
        })
      ).cantidadFisica,
    ).toBe(1);
    expect(
      (
        await prisma.inventario.findUniqueOrThrow({
          where: { id: inventarioId },
        })
      ).cantidadReservada,
    ).toBe(0);
  });
});
