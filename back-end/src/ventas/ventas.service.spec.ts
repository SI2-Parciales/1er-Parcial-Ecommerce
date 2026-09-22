import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { CanalVenta, EstadoVenta, Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
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
    venta: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
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
  const user: AuthenticatedUser = {
    id: 7,
    email: 'cajero@example.test',
    nombre: 'Caja',
    role: 'CAJERO',
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
  let service: VentasService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VentasService(
      prisma as unknown as PrismaService,
      variantesService as unknown as VariantesService,
      inventarioService as unknown as InventarioService,
    );
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
});
