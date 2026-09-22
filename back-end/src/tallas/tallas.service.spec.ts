import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { TallasService } from './tallas.service.js';

describe('TallasService', () => {
  const prisma = {
    talla: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  let service: TallasService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.talla.findFirst.mockResolvedValue(null);
    service = new TallasService(prisma as unknown as PrismaService);
  });

  it('crea una talla normalizada y la desactiva lógicamente', async () => {
    prisma.talla.create.mockResolvedValue({
      id: 1,
      nombre: 'M',
      estado: 'ACTIVO',
    });
    await service.create({ nombre: ' M ' });
    expect(prisma.talla.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nombre: 'M', estado: 'ACTIVO' } }),
    );

    prisma.talla.findUnique.mockResolvedValue({
      id: 1,
      nombre: 'M',
      estado: 'ACTIVO',
    });
    prisma.talla.update.mockResolvedValue({
      id: 1,
      nombre: 'M',
      estado: 'INACTIVO',
    });
    await expect(service.deactivate(1)).resolves.toMatchObject({
      message: 'Talla desactivada.',
      talla: { estado: 'INACTIVO' },
    });
  });

  it('convierte una colisión concurrente de la base de datos en 409', async () => {
    prisma.talla.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.create({ nombre: 'M' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
