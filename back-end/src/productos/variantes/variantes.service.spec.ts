import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { VariantesService } from './variantes.service.js';

describe('VariantesService', () => {
  const transaction = {
    $queryRaw: vi.fn(),
    producto: { findUnique: vi.fn() },
    talla: { findUnique: vi.fn() },
    color: { findUnique: vi.fn() },
    varianteProducto: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const prisma = {
    producto: { findUnique: vi.fn() },
    varianteProducto: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  let service: VariantesService;

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.$queryRaw.mockResolvedValue([{ id: 1 }]);
    transaction.producto.findUnique.mockResolvedValue({ estado: 'ACTIVO' });
    transaction.talla.findUnique.mockResolvedValue({ estado: 'ACTIVO' });
    transaction.color.findUnique.mockResolvedValue({ estado: 'ACTIVO' });
    transaction.varianteProducto.findFirst.mockResolvedValue(null);
    service = new VariantesService(prisma as unknown as PrismaService);
  });

  it('normaliza el SKU y crea una combinación activa', async () => {
    transaction.varianteProducto.create.mockResolvedValue({
      id: 1,
      sku: 'POL-001',
      estado: 'ACTIVO',
      talla: { id: 1, nombre: 'M', estado: 'ACTIVO' },
      color: { id: 1, nombre: 'Negro', codigoHex: '#000000', estado: 'ACTIVO' },
    });
    await service.create(1, { tallaId: 1, colorId: 1, sku: ' pol - 001 ' });
    expect(transaction.varianteProducto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sku: 'POL-001', productoId: 1 }),
      }),
    );
  });

  it('rechaza SKU y combinación duplicados', async () => {
    transaction.varianteProducto.findFirst
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce(null);
    await expect(
      service.create(1, { tallaId: 1, colorId: 1, sku: 'POL-001' }),
    ).rejects.toBeInstanceOf(ConflictException);

    transaction.varianteProducto.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 3 });
    await expect(
      service.create(1, { tallaId: 1, colorId: 1, sku: 'POL-002' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza modificaciones si el producto está inactivo y valida pertenencia', async () => {
    transaction.producto.findUnique.mockResolvedValue({ estado: 'INACTIVO' });
    await expect(
      service.update(1, 4, { sku: 'POL-004' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.producto.findUnique.mockResolvedValue({
      estado: 'ACTIVO',
      categoria: { estado: 'ACTIVO' },
    });
    prisma.varianteProducto.findFirst.mockResolvedValue(null);
    await expect(service.findById(1, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
