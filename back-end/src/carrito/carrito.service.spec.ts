import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VariantesService } from '../productos/variantes/variantes.service.js';
import { CarritoService } from './carrito.service.js';

describe('CarritoService', () => {
  const transaction = {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    carrito: {
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    detalleCarrito: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
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
    getAvailableQuantities: vi.fn(),
  };
  const customer: AuthenticatedUser = {
    id: 10,
    email: 'cliente@example.test',
    nombre: 'Cliente',
    role: 'CLIENTE',
  };
  const now = new Date('2026-09-22T12:00:00.000Z');
  let service: CarritoService;

  const cartRecord = (
    details: Array<{
      id: number;
      cantidad: number;
      varianteProducto: {
        id: number;
        sku: string;
        estado: string;
        producto: {
          id: number;
          nombre: string;
          imagenUrl: string | null;
          precio: Prisma.Decimal;
          estado: string;
          categoria: { estado: string };
        };
        talla: { id: number; nombre: string; estado: string };
        color: {
          id: number;
          nombre: string;
          codigoHex: string;
          estado: string;
        };
      };
    }> = [],
    branch: { id: number; nombre: string; ubicacion: string; estado: string } | null = null,
  ) => ({
    id: 1,
    creadoEn: now,
    actualizadoEn: now,
    sucursal: branch,
    detalles: details,
  });

  const detailRecord = (quantity = 2) => ({
    id: 7,
    cantidad: quantity,
    varianteProducto: {
      id: 12,
      sku: 'POL-NEG-M',
      estado: 'ACTIVO',
      producto: {
        id: 4,
        nombre: 'Polera',
        imagenUrl: '/uploads/productos/polera.webp',
        precio: new Prisma.Decimal('129.90'),
        estado: 'ACTIVO',
        categoria: { estado: 'ACTIVO' },
      },
      talla: { id: 2, nombre: 'M', estado: 'ACTIVO' },
      color: {
        id: 3,
        nombre: 'Negro',
        codigoHex: '#000000',
        estado: 'ACTIVO',
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.$executeRaw.mockResolvedValue(1);
    transaction.carrito.update.mockResolvedValue({ id: 1 });
    transaction.detalleCarrito.upsert.mockResolvedValue({ id: 7 });
    inventarioService.ensureAvailability.mockResolvedValue(undefined);
    inventarioService.getAvailableQuantities.mockResolvedValue(new Map());
    service = new CarritoService(
      prisma as unknown as PrismaService,
      variantesService as unknown as VariantesService,
      inventarioService as unknown as InventarioService,
    );
  });

  it('obtiene o crea un carrito vacío sin inventar una sucursal', async () => {
    transaction.$queryRaw.mockResolvedValue([{ id: 1, sucursalId: null }]);
    transaction.carrito.findUniqueOrThrow.mockResolvedValue(cartRecord());

    await expect(service.get(customer)).resolves.toMatchObject({
      id: 1,
      sucursal: null,
      detalles: [],
      total: 0,
    });
    expect(transaction.$executeRaw).toHaveBeenCalledOnce();
    expect(inventarioService.getAvailableQuantities).not.toHaveBeenCalled();
  });

  it('selecciona una sucursal activa sin modificar los detalles', async () => {
    const branch = {
      id: 3,
      nombre: 'Central',
      ubicacion: 'Centro',
      estado: 'ACTIVO',
    };
    transaction.$queryRaw
      .mockResolvedValueOnce([{ id: 1, sucursalId: null }])
      .mockResolvedValueOnce([branch]);
    transaction.carrito.findUniqueOrThrow.mockResolvedValue(
      cartRecord([], branch),
    );

    const result = await service.selectBranch({ sucursalId: 3 }, customer);

    expect(transaction.carrito.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { sucursalId: 3 },
    });
    expect(result).toMatchObject({ sucursal: branch, detalles: [] });
  });

  it('incrementa una variante existente y valida la cantidad acumulada', async () => {
    const branch = {
      id: 3,
      nombre: 'Central',
      ubicacion: 'Centro',
      estado: 'ACTIVO',
    };
    transaction.$queryRaw
      .mockResolvedValueOnce([{ id: 1, sucursalId: 3 }])
      .mockResolvedValueOnce([branch]);
    variantesService.resolveActiveForPurchase.mockResolvedValue([
      {
        id: 12,
        sku: 'POL-NEG-M',
        precio: new Prisma.Decimal('129.90'),
        producto: { id: 4, nombre: 'Polera' },
        talla: { id: 2, nombre: 'M' },
        color: { id: 3, nombre: 'Negro', codigoHex: '#000000' },
      },
    ]);
    transaction.detalleCarrito.findUnique.mockResolvedValue({
      id: 7,
      cantidad: 1,
    });
    transaction.carrito.findUniqueOrThrow.mockResolvedValue(
      cartRecord([detailRecord(3)], branch),
    );
    inventarioService.getAvailableQuantities.mockResolvedValue(
      new Map([[12, 5]]),
    );

    const result = await service.addDetail(
      { varianteProductoId: 12, cantidad: 2 },
      customer,
    );

    expect(inventarioService.ensureAvailability).toHaveBeenCalledWith(
      transaction,
      3,
      [{ varianteProductoId: 12, cantidad: 3 }],
    );
    expect(transaction.detalleCarrito.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { cantidad: 3 } }),
    );
    expect(result).toMatchObject({
      total: 389.7,
      detalles: [
        {
          cantidad: 3,
          precioUnitario: 129.9,
          subtotal: 389.7,
          cantidadDisponible: 5,
          comercializable: true,
          disponible: true,
        },
      ],
    });
  });

  it('mantiene un artículo y lo marca indisponible cuando cambia el stock', async () => {
    const branch = {
      id: 3,
      nombre: 'Central',
      ubicacion: 'Centro',
      estado: 'ACTIVO',
    };
    transaction.$queryRaw.mockResolvedValue([{ id: 1, sucursalId: 3 }]);
    transaction.carrito.findUniqueOrThrow.mockResolvedValue(
      cartRecord([detailRecord(2)], branch),
    );
    inventarioService.getAvailableQuantities.mockResolvedValue(
      new Map([[12, 1]]),
    );

    const result = await service.get(customer);

    expect(result.detalles).toHaveLength(1);
    expect(result.detalles[0]).toMatchObject({
      cantidad: 2,
      cantidadDisponible: 1,
      comercializable: true,
      disponible: false,
    });
  });

  it('rechaza agregar artículos mientras no exista una sucursal seleccionada', async () => {
    transaction.$queryRaw.mockResolvedValue([{ id: 1, sucursalId: null }]);

    await expect(
      service.addDetail(
        { varianteProductoId: 12, cantidad: 1 },
        customer,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(variantesService.resolveActiveForPurchase).not.toHaveBeenCalled();
  });

  it('no permite que otro usuario elimine detalles ajenos', async () => {
    transaction.$queryRaw.mockResolvedValue([{ id: 1, sucursalId: 3 }]);
    transaction.detalleCarrito.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.removeDetail(99, customer)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(transaction.carrito.update).not.toHaveBeenCalled();
  });

  it('rechaza actores autenticados que no sean clientes', async () => {
    await expect(
      service.get({ ...customer, role: 'ADMINISTRADOR' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
