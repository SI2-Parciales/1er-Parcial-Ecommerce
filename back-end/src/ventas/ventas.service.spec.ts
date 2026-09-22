import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CanalVenta, EstadoVenta, Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { CarritoService } from '../carrito/carrito.service.js';
import { InventarioService } from '../inventario/inventario.service.js';
import {
  VarianteCompra,
  VariantesService,
} from '../productos/variantes/variantes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VentasService } from './ventas.service.js';

describe('VentasService', () => {
  const transaction = {
    $queryRaw: vi.fn(),
    venta: { create: vi.fn(), update: vi.fn() },
    detalleVenta: { findMany: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    venta: { findFirst: vi.fn() },
  };
  const variantesService = {
    resolveActiveForPurchase: vi.fn(),
  };
  const inventarioService = {
    ensureAvailability: vi.fn(),
    applyStockEntry: vi.fn(),
    applyTransfer: vi.fn(),
    applyShrinkage: vi.fn(),
  };
  const carritoService = {
    lockForCheckout: vi.fn(),
  };
  const user: AuthenticatedUser = {
    id: 7,
    email: 'cajero@example.test',
    nombre: 'Caja',
    role: 'CAJERO',
  };
  const customer: AuthenticatedUser = {
    id: 30,
    email: 'cliente@example.test',
    nombre: 'Cliente',
    role: 'CLIENTE',
  };
  const variants: VarianteCompra[] = [
    {
      id: 11,
      sku: 'POL-NEG-M',
      precio: new Prisma.Decimal('129.90'),
      producto: { id: 3, nombre: 'Polera' },
      talla: { id: 2, nombre: 'M' },
      color: { id: 4, nombre: 'Negro', codigoHex: '#000000' },
    },
    {
      id: 12,
      sku: 'POL-AZU-L',
      precio: new Prisma.Decimal('80.00'),
      producto: { id: 3, nombre: 'Polera' },
      talla: { id: 5, nombre: 'L' },
      color: { id: 6, nombre: 'Azul', codigoHex: '#0000FF' },
    },
  ];
  const digitalSaleRecord = (hashSolicitud?: string) => ({
    id: 40,
    canal: CanalVenta.DIGITAL,
    nombreFacturacion: 'Ana Pérez',
    documentoFacturacion: '1234567',
    fecha: new Date('2026-09-22T13:00:00.000Z'),
    total: new Prisma.Decimal('339.80'),
    estado: EstadoVenta.PENDIENTE_PAGO,
    sucursal: { id: 2, nombre: 'Sucursal Central' },
    cajero: null,
    cliente: { id: 30, nombre: 'Ana', apellido: 'Pérez' },
    detalles: [
      {
        id: 10,
        cantidad: 2,
        precioUnitario: variants[0].precio,
        subtotal: variants[0].precio.mul(2),
        varianteProducto: {
          id: variants[0].id,
          sku: variants[0].sku,
          producto: variants[0].producto,
          talla: variants[0].talla,
          color: variants[0].color,
        },
      },
      {
        id: 11,
        cantidad: 1,
        precioUnitario: variants[1].precio,
        subtotal: variants[1].precio,
        varianteProducto: {
          id: variants[1].id,
          sku: variants[1].sku,
          producto: variants[1].producto,
          talla: variants[1].talla,
          color: variants[1].color,
        },
      },
    ],
    ...(hashSolicitud === undefined ? {} : { hashSolicitud }),
  });
  let service: VentasService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VentasService(
      prisma as unknown as PrismaService,
      variantesService as unknown as VariantesService,
      inventarioService as unknown as InventarioService,
      carritoService as unknown as CarritoService,
    );
    prisma.venta.findFirst.mockResolvedValue(null);
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 7,
          nombre: 'Caja',
          apellido: 'Central',
          estado: 'ACTIVO',
          sucursalId: 2,
          role: 'CAJERO',
        },
      ])
      .mockResolvedValueOnce([
        { id: 2, nombre: 'Sucursal Central', estado: 'ACTIVO' },
      ]);
    variantesService.resolveActiveForPurchase.mockResolvedValue(variants);
    inventarioService.ensureAvailability.mockResolvedValue(undefined);
    carritoService.lockForCheckout.mockResolvedValue({
      id: 5,
      sucursalId: 2,
      detalles: [
        { varianteProductoId: 11, cantidad: 2 },
        { varianteProductoId: 12, cantidad: 1 },
      ],
    });
  });

  it('registra una venta múltiple, agrupa ID/SKU y usa facturación genérica', async () => {
    transaction.venta.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) => ({
        id: 20,
        canal: CanalVenta.PRESENCIAL,
        nombreFacturacion: data.nombreFacturacion,
        documentoFacturacion: data.documentoFacturacion,
        fecha: new Date('2026-09-22T12:00:00.000Z'),
        total: data.total,
        estado: EstadoVenta.PENDIENTE_PAGO,
        sucursal: { id: 2, nombre: 'Sucursal Central' },
        cajero: { id: 7, nombre: 'Caja', apellido: 'Central' },
        cliente: null,
        detalles: [
          {
            id: 1,
            cantidad: 3,
            precioUnitario: variants[0].precio,
            subtotal: variants[0].precio.mul(3),
            varianteProducto: {
              id: variants[0].id,
              sku: variants[0].sku,
              producto: variants[0].producto,
              talla: variants[0].talla,
              color: variants[0].color,
            },
          },
          {
            id: 2,
            cantidad: 1,
            precioUnitario: variants[1].precio,
            subtotal: variants[1].precio,
            varianteProducto: {
              id: variants[1].id,
              sku: variants[1].sku,
              producto: variants[1].producto,
              talla: variants[1].talla,
              color: variants[1].color,
            },
          },
        ],
      }),
    );

    const result = await service.createPresencial(
      {
        detalles: [
          { varianteProductoId: 11, cantidad: 1 },
          { sku: ' pol-neg-m ', cantidad: 2 },
          { varianteProductoId: 12, cantidad: 1 },
        ],
      },
      user,
    );

    expect(inventarioService.ensureAvailability).toHaveBeenCalledWith(
      transaction,
      2,
      [
        { varianteProductoId: 11, cantidad: 3 },
        { varianteProductoId: 12, cantidad: 1 },
      ],
    );
    expect(transaction.venta.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          canal: CanalVenta.PRESENCIAL,
          sucursalId: 2,
          cajeroId: 7,
          clienteId: undefined,
          nombreFacturacion: 'CONSUMIDOR FINAL',
          documentoFacturacion: '0',
          total: new Prisma.Decimal('469.70'),
          detalles: {
            create: [
              expect.objectContaining({
                varianteProductoId: 11,
                cantidad: 3,
                subtotal: new Prisma.Decimal('389.70'),
              }),
              expect.objectContaining({
                varianteProductoId: 12,
                cantidad: 1,
                subtotal: new Prisma.Decimal('80.00'),
              }),
            ],
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      total: 469.7,
      estado: 'PENDIENTE_PAGO',
      nombreFacturacion: 'CONSUMIDOR FINAL',
      detalles: [{ cantidad: 3 }, { cantidad: 1 }],
    });
    expect(inventarioService.applyStockEntry).not.toHaveBeenCalled();
    expect(inventarioService.applyTransfer).not.toHaveBeenCalled();
    expect(inventarioService.applyShrinkage).not.toHaveBeenCalled();
  });

  it('acepta cliente activo y datos de facturación explícitos', async () => {
    transaction.$queryRaw.mockResolvedValueOnce([
      { id: 30, estado: 'ACTIVO', role: 'CLIENTE' },
    ]);
    transaction.venta.create.mockResolvedValue({
      id: 21,
      canal: CanalVenta.PRESENCIAL,
      nombreFacturacion: 'Ana Pérez',
      documentoFacturacion: '4567890',
      fecha: new Date('2026-09-22T12:00:00.000Z'),
      total: new Prisma.Decimal('129.90'),
      estado: EstadoVenta.PENDIENTE_PAGO,
      sucursal: { id: 2, nombre: 'Sucursal Central' },
      cajero: { id: 7, nombre: 'Caja', apellido: 'Central' },
      cliente: { id: 30, nombre: 'Ana', apellido: 'Pérez' },
      detalles: [
        {
          id: 3,
          cantidad: 1,
          precioUnitario: variants[0].precio,
          subtotal: variants[0].precio,
          varianteProducto: {
            id: variants[0].id,
            sku: variants[0].sku,
            producto: variants[0].producto,
            talla: variants[0].talla,
            color: variants[0].color,
          },
        },
      ],
    });

    const result = await service.createPresencial(
      {
        clienteId: 30,
        nombreFacturacion: ' Ana Pérez ',
        documentoFacturacion: ' 4567890 ',
        detalles: [{ varianteProductoId: 11, cantidad: 1 }],
      },
      user,
    );

    expect(result.cliente).toMatchObject({ id: 30, nombre: 'Ana' });
    expect(transaction.venta.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clienteId: 30,
          nombreFacturacion: 'Ana Pérez',
          documentoFacturacion: '4567890',
        }),
      }),
    );
  });

  it('rechaza facturación incompleta e identificadores ambiguos antes de escribir', async () => {
    await expect(
      service.createPresencial(
        {
          nombreFacturacion: 'Ana',
          detalles: [{ varianteProductoId: 11, cantidad: 1 }],
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createPresencial(
        {
          detalles: [{ varianteProductoId: 11, sku: 'POL-NEG-M', cantidad: 1 }],
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza actores sin permisos o sin sucursal', async () => {
    transaction.$queryRaw.mockReset().mockResolvedValueOnce([
      {
        id: 9,
        nombre: 'Cliente',
        apellido: 'Final',
        estado: 'ACTIVO',
        sucursalId: null,
        role: 'CLIENTE',
      },
    ]);
    await expect(
      service.createPresencial(
        { detalles: [{ varianteProductoId: 11, cantidad: 1 }] },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.venta.create).not.toHaveBeenCalled();
  });

  it('propaga el conflicto de existencias y no crea registros parciales', async () => {
    inventarioService.ensureAvailability.mockRejectedValue(
      new ConflictException('Sin existencias.'),
    );
    await expect(
      service.createPresencial(
        { detalles: [{ varianteProductoId: 11, cantidad: 2 }] },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.venta.create).not.toHaveBeenCalled();
  });

  it('crea una venta digital desde el carrito con precios históricos', async () => {
    const key = '7ad63e0d-91ad-4fd7-a422-b14d76875c27';
    transaction.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ id: 30, estado: 'ACTIVO', role: 'CLIENTE' }])
      .mockResolvedValueOnce([
        { id: 2, nombre: 'Sucursal Central', estado: 'ACTIVO' },
      ]);
    transaction.venta.create.mockResolvedValue(digitalSaleRecord());

    const result = await service.createDigital(
      {
        nombreFacturacion: ' Ana Pérez ',
        documentoFacturacion: ' 1234567 ',
      },
      customer,
      key,
    );

    expect(carritoService.lockForCheckout).toHaveBeenCalledWith(
      transaction,
      30,
    );
    expect(inventarioService.ensureAvailability).toHaveBeenCalledWith(
      transaction,
      2,
      [
        { varianteProductoId: 11, cantidad: 2 },
        { varianteProductoId: 12, cantidad: 1 },
      ],
    );
    expect(transaction.venta.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          canal: CanalVenta.DIGITAL,
          sucursalId: 2,
          cajeroId: null,
          clienteId: 30,
          nombreFacturacion: 'Ana Pérez',
          documentoFacturacion: '1234567',
          total: new Prisma.Decimal('339.80'),
          claveIdempotencia: key,
          hashSolicitud: expect.stringMatching(/^[a-f0-9]{64}$/),
          detalles: {
            create: [
              expect.objectContaining({
                varianteProductoId: 11,
                cantidad: 2,
                precioUnitario: new Prisma.Decimal('129.90'),
                subtotal: new Prisma.Decimal('259.80'),
              }),
              expect.objectContaining({
                varianteProductoId: 12,
                cantidad: 1,
                precioUnitario: new Prisma.Decimal('80.00'),
                subtotal: new Prisma.Decimal('80.00'),
              }),
            ],
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      id: 40,
      canal: 'DIGITAL',
      cajero: null,
      cliente: { id: 30 },
      estado: 'PENDIENTE_PAGO',
      total: 339.8,
    });
  });

  it('devuelve la misma venta al repetir una clave con igual facturación', async () => {
    const key = '7ad63e0d-91ad-4fd7-a422-b14d76875c27';
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          clientId: 30,
          nombre: 'Ana Pérez',
          documento: '1234567',
        }),
      )
      .digest('hex');
    prisma.venta.findFirst.mockResolvedValue(digitalSaleRecord(requestHash));

    const result = await service.createDigital(
      {
        nombreFacturacion: 'Ana Pérez',
        documentoFacturacion: '1234567',
      },
      customer,
      key,
    );

    expect(result).toMatchObject({ id: 40, canal: 'DIGITAL' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(transaction.venta.create).not.toHaveBeenCalled();
  });

  it('rechaza una clave reutilizada con otra facturación', async () => {
    const key = '7ad63e0d-91ad-4fd7-a422-b14d76875c27';
    prisma.venta.findFirst.mockResolvedValue(digitalSaleRecord('0'.repeat(64)));

    await expect(
      service.createDigital(
        {
          nombreFacturacion: 'Ana Pérez',
          documentoFacturacion: '1234567',
        },
        customer,
        key,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('recupera la venta creada por una confirmación concurrente equivalente', async () => {
    const key = '7ad63e0d-91ad-4fd7-a422-b14d76875c27';
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          clientId: 30,
          nombre: 'Ana Pérez',
          documento: '1234567',
        }),
      )
      .digest('hex');
    prisma.venta.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(digitalSaleRecord(requestHash));
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2002' });

    await expect(
      service.createDigital(
        {
          nombreFacturacion: 'Ana Pérez',
          documentoFacturacion: '1234567',
        },
        customer,
        key,
      ),
    ).resolves.toMatchObject({ id: 40, canal: 'DIGITAL' });
    expect(prisma.venta.findFirst).toHaveBeenCalledTimes(2);
  });

  it('rechaza facturación o clave inválida antes de leer el carrito', async () => {
    await expect(
      service.createDigital(
        { nombreFacturacion: '', documentoFacturacion: '1234567' },
        customer,
        '7ad63e0d-91ad-4fd7-a422-b14d76875c27',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createDigital(
        {
          nombreFacturacion: 'Ana Pérez',
          documentoFacturacion: '1234567',
        },
        customer,
        'no-es-uuid',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(carritoService.lockForCheckout).not.toHaveBeenCalled();
  });

  it('rechaza actores no clientes y propaga conflictos del carrito o stock', async () => {
    const key = '7ad63e0d-91ad-4fd7-a422-b14d76875c27';
    transaction.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ id: 7, estado: 'ACTIVO', role: 'CAJERO' }]);
    await expect(
      service.createDigital(
        {
          nombreFacturacion: 'Ana Pérez',
          documentoFacturacion: '1234567',
        },
        user,
        key,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    transaction.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ id: 30, estado: 'ACTIVO', role: 'CLIENTE' }]);
    carritoService.lockForCheckout.mockRejectedValueOnce(
      new ConflictException('El carrito está vacío.'),
    );
    await expect(
      service.createDigital(
        {
          nombreFacturacion: 'Ana Pérez',
          documentoFacturacion: '1234567',
        },
        customer,
        key,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.venta.create).not.toHaveBeenCalled();
  });

  it('bloquea una venta pendiente con sus detalles y la marca pagada', async () => {
    transaction.$queryRaw.mockReset().mockResolvedValue([
      {
        id: 20,
        canal: CanalVenta.PRESENCIAL,
        sucursalId: 2,
        clienteId: null,
        total: new Prisma.Decimal('129.90'),
        estado: EstadoVenta.PENDIENTE_PAGO,
        fecha: new Date('2026-09-22T14:00:00.000Z'),
      },
    ]);
    transaction.detalleVenta.findMany.mockResolvedValue([
      { varianteProductoId: 11, cantidad: 2 },
    ]);
    transaction.venta.update.mockResolvedValue({
      id: 20,
      estado: EstadoVenta.PAGADA,
      total: new Prisma.Decimal('129.90'),
    });

    const locked = await service.lockPendingForPayment(
      transaction as never,
      20,
    );
    expect(locked).toMatchObject({
      id: 20,
      clienteId: null,
      estado: 'PENDIENTE_PAGO',
      detalles: [{ varianteProductoId: 11, cantidad: 2 }],
    });
    await service.markPaid(transaction as never, 20);
    expect(transaction.venta.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { estado: EstadoVenta.PAGADA },
      select: { id: true, estado: true, total: true },
    });
  });

  it('autoriza únicamente al propietario activo de una venta digital', async () => {
    const digitalSale = {
      id: 40,
      canal: CanalVenta.DIGITAL,
      sucursalId: 2,
      clienteId: 30,
      total: new Prisma.Decimal('339.80'),
      estado: EstadoVenta.PENDIENTE_PAGO,
      fecha: new Date('2026-09-22T14:00:00.000Z'),
      detalles: [{ varianteProductoId: 11, cantidad: 2 }],
    };
    transaction.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ id: 30, estado: 'ACTIVO', role: 'CLIENTE' }])
      .mockResolvedValueOnce([
        { id: 2, nombre: 'Sucursal Central', estado: 'ACTIVO' },
      ]);

    await expect(
      service.authorizeDigitalBuyerForSale(
        transaction as never,
        customer,
        digitalSale,
      ),
    ).resolves.toEqual({ id: 30 });

    transaction.$queryRaw.mockReset().mockResolvedValueOnce([
      { id: 31, estado: 'ACTIVO', role: 'CLIENTE' },
    ]);
    await expect(
      service.authorizeDigitalBuyerForSale(
        transaction as never,
        { ...customer, id: 31 },
        digitalSale,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza una venta ya pagada antes de consultar sus detalles', async () => {
    transaction.$queryRaw.mockReset().mockResolvedValue([
      {
        id: 20,
        canal: CanalVenta.PRESENCIAL,
        sucursalId: 2,
        clienteId: null,
        total: new Prisma.Decimal('129.90'),
        estado: EstadoVenta.PAGADA,
        fecha: new Date('2026-09-22T14:00:00.000Z'),
      },
    ]);
    await expect(
      service.lockPendingForPayment(transaction as never, 20),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.detalleVenta.findMany).not.toHaveBeenCalled();
  });
});
