import {
  BadRequestException,
  Injectable,
  Logger,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import type { AppEnvironment } from '../config/env.validation.js';
import {
  MAX_PRODUCT_IMAGE_BYTES,
  PRODUCT_IMAGES_PUBLIC_PREFIX,
  resolveProductImagesDirectory,
} from './product-images.constants.js';

export interface UploadedProductImage {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

interface DetectedImage {
  extension: 'jpg' | 'png' | 'webp';
  mimetype: 'image/jpeg' | 'image/png' | 'image/webp';
}

@Injectable()
export class ProductImagesStorageService {
  private readonly logger = new Logger(ProductImagesStorageService.name);
  private readonly directory: string;

  constructor(config: ConfigService<AppEnvironment>) {
    this.directory = resolveProductImagesDirectory(
      config.get<string>('PRODUCT_IMAGES_DIR'),
    );
  }

  async save(file: UploadedProductImage | undefined): Promise<string> {
    if (!file) {
      throw new BadRequestException(
        'Debes enviar una imagen en el campo imagen.',
      );
    }
    if (file.buffer.length === 0 || file.size === 0) {
      throw new BadRequestException('La imagen no puede estar vacía.');
    }
    if (
      file.buffer.length > MAX_PRODUCT_IMAGE_BYTES ||
      file.size > MAX_PRODUCT_IMAGE_BYTES
    ) {
      throw new PayloadTooLargeException(
        'La imagen no puede superar los 5 MB.',
      );
    }

    const detected = this.detectImage(file.buffer);
    if (
      !detected ||
      detected.mimetype !== file.mimetype.toLowerCase() ||
      !this.extensionMatches(file.originalname, detected.extension)
    ) {
      throw new UnsupportedMediaTypeException(
        'La imagen debe ser un archivo JPG, PNG o WebP válido.',
      );
    }

    await mkdir(this.directory, { recursive: true });
    const filename = `${randomUUID()}.${detected.extension}`;
    await writeFile(resolve(this.directory, filename), file.buffer, {
      flag: 'wx',
    });
    return `${PRODUCT_IMAGES_PUBLIC_PREFIX}${filename}`;
  }

  private extensionMatches(
    originalName: string,
    detectedExtension: DetectedImage['extension'],
  ): boolean {
    const extension = extname(originalName).toLowerCase();
    return detectedExtension === 'jpg'
      ? extension === '.jpg' || extension === '.jpeg'
      : extension === `.${detectedExtension}`;
  }

  async removeManaged(publicUrl: string | null): Promise<void> {
    const filename = this.getManagedFilename(publicUrl);
    if (!filename) return;

    try {
      await unlink(resolve(this.directory, filename));
    } catch (error: unknown) {
      if (this.isFileSystemError(error, 'ENOENT')) return;
      this.logger.warn(
        `No se pudo eliminar el archivo de imagen administrado ${filename}.`,
      );
    }
  }

  private detectImage(buffer: Buffer): DetectedImage | null {
    if (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return { extension: 'png', mimetype: 'image/png' };
    }
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { extension: 'jpg', mimetype: 'image/jpeg' };
    }
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return { extension: 'webp', mimetype: 'image/webp' };
    }
    return null;
  }

  private getManagedFilename(publicUrl: string | null): string | null {
    if (!publicUrl?.startsWith(PRODUCT_IMAGES_PUBLIC_PREFIX)) return null;
    const filename = publicUrl.slice(PRODUCT_IMAGES_PUBLIC_PREFIX.length);
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) return null;

    const target = resolve(this.directory, filename);
    return dirname(target) === this.directory ? filename : null;
  }

  private isFileSystemError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
