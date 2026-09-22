import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { EstadoPago, MetodoPago, PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import request from 'supertest';
import { PRODUCT_IMAGES_PUBLIC_PREFIX } from '../src/productos/product-images.constants.js';

const describeWithDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeWithDatabase('AppController (e2e)', () => {
  let app: NestExpressApplication;
  let productImagesDirectory: string;
  const prisma = new PrismaClient();
  const validRegistration = {
    nombre: 'Juan',
    apellido: 'Perez',
    telefono: '73168919',
    email: 'juan@example.com',
    password: 'EjemploSeguro123!',
  };
  const actorRoles = [
    'CLIENTE',
    'CAJERO',
    'ENCARGADO_SUCURSAL',
    'ADMINISTRADOR',
  ] as const;
  const demoEndpoints = [
    { path: '/demo/acceso/cliente', minimumRoleIndex: 0 },
    { path: '/demo/acceso/cajero', minimumRoleIndex: 1 },
    { path: '/demo/acceso/encargado-sucursal', minimumRoleIndex: 2 },
    { path: '/demo/acceso/administrador', minimumRoleIndex: 3 },
  ];

  beforeAll(async () => {
    productImagesDirectory = await mkdtemp(
      join(tmpdir(), 'fashionstore-e2e-product-images-'),
    );
    process.env.PRODUCT_IMAGES_DIR = productImagesDirectory;
    await prisma.rol.upsert({
      where: { nombre: 'CLIENTE' },
      create: { nombre: 'CLIENTE', descripcion: 'Cliente de FashionStore' },
      update: {},
    });
    const roleDescriptions = {
      CLIENTE: 'Cliente de FashionStore',
      CAJERO: 'Cajero de FashionStore',
      ENCARGADO_SUCURSAL: 'Encargado de sucursal de FashionStore',
      ADMINISTRADOR: 'Administrador de FashionStore',
    };
    await Promise.all(
      actorRoles.map((nombre) =>
        prisma.rol.upsert({
          where: { nombre },
          create: { nombre, descripcion: roleDescriptions[nombre] },
          update: { descripcion: roleDescriptions[nombre] },
        }),
      ),
    );
  });

  beforeEach(async () => {
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
    const { AppModule } = await import('./../src/app.module.js');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    app.useStaticAssets(productImagesDirectory, {
      prefix: PRODUCT_IMAGES_PUBLIC_PREFIX,
      dotfiles: 'deny',
      index: false,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    await app.init();
  });

  it('protege las rutas por defecto, incluida la ruta raíz', () => {
    return request(app.getHttpServer()).get('/').expect(401);
  });

  it('registra un cliente y nunca expone la contraseña ni su hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegistration, email: ' JUAN@EXAMPLE.COM ' })
      .expect(201);

    expect(response.body).toMatchObject({
      message: 'Registro exitoso.',
      user: {
        nombre: 'Juan',
        email: 'juan@example.com',
        estado: 'ACTIVO',
        rol: 'CLIENTE',
      },
    });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).not.toHaveProperty('sucursalId');
    expect(JSON.stringify(response.body)).not.toMatch(/password|hash/i);

    const savedUser = await prisma.usuario.findUnique({
      where: { email: 'juan@example.com' },
      include: { rol: true },
    });
    expect(savedUser?.passwordHash).not.toBe(validRegistration.password);
    expect(savedUser?.rol.nombre).toBe('CLIENTE');
    expect(savedUser?.sucursalId).toBeNull();
  });

  it('rechaza email duplicado, datos inválidos y campos privilegiados', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegistration)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegistration)
      .expect(409);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegistration, email: 'invalido' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...validRegistration,
        email: 'sin-nombre@example.com',
        nombre: '',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...validRegistration,
        email: 'otro@example.com',
        rol: 'ADMINISTRADOR',
      })
      .expect(400);
  });

  it('permite login, incluye los claims esperados y rechaza credenciales inválidas', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegistration)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: validRegistration.email,
        password: validRegistration.password,
      })
      .expect(200);
    const payload = app.get(JwtService).verify(response.body.accessToken) as {
      sub: number;
      role: string;
    };
    expect(payload).toMatchObject({
      sub: response.body.user.id,
      role: 'CLIENTE',
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password|hash/i);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: validRegistration.email,
        password: 'ContraseñaIncorrecta123!',
      })
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'nadie@example.com',
        password: validRegistration.password,
      })
      .expect(401);
  });

  it('rechaza cuentas inactivas', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegistration)
      .expect(201);
    await prisma.usuario.update({
      where: { email: validRegistration.email },
      data: { estado: 'INACTIVO' },
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: validRegistration.email,
        password: validRegistration.password,
      })
      .expect(401);
  });

  it('limita los intentos de login a cinco por minuto', async () => {
    const credentials = {
      email: 'nadie@example.com',
      password: validRegistration.password,
    };
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(401);
    }
    await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(429);
  });

  it('aplica la matriz jerárquica completa de roles a los cuatro endpoints', async () => {
    const jwtService = app.get(JwtService);
    const tokens = new Map<string, string>();
    const passwordHash = await argon2.hash('unused-hash-value');

    for (const role of actorRoles) {
      const databaseRole = await prisma.rol.findUniqueOrThrow({
        where: { nombre: role },
      });
      const user = await prisma.usuario.create({
        data: {
          nombre: role,
          apellido: 'Prueba',
          telefono: '70000000',
          email: `${role.toLowerCase()}@roles.example.test`,
          passwordHash,
          estado: 'ACTIVO',
          rolId: databaseRole.id,
        },
      });

      // Se incluye ADMINISTRADOR incluso en tokens inferiores: la autorización
      // debe basarse en el rol actual de la BD, no en un claim viejo del JWT.
      tokens.set(
        role,
        jwtService.sign({ sub: user.id, role: 'ADMINISTRADOR' }),
      );
    }

    for (let actorIndex = 0; actorIndex < actorRoles.length; actorIndex += 1) {
      const actor = actorRoles[actorIndex];
      const token = tokens.get(actor);
      if (!token) throw new Error(`Falta el token E2E para ${actor}.`);

      for (const endpoint of demoEndpoints) {
        const expectedStatus =
          actorIndex >= endpoint.minimumRoleIndex ? 200 : 403;
        await request(app.getHttpServer())
          .get(endpoint.path)
          .set('Authorization', `Bearer ${token}`)
          .expect(expectedStatus);
      }
    }
  });

  it('rechaza tokens inválidos o vencidos en endpoints protegidos', async () => {
    const jwtService = app.get(JwtService);
    const expiredToken = jwtService.sign({ sub: 1 }, { expiresIn: '-1s' });

    await request(app.getHttpServer()).get('/demo/acceso/cliente').expect(401);
    await request(app.getHttpServer())
      .get('/demo/acceso/cliente')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
    await request(app.getHttpServer())
      .get('/demo/acceso/cliente')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('aplica cambios de rol y desactivaciones inmediatamente aunque el JWT siga vigente', async () => {
    const administratorRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ADMINISTRADOR' },
    });
    const clientRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CLIENTE' },
    });
    const user = await prisma.usuario.create({
      data: {
        nombre: 'Admin',
        apellido: 'Temporal',
        telefono: '70000000',
        email: 'admin-temporal@example.test',
        passwordHash: await argon2.hash('unused-hash-value'),
        estado: 'ACTIVO',
        rolId: administratorRole.id,
      },
    });
    const token = app
      .get(JwtService)
      .sign({ sub: user.id, role: 'ADMINISTRADOR' });

    await request(app.getHttpServer())
      .get('/demo/acceso/administrador')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await prisma.usuario.update({
      where: { id: user.id },
      data: { rolId: clientRole.id },
    });
    await request(app.getHttpServer())
      .get('/demo/acceso/administrador')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/demo/acceso/cliente')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await prisma.usuario.update({
      where: { id: user.id },
      data: { estado: 'INACTIVO' },
    });
    await request(app.getHttpServer())
      .get('/demo/acceso/cliente')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('permite al administrador gestionar usuarios y roles, pero protege esas rutas y el último admin', async () => {
    const roles = new Map<string, number>();
    for (const nombre of actorRoles) {
      const role = await prisma.rol.findUniqueOrThrow({ where: { nombre } });
      roles.set(nombre, role.id);
    }

    const passwordHash = await argon2.hash('unused-hash-value');
    const administrator = await prisma.usuario.create({
      data: {
        nombre: 'Admin',
        apellido: 'Principal',
        telefono: '70000000',
        email: 'admin-gestion@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: roles.get('ADMINISTRADOR')!,
      },
    });
    const customer = await prisma.usuario.create({
      data: {
        nombre: 'Cliente',
        apellido: 'Prueba',
        telefono: '70000001',
        email: 'cliente-gestion@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: roles.get('CLIENTE')!,
      },
    });
    const anotherCustomer = await prisma.usuario.create({
      data: {
        nombre: 'Otro',
        apellido: 'Cliente',
        telefono: '70000002',
        email: 'otro-gestion@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: roles.get('CLIENTE')!,
      },
    });
    const jwtService = app.get(JwtService);
    const administratorToken = jwtService.sign({
      sub: administrator.id,
      role: 'ADMINISTRADOR',
    });
    const customerToken = jwtService.sign({
      sub: customer.id,
      role: 'CLIENTE',
    });

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${administratorToken}`)
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(4));

    const userList = await request(app.getHttpServer())
      .get('/users?page=1&limit=20')
      .set('Authorization', `Bearer ${administratorToken}`)
      .expect(200);
    expect(userList.body.meta).toMatchObject({ page: 1, limit: 20, total: 3 });
    expect(
      userList.body.data.find((user: { id: number }) => user.id === customer.id)
        .sucursalId,
    ).toBeNull();
    expect(JSON.stringify(userList.body)).not.toMatch(/password|hash/i);

    await request(app.getHttpServer())
      .get(`/users/${customer.id}`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.sucursalId).toBeNull());

    await request(app.getHttpServer())
      .patch(`/users/${customer.id}`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .send({ rolId: roles.get('ENCARGADO_SUCURSAL') })
      .expect(200)
      .expect(({ body }) => expect(body.rol.nombre).toBe('ENCARGADO_SUCURSAL'));
    await request(app.getHttpServer())
      .patch(`/users/${customer.id}`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .send({ email: anotherCustomer.email.toUpperCase() })
      .expect(409);
    await request(app.getHttpServer())
      .get('/demo/acceso/encargado-sucursal')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/users/${customer.id}`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.user.estado).toBe('INACTIVO'));
    await request(app.getHttpServer())
      .get('/demo/acceso/cliente')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/users/${administrator.id}`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .send({ estado: 'INACTIVO' })
      .expect(409);
  });

  it('gestiona sucursales con validación y permisos según rol', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const createActor = async (
      roleName: (typeof actorRoles)[number],
      email: string,
    ) => {
      const role = await prisma.rol.findUniqueOrThrow({
        where: { nombre: roleName },
      });
      return prisma.usuario.create({
        data: {
          nombre: roleName,
          apellido: 'Prueba',
          telefono: '70000000',
          email,
          passwordHash,
          estado: 'ACTIVO',
          rolId: role.id,
        },
      });
    };

    const client = await createActor(
      'CLIENTE',
      'cliente-sucursal@example.test',
    );
    const manager = await createActor(
      'ENCARGADO_SUCURSAL',
      'encargado-sucursal@example.test',
    );
    const administrator = await createActor(
      'ADMINISTRADOR',
      'admin-sucursal@example.test',
    );
    const jwtService = app.get(JwtService);
    const tokenFor = (id: number, role: string) =>
      jwtService.sign({ sub: id, role });
    const clientToken = tokenFor(client.id, 'CLIENTE');
    const managerToken = tokenFor(manager.id, 'ENCARGADO_SUCURSAL');
    const adminToken = tokenFor(administrator.id, 'ADMINISTRADOR');
    const path = '/sucursales';

    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ nombre: 'Sucursal Norte', ubicacion: 'Av. Norte 100' })
      .expect(403);

    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Sucursal Norte', ubicacion: 'Av. Norte 100' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          nombre: 'Sucursal Norte',
          ubicacion: 'Av. Norte 100',
          cantidadVestidores: 0,
          estado: 'ACTIVO',
        });
        expect(body.id).toEqual(expect.any(Number));
        expect(body.creadoEn).toEqual(expect.any(String));
        expect(body.actualizadoEn).toEqual(expect.any(String));
      });

    const created = await prisma.sucursal.findFirstOrThrow({
      where: { nombre: 'Sucursal Norte' },
      select: { id: true },
    });
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Sucursal Inválida',
        ubicacion: 'Av. Norte 200',
        cantidadVestidores: -1,
      })
      .expect(400);
    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.meta).toMatchObject({ page: 1, limit: 20, total: 1 });
      });
    await request(app.getHttpServer())
      .get(`${path}/${created.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.id).toBe(created.id));
    await request(app.getHttpServer())
      .patch(`${path}/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ cantidadVestidores: 3, ubicacion: 'Av. Norte 200' })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          cantidadVestidores: 3,
          ubicacion: 'Av. Norte 200',
        }),
      );
    await request(app.getHttpServer())
      .delete(`${path}/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.sucursal.estado).toBe('INACTIVO'));
    await request(app.getHttpServer())
      .patch(`${path}/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'ACTIVO' })
      .expect(200)
      .expect(({ body }) => expect(body.estado).toBe('ACTIVO'));
    await request(app.getHttpServer())
      .get(`${path}/999999`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(404);
  });

  it('gestiona categorías, tallas y colores solo como administrador', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const administratorRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ADMINISTRADOR' },
    });
    const clientRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CLIENTE' },
    });
    const administrator = await prisma.usuario.create({
      data: {
        nombre: 'Admin',
        apellido: 'Catálogos',
        telefono: '70000000',
        email: 'admin-catalogos@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: administratorRole.id,
      },
    });
    const client = await prisma.usuario.create({
      data: {
        nombre: 'Cliente',
        apellido: 'Catálogos',
        telefono: '70000001',
        email: 'cliente-catalogos@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: clientRole.id,
      },
    });
    const jwtService = app.get(JwtService);
    const adminToken = jwtService.sign({
      sub: administrator.id,
      role: 'ADMINISTRADOR',
    });
    const clientToken = jwtService.sign({ sub: client.id, role: 'CLIENTE' });

    await request(app.getHttpServer()).get('/categorias').expect(401);
    await request(app.getHttpServer())
      .get('/categorias')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Ropa', estado: 'INACTIVO' })
      .expect(400);
    const categoria = await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: '  Ropa   deportiva ',
        descripcion: ' Prendas de deporte ',
      })
      .expect(201);
    expect(categoria.body).toMatchObject({
      nombre: 'Ropa deportiva',
      descripcion: 'Prendas de deporte',
      estado: 'ACTIVO',
    });
    await request(app.getHttpServer())
      .post('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'ROPA DEPORTIVA' })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/categorias/${categoria.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ descripcion: null })
      .expect(200)
      .expect(({ body }) => expect(body.descripcion).toBeNull());
    await request(app.getHttpServer())
      .delete(`/categorias/${categoria.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.categoria.estado).toBe('INACTIVO'));
    await request(app.getHttpServer())
      .get('/categorias')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.data).toEqual([]));
    await request(app.getHttpServer())
      .get('/categorias?includeInactive=true')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(1));
    await request(app.getHttpServer())
      .get('/categorias/999999')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    const talla = await request(app.getHttpServer())
      .post('/tallas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: ' M ' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/tallas/${talla.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'INACTIVO' })
      .expect(200)
      .expect(({ body }) => expect(body.estado).toBe('INACTIVO'));

    await request(app.getHttpServer())
      .post('/colores')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: 'Rojo', codigoHex: '#FFF' })
      .expect(400);
    const color = await request(app.getHttpServer())
      .post('/colores')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: ' Rojo intenso ', codigoHex: ' #ff5733 ' })
      .expect(201);
    expect(color.body).toMatchObject({
      nombre: 'Rojo intenso',
      codigoHex: '#FF5733',
      estado: 'ACTIVO',
    });
    await request(app.getHttpServer())
      .delete(`/colores/${color.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.color.estado).toBe('INACTIVO'));
  });

  it('gestiona productos y variantes con catálogo público y administración protegida', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const administratorRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ADMINISTRADOR' },
    });
    const clientRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CLIENTE' },
    });
    const administrator = await prisma.usuario.create({
      data: {
        nombre: 'Admin',
        apellido: 'Productos',
        telefono: '70000000',
        email: 'admin-productos@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: administratorRole.id,
      },
    });
    const client = await prisma.usuario.create({
      data: {
        nombre: 'Cliente',
        apellido: 'Productos',
        telefono: '70000001',
        email: 'cliente-productos@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: clientRole.id,
      },
    });
    const categoria = await prisma.categoria.create({
      data: { nombre: 'Poleras', estado: 'ACTIVO' },
    });
    const tallaM = await prisma.talla.create({
      data: { nombre: 'M', estado: 'ACTIVO' },
    });
    const tallaL = await prisma.talla.create({
      data: { nombre: 'L', estado: 'ACTIVO' },
    });
    const color = await prisma.color.create({
      data: { nombre: 'Negro', codigoHex: '#000000', estado: 'ACTIVO' },
    });
    const jwtService = app.get(JwtService);
    const adminToken = jwtService.sign({
      sub: administrator.id,
      role: 'ADMINISTRADOR',
    });
    const clientToken = jwtService.sign({ sub: client.id, role: 'CLIENTE' });

    await request(app.getHttpServer())
      .get('/productos')
      .expect(200)
      .expect(({ body }) => expect(body.data).toEqual([]));
    await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ nombre: 'Polera', precio: 129.9, categoriaId: categoria.id })
      .expect(403);
    await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Ruta inyectada',
        precio: 10,
        categoriaId: categoria.id,
        imagenUrl: 'C:\\Fotos\\producto.png',
      })
      .expect(400);

    const productResponse = await request(app.getHttpServer())
      .post('/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: ' Polera  Oversize ',
        descripcion: 'Algodón',
        precio: 129.9,
        categoriaId: categoria.id,
      })
      .expect(201);
    expect(productResponse.body).toMatchObject({
      nombre: 'Polera Oversize',
      imagenUrl: null,
      precio: 129.9,
      estado: 'ACTIVO',
      categoria: { id: categoria.id, nombre: 'Poleras' },
    });
    expect(typeof productResponse.body.precio).toBe('number');
    const productoId = productResponse.body.id as number;

    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
    ]);
    await request(app.getHttpServer())
      .put(`/productos/${productoId}/imagen`)
      .attach('imagen', png, {
        filename: 'producto.png',
        contentType: 'image/png',
      })
      .expect(401);
    await request(app.getHttpServer())
      .put(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${clientToken}`)
      .attach('imagen', png, {
        filename: 'producto.png',
        contentType: 'image/png',
      })
      .expect(403);
    await request(app.getHttpServer())
      .put(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .put(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('imagen', Buffer.from('contenido falso'), {
        filename: 'producto.png',
        contentType: 'image/png',
      })
      .expect(415);
    await request(app.getHttpServer())
      .put(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('imagen', png, {
        filename: 'producto.jpg',
        contentType: 'image/png',
      })
      .expect(415);
    await request(app.getHttpServer())
      .put(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('imagen', png, {
        filename: 'primera.png',
        contentType: 'image/png',
      })
      .attach('imagen', png, {
        filename: 'segunda.png',
        contentType: 'image/png',
      })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('imagen', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'demasiado-grande.png',
        contentType: 'image/png',
      })
      .expect(413);

    const uploadedImage = await request(app.getHttpServer())
      .put(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('imagen', png, {
        filename: 'producto.png',
        contentType: 'image/png',
      })
      .expect(200);
    const firstImageUrl = uploadedImage.body.imagenUrl as string;
    expect(firstImageUrl).toMatch(
      /^\/imagenes\/productos\/[0-9a-f-]{36}\.png$/,
    );
    await request(app.getHttpServer()).get(firstImageUrl).expect(200);
    await request(app.getHttpServer())
      .get('/productos')
      .expect(200)
      .expect(({ body }) => expect(body.data[0].imagenUrl).toBe(firstImageUrl));
    await request(app.getHttpServer())
      .get(`/productos/${productoId}`)
      .expect(200)
      .expect(({ body }) => expect(body.imagenUrl).toBe(firstImageUrl));

    const webp = Buffer.from('RIFFxxxxWEBP', 'ascii');
    const replacedImage = await request(app.getHttpServer())
      .put(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('imagen', webp, {
        filename: 'producto.webp',
        contentType: 'image/webp',
      })
      .expect(200);
    const secondImageUrl = replacedImage.body.imagenUrl as string;
    expect(secondImageUrl).toMatch(
      /^\/imagenes\/productos\/[0-9a-f-]{36}\.webp$/,
    );
    expect(secondImageUrl).not.toBe(firstImageUrl);
    await request(app.getHttpServer()).get(firstImageUrl).expect(404);
    await request(app.getHttpServer()).get(secondImageUrl).expect(200);

    await request(app.getHttpServer())
      .delete(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/productos/${productoId}/imagen`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.producto.imagenUrl).toBeNull());
    await request(app.getHttpServer()).get(secondImageUrl).expect(404);

    const variantResponse = await request(app.getHttpServer())
      .post(`/productos/${productoId}/variantes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tallaId: tallaM.id, colorId: color.id, sku: ' pol - 001 ' })
      .expect(201);
    expect(variantResponse.body).toMatchObject({
      sku: 'POL-001',
      estado: 'ACTIVO',
      talla: { id: tallaM.id },
      color: { id: color.id },
    });

    await request(app.getHttpServer())
      .post(`/productos/${productoId}/variantes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tallaId: tallaL.id, colorId: color.id, sku: 'POL-001' })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/productos/${productoId}/variantes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tallaId: tallaM.id, colorId: color.id, sku: 'POL-002' })
      .expect(409);

    await request(app.getHttpServer())
      .get(`/productos/${productoId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.variantes).toHaveLength(1);
        expect(body.variantes[0].sku).toBe('POL-001');
      });

    const varianteId = variantResponse.body.id as number;
    await request(app.getHttpServer())
      .delete(`/productos/${productoId}/variantes/${varianteId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.variante.estado).toBe('INACTIVO'));
    await request(app.getHttpServer())
      .get(`/productos/${productoId}/variantes`)
      .expect(200)
      .expect(({ body }) => expect(body.data).toEqual([]));
    await request(app.getHttpServer())
      .get(`/productos/${productoId}/variantes?estado=INACTIVO`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(1));

    await request(app.getHttpServer())
      .delete(`/productos/${productoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.producto.estado).toBe('INACTIVO'));
    await request(app.getHttpServer())
      .get(`/productos/${productoId}`)
      .expect(404);
    await request(app.getHttpServer())
      .get('/productos?estado=INACTIVO')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(1));
    await request(app.getHttpServer())
      .patch(`/productos/${productoId}/variantes/${varianteId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ estado: 'ACTIVO' })
      .expect(400);
  });

  it('consulta inventario global, por sucursal y por variante con integridad SQL', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const roleIds = new Map<string, number>();
    for (const role of actorRoles) {
      const databaseRole = await prisma.rol.findUniqueOrThrow({
        where: { nombre: role },
      });
      roleIds.set(role, databaseRole.id);
    }
    const createActor = (role: (typeof actorRoles)[number], email: string) =>
      prisma.usuario.create({
        data: {
          nombre: role,
          apellido: 'Inventario',
          telefono: '70000000',
          email,
          passwordHash,
          estado: 'ACTIVO',
          rolId: roleIds.get(role)!,
        },
      });
    const [administrator, manager, cashier, customer] = await Promise.all([
      createActor('ADMINISTRADOR', 'admin-inventario@example.test'),
      createActor('ENCARGADO_SUCURSAL', 'encargado-inventario@example.test'),
      createActor('CAJERO', 'cajero-inventario@example.test'),
      createActor('CLIENTE', 'cliente-inventario@example.test'),
    ]);
    const central = await prisma.sucursal.create({
      data: { nombre: 'Central Inventario', ubicacion: 'Centro' },
    });
    const north = await prisma.sucursal.create({
      data: {
        nombre: 'Norte Inventario',
        ubicacion: 'Norte',
        estado: 'INACTIVO',
      },
    });
    const south = await prisma.sucursal.create({
      data: { nombre: 'Sur Inventario', ubicacion: 'Sur' },
    });
    await prisma.usuario.update({
      where: { id: manager.id },
      data: { sucursalId: central.id },
    });
    const category = await prisma.categoria.create({
      data: { nombre: 'Abrigos inventario' },
    });
    const sizeM = await prisma.talla.create({
      data: { nombre: 'M inventario' },
    });
    const sizeL = await prisma.talla.create({
      data: { nombre: 'L inventario' },
    });
    const black = await prisma.color.create({
      data: { nombre: 'Negro inventario', codigoHex: '#000000' },
    });
    const product = await prisma.producto.create({
      data: {
        nombre: 'Chaqueta Inventario',
        precio: 250,
        categoriaId: category.id,
      },
    });
    const withStock = await prisma.varianteProducto.create({
      data: {
        productoId: product.id,
        tallaId: sizeM.id,
        colorId: black.id,
        sku: 'CHAQ-NEG-M',
      },
    });
    const withoutStock = await prisma.varianteProducto.create({
      data: {
        productoId: product.id,
        tallaId: sizeL.id,
        colorId: black.id,
        sku: 'CHAQ-NEG-L',
      },
    });
    await prisma.inventario.createMany({
      data: [
        {
          sucursalId: central.id,
          varianteProductoId: withStock.id,
          cantidadFisica: 10,
          cantidadReservada: 3,
        },
        {
          sucursalId: north.id,
          varianteProductoId: withStock.id,
          cantidadFisica: 5,
          cantidadReservada: 1,
        },
      ],
    });
    const centralInventory = await prisma.inventario.findUniqueOrThrow({
      where: {
        sucursalId_varianteProductoId: {
          sucursalId: central.id,
          varianteProductoId: withStock.id,
        },
      },
    });
    const northInventory = await prisma.inventario.findUniqueOrThrow({
      where: {
        sucursalId_varianteProductoId: {
          sucursalId: north.id,
          varianteProductoId: withStock.id,
        },
      },
    });

    const jwtService = app.get(JwtService);
    const tokenFor = (id: number, role: string) =>
      jwtService.sign({ sub: id, role });
    const adminToken = tokenFor(administrator.id, 'ADMINISTRADOR');
    const managerToken = tokenFor(manager.id, 'ENCARGADO_SUCURSAL');
    const cashierToken = tokenFor(cashier.id, 'CAJERO');
    const customerToken = tokenFor(customer.id, 'CLIENTE');

    await request(app.getHttpServer()).get('/inventario').expect(401);
    await request(app.getHttpServer())
      .get('/inventario')
      .set('Authorization', `Bearer ${cashierToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/inventario')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/inventario/variantes/${withStock.id}`)
      .expect(401);

    await request(app.getHttpServer())
      .get(`/inventario/publico/variantes/${withStock.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.variante).toMatchObject({
          id: withStock.id,
          sku: 'CHAQ-NEG-M',
          producto: { id: product.id, nombre: 'Chaqueta Inventario' },
          talla: { id: sizeM.id, nombre: 'M inventario' },
          color: { id: black.id, codigoHex: '#000000' },
        });
        expect(body.sucursales.meta.total).toBe(2);
        expect(body.sucursales.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: central.id,
              cantidadDisponible: 7,
              agotado: false,
            }),
            expect.objectContaining({
              id: south.id,
              cantidadDisponible: 0,
              agotado: true,
            }),
          ]),
        );
        expect(body.sucursales.data).not.toEqual(
          expect.arrayContaining([expect.objectContaining({ id: north.id })]),
        );
        expect(body.sucursales.data[0]).not.toHaveProperty('cantidadFisica');
        expect(body.sucursales.data[0]).not.toHaveProperty('cantidadReservada');
        expect(body.sucursales.data[0]).not.toHaveProperty('inventarioId');
      });
    await request(app.getHttpServer())
      .get('/inventario/publico/variantes/999999')
      .expect(404);

    const global = await request(app.getHttpServer())
      .get('/inventario')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(global.body.meta).toMatchObject({ page: 1, limit: 20, total: 2 });
    expect(
      global.body.data.find(
        (item: { variante: { id: number } }) =>
          item.variante.id === withStock.id,
      ),
    ).toMatchObject({
      cantidadFisica: 15,
      cantidadReservada: 4,
      cantidadNoDisponible: 0,
      cantidadDisponible: 11,
      agotado: false,
    });
    expect(
      global.body.data.find(
        (item: { variante: { id: number } }) =>
          item.variante.id === withoutStock.id,
      ),
    ).toMatchObject({
      cantidadFisica: 0,
      cantidadReservada: 0,
      cantidadNoDisponible: 0,
      cantidadDisponible: 0,
      agotado: true,
    });

    await request(app.getHttpServer())
      .get('/inventario')
      .query({
        nombre: 'chaqueta',
        sku: 'neg-m',
        productoId: product.id,
        tallaId: sizeM.id,
        colorId: black.id,
        agotado: false,
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0].variante.id).toBe(withStock.id);
      });

    await request(app.getHttpServer())
      .get('/inventario')
      .query({ sucursalId: central.id, agotado: true })
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).toMatchObject({
          inventarioId: null,
          variante: { id: withoutStock.id },
          cantidadFisica: 0,
          cantidadNoDisponible: 0,
          cantidadDisponible: 0,
          agotado: true,
        });
      });
    await request(app.getHttpServer())
      .get('/inventario')
      .query({ sucursalId: 999999 })
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/inventario/variantes/${withStock.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.variante).toMatchObject({
          id: withStock.id,
          sku: 'CHAQ-NEG-M',
        });
        expect(body.totales).toMatchObject({
          cantidadFisica: 15,
          cantidadReservada: 4,
          cantidadNoDisponible: 0,
          cantidadDisponible: 11,
        });
        expect(body.sucursales.meta.total).toBe(3);
        expect(
          body.sucursales.data.find(
            (branch: { id: number }) => branch.id === north.id,
          ),
        ).toMatchObject({ estado: 'INACTIVO', cantidadFisica: 5 });
      });
    await request(app.getHttpServer())
      .get('/inventario/variantes/999999')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/inventario/${northInventory.id}/disponibilidad`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        cantidadNoDisponible: 1,
        cantidadNoDisponibleEsperada: 0,
      })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/inventario/${centralInventory.id}/disponibilidad`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        cantidadNoDisponible: -1,
        cantidadNoDisponibleEsperada: 0,
      })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/inventario/${centralInventory.id}/disponibilidad`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        cantidadNoDisponible: 8,
        cantidadNoDisponibleEsperada: 0,
      })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/inventario/${centralInventory.id}/disponibilidad`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        cantidadNoDisponible: 3,
        cantidadNoDisponibleEsperada: 0,
      })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          inventarioId: centralInventory.id,
          sucursal: { id: central.id },
          cantidadFisica: 10,
          cantidadReservada: 3,
          cantidadNoDisponible: 3,
          cantidadDisponible: 4,
          agotado: false,
        }),
      );
    const afterUnavailable = await prisma.inventario.findUniqueOrThrow({
      where: { id: centralInventory.id },
    });
    expect(afterUnavailable.cantidadFisica).toBe(10);
    expect(afterUnavailable.cantidadReservada).toBe(3);

    await request(app.getHttpServer())
      .patch(`/inventario/${centralInventory.id}/disponibilidad`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        cantidadNoDisponible: 4,
        cantidadNoDisponibleEsperada: 0,
      })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/inventario/${centralInventory.id}/disponibilidad`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        cantidadNoDisponible: 1,
        cantidadNoDisponibleEsperada: 3,
      })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          cantidadNoDisponible: 1,
          cantidadDisponible: 6,
        }),
      );

    await request(app.getHttpServer())
      .patch(`/inventario/${northInventory.id}/disponibilidad`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        cantidadNoDisponible: 4,
        cantidadNoDisponibleEsperada: 0,
      })
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({
          sucursal: { id: north.id, estado: 'INACTIVO' },
          cantidadFisica: 5,
          cantidadReservada: 1,
          cantidadNoDisponible: 4,
          cantidadDisponible: 0,
          agotado: true,
        }),
      );

    await request(app.getHttpServer())
      .get('/inventario')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => {
        const item = body.data.find(
          (current: { variante: { id: number } }) =>
            current.variante.id === withStock.id,
        );
        expect(item).toMatchObject({
          inventarioId: null,
          cantidadFisica: 15,
          cantidadReservada: 4,
          cantidadNoDisponible: 5,
          cantidadDisponible: 6,
          agotado: false,
        });
      });

    const concurrentResponses = await Promise.all([
      request(app.getHttpServer())
        .patch(`/inventario/${centralInventory.id}/disponibilidad`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          cantidadNoDisponible: 2,
          cantidadNoDisponibleEsperada: 1,
        }),
      request(app.getHttpServer())
        .patch(`/inventario/${centralInventory.id}/disponibilidad`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          cantidadNoDisponible: 3,
          cantidadNoDisponibleEsperada: 1,
        }),
    ]);
    expect(
      concurrentResponses
        .map(({ status }) => status)
        .sort((left, right) => left - right),
    ).toEqual([200, 409]);

    await expect(
      prisma.inventario.create({
        data: {
          sucursalId: central.id,
          varianteProductoId: withStock.id,
          cantidadFisica: 1,
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.inventario.create({
        data: {
          sucursalId: central.id,
          varianteProductoId: withoutStock.id,
          cantidadFisica: -1,
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.inventario.create({
        data: {
          sucursalId: central.id,
          varianteProductoId: withoutStock.id,
          cantidadFisica: 2,
          cantidadReservada: 3,
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.inventario.create({
        data: {
          sucursalId: central.id,
          varianteProductoId: withoutStock.id,
          cantidadFisica: 2,
          cantidadNoDisponible: -1,
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.inventario.create({
        data: {
          sucursalId: central.id,
          varianteProductoId: withoutStock.id,
          cantidadFisica: 2,
          cantidadReservada: 1,
          cantidadNoDisponible: 2,
        },
      }),
    ).rejects.toBeDefined();
  });

  it('registra movimientos atómicos, autorizados, concurrentes e idempotentes', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const administratorRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ADMINISTRADOR' },
    });
    const managerRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ENCARGADO_SUCURSAL' },
    });
    const [administrator, manager] = await Promise.all([
      prisma.usuario.create({
        data: {
          nombre: 'Admin',
          apellido: 'Movimientos',
          telefono: '70000001',
          email: 'admin-movimientos@example.test',
          passwordHash,
          estado: 'ACTIVO',
          rolId: administratorRole.id,
        },
      }),
      prisma.usuario.create({
        data: {
          nombre: 'Encargado',
          apellido: 'Movimientos',
          telefono: '70000002',
          email: 'encargado-movimientos@example.test',
          passwordHash,
          estado: 'ACTIVO',
          rolId: managerRole.id,
        },
      }),
    ]);
    const [central, north, inactiveBranch] = await Promise.all([
      prisma.sucursal.create({
        data: { nombre: 'Central CU32', ubicacion: 'Centro' },
      }),
      prisma.sucursal.create({
        data: { nombre: 'Norte CU32', ubicacion: 'Norte' },
      }),
      prisma.sucursal.create({
        data: {
          nombre: 'Inactiva CU32',
          ubicacion: 'Sur',
          estado: 'INACTIVO',
        },
      }),
    ]);
    await prisma.usuario.update({
      where: { id: manager.id },
      data: { sucursalId: central.id },
    });

    const category = await prisma.categoria.create({
      data: { nombre: 'Categoría CU32' },
    });
    const [sizeM, sizeL, sizeS, sizeXl] = await Promise.all([
      prisma.talla.create({ data: { nombre: 'M CU32' } }),
      prisma.talla.create({ data: { nombre: 'L CU32' } }),
      prisma.talla.create({ data: { nombre: 'S CU32' } }),
      prisma.talla.create({ data: { nombre: 'XL CU32' } }),
    ]);
    const color = await prisma.color.create({
      data: { nombre: 'Negro CU32', codigoHex: '#111111' },
    });
    const product = await prisma.producto.create({
      data: {
        nombre: 'Chaqueta CU32',
        precio: 300,
        categoriaId: category.id,
      },
    });
    const [variant, concurrentVariant, newInventoryVariant, inactiveVariant] =
      await Promise.all([
        prisma.varianteProducto.create({
          data: {
            productoId: product.id,
            tallaId: sizeM.id,
            colorId: color.id,
            sku: 'CU32-NEG-M',
          },
        }),
        prisma.varianteProducto.create({
          data: {
            productoId: product.id,
            tallaId: sizeL.id,
            colorId: color.id,
            sku: 'CU32-NEG-L',
          },
        }),
        prisma.varianteProducto.create({
          data: {
            productoId: product.id,
            tallaId: sizeS.id,
            colorId: color.id,
            sku: 'CU32-NEG-S',
          },
        }),
        prisma.varianteProducto.create({
          data: {
            productoId: product.id,
            tallaId: sizeXl.id,
            colorId: color.id,
            sku: 'CU32-INACTIVA',
            estado: 'INACTIVO',
          },
        }),
      ]);
    await prisma.inventario.createMany({
      data: [
        {
          sucursalId: central.id,
          varianteProductoId: variant.id,
          cantidadFisica: 10,
          cantidadReservada: 2,
          cantidadNoDisponible: 3,
        },
        {
          sucursalId: central.id,
          varianteProductoId: concurrentVariant.id,
          cantidadFisica: 5,
        },
        {
          sucursalId: inactiveBranch.id,
          varianteProductoId: variant.id,
          cantidadFisica: 2,
        },
      ],
    });

    const jwtService = app.get(JwtService);
    const adminToken = jwtService.sign({
      sub: administrator.id,
      role: 'ADMINISTRADOR',
    });
    const managerToken = jwtService.sign({
      sub: manager.id,
      role: 'ENCARGADO_SUCURSAL',
    });
    const postMovement = (
      token: string,
      body: Record<string, unknown>,
      key = randomUUID(),
    ) =>
      request(app.getHttpServer())
        .post('/inventario/movimientos')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', key)
        .send(body);

    await postMovement(managerToken, {
      tipo: 'RECEPCION',
      varianteProductoId: variant.id,
      cantidad: 1,
      sucursalDestinoId: north.id,
    }).expect(403);
    await postMovement(adminToken, {
      tipo: 'RECEPCION',
      varianteProductoId: variant.id,
      cantidad: 1,
      sucursalDestinoId: inactiveBranch.id,
    }).expect(409);
    await postMovement(adminToken, {
      tipo: 'RECEPCION',
      varianteProductoId: inactiveVariant.id,
      cantidad: 1,
      sucursalDestinoId: central.id,
    }).expect(409);

    const receptionKey = randomUUID();
    const reception = await postMovement(
      managerToken,
      {
        tipo: 'RECEPCION',
        varianteProductoId: variant.id,
        cantidad: 2,
        sucursalDestinoId: central.id,
        observacion: 'Recepción CU32',
      },
      receptionKey,
    ).expect(201);
    expect(reception.body).toMatchObject({
      movimiento: {
        tipo: 'RECEPCION',
        usuario: { id: manager.id },
      },
      inventarioOrigen: null,
      inventarioDestino: {
        cantidadFisica: 12,
        cantidadReservada: 2,
        cantidadNoDisponible: 3,
        cantidadDisponible: 7,
      },
    });

    await postMovement(managerToken, {
      tipo: 'TRANSFERENCIA',
      varianteProductoId: variant.id,
      cantidad: 2,
      sucursalOrigenId: central.id,
      sucursalDestinoId: north.id,
    })
      .expect(201)
      .expect(({ body }) => {
        expect(body.inventarioOrigen).toMatchObject({
          cantidadFisica: 10,
          cantidadReservada: 2,
          cantidadNoDisponible: 3,
          cantidadDisponible: 5,
        });
        expect(body.inventarioDestino).toMatchObject({
          cantidadFisica: 2,
          cantidadDisponible: 2,
        });
      });

    await postMovement(managerToken, {
      tipo: 'DEVOLUCION',
      varianteProductoId: variant.id,
      cantidad: 3,
      cantidadNoDisponible: 2,
      sucursalDestinoId: central.id,
    })
      .expect(201)
      .expect(({ body }) =>
        expect(body.inventarioDestino).toMatchObject({
          cantidadFisica: 13,
          cantidadReservada: 2,
          cantidadNoDisponible: 5,
          cantidadDisponible: 6,
        }),
      );

    await postMovement(managerToken, {
      tipo: 'MERMA',
      varianteProductoId: variant.id,
      cantidad: 2,
      sucursalOrigenId: central.id,
      origenUnidades: 'NO_DISPONIBLE',
      observacion: 'Prendas dañadas',
    })
      .expect(201)
      .expect(({ body }) =>
        expect(body.inventarioOrigen).toMatchObject({
          cantidadFisica: 11,
          cantidadReservada: 2,
          cantidadNoDisponible: 3,
          cantidadDisponible: 6,
        }),
      );

    const replay = await postMovement(
      managerToken,
      {
        tipo: 'RECEPCION',
        varianteProductoId: variant.id,
        cantidad: 2,
        sucursalDestinoId: central.id,
        observacion: 'Recepción CU32',
      },
      receptionKey,
    ).expect(201);
    expect(replay.body).toEqual(reception.body);
    await postMovement(
      managerToken,
      {
        tipo: 'RECEPCION',
        varianteProductoId: variant.id,
        cantidad: 3,
        sucursalDestinoId: central.id,
        observacion: 'Recepción CU32',
      },
      receptionKey,
    ).expect(409);

    await request(app.getHttpServer())
      .get('/inventario/movimientos')
      .query({ varianteProductoId: variant.id })
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.meta.total).toBe(4);
        expect(body.data).toHaveLength(4);
        expect(
          body.data.every(
            (movement: {
              sucursalOrigen: { id: number } | null;
              sucursalDestino: { id: number } | null;
            }) =>
              movement.sucursalOrigen?.id === central.id ||
              movement.sucursalDestino?.id === central.id,
          ),
        ).toBe(true);
      });
    await request(app.getHttpServer())
      .get('/inventario/movimientos')
      .query({ sucursalId: north.id })
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);

    const concurrentTransfers = await Promise.all([
      postMovement(managerToken, {
        tipo: 'TRANSFERENCIA',
        varianteProductoId: concurrentVariant.id,
        cantidad: 4,
        sucursalOrigenId: central.id,
        sucursalDestinoId: north.id,
      }),
      postMovement(managerToken, {
        tipo: 'TRANSFERENCIA',
        varianteProductoId: concurrentVariant.id,
        cantidad: 4,
        sucursalOrigenId: central.id,
        sucursalDestinoId: north.id,
      }),
    ]);
    expect(
      concurrentTransfers
        .map(({ status }) => status)
        .sort((left, right) => left - right),
    ).toEqual([201, 409]);
    const concurrentStocks = await prisma.inventario.findMany({
      where: { varianteProductoId: concurrentVariant.id },
      orderBy: { sucursalId: 'asc' },
    });
    expect(concurrentStocks).toHaveLength(2);
    expect(
      concurrentStocks.reduce(
        (total, stock) => total + stock.cantidadFisica,
        0,
      ),
    ).toBe(5);
    expect(
      await prisma.movimientoInventario.count({
        where: {
          tipo: 'TRANSFERENCIA',
          varianteProductoId: concurrentVariant.id,
        },
      }),
    ).toBe(1);

    await Promise.all([
      postMovement(adminToken, {
        tipo: 'RECEPCION',
        varianteProductoId: newInventoryVariant.id,
        cantidad: 2,
        sucursalDestinoId: north.id,
      }).expect(201),
      postMovement(adminToken, {
        tipo: 'RECEPCION',
        varianteProductoId: newInventoryVariant.id,
        cantidad: 3,
        sucursalDestinoId: north.id,
      }).expect(201),
    ]);
    const createdOnce = await prisma.inventario.findMany({
      where: {
        varianteProductoId: newInventoryVariant.id,
        sucursalId: north.id,
      },
    });
    expect(createdOnce).toHaveLength(1);
    expect(createdOnce[0].cantidadFisica).toBe(5);

    await postMovement(adminToken, {
      tipo: 'MERMA',
      varianteProductoId: variant.id,
      cantidad: 1,
      sucursalOrigenId: inactiveBranch.id,
      origenUnidades: 'DISPONIBLE',
      observacion: 'Retiro de sucursal inactiva',
    }).expect(201);
  });

  it('asigna, consulta, reasigna y desasigna personal sin exponer credenciales', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const roleIds = new Map<string, number>();
    for (const role of actorRoles) {
      const databaseRole = await prisma.rol.findUniqueOrThrow({
        where: { nombre: role },
      });
      roleIds.set(role, databaseRole.id);
    }
    const createUser = (
      role: (typeof actorRoles)[number],
      email: string,
      estado = 'ACTIVO',
    ) =>
      prisma.usuario.create({
        data: {
          nombre: role,
          apellido: 'Sucursal',
          telefono: '70000000',
          email,
          passwordHash,
          estado,
          rolId: roleIds.get(role)!,
        },
      });

    const administrator = await createUser(
      'ADMINISTRADOR',
      'admin-personal@example.test',
    );
    const manager = await createUser(
      'ENCARGADO_SUCURSAL',
      'encargado-personal@example.test',
    );
    const cashier = await createUser('CAJERO', 'cajero-personal@example.test');
    const customer = await createUser(
      'CLIENTE',
      'cliente-personal@example.test',
    );
    const inactiveCashier = await createUser(
      'CAJERO',
      'inactivo-personal@example.test',
      'INACTIVO',
    );
    const firstBranch = await prisma.sucursal.create({
      data: { nombre: 'Sucursal Personal 1', ubicacion: 'Zona Norte' },
    });
    const secondBranch = await prisma.sucursal.create({
      data: { nombre: 'Sucursal Personal 2', ubicacion: 'Zona Sur' },
    });
    const inactiveBranch = await prisma.sucursal.create({
      data: {
        nombre: 'Sucursal Inactiva',
        ubicacion: 'Zona Este',
        estado: 'INACTIVO',
      },
    });
    const jwtService = app.get(JwtService);
    const tokenFor = (id: number, role: string) =>
      jwtService.sign({ sub: id, role });
    const administratorToken = tokenFor(administrator.id, 'ADMINISTRADOR');
    const managerToken = tokenFor(manager.id, 'ENCARGADO_SUCURSAL');
    const customerToken = tokenFor(customer.id, 'CLIENTE');

    await request(app.getHttpServer())
      .get(`/sucursales/${firstBranch.id}/personal`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body).toEqual([]));
    await request(app.getHttpServer())
      .get(`/sucursales/${firstBranch.id}/personal`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/sucursales/${firstBranch.id}/personal`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ usuarioId: cashier.id })
      .expect(403);

    const assignment = await request(app.getHttpServer())
      .post(`/sucursales/${firstBranch.id}/personal`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .send({ usuarioId: cashier.id })
      .expect(201);
    expect(assignment.body).toMatchObject({
      id: cashier.id,
      nombre: 'CAJERO',
      email: cashier.email,
      rol: 'CAJERO',
    });
    expect(JSON.stringify(assignment.body)).not.toMatch(/password|hash/i);

    await request(app.getHttpServer())
      .post(`/sucursales/${firstBranch.id}/personal`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .send({ usuarioId: cashier.id })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/sucursales/${firstBranch.id}/personal`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .send({ usuarioId: customer.id })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/sucursales/${firstBranch.id}/personal`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .send({ usuarioId: inactiveCashier.id })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/sucursales/${inactiveBranch.id}/personal`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .send({ usuarioId: cashier.id })
      .expect(409);

    await request(app.getHttpServer())
      .get(`/sucursales/${firstBranch.id}/personal`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({ id: cashier.id, rol: 'CAJERO' });
        expect(JSON.stringify(body)).not.toMatch(/password|hash/i);
      });

    await request(app.getHttpServer())
      .post(`/sucursales/${secondBranch.id}/personal`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .send({ usuarioId: cashier.id })
      .expect(201);
    expect(
      (await prisma.usuario.findUniqueOrThrow({ where: { id: cashier.id } }))
        .rolId,
    ).toBe(roleIds.get('CAJERO'));
    await request(app.getHttpServer())
      .get(`/sucursales/${firstBranch.id}/personal`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200)
      .expect(({ body }) => expect(body).toEqual([]));

    await request(app.getHttpServer())
      .delete(`/sucursales/${secondBranch.id}/personal/${cashier.id}`)
      .set('Authorization', `Bearer ${administratorToken}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body).toMatchObject({ id: cashier.id, rol: 'CAJERO' }),
      );
    const unassigned = await prisma.usuario.findUniqueOrThrow({
      where: { id: cashier.id },
    });
    expect(unassigned.sucursalId).toBeNull();
    expect(unassigned.estado).toBe('ACTIVO');
    expect(unassigned.rolId).toBe(roleIds.get('CAJERO'));
  });

  it('registra ventas presenciales pendientes sin modificar el inventario', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const cashierRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CAJERO' },
    });
    const clientRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CLIENTE' },
    });
    const branch = await prisma.sucursal.create({
      data: { nombre: 'Sucursal Ventas', ubicacion: 'Centro' },
    });
    const cashier = await prisma.usuario.create({
      data: {
        nombre: 'Cajero',
        apellido: 'Ventas',
        telefono: '70000000',
        email: 'cajero-ventas@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: cashierRole.id,
        sucursalId: branch.id,
      },
    });
    const client = await prisma.usuario.create({
      data: {
        nombre: 'Cliente',
        apellido: 'Registrado',
        telefono: '71111111',
        email: 'cliente-ventas@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: clientRole.id,
      },
    });
    const category = await prisma.categoria.create({
      data: { nombre: 'Categoría Ventas' },
    });
    const size = await prisma.talla.create({ data: { nombre: 'M Ventas' } });
    const color = await prisma.color.create({
      data: { nombre: 'Negro Ventas', codigoHex: '#111111' },
    });
    const firstProduct = await prisma.producto.create({
      data: {
        nombre: 'Polera Venta',
        precio: 129.9,
        categoriaId: category.id,
      },
    });
    const secondProduct = await prisma.producto.create({
      data: {
        nombre: 'Gorra Venta',
        precio: 80,
        categoriaId: category.id,
      },
    });
    const firstVariant = await prisma.varianteProducto.create({
      data: {
        productoId: firstProduct.id,
        tallaId: size.id,
        colorId: color.id,
        sku: 'VENTA-POL-M',
      },
    });
    const secondVariant = await prisma.varianteProducto.create({
      data: {
        productoId: secondProduct.id,
        tallaId: size.id,
        colorId: color.id,
        sku: 'VENTA-GOR-M',
      },
    });
    await prisma.inventario.createMany({
      data: [
        {
          sucursalId: branch.id,
          varianteProductoId: firstVariant.id,
          cantidadFisica: 10,
          cantidadReservada: 2,
          cantidadNoDisponible: 1,
        },
        {
          sucursalId: branch.id,
          varianteProductoId: secondVariant.id,
          cantidadFisica: 3,
        },
      ],
    });
    const inventoryBefore = await prisma.inventario.findMany({
      where: { sucursalId: branch.id },
      orderBy: { varianteProductoId: 'asc' },
    });
    const jwtService = app.get(JwtService);
    const cashierToken = jwtService.sign({ sub: cashier.id, role: 'CAJERO' });
    const clientToken = jwtService.sign({ sub: client.id, role: 'CLIENTE' });
    const path = '/ventas/presenciales';

    await request(app.getHttpServer())
      .post(path)
      .send({ detalles: [] })
      .expect(401);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        detalles: [{ varianteProductoId: firstVariant.id, cantidad: 1 }],
      })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        detalles: [
          { varianteProductoId: firstVariant.id, cantidad: 1 },
          { sku: ' venta-pol-m ', cantidad: 2 },
          { varianteProductoId: secondVariant.id, cantidad: 1 },
        ],
      })
      .expect(201);
    expect(created.body).toMatchObject({
      canal: 'PRESENCIAL',
      estado: 'PENDIENTE_PAGO',
      nombreFacturacion: 'CONSUMIDOR FINAL',
      documentoFacturacion: '0',
      total: 469.7,
      sucursal: { id: branch.id },
      cajero: { id: cashier.id },
      cliente: null,
    });
    expect(created.body.detalles).toHaveLength(2);
    expect(created.body.detalles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cantidad: 3,
          precioUnitario: 129.9,
          subtotal: 389.7,
          variante: expect.objectContaining({ id: firstVariant.id }),
        }),
        expect.objectContaining({
          cantidad: 1,
          precioUnitario: 80,
          subtotal: 80,
          variante: expect.objectContaining({ id: secondVariant.id }),
        }),
      ]),
    );

    const saved = await prisma.venta.findUniqueOrThrow({
      where: { id: created.body.id as number },
      include: { detalles: true },
    });
    expect(saved.detalles).toHaveLength(2);
    expect(
      saved.detalles
        .find((detail) => detail.varianteProductoId === firstVariant.id)
        ?.precioUnitario.toString(),
    ).toBe('129.9');
    expect(
      await prisma.inventario.findMany({
        where: { sucursalId: branch.id },
        orderBy: { varianteProductoId: 'asc' },
      }),
    ).toEqual(inventoryBefore);

    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        clienteId: client.id,
        nombreFacturacion: 'Cliente Registrado',
        documentoFacturacion: '1234567',
        detalles: [{ sku: secondVariant.sku, cantidad: 1 }],
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.cliente).toMatchObject({ id: client.id });
        expect(body.nombreFacturacion).toBe('Cliente Registrado');
      });

    const countBeforeFailure = await prisma.venta.count();
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        detalles: [{ varianteProductoId: secondVariant.id, cantidad: 4 }],
      })
      .expect(409);
    expect(await prisma.venta.count()).toBe(countBeforeFailure);
    expect(await prisma.detalleVenta.count()).toBe(3);
  });

  it('procesa pagos de caja de forma atómica y protege inventario concurrente', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const cashierRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CAJERO' },
    });
    const firstBranch = await prisma.sucursal.create({
      data: { nombre: 'Sucursal Pagos', ubicacion: 'Centro' },
    });
    const secondBranch = await prisma.sucursal.create({
      data: { nombre: 'Sucursal Pagos Norte', ubicacion: 'Norte' },
    });
    const cashier = await prisma.usuario.create({
      data: {
        nombre: 'Cajero',
        apellido: 'Pagos',
        telefono: '72222222',
        email: 'cajero-pagos@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: cashierRole.id,
        sucursalId: firstBranch.id,
      },
    });
    const otherCashier = await prisma.usuario.create({
      data: {
        nombre: 'Otro',
        apellido: 'Cajero',
        telefono: '73333333',
        email: 'otro-cajero-pagos@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: cashierRole.id,
        sucursalId: secondBranch.id,
      },
    });
    const category = await prisma.categoria.create({
      data: { nombre: 'Categoría Pagos' },
    });
    const size = await prisma.talla.create({ data: { nombre: 'M Pagos' } });
    const color = await prisma.color.create({
      data: { nombre: 'Azul Pagos', codigoHex: '#0000AA' },
    });
    const product = await prisma.producto.create({
      data: {
        nombre: 'Prenda Pagos',
        precio: 100,
        categoriaId: category.id,
      },
    });
    const variant = await prisma.varianteProducto.create({
      data: {
        productoId: product.id,
        tallaId: size.id,
        colorId: color.id,
        sku: 'PRENDA-PAGOS-M',
      },
    });
    const inventory = await prisma.inventario.create({
      data: {
        sucursalId: firstBranch.id,
        varianteProductoId: variant.id,
        cantidadFisica: 10,
        cantidadReservada: 1,
        cantidadNoDisponible: 1,
      },
    });
    const jwtService = app.get(JwtService);
    const cashierToken = jwtService.sign({ sub: cashier.id, role: 'CAJERO' });
    const otherCashierToken = jwtService.sign({
      sub: otherCashier.id,
      role: 'CAJERO',
    });
    const createSale = async (cantidad: number) =>
      request(app.getHttpServer())
        .post('/ventas/presenciales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ detalles: [{ varianteProductoId: variant.id, cantidad }] })
        .expect(201);
    const paymentPath = (saleId: number) => `/ventas/${saleId}/pagos/caja`;

    const cashSale = await createSale(2);
    const cashPayment = await request(app.getHttpServer())
      .post(paymentPath(cashSale.body.id as number))
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ metodo: 'EFECTIVO', montoRecibido: 250 })
      .expect(201);
    expect(cashPayment.body).toMatchObject({
      pago: {
        ventaId: cashSale.body.id,
        metodo: 'EFECTIVO',
        monto: 200,
        montoRecibido: 250,
        cambio: 50,
        referencia: null,
        simulado: true,
        estado: 'CONFIRMADO',
      },
      venta: { id: cashSale.body.id, estado: 'PAGADA', total: 200 },
    });
    const afterCash = await prisma.inventario.findUniqueOrThrow({
      where: { id: inventory.id },
    });
    expect(afterCash).toMatchObject({
      cantidadFisica: 8,
      cantidadReservada: 1,
      cantidadNoDisponible: 1,
    });
    expect(
      await prisma.movimientoInventario.count({
        where: { ventaId: cashSale.body.id as number, tipo: 'VENTA' },
      }),
    ).toBe(1);
    await request(app.getHttpServer())
      .post(paymentPath(cashSale.body.id as number))
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ metodo: 'EFECTIVO', montoRecibido: 250 })
      .expect(409);
    expect(
      await prisma.movimientoInventario.count({
        where: { ventaId: cashSale.body.id as number },
      }),
    ).toBe(1);

    const cardSale = await createSale(1);
    await request(app.getHttpServer())
      .post(paymentPath(cardSale.body.id as number))
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ metodo: 'TARJETA', referencia: ' AUT-SIM-001 ' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.pago).toMatchObject({
          metodo: 'TARJETA',
          monto: 100,
          montoRecibido: null,
          cambio: null,
          referencia: 'AUT-SIM-001',
          simulado: true,
        });
      });
    const qrSale = await createSale(1);
    await request(app.getHttpServer())
      .post(paymentPath(qrSale.body.id as number))
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ metodo: 'QR' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.pago).toMatchObject({
          metodo: 'QR',
          monto: 100,
          referencia: null,
          simulado: true,
        });
      });

    const insufficientCashSale = await createSale(1);
    await request(app.getHttpServer())
      .post(paymentPath(insufficientCashSale.body.id as number))
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ metodo: 'EFECTIVO', montoRecibido: 99.99 })
      .expect(400);
    expect(
      await prisma.venta.findUniqueOrThrow({
        where: { id: insufficientCashSale.body.id as number },
      }),
    ).toMatchObject({ estado: 'PENDIENTE_PAGO' });

    const forbiddenSale = await createSale(1);
    await request(app.getHttpServer())
      .post(paymentPath(forbiddenSale.body.id as number))
      .set('Authorization', `Bearer ${otherCashierToken}`)
      .send({ metodo: 'QR' })
      .expect(403);
    await request(app.getHttpServer())
      .post(paymentPath(999999))
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ metodo: 'QR' })
      .expect(404);

    const lostStockSale = await createSale(3);
    await prisma.inventario.update({
      where: { id: inventory.id },
      data: { cantidadFisica: { decrement: 2 } },
    });
    const beforeLostStockPayment = await prisma.inventario.findUniqueOrThrow({
      where: { id: inventory.id },
    });
    await request(app.getHttpServer())
      .post(paymentPath(lostStockSale.body.id as number))
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ metodo: 'QR' })
      .expect(409);
    expect(
      await prisma.inventario.findUniqueOrThrow({
        where: { id: inventory.id },
      }),
    ).toEqual(beforeLostStockPayment);

    const rollbackSale = await createSale(1);
    await prisma.pago.create({
      data: {
        ventaId: rollbackSale.body.id as number,
        metodo: MetodoPago.QR,
        monto: 100,
        simulado: true,
        estado: EstadoPago.CONFIRMADO,
      },
    });
    const beforeRollback = await prisma.inventario.findUniqueOrThrow({
      where: { id: inventory.id },
    });
    await request(app.getHttpServer())
      .post(paymentPath(rollbackSale.body.id as number))
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ metodo: 'QR' })
      .expect(409);
    expect(
      await prisma.inventario.findUniqueOrThrow({
        where: { id: inventory.id },
      }),
    ).toEqual(beforeRollback);
    expect(
      await prisma.movimientoInventario.count({
        where: { ventaId: rollbackSale.body.id as number },
      }),
    ).toBe(0);
    expect(
      await prisma.venta.findUniqueOrThrow({
        where: { id: rollbackSale.body.id as number },
      }),
    ).toMatchObject({ estado: 'PENDIENTE_PAGO' });

    const concurrentSale = await createSale(1);
    const duplicateResponses = await Promise.all([
      request(app.getHttpServer())
        .post(paymentPath(concurrentSale.body.id as number))
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ metodo: 'QR' }),
      request(app.getHttpServer())
        .post(paymentPath(concurrentSale.body.id as number))
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ metodo: 'QR' }),
    ]);
    expect(
      duplicateResponses
        .map((response) => response.status)
        .sort((left, right) => left - right),
    ).toEqual([201, 409]);
    expect(
      await prisma.pago.count({
        where: {
          ventaId: concurrentSale.body.id as number,
          estado: EstadoPago.CONFIRMADO,
        },
      }),
    ).toBe(1);

    const firstCompetingSale = await createSale(1);
    const secondCompetingSale = await createSale(1);
    const competingResponses = await Promise.all([
      request(app.getHttpServer())
        .post(paymentPath(firstCompetingSale.body.id as number))
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ metodo: 'QR' }),
      request(app.getHttpServer())
        .post(paymentPath(secondCompetingSale.body.id as number))
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ metodo: 'QR' }),
    ]);
    expect(
      competingResponses
        .map((response) => response.status)
        .sort((left, right) => left - right),
    ).toEqual([201, 409]);
    const finalInventory = await prisma.inventario.findUniqueOrThrow({
      where: { id: inventory.id },
    });
    expect(
      finalInventory.cantidadFisica -
        finalInventory.cantidadReservada -
        finalInventory.cantidadNoDisponible,
    ).toBe(0);
  }, 30_000);

  it('gestiona un carrito persistente por sucursal sin alterar inventario', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const clientRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CLIENTE' },
    });
    const adminRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ADMINISTRADOR' },
    });
    const customer = await prisma.usuario.create({
      data: {
        nombre: 'Cliente',
        apellido: 'Carrito',
        telefono: '70001001',
        email: 'cliente-carrito@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: clientRole.id,
      },
    });
    const secondCustomer = await prisma.usuario.create({
      data: {
        nombre: 'Segundo',
        apellido: 'Cliente',
        telefono: '70001002',
        email: 'segundo-carrito@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: clientRole.id,
      },
    });
    const concurrentCustomer = await prisma.usuario.create({
      data: {
        nombre: 'Cliente',
        apellido: 'Concurrente',
        telefono: '70001003',
        email: 'concurrente-carrito@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: clientRole.id,
      },
    });
    const administrator = await prisma.usuario.create({
      data: {
        nombre: 'Admin',
        apellido: 'Carrito',
        telefono: '70001004',
        email: 'admin-carrito@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: adminRole.id,
      },
    });
    const branch = await prisma.sucursal.create({
      data: { nombre: 'Sucursal Carrito', ubicacion: 'Centro' },
    });
    const emptyBranch = await prisma.sucursal.create({
      data: { nombre: 'Sucursal Sin Stock', ubicacion: 'Norte' },
    });
    const category = await prisma.categoria.create({
      data: { nombre: 'Categoría Carrito' },
    });
    const size = await prisma.talla.create({ data: { nombre: 'M Carrito' } });
    const color = await prisma.color.create({
      data: { nombre: 'Negro Carrito', codigoHex: '#101010' },
    });
    const product = await prisma.producto.create({
      data: {
        nombre: 'Prenda Carrito',
        imagenUrl: '/uploads/productos/prenda-carrito.webp',
        precio: 49.95,
        categoriaId: category.id,
      },
    });
    const variant = await prisma.varianteProducto.create({
      data: {
        productoId: product.id,
        tallaId: size.id,
        colorId: color.id,
        sku: 'PRENDA-CARRITO-M',
      },
    });
    const inventory = await prisma.inventario.create({
      data: {
        sucursalId: branch.id,
        varianteProductoId: variant.id,
        cantidadFisica: 5,
        cantidadReservada: 1,
        cantidadNoDisponible: 1,
      },
    });
    const jwtService = app.get(JwtService);
    const tokenFor = (id: number, role: string) =>
      jwtService.sign({ sub: id, role });
    const customerToken = tokenFor(customer.id, 'CLIENTE');
    const secondCustomerToken = tokenFor(secondCustomer.id, 'CLIENTE');
    const concurrentCustomerToken = tokenFor(concurrentCustomer.id, 'CLIENTE');
    const administratorToken = tokenFor(administrator.id, 'ADMINISTRADOR');

    await request(app.getHttpServer())
      .get('/carrito')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          sucursal: null,
          detalles: [],
          total: 0,
        });
      });
    await request(app.getHttpServer())
      .post('/carrito/detalles')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ varianteProductoId: variant.id, cantidad: 1 })
      .expect(409);
    await request(app.getHttpServer())
      .put('/carrito/sucursal')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ sucursalId: branch.id })
      .expect(200);
    await request(app.getHttpServer())
      .get('/carrito')
      .set('Authorization', `Bearer ${administratorToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .post('/carrito/detalles')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ varianteProductoId: variant.id, cantidad: 1 })
      .expect(200);
    const incremented = await request(app.getHttpServer())
      .post('/carrito/detalles')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ varianteProductoId: variant.id, cantidad: 1 })
      .expect(200);
    expect(incremented.body).toMatchObject({
      total: 99.9,
      detalles: [
        {
          cantidad: 2,
          precioUnitario: 49.95,
          subtotal: 99.9,
          cantidadDisponible: 3,
          comercializable: true,
          disponible: true,
        },
      ],
    });
    expect(await prisma.detalleCarrito.count()).toBe(1);
    const detailId = incremented.body.detalles[0].id as number;

    await request(app.getHttpServer())
      .delete(`/carrito/detalles/${detailId}`)
      .set('Authorization', `Bearer ${secondCustomerToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/carrito/detalles/${detailId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cantidad: 4 })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/carrito/detalles/${detailId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ cantidad: 3 })
      .expect(200);

    await prisma.inventario.update({
      where: { id: inventory.id },
      data: { cantidadFisica: 3 },
    });
    await prisma.producto.update({
      where: { id: product.id },
      data: { precio: 50.1 },
    });
    const inventoryBeforeRead = await prisma.inventario.findUniqueOrThrow({
      where: { id: inventory.id },
    });
    await request(app.getHttpServer())
      .get('/carrito')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          total: 150.3,
          detalles: [
            {
              cantidad: 3,
              precioUnitario: 50.1,
              subtotal: 150.3,
              cantidadDisponible: 1,
              comercializable: true,
              disponible: false,
            },
          ],
        });
      });
    expect(
      await prisma.inventario.findUniqueOrThrow({
        where: { id: inventory.id },
      }),
    ).toEqual(inventoryBeforeRead);
    expect(await prisma.movimientoInventario.count()).toBe(0);

    await request(app.getHttpServer())
      .put('/carrito/sucursal')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ sucursalId: emptyBranch.id })
      .expect(200)
      .expect(({ body }) => {
        expect(body.detalles).toHaveLength(1);
        expect(body.detalles[0]).toMatchObject({
          cantidadDisponible: 0,
          disponible: false,
        });
      });
    await request(app.getHttpServer())
      .delete(`/carrito/detalles/${detailId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ detalles: [], total: 0 });
      });

    const concurrentCreation = await Promise.all([
      request(app.getHttpServer())
        .get('/carrito')
        .set('Authorization', `Bearer ${concurrentCustomerToken}`),
      request(app.getHttpServer())
        .get('/carrito')
        .set('Authorization', `Bearer ${concurrentCustomerToken}`),
    ]);
    expect(concurrentCreation.map(({ status }) => status)).toEqual([200, 200]);
    expect(
      await prisma.carrito.count({
        where: { usuarioId: concurrentCustomer.id },
      }),
    ).toBe(1);

    await prisma.inventario.update({
      where: { id: inventory.id },
      data: {
        cantidadFisica: 10,
        cantidadReservada: 0,
        cantidadNoDisponible: 0,
      },
    });
    await request(app.getHttpServer())
      .put('/carrito/sucursal')
      .set('Authorization', `Bearer ${concurrentCustomerToken}`)
      .send({ sucursalId: branch.id })
      .expect(200);
    const concurrentAdds = await Promise.all([
      request(app.getHttpServer())
        .post('/carrito/detalles')
        .set('Authorization', `Bearer ${concurrentCustomerToken}`)
        .send({ varianteProductoId: variant.id, cantidad: 1 }),
      request(app.getHttpServer())
        .post('/carrito/detalles')
        .set('Authorization', `Bearer ${concurrentCustomerToken}`)
        .send({ varianteProductoId: variant.id, cantidad: 1 }),
    ]);
    expect(concurrentAdds.map(({ status }) => status)).toEqual([200, 200]);
    const concurrentCart = await prisma.carrito.findUniqueOrThrow({
      where: { usuarioId: concurrentCustomer.id },
      include: { detalles: true },
    });
    expect(concurrentCart.detalles).toHaveLength(1);
    expect(concurrentCart.detalles[0].cantidad).toBe(2);
    expect(
      await prisma.inventario.findUniqueOrThrow({
        where: { id: inventory.id },
      }),
    ).toMatchObject({
      cantidadFisica: 10,
      cantidadReservada: 0,
      cantidadNoDisponible: 0,
    });
    expect(await prisma.movimientoInventario.count()).toBe(0);
  }, 30_000);

  it('crea compras digitales idempotentes sin modificar carrito ni inventario', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const clientRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CLIENTE' },
    });
    const adminRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'ADMINISTRADOR' },
    });
    const createCustomer = (email: string, telefono: string) =>
      prisma.usuario.create({
        data: {
          nombre: 'Cliente',
          apellido: 'Digital',
          telefono,
          email,
          passwordHash,
          estado: 'ACTIVO',
          rolId: clientRole.id,
        },
      });
    const [customer, concurrentCustomer, failingCustomer, emptyCustomer] =
      await Promise.all([
        createCustomer('compra-digital@example.test', '71110001'),
        createCustomer('compra-concurrente@example.test', '71110002'),
        createCustomer('compra-sin-stock@example.test', '71110003'),
        createCustomer('compra-vacia@example.test', '71110004'),
      ]);
    const administrator = await prisma.usuario.create({
      data: {
        nombre: 'Admin',
        apellido: 'Digital',
        telefono: '71110005',
        email: 'admin-compra-digital@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: adminRole.id,
      },
    });
    const branch = await prisma.sucursal.create({
      data: { nombre: 'Sucursal Compra Digital', ubicacion: 'Centro' },
    });
    const category = await prisma.categoria.create({
      data: { nombre: 'Categoría Compra Digital' },
    });
    const size = await prisma.talla.create({
      data: { nombre: 'M Compra Digital' },
    });
    const firstColor = await prisma.color.create({
      data: { nombre: 'Negro Compra Digital', codigoHex: '#111111' },
    });
    const secondColor = await prisma.color.create({
      data: { nombre: 'Azul Compra Digital', codigoHex: '#1111AA' },
    });
    const firstProduct = await prisma.producto.create({
      data: {
        nombre: 'Chaqueta Digital',
        precio: 100.25,
        categoriaId: category.id,
      },
    });
    const secondProduct = await prisma.producto.create({
      data: {
        nombre: 'Polera Digital',
        precio: 20.1,
        categoriaId: category.id,
      },
    });
    const firstVariant = await prisma.varianteProducto.create({
      data: {
        productoId: firstProduct.id,
        tallaId: size.id,
        colorId: firstColor.id,
        sku: 'CHAQ-DIGITAL-M',
      },
    });
    const secondVariant = await prisma.varianteProducto.create({
      data: {
        productoId: secondProduct.id,
        tallaId: size.id,
        colorId: secondColor.id,
        sku: 'POL-DIGITAL-M',
      },
    });
    await prisma.inventario.createMany({
      data: [
        {
          sucursalId: branch.id,
          varianteProductoId: firstVariant.id,
          cantidadFisica: 10,
          cantidadReservada: 1,
          cantidadNoDisponible: 1,
        },
        {
          sucursalId: branch.id,
          varianteProductoId: secondVariant.id,
          cantidadFisica: 5,
          cantidadReservada: 0,
          cantidadNoDisponible: 0,
        },
      ],
    });
    const cart = await prisma.carrito.create({
      data: {
        usuarioId: customer.id,
        sucursalId: branch.id,
        detalles: {
          create: [
            { varianteProductoId: firstVariant.id, cantidad: 2 },
            { varianteProductoId: secondVariant.id, cantidad: 1 },
          ],
        },
      },
      include: { detalles: true },
    });
    await prisma.carrito.create({
      data: {
        usuarioId: concurrentCustomer.id,
        sucursalId: branch.id,
        detalles: {
          create: { varianteProductoId: firstVariant.id, cantidad: 1 },
        },
      },
    });
    await prisma.carrito.create({
      data: { usuarioId: emptyCustomer.id, sucursalId: branch.id },
    });
    await prisma.carrito.create({
      data: {
        usuarioId: failingCustomer.id,
        sucursalId: branch.id,
        detalles: {
          create: { varianteProductoId: secondVariant.id, cantidad: 6 },
        },
      },
    });
    const inventoriesBefore = await prisma.inventario.findMany({
      orderBy: { id: 'asc' },
    });
    const jwtService = app.get(JwtService);
    const tokenFor = (id: number, role: string) =>
      jwtService.sign({ sub: id, role });
    const customerToken = tokenFor(customer.id, 'CLIENTE');
    const concurrentToken = tokenFor(concurrentCustomer.id, 'CLIENTE');
    const failingToken = tokenFor(failingCustomer.id, 'CLIENTE');
    const emptyToken = tokenFor(emptyCustomer.id, 'CLIENTE');
    const adminToken = tokenFor(administrator.id, 'ADMINISTRADOR');
    const checkoutBody = {
      nombreFacturacion: 'Ana Digital',
      documentoFacturacion: '9876543',
    };
    const key = randomUUID();

    await request(app.getHttpServer())
      .post('/ventas/digitales')
      .set('Authorization', `Bearer ${customerToken}`)
      .send(checkoutBody)
      .expect(400);
    await request(app.getHttpServer())
      .post('/ventas/digitales')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Idempotency-Key', randomUUID())
      .send(checkoutBody)
      .expect(403);
    await request(app.getHttpServer())
      .post('/ventas/digitales')
      .set('Authorization', `Bearer ${emptyToken}`)
      .set('Idempotency-Key', randomUUID())
      .send(checkoutBody)
      .expect(409);
    await request(app.getHttpServer())
      .post('/ventas/digitales')
      .set('Authorization', `Bearer ${failingToken}`)
      .set('Idempotency-Key', randomUUID())
      .send(checkoutBody)
      .expect(409);
    expect(
      await prisma.venta.count({ where: { clienteId: failingCustomer.id } }),
    ).toBe(0);

    const created = await request(app.getHttpServer())
      .post('/ventas/digitales')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', key)
      .send(checkoutBody)
      .expect(201);
    expect(created.body).toMatchObject({
      canal: 'DIGITAL',
      sucursal: { id: branch.id },
      cajero: null,
      cliente: { id: customer.id },
      nombreFacturacion: 'Ana Digital',
      documentoFacturacion: '9876543',
      total: 220.6,
      estado: 'PENDIENTE_PAGO',
      detalles: [
        { cantidad: 2, precioUnitario: 100.25, subtotal: 200.5 },
        { cantidad: 1, precioUnitario: 20.1, subtotal: 20.1 },
      ],
    });
    const saleId = created.body.id as number;
    const saved = await prisma.venta.findUniqueOrThrow({
      where: { id: saleId },
      include: { detalles: { orderBy: { id: 'asc' } } },
    });
    expect(saved).toMatchObject({
      canal: 'DIGITAL',
      clienteId: customer.id,
      cajeroId: null,
      sucursalId: branch.id,
      estado: 'PENDIENTE_PAGO',
      claveIdempotencia: key,
    });
    expect(
      saved.detalles.map(({ precioUnitario }) => precioUnitario.toNumber()),
    ).toEqual([100.25, 20.1]);
    expect(
      await prisma.carrito.findUniqueOrThrow({
        where: { id: cart.id },
        include: { detalles: { orderBy: { id: 'asc' } } },
      }),
    ).toMatchObject({
      sucursalId: branch.id,
      detalles: [
        { varianteProductoId: firstVariant.id, cantidad: 2 },
        { varianteProductoId: secondVariant.id, cantidad: 1 },
      ],
    });
    expect(
      await prisma.inventario.findMany({ orderBy: { id: 'asc' } }),
    ).toEqual(inventoriesBefore);
    expect(await prisma.movimientoInventario.count()).toBe(0);
    expect(await prisma.pago.count()).toBe(0);

    await request(app.getHttpServer())
      .post('/ventas/digitales')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', key)
      .send(checkoutBody)
      .expect(201)
      .expect(({ body }) => expect(body.id).toBe(saleId));
    expect(
      await prisma.venta.count({
        where: { clienteId: customer.id, canal: 'DIGITAL' },
      }),
    ).toBe(1);
    await request(app.getHttpServer())
      .post('/ventas/digitales')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', key)
      .send({ ...checkoutBody, documentoFacturacion: 'OTRO' })
      .expect(409);

    await prisma.producto.update({
      where: { id: firstProduct.id },
      data: { precio: 150 },
    });
    expect(
      (
        await prisma.detalleVenta.findFirstOrThrow({
          where: { ventaId: saleId, varianteProductoId: firstVariant.id },
        })
      ).precioUnitario.toNumber(),
    ).toBe(100.25);

    const concurrentKey = randomUUID();
    const concurrentResponses = await Promise.all([
      request(app.getHttpServer())
        .post('/ventas/digitales')
        .set('Authorization', `Bearer ${concurrentToken}`)
        .set('Idempotency-Key', concurrentKey)
        .send(checkoutBody),
      request(app.getHttpServer())
        .post('/ventas/digitales')
        .set('Authorization', `Bearer ${concurrentToken}`)
        .set('Idempotency-Key', concurrentKey)
        .send(checkoutBody),
    ]);
    expect(concurrentResponses.map(({ status }) => status)).toEqual([201, 201]);
    expect(concurrentResponses[0].body.id).toBe(concurrentResponses[1].body.id);
    expect(
      await prisma.venta.count({
        where: { clienteId: concurrentCustomer.id, canal: 'DIGITAL' },
      }),
    ).toBe(1);

    await prisma.varianteProducto.update({
      where: { id: secondVariant.id },
      data: { estado: 'INACTIVO' },
    });
    await request(app.getHttpServer())
      .post('/ventas/digitales')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send(checkoutBody)
      .expect(409);
  }, 30_000);

  it('confirma pagos electrónicos simulados y conserva la consistencia digital', async () => {
    const passwordHash = await argon2.hash('unused-hash-value');
    const clientRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CLIENTE' },
    });
    const cashierRole = await prisma.rol.findUniqueOrThrow({
      where: { nombre: 'CAJERO' },
    });
    const createCustomer = (index: number) =>
      prisma.usuario.create({
        data: {
          nombre: `Cliente ${index}`,
          apellido: 'Pago Digital',
          telefono: `72220${index.toString().padStart(3, '0')}`,
          email: `pago-digital-${index}@example.test`,
          passwordHash,
          estado: 'ACTIVO',
          rolId: clientRole.id,
        },
      });
    const customers = await Promise.all(
      Array.from({ length: 8 }, (_value, index) => createCustomer(index + 1)),
    );
    const [owner, other, modified, noStock, rollback, duplicate, competitorA, competitorB] =
      customers;
    const branch = await prisma.sucursal.create({
      data: { nombre: 'Sucursal Pago Digital', ubicacion: 'Centro' },
    });
    const cashier = await prisma.usuario.create({
      data: {
        nombre: 'Cajero',
        apellido: 'Pago Digital',
        telefono: '73330000',
        email: 'cajero-pago-digital@example.test',
        passwordHash,
        estado: 'ACTIVO',
        rolId: cashierRole.id,
        sucursalId: branch.id,
      },
    });
    const category = await prisma.categoria.create({
      data: { nombre: 'Categoría Pago Digital' },
    });
    const size = await prisma.talla.create({
      data: { nombre: 'M Pago Digital' },
    });
    const createStockedVariant = async (
      suffix: string,
      precio: number,
      cantidadFisica: number,
      cantidadReservada = 0,
      cantidadNoDisponible = 0,
    ) => {
      const color = await prisma.color.create({
        data: {
          nombre: `Color ${suffix}`,
          codigoHex: `#${suffix.padStart(6, '0').slice(-6)}`,
        },
      });
      const product = await prisma.producto.create({
        data: {
          nombre: `Producto ${suffix}`,
          precio,
          categoriaId: category.id,
        },
      });
      const variant = await prisma.varianteProducto.create({
        data: {
          productoId: product.id,
          tallaId: size.id,
          colorId: color.id,
          sku: `PAGO-DIGITAL-${suffix}`,
        },
      });
      const inventory = await prisma.inventario.create({
        data: {
          sucursalId: branch.id,
          varianteProductoId: variant.id,
          cantidadFisica,
          cantidadReservada,
          cantidadNoDisponible,
        },
      });
      return { variant, inventory };
    };
    const core = await createStockedVariant('100001', 50, 20, 1, 1);
    const secondary = await createStockedVariant('100002', 25.5, 10);
    const scarce = await createStockedVariant('100003', 40, 1);
    const rollbackStock = await createStockedVariant('100004', 30, 3);
    const race = await createStockedVariant('100005', 10, 2);
    const jwtService = app.get(JwtService);
    const tokenFor = (id: number) => jwtService.sign({ sub: id });
    const checkoutBody = {
      nombreFacturacion: 'Cliente Pago Digital',
      documentoFacturacion: '9988776',
    };
    const oldCartDate = new Date('2020-01-01T00:00:00.000Z');
    const createDigitalSale = async (
      customer: (typeof customers)[number],
      details: Array<{ varianteProductoId: number; cantidad: number }>,
    ) => {
      const cart = await prisma.carrito.create({
        data: {
          usuarioId: customer.id,
          sucursalId: branch.id,
          detalles: { create: details },
        },
        include: { detalles: true },
      });
      await prisma.carrito.update({
        where: { id: cart.id },
        data: { actualizadoEn: oldCartDate },
      });
      const response = await request(app.getHttpServer())
        .post('/ventas/digitales')
        .set('Authorization', `Bearer ${tokenFor(customer.id)}`)
        .set('Idempotency-Key', randomUUID())
        .send(checkoutBody)
        .expect(201);
      return { cart, saleId: response.body.id as number };
    };
    const electronicPath = (saleId: number) =>
      `/ventas/${saleId}/pagos/electronico`;

    const ownerCheckout = await createDigitalSale(owner, [
      { varianteProductoId: core.variant.id, cantidad: 2 },
      { varianteProductoId: secondary.variant.id, cantidad: 1 },
    ]);
    await request(app.getHttpServer())
      .post(electronicPath(ownerCheckout.saleId))
      .set('Authorization', `Bearer ${tokenFor(owner.id)}`)
      .send({ metodo: 'EFECTIVO' })
      .expect(400);
    await request(app.getHttpServer())
      .post(electronicPath(ownerCheckout.saleId))
      .set('Authorization', `Bearer ${tokenFor(owner.id)}`)
      .send({ metodo: 'TARJETA', referencia: 'NO-ACEPTADA' })
      .expect(400);
    await request(app.getHttpServer())
      .post(electronicPath(ownerCheckout.saleId))
      .set('Authorization', `Bearer ${tokenFor(other.id)}`)
      .send({ metodo: 'TARJETA' })
      .expect(403);
    await request(app.getHttpServer())
      .post(electronicPath(ownerCheckout.saleId))
      .set('Authorization', `Bearer ${tokenFor(cashier.id)}`)
      .send({ metodo: 'QR' })
      .expect(403);
    await request(app.getHttpServer())
      .post(electronicPath(999999))
      .set('Authorization', `Bearer ${tokenFor(owner.id)}`)
      .send({ metodo: 'QR' })
      .expect(404);

    const presencial = await prisma.venta.create({
      data: {
        canal: 'PRESENCIAL',
        sucursalId: branch.id,
        cajeroId: cashier.id,
        nombreFacturacion: 'CONSUMIDOR FINAL',
        documentoFacturacion: '0',
        total: 50,
        detalles: {
          create: {
            varianteProductoId: core.variant.id,
            cantidad: 1,
            precioUnitario: 50,
            subtotal: 50,
          },
        },
      },
    });
    await request(app.getHttpServer())
      .post(electronicPath(presencial.id))
      .set('Authorization', `Bearer ${tokenFor(owner.id)}`)
      .send({ metodo: 'QR' })
      .expect(409);

    const cardPayment = await request(app.getHttpServer())
      .post(electronicPath(ownerCheckout.saleId))
      .set('Authorization', `Bearer ${tokenFor(owner.id)}`)
      .send({ metodo: 'TARJETA' })
      .expect(201);
    expect(cardPayment.body).toMatchObject({
      pago: {
        ventaId: ownerCheckout.saleId,
        metodo: 'TARJETA',
        monto: 125.5,
        montoRecibido: null,
        cambio: null,
        simulado: true,
        estado: 'CONFIRMADO',
      },
      venta: {
        id: ownerCheckout.saleId,
        estado: 'PAGADA',
        total: 125.5,
      },
    });
    expect(cardPayment.body.pago.referencia).toMatch(
      /^SIM-TARJETA-[0-9a-f-]{36}$/,
    );
    expect(
      await prisma.detalleCarrito.count({
        where: { carritoId: ownerCheckout.cart.id },
      }),
    ).toBe(0);
    expect(
      await prisma.inventario.findUniqueOrThrow({
        where: { id: core.inventory.id },
      }),
    ).toMatchObject({
      cantidadFisica: 18,
      cantidadReservada: 1,
      cantidadNoDisponible: 1,
    });
    expect(
      await prisma.inventario.findUniqueOrThrow({
        where: { id: secondary.inventory.id },
      }),
    ).toMatchObject({ cantidadFisica: 9 });
    expect(
      await prisma.movimientoInventario.count({
        where: { ventaId: ownerCheckout.saleId, usuarioId: owner.id },
      }),
    ).toBe(2);
    await request(app.getHttpServer())
      .post(electronicPath(ownerCheckout.saleId))
      .set('Authorization', `Bearer ${tokenFor(owner.id)}`)
      .send({ metodo: 'TARJETA' })
      .expect(409);

    const modifiedCheckout = await createDigitalSale(modified, [
      { varianteProductoId: core.variant.id, cantidad: 1 },
    ]);
    await prisma.detalleCarrito.update({
      where: { id: modifiedCheckout.cart.detalles[0].id },
      data: { cantidad: 3 },
    });
    const modifiedSale = await prisma.venta.findUniqueOrThrow({
      where: { id: modifiedCheckout.saleId },
    });
    await prisma.carrito.update({
      where: { id: modifiedCheckout.cart.id },
      data: {
        actualizadoEn: new Date(modifiedSale.fecha.getTime() + 1_000),
      },
    });
    const qrPayment = await request(app.getHttpServer())
      .post(electronicPath(modifiedCheckout.saleId))
      .set('Authorization', `Bearer ${tokenFor(modified.id)}`)
      .send({ metodo: 'QR' })
      .expect(201);
    expect(qrPayment.body.pago).toMatchObject({
      metodo: 'QR',
      montoRecibido: null,
      cambio: null,
      simulado: true,
    });
    expect(qrPayment.body.pago.referencia).toMatch(/^SIM-QR-[0-9a-f-]{36}$/);
    expect(
      await prisma.detalleCarrito.findUniqueOrThrow({
        where: { id: modifiedCheckout.cart.detalles[0].id },
      }),
    ).toMatchObject({ cantidad: 3 });

    const noStockCheckout = await createDigitalSale(noStock, [
      { varianteProductoId: scarce.variant.id, cantidad: 1 },
    ]);
    await prisma.inventario.update({
      where: { id: scarce.inventory.id },
      data: { cantidadNoDisponible: 1 },
    });
    await request(app.getHttpServer())
      .post(electronicPath(noStockCheckout.saleId))
      .set('Authorization', `Bearer ${tokenFor(noStock.id)}`)
      .send({ metodo: 'QR' })
      .expect(409);
    expect(
      await prisma.venta.findUniqueOrThrow({
        where: { id: noStockCheckout.saleId },
      }),
    ).toMatchObject({ estado: 'PENDIENTE_PAGO' });
    expect(
      await prisma.detalleCarrito.count({
        where: { carritoId: noStockCheckout.cart.id },
      }),
    ).toBe(1);

    const rollbackCheckout = await createDigitalSale(rollback, [
      { varianteProductoId: rollbackStock.variant.id, cantidad: 1 },
    ]);
    await prisma.pago.create({
      data: {
        ventaId: rollbackCheckout.saleId,
        metodo: MetodoPago.QR,
        monto: 30,
        referencia: `SIM-QR-${randomUUID()}`,
        simulado: true,
        estado: EstadoPago.CONFIRMADO,
      },
    });
    const rollbackInventoryBefore = await prisma.inventario.findUniqueOrThrow({
      where: { id: rollbackStock.inventory.id },
    });
    await request(app.getHttpServer())
      .post(electronicPath(rollbackCheckout.saleId))
      .set('Authorization', `Bearer ${tokenFor(rollback.id)}`)
      .send({ metodo: 'QR' })
      .expect(409);
    expect(
      await prisma.inventario.findUniqueOrThrow({
        where: { id: rollbackStock.inventory.id },
      }),
    ).toEqual(rollbackInventoryBefore);
    expect(
      await prisma.movimientoInventario.count({
        where: { ventaId: rollbackCheckout.saleId },
      }),
    ).toBe(0);
    expect(
      await prisma.detalleCarrito.count({
        where: { carritoId: rollbackCheckout.cart.id },
      }),
    ).toBe(1);
    expect(
      await prisma.venta.findUniqueOrThrow({
        where: { id: rollbackCheckout.saleId },
      }),
    ).toMatchObject({ estado: 'PENDIENTE_PAGO' });

    const duplicateCheckout = await createDigitalSale(duplicate, [
      { varianteProductoId: race.variant.id, cantidad: 1 },
    ]);
    const competingCheckouts = await Promise.all([
      createDigitalSale(competitorA, [
        { varianteProductoId: race.variant.id, cantidad: 1 },
      ]),
      createDigitalSale(competitorB, [
        { varianteProductoId: race.variant.id, cantidad: 1 },
      ]),
    ]);
    const duplicateResponses = await Promise.all([
      request(app.getHttpServer())
        .post(electronicPath(duplicateCheckout.saleId))
        .set('Authorization', `Bearer ${tokenFor(duplicate.id)}`)
        .send({ metodo: 'QR' }),
      request(app.getHttpServer())
        .post(electronicPath(duplicateCheckout.saleId))
        .set('Authorization', `Bearer ${tokenFor(duplicate.id)}`)
        .send({ metodo: 'QR' }),
    ]);
    expect(
      duplicateResponses
        .map(({ status }) => status)
        .sort((left, right) => left - right),
    ).toEqual([201, 409]);
    expect(
      await prisma.pago.count({
        where: {
          ventaId: duplicateCheckout.saleId,
          estado: EstadoPago.CONFIRMADO,
        },
      }),
    ).toBe(1);

    const competingResponses = await Promise.all(
      competingCheckouts.map((checkout, index) =>
        request(app.getHttpServer())
          .post(electronicPath(checkout.saleId))
          .set(
            'Authorization',
            `Bearer ${tokenFor(index === 0 ? competitorA.id : competitorB.id)}`,
          )
          .send({ metodo: 'TARJETA' }),
      ),
    );
    expect(
      competingResponses
        .map(({ status }) => status)
        .sort((left, right) => left - right),
    ).toEqual([201, 409]);
    expect(
      await prisma.inventario.findUniqueOrThrow({
        where: { id: race.inventory.id },
      }),
    ).toMatchObject({ cantidadFisica: 0 });
    expect(
      await prisma.pago.count({
        where: {
          ventaId: { in: competingCheckouts.map(({ saleId }) => saleId) },
          estado: EstadoPago.CONFIRMADO,
        },
      }),
    ).toBe(1);
  }, 45_000);

  it('migra usuarios VENDEDOR existentes a CAJERO conservando su relación', async () => {
    const legacyRole = await prisma.rol.upsert({
      where: { nombre: 'VENDEDOR' },
      create: { nombre: 'VENDEDOR', descripcion: 'Rol anterior vendedor' },
      update: {},
    });
    const legacyUser = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Anterior',
        telefono: '70000000',
        email: 'vendedor-anterior@example.test',
        passwordHash: await argon2.hash('unused-hash-value'),
        estado: 'ACTIVO',
        rolId: legacyRole.id,
      },
    });

    const migrationSql = await readFile(
      resolve(
        process.cwd(),
        'prisma/migrations/20260921010000_actor_roles/migration.sql',
      ),
      'utf8',
    );
    await prisma.$executeRawUnsafe(migrationSql);

    const migratedUser = await prisma.usuario.findUnique({
      where: { id: legacyUser.id },
      include: { rol: true },
    });
    expect(migratedUser?.rol.nombre).toBe('CAJERO');
    expect(migratedUser?.rolId).not.toBe(legacyRole.id);
    expect(
      await prisma.rol.findUnique({ where: { nombre: 'VENDEDOR' } }),
    ).toBeNull();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await rm(productImagesDirectory, { recursive: true, force: true });
  });
});
