import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import {
  ACTIVE_STATUS,
  INACTIVE_STATUS,
  normalizeName,
  normalizeOptionalText,
} from '../catalogos/catalogos.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ProductImagesStorageService,
  type UploadedProductImage,
} from './product-images-storage.service.js';
import {
  CreateProductoDto,
  QueryProductosDto,
  UpdateProductoDto,
} from './productos.dto.js';
import {
  decimalToNumber,
  isAdministrator,
  requireAdministratorForInactive,
} from './productos.utils.js';

@Injectable()
export class ProductosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ProductImagesStorageService,
  ) {}

  async create(input: CreateProductoDto) {
    return this.prisma.$transaction(async (transaction) => {
      await this.ensureActiveCategory(transaction, input.categoriaId);
      const producto = await transaction.producto.create({
        data: {
          nombre: normalizeName(input.nombre),
          descripcion: normalizeOptionalText(input.descripcion),
          precio: new Prisma.Decimal(input.precio),
          categoriaId: input.categoriaId,
          estado: ACTIVE_STATUS,
        },
        select: this.productoSelect,
      });
      return this.mapPrice(producto);
    });
  }

  async findAll(query: QueryProductosDto, user?: AuthenticatedUser) {
    requireAdministratorForInactive(query.estado, user);
    const administrator = isAdministrator(user);
    const page = query.pagina || query.page || 1;
    const limit = query.limite || query.limit || 20;
    const nombre = query.buscar || query.nombre;

    const where: Prisma.ProductoWhereInput = {
      estado: query.estado ?? ACTIVE_STATUS,
      ...(nombre
        ? { nombre: { contains: nombre, mode: 'insensitive' } }
        : {}),
      ...(query.categoriaId ? { categoriaId: query.categoriaId } : {}),
      ...(administrator ? {} : { categoria: { estado: ACTIVE_STATUS } }),
    };
    const skip = (page - 1) * limit;
    const [productos, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' },
        select: {
          ...this.productoSelect,
          variantes: {
            where: administrator ? {} : { estado: ACTIVE_STATUS },
            orderBy: { id: 'asc' },
            select: {
              id: true,
              sku: true,
              estado: true,
              talla: { select: { id: true, nombre: true } },
              color: { select: { id: true, nombre: true, codigoHex: true } },
              inventarios: {
                select: {
                  id: true,
                  cantidadFisica: true,
                  cantidadReservada: true,
                  cantidadNoDisponible: true,
                  sucursalId: true,
                  sucursal: { select: { id: true, nombre: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.producto.count({ where }),
    ]);
    return {
      data: productos.map((producto) => this.mapPrice(producto)),
      meta: { page, limit, total },
    };
  }

  async findById(id: number, user?: AuthenticatedUser) {
    const administrator = isAdministrator(user);
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      select: {
        ...this.productoSelect,
        variantes: {
          where: administrator
            ? {}
            : {
                estado: ACTIVE_STATUS,
                talla: { estado: ACTIVE_STATUS },
                color: { estado: ACTIVE_STATUS },
              },
          orderBy: { id: 'asc' },
          select: this.varianteSelect,
        },
      },
    });
    if (
      !producto ||
      (!administrator &&
        (producto.estado !== ACTIVE_STATUS ||
          producto.categoria.estado !== ACTIVE_STATUS))
    ) {
      throw new NotFoundException('No se encontró el producto solicitado.');
    }
    return this.mapPrice(producto);
  }

  async update(id: number, input: UpdateProductoDto) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Envía al menos un campo para actualizar.');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "productos" WHERE "id" = ${id} FOR UPDATE
      `;
      const current = await transaction.producto.findUnique({
        where: { id },
        select: { id: true, categoriaId: true, estado: true },
      });
      if (!current) {
        throw new NotFoundException('No se encontró el producto solicitado.');
      }

      const nextStatus = input.estado ?? current.estado;
      const nextCategoryId = input.categoriaId ?? current.categoriaId;
      if (nextStatus === ACTIVE_STATUS) {
        await this.ensureActiveCategory(transaction, nextCategoryId);
      }

      const data: Prisma.ProductoUncheckedUpdateInput = {};
      if (input.nombre !== undefined) data.nombre = normalizeName(input.nombre);
      if (input.descripcion !== undefined) {
        data.descripcion = normalizeOptionalText(input.descripcion);
      }
      if (input.precio !== undefined) {
        data.precio = new Prisma.Decimal(input.precio);
      }
      if (input.categoriaId !== undefined) data.categoriaId = input.categoriaId;
      if (input.estado !== undefined) data.estado = input.estado;

      const producto = await transaction.producto.update({
        where: { id },
        data,
        select: this.productoSelect,
      });
      return this.mapPrice(producto);
    });
  }

  async deactivate(id: number) {
    const producto = await this.update(id, { estado: INACTIVE_STATUS });
    return { message: 'Producto desactivado.', producto };
  }

  async uploadImage(id: number, file: UploadedProductImage | undefined) {
    const exists = await this.prisma.producto.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException('No se encontró el producto solicitado.');
    }

    const imageUrl = await this.imageStorage.save(file);
    try {
      const result = await this.prisma.$transaction(async (transaction) => {
        await transaction.$queryRaw<Array<{ id: number }>>`
          SELECT "id" FROM "productos" WHERE "id" = ${id} FOR UPDATE
        `;
        const current = await transaction.producto.findUnique({
          where: { id },
          select: { imagenUrl: true },
        });
        if (!current) {
          throw new NotFoundException('No se encontró el producto solicitado.');
        }

        const producto = await transaction.producto.update({
          where: { id },
          data: { imagenUrl: imageUrl },
          select: this.productoSelect,
        });
        return { previousImageUrl: current.imagenUrl, producto };
      });

      await this.imageStorage.removeManaged(result.previousImageUrl);
      return this.mapPrice(result.producto);
    } catch (error: unknown) {
      await this.imageStorage.removeManaged(imageUrl);
      throw error;
    }
  }

  async deleteImage(id: number) {
    const result = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "productos" WHERE "id" = ${id} FOR UPDATE
      `;
      const current = await transaction.producto.findUnique({
        where: { id },
        select: { imagenUrl: true },
      });
      if (!current) {
        throw new NotFoundException('No se encontró el producto solicitado.');
      }

      const producto = await transaction.producto.update({
        where: { id },
        data: { imagenUrl: null },
        select: this.productoSelect,
      });
      return { previousImageUrl: current.imagenUrl, producto };
    });

    await this.imageStorage.removeManaged(result.previousImageUrl);
    return {
      message: 'Imagen del producto eliminada.',
      producto: this.mapPrice(result.producto),
    };
  }

  private async ensureActiveCategory(
    transaction: Prisma.TransactionClient,
    categoriaId: number,
  ) {
    await transaction.$queryRaw<Array<{ id: number }>>`
      SELECT "id" FROM "categorias" WHERE "id" = ${categoriaId} FOR SHARE
    `;
    const categoria = await transaction.categoria.findUnique({
      where: { id: categoriaId },
      select: { estado: true },
    });
    if (!categoria) {
      throw new NotFoundException('No se encontró la categoría solicitada.');
    }
    if (categoria.estado !== ACTIVE_STATUS) {
      throw new BadRequestException('La categoría debe estar activa.');
    }
  }

  private mapPrice<T extends { precio: Prisma.Decimal }>(producto: T) {
    return { ...producto, precio: decimalToNumber(producto.precio) };
  }

  private readonly productoSelect = {
    id: true,
    nombre: true,
    descripcion: true,
    imagenUrl: true,
    precio: true,
    estado: true,
    creadoEn: true,
    actualizadoEn: true,
    categoria: { select: { id: true, nombre: true, estado: true } },
  } satisfies Prisma.ProductoSelect;

  private readonly varianteSelect = {
    id: true,
    sku: true,
    estado: true,
    creadoEn: true,
    actualizadoEn: true,
    talla: { select: { id: true, nombre: true, estado: true } },
    color: {
      select: { id: true, nombre: true, codigoHex: true, estado: true },
    },
  } satisfies Prisma.VarianteProductoSelect;
}
