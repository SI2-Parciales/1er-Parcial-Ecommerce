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
  let varianteProductoId: number;
  let inventarioId: number;

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
    const passwordHash = await argon2.hash('unused-password');
    const [customer, otherCustomer] = await Promise.all([
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
    ]);
    const branch = await prisma.sucursal.create({
      data: { nombre: 'Central Reservas', ubicacion: 'Centro' },
    });
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
    varianteProductoId = variant.id;
    inventarioId = inventory.id;
    const jwt = app.get(JwtService);
    tokenCliente = jwt.sign({ sub: customer.id });
    tokenOtroCliente = jwt.sign({ sub: otherCustomer.id });
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
});
