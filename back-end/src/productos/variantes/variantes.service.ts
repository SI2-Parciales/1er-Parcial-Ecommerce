import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/guards/jwt-auth.guard.js';
import {
  ACTIVE_STATUS,
  INACTIVE_STATUS,
  isPrismaError,
} from '../../catalogos/catalogos.utils.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  isAdministrator,
  normalizeSku,
  requireAdministratorForInactive,
} from '../productos.utils.js';
import {
  CreateVarianteProductoDto,
  QueryVariantesDto,
  UpdateVarianteProductoDto,
} from './variantes.dto.js';

@Injectable()
export class VariantesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(productoId: number, input: CreateVarianteProductoDto) {
    return this.prisma.$transaction(async (transaction) => {
      await this.ensureActiveProduct(transaction, productoId);
      await this.ensureActiveTalla(transaction, input.tallaId);
      await this.ensureActiveColor(transaction, input.colorId);
      const sku = normalizeSku(input.sku);
      await this.ensureUniqueValues(
        transaction,
        productoId,
        input.tallaId,
        input.colorId,
        sku,
      );

      try {
        return await transaction.varianteProducto.create({
          data: {
            productoId,
            tallaId: input.tallaId,
            colorId: input.colorId,
            sku,
            estado: ACTIVE_STATUS,
          },
          select: this.varianteSelect,
        });
      } catch (error: unknown) {
        this.throwUniqueConflict(error);
      }
    });
  }

  async findAll(
    productoId: number,
    query: QueryVariantesDto,
    user?: AuthenticatedUser,
  ) {
    requireAdministratorForInactive(query.estado, user);
    const administrator = isAdministrator(user);
    await this.ensureVisibleProduct(productoId, administrator);
    const where: Prisma.VarianteProductoWhereInput = {
      productoId,
      estado: query.estado ?? ACTIVE_STATUS,
      ...(administrator
        ? {}
        : {
            talla: { estado: ACTIVE_STATUS },
            color: { estado: ACTIVE_STATUS },
          }),
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.prisma.varianteProducto.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { id: 'asc' },
        select: this.varianteSelect,
      }),
      this.prisma.varianteProducto.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findById(productoId: number, id: number, user?: AuthenticatedUser) {
    const administrator = isAdministrator(user);
    await this.ensureVisibleProduct(productoId, administrator);
    const variante = await this.prisma.varianteProducto.findFirst({
      where: {
        id,
        productoId,
        ...(administrator
          ? {}
          : {
              estado: ACTIVE_STATUS,
              talla: { estado: ACTIVE_STATUS },
              color: { estado: ACTIVE_STATUS },
            }),
      },
      select: this.varianteSelect,
    });
    if (!variante) {
      throw new NotFoundException('No se encontró la variante solicitada.');
    }
    return variante;
  }

  async update(
    productoId: number,
    id: number,
    input: UpdateVarianteProductoDto,
  ) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException('Envía al menos un campo para actualizar.');
    }

    return this.prisma.$transaction(async (transaction) => {
      await this.ensureActiveProduct(transaction, productoId);
      await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "variantes_producto" WHERE "id" = ${id} FOR UPDATE
      `;
      const current = await transaction.varianteProducto.findFirst({
        where: { id, productoId },
        select: { id: true, tallaId: true, colorId: true, sku: true },
      });
      if (!current) {
        throw new NotFoundException('No se encontró la variante solicitada.');
      }

      const tallaId = input.tallaId ?? current.tallaId;
      const colorId = input.colorId ?? current.colorId;
      const sku =
        input.sku === undefined ? current.sku : normalizeSku(input.sku);
      await this.ensureActiveTalla(transaction, tallaId);
      await this.ensureActiveColor(transaction, colorId);
      await this.ensureUniqueValues(
        transaction,
        productoId,
        tallaId,
        colorId,
        sku,
        id,
      );

      const data: Prisma.VarianteProductoUncheckedUpdateInput = {};
      if (input.tallaId !== undefined) data.tallaId = input.tallaId;
      if (input.colorId !== undefined) data.colorId = input.colorId;
      if (input.sku !== undefined) data.sku = sku;
      if (input.estado !== undefined) data.estado = input.estado;
      try {
        return await transaction.varianteProducto.update({
          where: { id },
          data,
          select: this.varianteSelect,
        });
      } catch (error: unknown) {
        this.throwUniqueConflict(error);
      }
    });
  }

  async deactivate(productoId: number, id: number) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true },
    });
    if (!producto) {
      throw new NotFoundException('No se encontró el producto solicitado.');
    }
    const current = await this.prisma.varianteProducto.findFirst({
      where: { id, productoId },
      select: { id: true },
    });
    if (!current) {
      throw new NotFoundException('No se encontró la variante solicitada.');
    }
    const variante = await this.prisma.varianteProducto.update({
      where: { id },
      data: { estado: INACTIVE_STATUS },
      select: this.varianteSelect,
    });
    return { message: 'Variante desactivada.', variante };
  }

  private async ensureVisibleProduct(
    productoId: number,
    administrator: boolean,
  ) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
      select: { estado: true, categoria: { select: { estado: true } } },
    });
    if (
      !producto ||
      (!administrator &&
        (producto.estado !== ACTIVE_STATUS ||
          producto.categoria.estado !== ACTIVE_STATUS))
    ) {
      throw new NotFoundException('No se encontró el producto solicitado.');
    }
  }

  private async ensureActiveProduct(
    transaction: Prisma.TransactionClient,
    productoId: number,
  ) {
    await transaction.$queryRaw<Array<{ id: number }>>`
      SELECT "id" FROM "productos" WHERE "id" = ${productoId} FOR SHARE
    `;
    const producto = await transaction.producto.findUnique({
      where: { id: productoId },
      select: { estado: true },
    });
    if (!producto)
      throw new NotFoundException('No se encontró el producto solicitado.');
    if (producto.estado !== ACTIVE_STATUS) {
      throw new BadRequestException('El producto debe estar activo.');
    }
  }

  private async ensureActiveTalla(
    transaction: Prisma.TransactionClient,
    tallaId: number,
  ) {
    await transaction.$queryRaw<Array<{ id: number }>>`
      SELECT "id" FROM "tallas" WHERE "id" = ${tallaId} FOR SHARE
    `;
    const talla = await transaction.talla.findUnique({
      where: { id: tallaId },
      select: { estado: true },
    });
    if (!talla)
      throw new NotFoundException('No se encontró la talla solicitada.');
    if (talla.estado !== ACTIVE_STATUS) {
      throw new BadRequestException('La talla debe estar activa.');
    }
  }

  private async ensureActiveColor(
    transaction: Prisma.TransactionClient,
    colorId: number,
  ) {
    await transaction.$queryRaw<Array<{ id: number }>>`
      SELECT "id" FROM "colores" WHERE "id" = ${colorId} FOR SHARE
    `;
    const color = await transaction.color.findUnique({
      where: { id: colorId },
      select: { estado: true },
    });
    if (!color)
      throw new NotFoundException('No se encontró el color solicitado.');
    if (color.estado !== ACTIVE_STATUS) {
      throw new BadRequestException('El color debe estar activo.');
    }
  }

  private async ensureUniqueValues(
    transaction: Prisma.TransactionClient,
    productoId: number,
    tallaId: number,
    colorId: number,
    sku: string,
    excludeId?: number,
  ) {
    const exclusion = excludeId === undefined ? {} : { id: { not: excludeId } };
    const [sameSku, sameCombination] = await Promise.all([
      transaction.varianteProducto.findFirst({
        where: { sku, ...exclusion },
        select: { id: true },
      }),
      transaction.varianteProducto.findFirst({
        where: { productoId, tallaId, colorId, ...exclusion },
        select: { id: true },
      }),
    ]);
    if (sameSku) throw new ConflictException('El SKU ya está registrado.');
    if (sameCombination) {
      throw new ConflictException(
        'La combinación de producto, talla y color ya existe.',
      );
    }
  }

  private throwUniqueConflict(error: unknown): never {
    if (isPrismaError(error, 'P2002')) {
      throw new ConflictException(
        'El SKU o la combinación de variante ya está registrado.',
      );
    }
    throw error;
  }

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
