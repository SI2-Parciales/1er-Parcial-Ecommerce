import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { ACTIVE_STATUS } from '../catalogos/catalogos.utils.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VariantesService } from '../productos/variantes/variantes.service.js';
import {
  AddCarritoDetalleDto,
  SelectCarritoSucursalDto,
  UpdateCarritoDetalleDto,
} from './carrito.dto.js';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

interface LockedCartRow {
  id: number;
  sucursalId: number | null;
}

interface LockedBranchRow {
  id: number;
  nombre: string;
  ubicacion: string;
  estado: string;
}

const cartSelect = {
  id: true,
  creadoEn: true,
  actualizadoEn: true,
  sucursal: {
    select: { id: true, nombre: true, ubicacion: true, estado: true },
  },
  detalles: {
    orderBy: { id: 'asc' as const },
    select: {
      id: true,
      cantidad: true,
      varianteProducto: {
        select: {
          id: true,
          sku: true,
          estado: true,
          producto: {
            select: {
              id: true,
              nombre: true,
              imagenUrl: true,
              precio: true,
              estado: true,
              categoria: { select: { estado: true } },
            },
          },
          talla: { select: { id: true, nombre: true, estado: true } },
          color: {
            select: {
              id: true,
              nombre: true,
              codigoHex: true,
              estado: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CarritoSelect;

type CartRecord = Prisma.CarritoGetPayload<{ select: typeof cartSelect }>;

@Injectable()
export class CarritoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly variantesService: VariantesService,
    private readonly inventarioService: InventarioService,
  ) {}

  async get(authenticatedUser: AuthenticatedUser) {
    this.assertClient(authenticatedUser);
    return this.prisma.$transaction(async (transaction) => {
      const cart = await this.lockOrCreateCart(
        transaction,
        authenticatedUser.id,
      );
      return this.buildResponse(transaction, cart.id);
    });
  }

  async selectBranch(
    input: SelectCarritoSucursalDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    this.assertClient(authenticatedUser);
    return this.prisma.$transaction(async (transaction) => {
      const cart = await this.lockOrCreateCart(
        transaction,
        authenticatedUser.id,
      );
      await this.lockActiveBranch(transaction, input.sucursalId);
      await transaction.carrito.update({
        where: { id: cart.id },
        data: { sucursalId: input.sucursalId },
      });
      return this.buildResponse(transaction, cart.id);
    });
  }

  async addDetail(
    input: AddCarritoDetalleDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    this.assertClient(authenticatedUser);
    this.assertQuantity(input.cantidad);
    return this.prisma.$transaction(async (transaction) => {
      const cart = await this.lockOrCreateCart(
        transaction,
        authenticatedUser.id,
      );
      const branchId = this.requireSelectedBranch(cart);
      await this.lockActiveBranch(transaction, branchId);
      const [variant] = await this.variantesService.resolveActiveForPurchase(
        transaction,
        [{ varianteProductoId: input.varianteProductoId }],
      );
      const existing = await transaction.detalleCarrito.findUnique({
        where: {
          carritoId_varianteProductoId: {
            carritoId: cart.id,
            varianteProductoId: variant.id,
          },
        },
        select: { id: true, cantidad: true },
      });
      const quantity = (existing?.cantidad ?? 0) + input.cantidad;
      this.assertQuantity(quantity);
      await this.inventarioService.ensureAvailability(transaction, branchId, [
        { varianteProductoId: variant.id, cantidad: quantity },
      ]);
      await transaction.detalleCarrito.upsert({
        where: {
          carritoId_varianteProductoId: {
            carritoId: cart.id,
            varianteProductoId: variant.id,
          },
        },
        create: {
          carritoId: cart.id,
          varianteProductoId: variant.id,
          cantidad: quantity,
        },
        update: { cantidad: quantity },
      });
      await this.touchCart(transaction, cart.id);
      return this.buildResponse(transaction, cart.id);
    });
  }

  async updateDetail(
    detailId: number,
    input: UpdateCarritoDetalleDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    this.assertClient(authenticatedUser);
    this.assertIdentifier(detailId);
    this.assertQuantity(input.cantidad);
    return this.prisma.$transaction(async (transaction) => {
      const cart = await this.lockExistingCart(
        transaction,
        authenticatedUser.id,
      );
      if (!cart) {
        throw new NotFoundException(
          'No se encontró el detalle solicitado en tu carrito.',
        );
      }
      const detail = await transaction.detalleCarrito.findFirst({
        where: { id: detailId, carritoId: cart.id },
        select: { id: true, varianteProductoId: true },
      });
      if (!detail) {
        throw new NotFoundException(
          'No se encontró el detalle solicitado en tu carrito.',
        );
      }
      const branchId = this.requireSelectedBranch(cart);
      await this.lockActiveBranch(transaction, branchId);
      await this.variantesService.resolveActiveForPurchase(transaction, [
        { varianteProductoId: detail.varianteProductoId },
      ]);
      await this.inventarioService.ensureAvailability(transaction, branchId, [
        {
          varianteProductoId: detail.varianteProductoId,
          cantidad: input.cantidad,
        },
      ]);
      await transaction.detalleCarrito.update({
        where: { id: detail.id },
        data: { cantidad: input.cantidad },
      });
      await this.touchCart(transaction, cart.id);
      return this.buildResponse(transaction, cart.id);
    });
  }

  async removeDetail(detailId: number, authenticatedUser: AuthenticatedUser) {
    this.assertClient(authenticatedUser);
    this.assertIdentifier(detailId);
    return this.prisma.$transaction(async (transaction) => {
      const cart = await this.lockExistingCart(
        transaction,
        authenticatedUser.id,
      );
      if (!cart) {
        throw new NotFoundException(
          'No se encontró el detalle solicitado en tu carrito.',
        );
      }
      const deleted = await transaction.detalleCarrito.deleteMany({
        where: { id: detailId, carritoId: cart.id },
      });
      if (deleted.count === 0) {
        throw new NotFoundException(
          'No se encontró el detalle solicitado en tu carrito.',
        );
      }
      await this.touchCart(transaction, cart.id);
      return this.buildResponse(transaction, cart.id);
    });
  }

  private assertClient(authenticatedUser: AuthenticatedUser): void {
    if (authenticatedUser.role !== ACTOR_ROLE.CLIENTE) {
      throw new ForbiddenException(
        'Solo los clientes pueden gestionar un carrito.',
      );
    }
  }

  private assertIdentifier(value: number): void {
    if (!Number.isSafeInteger(value) || value < 1) {
      throw new BadRequestException('El identificador no es válido.');
    }
  }

  private assertQuantity(value: number): void {
    if (
      !Number.isSafeInteger(value) ||
      value < 1 ||
      value > MAX_POSTGRES_INTEGER
    ) {
      throw new BadRequestException('La cantidad no es válida.');
    }
  }

  private requireSelectedBranch(cart: LockedCartRow): number {
    if (cart.sucursalId === null) {
      throw new ConflictException(
        'Selecciona una sucursal antes de modificar el carrito.',
      );
    }
    return cart.sucursalId;
  }

  private async lockOrCreateCart(
    transaction: Prisma.TransactionClient,
    userId: number,
  ): Promise<LockedCartRow> {
    await transaction.$executeRaw`
      INSERT INTO "carritos" (
        "usuario_id",
        "creado_en",
        "actualizado_en"
      )
      VALUES (${userId}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("usuario_id") DO NOTHING
    `;
    const cart = await this.lockExistingCart(transaction, userId);
    if (!cart) {
      throw new ConflictException('No se pudo preparar el carrito.');
    }
    return cart;
  }

  private async lockExistingCart(
    transaction: Prisma.TransactionClient,
    userId: number,
  ): Promise<LockedCartRow | undefined> {
    const rows = await transaction.$queryRaw<LockedCartRow[]>`
      SELECT
        "id" AS "id",
        "sucursal_id" AS "sucursalId"
      FROM "carritos"
      WHERE "usuario_id" = ${userId}
      FOR UPDATE
    `;
    return rows[0];
  }

  private async lockActiveBranch(
    transaction: Prisma.TransactionClient,
    branchId: number,
  ): Promise<LockedBranchRow> {
    const rows = await transaction.$queryRaw<LockedBranchRow[]>`
      SELECT "id", "nombre", "ubicacion", "estado"
      FROM "sucursales"
      WHERE "id" = ${branchId}
      FOR SHARE
    `;
    const branch = rows[0];
    if (!branch) {
      throw new NotFoundException('No se encontró la sucursal solicitada.');
    }
    if (branch.estado !== ACTIVE_STATUS) {
      throw new ConflictException(
        'La sucursal seleccionada debe estar activa.',
      );
    }
    return branch;
  }

  private async touchCart(
    transaction: Prisma.TransactionClient,
    cartId: number,
  ): Promise<void> {
    await transaction.carrito.update({
      where: { id: cartId },
      data: { actualizadoEn: new Date() },
    });
  }

  private async buildResponse(
    transaction: Prisma.TransactionClient,
    cartId: number,
  ) {
    const cart = await transaction.carrito.findUniqueOrThrow({
      where: { id: cartId },
      select: cartSelect,
    });
    const quantities = cart.sucursal
      ? await this.inventarioService.getAvailableQuantities(
          transaction,
          cart.sucursal.id,
          cart.detalles.map((detail) => detail.varianteProducto.id),
        )
      : new Map<number, number>();
    return this.mapCart(cart, quantities);
  }

  private mapCart(cart: CartRecord, quantities: Map<number, number>) {
    let total = new Prisma.Decimal(0);
    const branchActive = cart.sucursal?.estado === ACTIVE_STATUS;
    const details = cart.detalles.map((detail) => {
      const variant = detail.varianteProducto;
      const commercial =
        variant.estado === ACTIVE_STATUS &&
        variant.producto.estado === ACTIVE_STATUS &&
        variant.producto.categoria.estado === ACTIVE_STATUS &&
        variant.talla.estado === ACTIVE_STATUS &&
        variant.color.estado === ACTIVE_STATUS;
      const availableQuantity = quantities.get(variant.id) ?? 0;
      const subtotal = variant.producto.precio.mul(detail.cantidad);
      total = total.plus(subtotal);
      return {
        id: detail.id,
        cantidad: detail.cantidad,
        precioUnitario: variant.producto.precio.toNumber(),
        subtotal: subtotal.toNumber(),
        cantidadDisponible: availableQuantity,
        comercializable: commercial,
        disponible:
          branchActive && commercial && availableQuantity >= detail.cantidad,
        variante: {
          id: variant.id,
          sku: variant.sku,
          estado: variant.estado,
          producto: {
            id: variant.producto.id,
            nombre: variant.producto.nombre,
            imagenUrl: variant.producto.imagenUrl,
            estado: variant.producto.estado,
          },
          talla: variant.talla,
          color: variant.color,
        },
      };
    });
    return {
      id: cart.id,
      sucursal: cart.sucursal,
      creadoEn: cart.creadoEn,
      actualizadoEn: cart.actualizadoEn,
      detalles: details,
      total: total.toNumber(),
    };
  }
}
