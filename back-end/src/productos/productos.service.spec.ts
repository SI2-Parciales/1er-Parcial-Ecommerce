import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductImagesStorageService } from './product-images-storage.service.js';
import { ProductosService } from './productos.service.js';

describe('ProductosService', () => {
  const transaction = {
    $queryRaw: vi.fn(),
    categoria: { findUnique: vi.fn() },
    producto: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
  const prisma = {
    producto: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) =>
      callback(transaction),
    ),
  };
  const imageStorage = {
    save: vi.fn(),
    removeManaged: vi.fn(),
  };
  let service: ProductosService;

  beforeEach(() => {
    vi.clearAllMocks();
    transaction.$queryRaw.mockResolvedValue([{ id: 1 }]);
    transaction.categoria.findUnique.mockResolvedValue({ estado: 'ACTIVO' });
    service = new ProductosService(
      prisma as unknown as PrismaService,
      imageStorage as unknown as ProductImagesStorageService,
    );
  });

  it('crea un producto activo con Decimal y devuelve precio numérico', async () => {
    transaction.producto.create.mockResolvedValue({
      id: 1,
      nombre: 'Polera Oversize',
      descripcion: null,
      precio: new Prisma.Decimal('129.90'),
      estado: 'ACTIVO',
      creadoEn: new Date(),
      actualizadoEn: new Date(),
      categoria: { id: 1, nombre: 'Poleras', estado: 'ACTIVO' },
    });

    const result = await service.create({
      nombre: '  Polera   Oversize ',
      descripcion: null,
      precio: 129.9,
      categoriaId: 1,
    });
    expect(result).toMatchObject({ nombre: 'Polera Oversize', precio: 129.9 });
    expect(typeof result.precio).toBe('number');
    expect(transaction.producto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ estado: 'ACTIVO', categoriaId: 1 }),
      }),
    );
  });

  it('rechaza una categoría inactiva o inexistente', async () => {
    transaction.categoria.findUnique.mockResolvedValue({ estado: 'INACTIVO' });
    await expect(
      service.create({ nombre: 'Polera', precio: 10, categoriaId: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);

    transaction.categoria.findUnique.mockResolvedValue(null);
    await expect(
      service.create({ nombre: 'Polera', precio: 10, categoriaId: 99 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('oculta categorías inactivas al público y reserva INACTIVO para administrador', async () => {
    prisma.producto.findMany.mockResolvedValue([]);
    prisma.producto.count.mockResolvedValue(0);
    await service.findAll({ page: 1, limit: 20 }, undefined);
    expect(prisma.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          estado: 'ACTIVO',
          categoria: { estado: 'ACTIVO' },
        }),
      }),
    );

    await expect(
      service.findAll({ page: 1, limit: 20, estado: 'INACTIVO' }, undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reemplaza la imagen, devuelve la URL pública y elimina el archivo anterior después del commit', async () => {
    prisma.producto.findUnique.mockResolvedValue({ id: 1 });
    imageStorage.save.mockResolvedValue(
      '/imagenes/productos/11111111-1111-4111-8111-111111111111.webp',
    );
    transaction.producto.findUnique.mockResolvedValue({
      imagenUrl: '/imagenes/productos/22222222-2222-4222-8222-222222222222.png',
    });
    transaction.producto.update.mockResolvedValue({
      id: 1,
      nombre: 'Polera',
      descripcion: null,
      imagenUrl:
        '/imagenes/productos/11111111-1111-4111-8111-111111111111.webp',
      precio: new Prisma.Decimal('129.90'),
      estado: 'ACTIVO',
      creadoEn: new Date(),
      actualizadoEn: new Date(),
      categoria: { id: 1, nombre: 'Poleras', estado: 'ACTIVO' },
    });
    const file = {
      buffer: Buffer.from('RIFFxxxxWEBP', 'ascii'),
      mimetype: 'image/webp',
      originalname: 'producto.webp',
      size: 12,
    };

    const result = await service.uploadImage(1, file);

    expect(transaction.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: { imagenUrl: result.imagenUrl },
      }),
    );
    expect(imageStorage.removeManaged).toHaveBeenCalledWith(
      '/imagenes/productos/22222222-2222-4222-8222-222222222222.png',
    );
    expect(result.precio).toBe(129.9);
  });

  it('comprueba que el producto exista antes de escribir la imagen', async () => {
    prisma.producto.findUnique.mockResolvedValue(null);

    await expect(
      service.uploadImage(999, {
        buffer: Buffer.from('RIFFxxxxWEBP', 'ascii'),
        mimetype: 'image/webp',
        originalname: 'producto.webp',
        size: 12,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(imageStorage.save).not.toHaveBeenCalled();
  });

  it('limpia el archivo nuevo si falla la actualización de base de datos', async () => {
    prisma.producto.findUnique.mockResolvedValue({ id: 1 });
    const newUrl =
      '/imagenes/productos/11111111-1111-4111-8111-111111111111.png';
    imageStorage.save.mockResolvedValue(newUrl);
    transaction.producto.findUnique.mockResolvedValue({ imagenUrl: null });
    transaction.producto.update.mockRejectedValue(new Error('database error'));

    await expect(
      service.uploadImage(1, {
        buffer: Buffer.from('imagen'),
        mimetype: 'image/png',
        originalname: 'producto.png',
        size: 6,
      }),
    ).rejects.toThrow('database error');
    expect(imageStorage.removeManaged).toHaveBeenCalledWith(newUrl);
  });

  it('desasocia la imagen de forma idempotente y conserva los demás datos', async () => {
    const previousImageUrl =
      '/imagenes/productos/22222222-2222-4222-8222-222222222222.jpg';
    transaction.producto.findUnique.mockResolvedValue({
      imagenUrl: previousImageUrl,
    });
    transaction.producto.update.mockResolvedValue({
      id: 1,
      nombre: 'Polera',
      descripcion: 'Algodón',
      imagenUrl: null,
      precio: new Prisma.Decimal('129.90'),
      estado: 'ACTIVO',
      creadoEn: new Date(),
      actualizadoEn: new Date(),
      categoria: { id: 1, nombre: 'Poleras', estado: 'ACTIVO' },
    });

    const result = await service.deleteImage(1);

    expect(transaction.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { imagenUrl: null } }),
    );
    expect(imageStorage.removeManaged).toHaveBeenCalledWith(previousImageUrl);
    expect(result.producto).toMatchObject({
      nombre: 'Polera',
      descripcion: 'Algodón',
      imagenUrl: null,
      precio: 129.9,
    });
  });
});
