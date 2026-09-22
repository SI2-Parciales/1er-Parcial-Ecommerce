import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const managedUser = {
    id: 2,
    nombre: 'Juan',
    apellido: 'Perez',
    telefono: '73168919',
    email: 'juan@example.com',
    estado: 'ACTIVO',
    sucursalId: null,
    rol: { id: 2, nombre: 'CAJERO', descripcion: 'Cajero' },
  };
  const transaction = {
    $queryRaw: vi.fn(),
    usuario: {
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    rol: { findUnique: vi.fn() },
  };
  const prisma = {
    usuario: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.$queryRaw.mockResolvedValue([{ id: 4 }]);
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('lista únicamente datos públicos y los metadatos de paginación', async () => {
    prisma.usuario.findMany.mockResolvedValue([managedUser]);
    prisma.usuario.count.mockResolvedValue(1);

    const result = await service.findAll({ page: 1, limit: 20 });

    expect(result).toEqual({
      data: [managedUser],
      meta: { page: 1, limit: 20, total: 1 },
    });
    expect(JSON.stringify(result)).not.toMatch(/password|hash/i);
  });

  it('normaliza el email y cambia el rol dentro de la transacción', async () => {
    transaction.usuario.findUnique.mockResolvedValue({
      id: 2,
      estado: 'ACTIVO',
      rolId: 1,
    });
    transaction.rol.findUnique.mockResolvedValue({ id: 2, nombre: 'CAJERO' });
    transaction.usuario.update.mockResolvedValue(managedUser);

    const result = await service.update(2, {
      email: ' JUAN@EXAMPLE.COM ',
      rolId: 2,
    });

    expect(transaction.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { email: 'juan@example.com', rolId: 2 },
      }),
    );
    expect(result).toEqual(managedUser);
    expect(JSON.stringify(result)).not.toMatch(/password|hash/i);
  });

  it('rechaza una actualización que quitaría al último administrador activo', async () => {
    transaction.usuario.findUnique.mockResolvedValue({
      id: 4,
      estado: 'ACTIVO',
      rolId: 4,
    });
    transaction.usuario.count.mockResolvedValue(0);

    await expect(
      service.update(4, { estado: 'INACTIVO' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.usuario.update).not.toHaveBeenCalled();
  });

  it('rechaza un PATCH vacío', async () => {
    await expect(service.update(2, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('convierte una colisión de email de PostgreSQL en conflicto HTTP', async () => {
    transaction.usuario.findUnique.mockResolvedValue({
      id: 2,
      estado: 'ACTIVO',
      rolId: 1,
    });
    transaction.usuario.update.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.update(2, { email: 'existente@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
