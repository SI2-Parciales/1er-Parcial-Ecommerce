import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppEnvironment } from '../config/env.validation.js';
import {
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGES_PUBLIC_PREFIX,
} from './product-images.constants.js';
import { ProductImagesStorageService } from './product-images-storage.service.js';

describe('ProductImagesStorageService', () => {
  let directory: string;
  let service: ProductImagesStorageService;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'fashionstore-product-images-'));
    const config = {
      get: () => directory,
    } as unknown as ConfigService<AppEnvironment>;
    service = new ProductImagesStorageService(config);
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it.each([
    {
      extension: 'png',
      mimetype: 'image/png',
      buffer: Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
      ]),
    },
    {
      extension: 'jpg',
      mimetype: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    },
    {
      extension: 'webp',
      mimetype: 'image/webp',
      buffer: Buffer.from('RIFFxxxxWEBP', 'ascii'),
    },
  ])(
    'guarda un archivo $extension con UUID y permite eliminarlo',
    async ({ extension, mimetype, buffer }) => {
      const imageUrl = await service.save({
        buffer,
        mimetype,
        originalname: `catalogo.${extension}`,
        size: buffer.length,
      });
      expect(imageUrl).toMatch(
        new RegExp(
          `^${PRODUCT_IMAGES_PUBLIC_PREFIX}[0-9a-f-]{36}\\.${extension}$`,
        ),
      );

      const filename = imageUrl.slice(PRODUCT_IMAGES_PUBLIC_PREFIX.length);
      await expect(readFile(join(directory, filename))).resolves.toEqual(
        buffer,
      );
      await service.removeManaged(imageUrl);
      await expect(readFile(join(directory, filename))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    },
  );

  it('rechaza archivos ausentes, vacíos, demasiado grandes y con firma falsa', async () => {
    await expect(service.save(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.save({
        buffer: Buffer.alloc(0),
        mimetype: 'image/png',
        originalname: 'vacia.png',
        size: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.save({
        buffer: Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1),
        mimetype: 'image/png',
        originalname: 'grande.png',
        size: MAX_PRODUCT_IMAGE_BYTES + 1,
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
    await expect(
      service.save({
        buffer: Buffer.from('no es una imagen'),
        mimetype: 'image/png',
        originalname: 'falsa.png',
        size: 16,
      }),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('rechaza un MIME que no coincide con la firma y nunca borra rutas ajenas', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await expect(
      service.save({
        buffer: png,
        mimetype: 'image/jpeg',
        originalname: 'imagen.jpg',
        size: png.length,
      }),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    await expect(
      service.save({
        buffer: png,
        mimetype: 'image/png',
        originalname: 'imagen.jpg',
        size: png.length,
      }),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);

    await expect(
      service.removeManaged('/otra-carpeta/archivo.png'),
    ).resolves.toBeUndefined();
    await expect(
      service.removeManaged('/imagenes/productos/../archivo.png'),
    ).resolves.toBeUndefined();
  });
});
