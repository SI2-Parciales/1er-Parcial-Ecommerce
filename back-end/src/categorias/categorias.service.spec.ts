import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoriasService } from './categorias.service.js';

describe('CategoriasService', () => {
  const prisma = {
    categoria: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  let service: CategoriasService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.categoria.findFirst.mockResolvedValue(null);
    service = new CategoriasService(prisma as unknown as PrismaService);
  });

  it('normaliza y crea una categoría activa', async () => {
    prisma.categoria.create.mockResolvedValue({
      id: 1,
      nombre: 'Ropa deportiva',
      descripcion: 'Prendas de deporte',
      estado: 'ACTIVO',
    });

    await expect(
      service.create({
        nombre: '  Ropa   deportiva  ',
        descripcion: ' Prendas  de deporte ',
      }),
    ).resolves.toMatchObject({ nombre: 'Ropa deportiva', estado: 'ACTIVO' });
    expect(prisma.categoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nombre: 'Ropa deportiva',
          descripcion: 'Prendas de deporte',
          estado: 'ACTIVO',
        }),
      }),
    );
  });

  it('rechaza nombres duplicados sin distinguir mayúsculas', async () => {
    prisma.categoria.findFirst.mockResolvedValue({ id: 2 });
    await expect(
      service.create({ nombre: 'ROPA', descripcion: undefined }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('filtra inactivos por defecto y devuelve 404 al actualizar un ID inexistente', async () => {
    prisma.categoria.findMany.mockResolvedValue([]);
    prisma.categoria.count.mockResolvedValue(0);
    await service.findAll({ page: 1, limit: 20, includeInactive: false });
    expect(prisma.categoria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { estado: 'ACTIVO' } }),
    );

    prisma.categoria.findUnique.mockResolvedValue(null);
    await expect(
      service.update(999, { estado: 'INACTIVO' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
