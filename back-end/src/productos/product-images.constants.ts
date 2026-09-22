import { isAbsolute, normalize, resolve } from 'node:path';

export const PRODUCT_IMAGES_PUBLIC_PREFIX = '/imagenes/productos/';
export const DEFAULT_PRODUCT_IMAGES_DIR = 'uploads/productos';
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

export function resolveProductImagesDirectory(configured?: string): string {
  const directory = configured?.trim() || DEFAULT_PRODUCT_IMAGES_DIR;
  return normalize(
    isAbsolute(directory) ? directory : resolve(process.cwd(), directory),
  );
}
