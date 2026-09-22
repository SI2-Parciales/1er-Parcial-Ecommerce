import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventarioService } from './inventario.service.js';

describe('InventarioService', () => {
  const transaction = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    inventario: { update: vi.fn() },
  };
  const prisma = {
    $queryRaw: vi.fn(),
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
    sucursal: { findUnique: vi.fn(), count: vi.fn() },
    varianteProducto: { findUnique: vi.fn() },
  };
  let service: InventarioService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new InventarioService(prisma as unknown as PrismaService);
  });

  it('calcula disponibilidad y totales consolidados sin usar números BigInt en la respuesta', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          inventarioId: null,
          varianteId: 8,
          sku: 'CHAQ-NEG-M',
          varianteEstado: 'ACTIVO',
          productoId: 2,
          productoNombre: 'Chaqueta',
          productoEstado: 'ACTIVO',
          tallaId: 3,
          tallaNombre: 'M',
          tallaEstado: 'ACTIVO',
          colorId: 4,
          colorNombre: 'Negro',
          colorCodigoHex: '#000000',
          colorEstado: 'ACTIVO',
          cantidadFisica: 18n,
          cantidadReservada: 3n,
          cantidadNoDisponible: 2n,
          cantidadDisponible: 13n,
          agotado: false,
        },
      ])
      .mockResolvedValueOnce([{ total: 1n }]);

    const result = await service.findAll({ page: 1, limit: 20 });

    expect(result.meta).toEqual({ page: 1, limit: 20, total: 1 });
    expect(result.data[0]).toMatchObject({
      variante: { id: 8, sku: 'CHAQ-NEG-M' },
      cantidadFisica: 18,
      cantidadReservada: 3,
      cantidadNoDisponible: 2,
      cantidadDisponible: 13,
      agotado: false,
    });
  });

  it('conserva variantes sin inventario como agotadas y valida la sucursal', async () => {
    prisma.sucursal.findUnique.mockResolvedValue({ id: 6 });
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          inventarioId: null,
          varianteId: 9,
          sku: 'CHAQ-AZU-L',
          varianteEstado: 'ACTIVO',
          productoId: 2,
          productoNombre: 'Chaqueta',
          productoEstado: 'ACTIVO',
          tallaId: 5,
          tallaNombre: 'L',
          tallaEstado: 'ACTIVO',
          colorId: 7,
          colorNombre: 'Azul',
          colorCodigoHex: '#0000FF',
          colorEstado: 'ACTIVO',
          cantidadFisica: 0n,
          cantidadReservada: 0n,
          cantidadNoDisponible: 0n,
          cantidadDisponible: 0n,
          agotado: true,
        },
      ])
      .mockResolvedValueOnce([{ total: 1n }]);

    const result = await service.findAll({
      page: 1,
      limit: 20,
      sucursalId: 6,
      agotado: true,
    });

    expect(prisma.sucursal.findUnique).toHaveBeenCalledWith({
      where: { id: 6 },
      select: { id: true },
    });
    expect(result.data[0]).toMatchObject({
      cantidadFisica: 0,
      cantidadReservada: 0,
      cantidadNoDisponible: 0,
      cantidadDisponible: 0,
      agotado: true,
    });
  });

  it('responde 404 cuando el filtro usa una sucursal inexistente', async () => {
    prisma.sucursal.findUnique.mockResolvedValue(null);

    await expect(
      service.findAll({ page: 1, limit: 20, sucursalId: 999 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('devuelve totales y todas las sucursales, incluyendo cantidades cero', async () => {
    prisma.varianteProducto.findUnique.mockResolvedValue({
      id: 8,
      sku: 'CHAQ-NEG-M',
      estado: 'ACTIVO',
      producto: { id: 2, nombre: 'Chaqueta', estado: 'ACTIVO' },
      talla: { id: 3, nombre: 'M', estado: 'ACTIVO' },
      color: {
        id: 4,
        nombre: 'Negro',
        codigoHex: '#000000',
        estado: 'ACTIVO',
      },
    });
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          inventarioId: null,
          id: 1,
          nombre: 'Central',
          ubicacion: 'Centro',
          estado: 'ACTIVO',
          cantidadFisica: 0,
          cantidadReservada: 0,
          cantidadNoDisponible: 0,
          cantidadDisponible: 0,
          agotado: true,
          actualizadoEn: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          cantidadFisica: 10n,
          cantidadReservada: 3n,
          cantidadNoDisponible: 2n,
          cantidadDisponible: 5n,
          agotado: false,
        },
      ]);
    prisma.sucursal.count.mockResolvedValue(1);

    const result = await service.findVariant(8, { page: 1, limit: 20 });

    expect(result.totales).toEqual({
      cantidadFisica: 10,
      cantidadReservada: 3,
      cantidadNoDisponible: 2,
      cantidadDisponible: 5,
      agotado: false,
    });
    expect(result.sucursales.data[0]).toMatchObject({
      id: 1,
      cantidadFisica: 0,
      cantidadDisponible: 0,
      agotado: true,
      actualizadoEn: null,
    });
  });

  it('responde 404 al consultar una variante inexistente', async () => {
    prisma.varianteProducto.findUnique.mockResolvedValue(null);

    await expect(
      service.findVariant(999, { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('devuelve solo disponibilidad pública en sucursales activas', async () => {
    prisma.varianteProducto.findUnique.mockResolvedValue({
      id: 8,
      sku: 'CHAQ-NEG-M',
      estado: 'ACTIVO',
      producto: {
        id: 2,
        nombre: 'Chaqueta',
        estado: 'ACTIVO',
        categoria: { estado: 'ACTIVO' },
      },
      talla: { id: 3, nombre: 'M', estado: 'ACTIVO' },
      color: {
        id: 4,
        nombre: 'Negro',
        codigoHex: '#000000',
        estado: 'ACTIVO',
      },
    });
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 1,
        nombre: 'Central',
        ubicacion: 'Centro',
        cantidadDisponible: 5n,
        agotado: false,
      },
      {
        id: 2,
        nombre: 'Sur',
        ubicacion: 'Sur',
        cantidadDisponible: 0n,
        agotado: true,
      },
    ]);
    prisma.sucursal.count.mockResolvedValue(2);

    const result = await service.findPublicVariantAvailability(8, {
      page: 1,
      limit: 20,
    });

    expect(prisma.sucursal.count).toHaveBeenCalledWith({
      where: { estado: 'ACTIVO' },
    });
    expect(result).toEqual({
      variante: {
        id: 8,
        sku: 'CHAQ-NEG-M',
        producto: { id: 2, nombre: 'Chaqueta' },
        talla: { id: 3, nombre: 'M' },
        color: { id: 4, nombre: 'Negro', codigoHex: '#000000' },
      },
      sucursales: {
        data: [
          {
            id: 1,
            nombre: 'Central',
            ubicacion: 'Centro',
            cantidadDisponible: 5,
            agotado: false,
          },
          {
            id: 2,
            nombre: 'Sur',
            ubicacion: 'Sur',
            cantidadDisponible: 0,
            agotado: true,
          },
        ],
        meta: { page: 1, limit: 20, total: 2 },
      },
    });
    expect(result.sucursales.data[0]).not.toHaveProperty('cantidadFisica');
    expect(result.sucursales.data[0]).not.toHaveProperty('inventarioId');
  });

  it('oculta una variante inactiva de la consulta pública', async () => {
    prisma.varianteProducto.findUnique.mockResolvedValue({
      id: 8,
      sku: 'CHAQ-NEG-M',
      estado: 'INACTIVO',
      producto: {
        id: 2,
        nombre: 'Chaqueta',
        estado: 'ACTIVO',
        categoria: { estado: 'ACTIVO' },
      },
      talla: { id: 3, nombre: 'M', estado: 'ACTIVO' },
      color: {
        id: 4,
        nombre: 'Negro',
        codigoHex: '#000000',
        estado: 'ACTIVO',
      },
    });

    await expect(
      service.findPublicVariantAvailability(8, { page: 1, limit: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.sucursal.count).not.toHaveBeenCalled();
  });

  it('permite al encargado apartar unidades de su propia sucursal sin alterar otras cantidades', async () => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 20,
          estado: 'ACTIVO',
          sucursalId: 4,
          role: 'ENCARGADO_SUCURSAL',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 30,
          sucursalId: 4,
          cantidadFisica: 10,
          cantidadReservada: 2,
          cantidadNoDisponible: 0,
        },
      ]);
    transaction.inventario.update.mockResolvedValue({
      id: 30,
      cantidadFisica: 10,
      cantidadReservada: 2,
      cantidadNoDisponible: 3,
      actualizadoEn: new Date('2026-09-21T12:00:00.000Z'),
      sucursal: {
        id: 4,
        nombre: 'Central',
        ubicacion: 'Centro',
        estado: 'ACTIVO',
      },
      varianteProducto: {
        id: 8,
        sku: 'CHAQ-NEG-M',
        estado: 'ACTIVO',
        producto: { id: 2, nombre: 'Chaqueta', estado: 'ACTIVO' },
        talla: { id: 3, nombre: 'M', estado: 'ACTIVO' },
        color: {
          id: 4,
          nombre: 'Negro',
          codigoHex: '#000000',
          estado: 'ACTIVO',
        },
      },
    });

    const result = await service.updateAvailability(
      30,
      { cantidadNoDisponible: 3, cantidadNoDisponibleEsperada: 0 },
      {
        id: 20,
        email: 'manager@test.com',
        nombre: 'Manager',
        role: 'ENCARGADO_SUCURSAL',
      },
    );

    expect(result).toMatchObject({
      inventarioId: 30,
      cantidadFisica: 10,
      cantidadReservada: 2,
      cantidadNoDisponible: 3,
      cantidadDisponible: 5,
      agotado: false,
    });
    expect(transaction.inventario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 30 },
        data: { cantidadNoDisponible: 3 },
      }),
    );
  });

  it('impide que un encargado modifique otra sucursal', async () => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 20,
          estado: 'ACTIVO',
          sucursalId: 4,
          role: 'ENCARGADO_SUCURSAL',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 31,
          sucursalId: 5,
          cantidadFisica: 10,
          cantidadReservada: 0,
          cantidadNoDisponible: 0,
        },
      ]);

    await expect(
      service.updateAvailability(
        31,
        { cantidadNoDisponible: 1, cantidadNoDisponibleEsperada: 0 },
        {
          id: 20,
          email: 'manager@test.com',
          nombre: 'Manager',
          role: 'ENCARGADO_SUCURSAL',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.inventario.update).not.toHaveBeenCalled();
  });

  it('detecta un valor esperado obsoleto como conflicto', async () => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 20,
          estado: 'ACTIVO',
          sucursalId: null,
          role: 'ADMINISTRADOR',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 31,
          sucursalId: 5,
          cantidadFisica: 10,
          cantidadReservada: 2,
          cantidadNoDisponible: 3,
        },
      ]);

    await expect(
      service.updateAvailability(
        31,
        { cantidadNoDisponible: 4, cantidadNoDisponibleEsperada: 0 },
        {
          id: 20,
          email: 'admin@test.com',
          nombre: 'Admin',
          role: 'ADMINISTRADOR',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza apartar más unidades que las disponibles físicamente', async () => {
    transaction.$queryRaw
      .mockResolvedValueOnce([
        {
          id: 20,
          estado: 'ACTIVO',
          sucursalId: null,
          role: 'ADMINISTRADOR',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 31,
          sucursalId: 5,
          cantidadFisica: 10,
          cantidadReservada: 2,
          cantidadNoDisponible: 0,
        },
      ]);

    await expect(
      service.updateAvailability(
        31,
        { cantidadNoDisponible: 9, cantidadNoDisponibleEsperada: 0 },
        {
          id: 20,
          email: 'admin@test.com',
          nombre: 'Admin',
          role: 'ADMINISTRADOR',
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea de forma segura un inventario inexistente antes de aplicar una entrada', async () => {
    transaction.$executeRaw.mockResolvedValue(1);
    transaction.$queryRaw.mockResolvedValue([
      {
        id: 30,
        sucursalId: 4,
        cantidadFisica: 0,
        cantidadReservada: 0,
        cantidadNoDisponible: 0,
      },
    ]);
    transaction.inventario.update.mockResolvedValue({
      id: 30,
      cantidadFisica: 5,
      cantidadReservada: 0,
      cantidadNoDisponible: 2,
      actualizadoEn: new Date('2026-09-21T12:00:00.000Z'),
      sucursal: {
        id: 4,
        nombre: 'Central',
        ubicacion: 'Centro',
        estado: 'ACTIVO',
      },
      varianteProducto: {
        id: 8,
        sku: 'CHAQ-NEG-M',
        estado: 'ACTIVO',
        producto: { id: 2, nombre: 'Chaqueta', estado: 'ACTIVO' },
        talla: { id: 3, nombre: 'M', estado: 'ACTIVO' },
        color: {
          id: 4,
          nombre: 'Negro',
          codigoHex: '#000000',
          estado: 'ACTIVO',
        },
      },
    });

    const result = await service.applyStockEntry(
      transaction as never,
      4,
      8,
      5,
      2,
    );

    expect(transaction.$executeRaw).toHaveBeenCalledOnce();
    expect(transaction.inventario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 30 },
        data: {
          cantidadFisica: { increment: 5 },
          cantidadNoDisponible: { increment: 2 },
        },
      }),
    );
    expect(result).toMatchObject({
      cantidadFisica: 5,
      cantidadNoDisponible: 2,
      cantidadDisponible: 3,
    });
  });

  it('transfiere solo disponibilidad y devuelve ambos inventarios actualizados', async () => {
    transaction.$executeRaw.mockResolvedValue(0);
    transaction.$queryRaw.mockResolvedValue([
      {
        id: 30,
        sucursalId: 2,
        cantidadFisica: 10,
        cantidadReservada: 2,
        cantidadNoDisponible: 3,
      },
      {
        id: 31,
        sucursalId: 5,
        cantidadFisica: 1,
        cantidadReservada: 0,
        cantidadNoDisponible: 0,
      },
    ]);
    const record = (id: number, branchId: number, physical: number) => ({
      id,
      cantidadFisica: physical,
      cantidadReservada: branchId === 2 ? 2 : 0,
      cantidadNoDisponible: branchId === 2 ? 3 : 0,
      actualizadoEn: new Date('2026-09-21T12:00:00.000Z'),
      sucursal: {
        id: branchId,
        nombre: `Sucursal ${branchId}`,
        ubicacion: 'Ubicación',
        estado: 'ACTIVO',
      },
      varianteProducto: {
        id: 8,
        sku: 'CHAQ-NEG-M',
        estado: 'ACTIVO',
        producto: { id: 2, nombre: 'Chaqueta', estado: 'ACTIVO' },
        talla: { id: 3, nombre: 'M', estado: 'ACTIVO' },
        color: {
          id: 4,
          nombre: 'Negro',
          codigoHex: '#000000',
          estado: 'ACTIVO',
        },
      },
    });
    transaction.inventario.update
      .mockResolvedValueOnce(record(30, 2, 8))
      .mockResolvedValueOnce(record(31, 5, 3));

    const result = await service.applyTransfer(
      transaction as never,
      8,
      2,
      5,
      2,
    );

    expect(result.origin).toMatchObject({
      cantidadFisica: 8,
      cantidadReservada: 2,
      cantidadNoDisponible: 3,
      cantidadDisponible: 3,
    });
    expect(result.destination).toMatchObject({
      cantidadFisica: 3,
      cantidadDisponible: 3,
    });
  });

  it('protege las unidades reservadas y apartadas durante una merma disponible', async () => {
    transaction.$queryRaw.mockResolvedValue([
      {
        id: 30,
        sucursalId: 2,
        cantidadFisica: 10,
        cantidadReservada: 2,
        cantidadNoDisponible: 3,
      },
    ]);

    await expect(
      service.applyShrinkage(transaction as never, 2, 8, 6, 'DISPONIBLE'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.inventario.update).not.toHaveBeenCalled();
  });

  it('valida disponibilidad local sin modificar el inventario', async () => {
    transaction.$queryRaw.mockResolvedValue([
      {
        id: 30,
        sucursalId: 2,
        varianteProductoId: 8,
        cantidadFisica: 10,
        cantidadReservada: 2,
        cantidadNoDisponible: 3,
      },
    ]);

    await expect(
      service.ensureAvailability(transaction as never, 2, [
        { varianteProductoId: 8, cantidad: 5 },
      ]),
    ).resolves.toBeUndefined();
    expect(transaction.inventario.update).not.toHaveBeenCalled();

    await expect(
      service.ensureAvailability(transaction as never, 2, [
        { varianteProductoId: 8, cantidad: 6 },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.ensureAvailability(transaction as never, 2, [
        { varianteProductoId: 999, cantidad: 1 },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
