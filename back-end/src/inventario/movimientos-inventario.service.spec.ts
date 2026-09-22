import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { TipoMovimiento } from '@prisma/client';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventarioService } from './inventario.service.js';
import { MovimientosInventarioService } from './movimientos-inventario.service.js';

describe('MovimientosInventarioService', () => {
  const transaction = {
    $queryRaw: vi.fn(),
    movimientoInventario: {
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    movimientoInventario: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    usuario: { findUnique: vi.fn() },
    sucursal: { findUnique: vi.fn() },
  };
  const inventario = {
    applyStockEntry: vi.fn(),
    applyTransfer: vi.fn(),
    applyShrinkage: vi.fn(),
  };
  const actor = {
    id: 20,
    email: 'manager@test.com',
    nombre: 'Ana',
    role: 'ENCARGADO_SUCURSAL',
  };
  const key = '550e8400-e29b-41d4-a716-446655440000';
  let service: MovimientosInventarioService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MovimientosInventarioService(
      prisma as unknown as PrismaService,
      inventario as unknown as InventarioService,
    );
    prisma.movimientoInventario.findUnique.mockResolvedValue(null);
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 20,
          nombre: 'Ana',
          apellido: 'Pérez',
          estado: 'ACTIVO',
          sucursalId: 2,
          role: 'ENCARGADO_SUCURSAL',
        },
      ])
      .mockResolvedValueOnce([{ id: 15, sku: 'CHAQ-NEG-M', estado: 'ACTIVO' }])
      .mockResolvedValueOnce([{ id: 2, nombre: 'Central', estado: 'ACTIVO' }]);
    transaction.movimientoInventario.create.mockResolvedValue({
      id: 80,
      fecha: new Date('2026-09-21T12:00:00.000Z'),
    });
    transaction.movimientoInventario.update.mockResolvedValue({ id: 80 });
  });

  it('registra una recepción con el usuario autenticado y conserva el resultado idempotente', async () => {
    inventario.applyStockEntry.mockResolvedValue({
      inventarioId: 3,
      cantidadFisica: 12,
    });

    const result = await service.create(
      {
        tipo: TipoMovimiento.RECEPCION,
        varianteProductoId: 15,
        cantidad: 2,
        sucursalDestinoId: 2,
        observacion: ' Mercadería recibida ',
      },
      actor,
      key,
    );

    expect(inventario.applyStockEntry).toHaveBeenCalledWith(
      transaction,
      2,
      15,
      2,
    );
    expect(transaction.movimientoInventario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usuarioId: 20,
          observacion: 'Mercadería recibida',
          claveIdempotencia: key,
        }),
      }),
    );
    expect(result).toMatchObject({
      movimiento: { id: 80, usuario: { id: 20 }, sucursalDestino: { id: 2 } },
      inventarioOrigen: null,
      inventarioDestino: { cantidadFisica: 12 },
    });
    expect(transaction.movimientoInventario.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 80 } }),
    );
  });

  it('rechaza relaciones y campos especiales incompatibles antes de abrir una transacción', async () => {
    await expect(
      service.create(
        {
          tipo: TipoMovimiento.TRANSFERENCIA,
          varianteProductoId: 15,
          cantidad: 1,
          sucursalOrigenId: 2,
          sucursalDestinoId: 2,
        },
        actor,
        key,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        {
          tipo: TipoMovimiento.DEVOLUCION,
          varianteProductoId: 15,
          cantidad: 1,
          cantidadNoDisponible: 2,
          sucursalDestinoId: 2,
        },
        actor,
        key,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('exige justificación y grupo de origen para una merma', async () => {
    await expect(
      service.create(
        {
          tipo: TipoMovimiento.MERMA,
          varianteProductoId: 15,
          cantidad: 1,
          sucursalOrigenId: 2,
        },
        actor,
        key,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('impide que el encargado transfiera desde otra sucursal', async () => {
    transaction.$queryRaw.mockReset();
    transaction.$queryRaw.mockResolvedValueOnce([
      {
        id: 20,
        nombre: 'Ana',
        apellido: 'Pérez',
        estado: 'ACTIVO',
        sucursalId: 2,
        role: 'ENCARGADO_SUCURSAL',
      },
    ]);

    await expect(
      service.create(
        {
          tipo: TipoMovimiento.TRANSFERENCIA,
          varianteProductoId: 15,
          cantidad: 1,
          sucursalOrigenId: 3,
          sucursalDestinoId: 2,
        },
        actor,
        key,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(inventario.applyTransfer).not.toHaveBeenCalled();
  });

  it('devuelve exactamente el resultado anterior sin volver a modificar inventario', async () => {
    const storedResult = {
      movimiento: { id: 80 },
      inventarioOrigen: null,
      inventarioDestino: { cantidadFisica: 12 },
    };
    const requestHash = createHash('sha256')
      .update(
        JSON.stringify({
          userId: 20,
          tipo: TipoMovimiento.RECEPCION,
          varianteProductoId: 15,
          cantidad: 2,
          sucursalOrigenId: null,
          sucursalDestinoId: 2,
          observacion: 'Mercadería recibida',
          cantidadNoDisponible: null,
          origenUnidades: null,
        }),
      )
      .digest('hex');
    prisma.movimientoInventario.findUnique.mockResolvedValue({
      hashSolicitud: requestHash,
      resultadoIdempotente: storedResult,
    });

    const result = await service.create(
      {
        tipo: TipoMovimiento.RECEPCION,
        varianteProductoId: 15,
        cantidad: 2,
        sucursalDestinoId: 2,
        observacion: 'Mercadería recibida',
      },
      actor,
      key,
    );

    expect(result).toEqual(storedResult);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(inventario.applyStockEntry).not.toHaveBeenCalled();
  });

  it('rechaza reutilizar una clave idempotente con otro cuerpo', async () => {
    prisma.movimientoInventario.findUnique.mockResolvedValue({
      hashSolicitud: 'otro-hash',
      resultadoIdempotente: {},
    });

    await expect(
      service.create(
        {
          tipo: TipoMovimiento.RECEPCION,
          varianteProductoId: 15,
          cantidad: 2,
          sucursalDestinoId: 2,
        },
        actor,
        key,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('limita el historial del encargado a su sucursal', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id: 20,
      estado: 'ACTIVO',
      sucursalId: 2,
      rol: { nombre: 'ENCARGADO_SUCURSAL' },
    });
    prisma.movimientoInventario.findMany.mockResolvedValue([]);
    prisma.movimientoInventario.count.mockResolvedValue(0);

    const result = await service.findAll({ page: 1, limit: 20 }, actor);

    expect(result.meta).toEqual({ page: 1, limit: 20, total: 0 });
    expect(prisma.movimientoInventario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ sucursalOrigenId: 2 }, { sucursalDestinoId: 2 }],
        },
      }),
    );
  });
});
