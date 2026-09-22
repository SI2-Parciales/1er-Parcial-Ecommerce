import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { SucursalesService } from './sucursales.service.js';

describe('SucursalesService personal', () => {
  const transaction = {
    $queryRaw: vi.fn(),
    sucursal: { findUnique: vi.fn() },
    usuario: { findUnique: vi.fn(), update: vi.fn() },
  };
  const prisma = {
    sucursal: { findUnique: vi.fn() },
    usuario: { findMany: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  let service: SucursalesService;

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.$queryRaw.mockResolvedValue([{ id: 1 }]);
    service = new SucursalesService(prisma as unknown as PrismaService);
  });

  it('lista solo los datos públicos del personal', async () => {
    prisma.sucursal.findUnique.mockResolvedValue({ id: 1 });
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 7,
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@example.com',
        rol: { nombre: 'CAJERO' },
      },
    ]);

    await expect(service.findPersonal(1)).resolves.toEqual([
      {
        id: 7,
        nombre: 'Ana',
        apellido: 'Pérez',
        email: 'ana@example.com',
        rol: 'CAJERO',
      },
    ]);
    expect(JSON.stringify(await service.findPersonal(1))).not.toMatch(
      /password|hash/i,
    );
  });

  it('asigna un usuario elegible sin modificar su rol', async () => {
    transaction.sucursal.findUnique.mockResolvedValue({ estado: 'ACTIVO' });
    transaction.usuario.findUnique.mockResolvedValue({
      id: 7,
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      estado: 'ACTIVO',
      sucursalId: null,
      rol: { nombre: 'CAJERO' },
    });
    transaction.usuario.update.mockResolvedValue({
      id: 7,
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      rol: { nombre: 'CAJERO' },
    });

    await expect(service.assignPersonal(1, { usuarioId: 7 })).resolves.toEqual({
      id: 7,
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      rol: 'CAJERO',
    });
    expect(transaction.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { sucursalId: 1 } }),
    );
  });

  it('rechaza una asignación repetida, clientes y destinos inactivos', async () => {
    transaction.sucursal.findUnique.mockResolvedValue({ estado: 'ACTIVO' });
    transaction.usuario.findUnique.mockResolvedValue({
      id: 7,
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@example.com',
      estado: 'ACTIVO',
      sucursalId: 1,
      rol: { nombre: 'CAJERO' },
    });
    await expect(
      service.assignPersonal(1, { usuarioId: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);

    transaction.usuario.findUnique.mockResolvedValue({
      id: 8,
      estado: 'ACTIVO',
      sucursalId: null,
      rol: { nombre: 'CLIENTE' },
    });
    await expect(
      service.assignPersonal(1, { usuarioId: 8 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    transaction.sucursal.findUnique.mockResolvedValue({ estado: 'INACTIVO' });
    await expect(
      service.assignPersonal(1, { usuarioId: 7 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.usuario.update).not.toHaveBeenCalled();
  });
});
