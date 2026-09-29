import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EstadoReserva, Prisma } from '@prisma/client';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { ACTIVE_STATUS } from '../catalogos/catalogos.utils.js';
import { InventarioService } from '../inventario/inventario.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { VariantesService } from '../productos/variantes/variantes.service.js';
import {
  CreateReservaDto,
  ListReservasQueryDto,
  UpdateReservaDetalleDto,
} from './reservas.dto.js';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

interface LockedReservationRow {
  id: number;
  estado: EstadoReserva;
  sucursalId: number;
}

interface LockedBranchRow {
  id: number;
  estado: string;
}

interface CurrentActorRow {
  id: number;
  estado: string;
  sucursalId: number | null;
  role: string;
}

const reservationListSelect = {
  id: true,
  fechaHora: true,
  estado: true,
  creadoEn: true,
  actualizadoEn: true,
  sucursal: { select: { id: true, nombre: true, ubicacion: true } },
  cliente: {
    select: { id: true, nombre: true, apellido: true, telefono: true },
  },
} satisfies Prisma.ReservaSelect;

const reservationDetailSelect = {
  ...reservationListSelect,
  detalles: {
    orderBy: { id: 'asc' as const },
    select: {
      id: true,
      cantidad: true,
      varianteProducto: {
        select: {
          id: true,
          sku: true,
          producto: {
            select: { id: true, nombre: true, imagenUrl: true },
          },
          talla: { select: { id: true, nombre: true } },
          color: { select: { id: true, nombre: true, codigoHex: true } },
        },
      },
    },
  },
} satisfies Prisma.ReservaSelect;

@Injectable()
export class ReservasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly variantesService: VariantesService,
    private readonly inventarioService: InventarioService,
  ) {}

  async create(input: CreateReservaDto, user: AuthenticatedUser) {
    this.assertClient(user);
    this.assertIdentifier(input.sucursalId);
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException(
        'La reserva debe incluir al menos una prenda.',
      );
    }
    const requested = this.aggregateItems(input.items);
    const fechaHora = new Date(input.fechaHora);
    if (!Number.isFinite(fechaHora.getTime())) {
      throw new BadRequestException(
        'La fecha y hora de atención no son válidas.',
      );
    }

    return this.prisma.$transaction(async (transaction) => {
      await this.lockActiveBranch(transaction, input.sucursalId);
      const variants = await this.variantesService.resolveActiveForPurchase(
        transaction,
        requested.map(({ varianteProductoId }) => ({ varianteProductoId })),
      );
      const variantIds = new Set(variants.map((variant) => variant.id));
      if (variantIds.size !== requested.length) {
        throw new NotFoundException(
          'No se encontró una de las variantes solicitadas.',
        );
      }
      await this.inventarioService.reserveForCustomer(
        transaction,
        input.sucursalId,
        requested,
      );
      const reservation = await transaction.reserva.create({
        data: {
          clienteId: user.id,
          sucursalId: input.sucursalId,
          fechaHora,
          estado: EstadoReserva.PENDIENTE,
          detalles: {
            create: requested.map((item) => ({
              varianteProductoId: item.varianteProductoId,
              cantidad: item.cantidad,
            })),
          },
        },
        select: reservationDetailSelect,
      });
      return reservation;
    });
  }

  async findAll(query: ListReservasQueryDto, user: AuthenticatedUser) {
    const where = await this.buildReadFilter(query, user);
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await Promise.all([
      this.prisma.reserva.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
        select: reservationListSelect,
      }),
      this.prisma.reserva.count({ where }),
    ]);
    return { data, meta: { page: query.page, limit: query.limit, total } };
  }

  async findOne(id: number, user: AuthenticatedUser) {
    this.assertIdentifier(id);
    const where = await this.buildReadFilter({}, user);
    const reservation = await this.prisma.reserva.findFirst({
      where: { ...where, id },
      select: reservationDetailSelect,
    });
    if (!reservation) throw this.reservationNotFound();
    return reservation;
  }

  async startPreparation(id: number, user: AuthenticatedUser) {
    return this.transitionForManager(
      id,
      user,
      EstadoReserva.PENDIENTE,
      EstadoReserva.EN_PROCESO,
    );
  }

  async finalize(id: number, user: AuthenticatedUser) {
    return this.transitionForManager(
      id,
      user,
      EstadoReserva.EN_PROCESO,
      EstadoReserva.FINALIZADA,
    );
  }

  async updateDetail(
    id: number,
    detailId: number,
    input: UpdateReservaDetalleDto,
    user: AuthenticatedUser,
  ) {
    this.assertClient(user);
    this.assertIdentifier(id);
    this.assertIdentifier(detailId);
    this.assertQuantity(input.cantidad);
    return this.prisma.$transaction(async (transaction) => {
      const reservation = await this.lockOwnedReservation(
        transaction,
        id,
        user.id,
      );
      this.assertPending(reservation, 'modificar');
      const detail = await transaction.detalleReserva.findFirst({
        where: { id: detailId, reservaId: id },
        select: { id: true, varianteProductoId: true, cantidad: true },
      });
      if (!detail) throw this.detailNotFound();
      if (input.cantidad >= detail.cantidad) {
        throw new BadRequestException(
          'Solo puedes reducir la cantidad de una prenda; para agregar prendas crea otra reserva.',
        );
      }
      await this.inventarioService.releaseCustomerReservation(
        transaction,
        reservation.sucursalId,
        [
          {
            varianteProductoId: detail.varianteProductoId,
            cantidad: detail.cantidad - input.cantidad,
          },
        ],
      );
      await transaction.detalleReserva.update({
        where: { id: detail.id },
        data: { cantidad: input.cantidad },
      });
      await transaction.reserva.update({
        where: { id },
        data: { actualizadoEn: new Date() },
      });
      return this.getDetailedReservation(transaction, id);
    });
  }

  async removeDetail(id: number, detailId: number, user: AuthenticatedUser) {
    this.assertClient(user);
    this.assertIdentifier(id);
    this.assertIdentifier(detailId);
    return this.prisma.$transaction(async (transaction) => {
      const reservation = await this.lockOwnedReservation(
        transaction,
        id,
        user.id,
      );
      this.assertPending(reservation, 'modificar');
      const detail = await transaction.detalleReserva.findFirst({
        where: { id: detailId, reservaId: id },
        select: { id: true, varianteProductoId: true, cantidad: true },
      });
      if (!detail) throw this.detailNotFound();
      await this.inventarioService.releaseCustomerReservation(
        transaction,
        reservation.sucursalId,
        [
          {
            varianteProductoId: detail.varianteProductoId,
            cantidad: detail.cantidad,
          },
        ],
      );
      await transaction.detalleReserva.delete({ where: { id: detail.id } });
      const remaining = await transaction.detalleReserva.count({
        where: { reservaId: id },
      });
      await transaction.reserva.update({
        where: { id },
        data: {
          ...(remaining === 0 ? { estado: EstadoReserva.CANCELADA } : {}),
          actualizadoEn: new Date(),
        },
      });
      return this.getDetailedReservation(transaction, id);
    });
  }

  async cancel(id: number, user: AuthenticatedUser) {
    this.assertClient(user);
    this.assertIdentifier(id);
    return this.prisma.$transaction(async (transaction) => {
      const reservation = await this.lockOwnedReservation(
        transaction,
        id,
        user.id,
      );
      if (reservation.estado === EstadoReserva.CANCELADA) {
        return this.getDetailedReservation(transaction, id);
      }
      this.assertPending(reservation, 'cancelar');
      const details = await transaction.detalleReserva.findMany({
        where: { reservaId: id },
        orderBy: { varianteProductoId: 'asc' },
        select: { varianteProductoId: true, cantidad: true },
      });
      await this.inventarioService.releaseCustomerReservation(
        transaction,
        reservation.sucursalId,
        details,
      );
      await transaction.reserva.update({
        where: { id },
        data: { estado: EstadoReserva.CANCELADA, actualizadoEn: new Date() },
      });
      return this.getDetailedReservation(transaction, id);
    });
  }

  private aggregateItems(
    items: CreateReservaDto['items'],
  ): Array<{ varianteProductoId: number; cantidad: number }> {
    const quantities = new Map<number, number>();
    for (const item of items) {
      this.assertIdentifier(item.varianteProductoId);
      this.assertQuantity(item.cantidad);
      const total =
        (quantities.get(item.varianteProductoId) ?? 0) + item.cantidad;
      this.assertQuantity(total);
      quantities.set(item.varianteProductoId, total);
    }
    return [...quantities.entries()]
      .sort(([left], [right]) => left - right)
      .map(([varianteProductoId, cantidad]) => ({
        varianteProductoId,
        cantidad,
      }));
  }

  private async lockActiveBranch(
    transaction: Prisma.TransactionClient,
    branchId: number,
  ): Promise<void> {
    const rows = await transaction.$queryRaw<LockedBranchRow[]>`
      SELECT "id", "estado" FROM "sucursales" WHERE "id" = ${branchId} FOR SHARE
    `;
    const branch = rows[0];
    if (!branch)
      throw new NotFoundException('No se encontró la sucursal solicitada.');
    if (branch.estado !== ACTIVE_STATUS) {
      throw new ConflictException(
        'La sucursal seleccionada debe estar activa.',
      );
    }
  }

  private async buildReadFilter(
    query: Partial<ListReservasQueryDto>,
    user: AuthenticatedUser,
  ): Promise<Prisma.ReservaWhereInput> {
    const where: Prisma.ReservaWhereInput = {};
    switch (user.role) {
      case ACTOR_ROLE.CLIENTE:
        where.clienteId = user.id;
        if (query.clienteId !== undefined && query.clienteId !== user.id) {
          throw new ForbiddenException(
            'Solo puedes consultar tus propias reservas.',
          );
        }
        if (query.clienteId !== undefined) where.clienteId = query.clienteId;
        if (query.sucursalId !== undefined) {
          where.sucursalId = query.sucursalId;
        }
        break;
      case ACTOR_ROLE.ENCARGADO_SUCURSAL: {
        const branchId = await this.getManagerBranch(user.id);
        if (query.sucursalId !== undefined && query.sucursalId !== branchId) {
          throw new ForbiddenException(
            'Solo puedes consultar reservas de tu sucursal asignada.',
          );
        }
        where.sucursalId = branchId;
        if (query.clienteId !== undefined) where.clienteId = query.clienteId;
        break;
      }
      case ACTOR_ROLE.ADMINISTRADOR:
        if (query.sucursalId !== undefined) {
          where.sucursalId = query.sucursalId;
        }
        if (query.clienteId !== undefined) where.clienteId = query.clienteId;
        break;
      default:
        throw new ForbiddenException('Tu rol no puede consultar reservas.');
    }
    if (query.estado !== undefined) where.estado = query.estado;
    return where;
  }

  private async getManagerBranch(userId: number): Promise<number> {
    const actor = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        estado: true,
        sucursalId: true,
        rol: { select: { nombre: true } },
      },
    });
    if (!actor || actor.estado !== ACTIVE_STATUS) {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }
    if (actor.rol.nombre !== ACTOR_ROLE.ENCARGADO_SUCURSAL) {
      throw new ForbiddenException(
        'Solo los encargados pueden consultar reservas de sucursal.',
      );
    }
    if (actor.sucursalId === null) {
      throw new ForbiddenException(
        'El encargado no tiene una sucursal asignada.',
      );
    }
    return actor.sucursalId;
  }

  private async transitionForManager(
    id: number,
    user: AuthenticatedUser,
    expected: EstadoReserva,
    next: EstadoReserva,
  ) {
    this.assertIdentifier(id);
    if (user.role !== ACTOR_ROLE.ENCARGADO_SUCURSAL) {
      throw new ForbiddenException(
        'Solo los encargados de sucursal pueden cambiar el estado de una reserva.',
      );
    }
    return this.prisma.$transaction(async (transaction) => {
      const actor = await this.lockManagerActor(transaction, user.id);
      const reservation = await this.lockReservationForBranch(
        transaction,
        id,
        actor.sucursalId!,
      );
      if (reservation.estado !== expected) {
        throw new ConflictException(
          `La reserva debe estar ${expected} para pasar a ${next}.`,
        );
      }
      if (next === EstadoReserva.FINALIZADA) {
        const details = await transaction.detalleReserva.findMany({
          where: { reservaId: id },
          orderBy: { varianteProductoId: 'asc' },
          select: { varianteProductoId: true, cantidad: true },
        });
        await this.inventarioService.releaseCustomerReservation(
          transaction,
          actor.sucursalId!,
          details,
        );
      }
      await transaction.reserva.update({
        where: { id },
        data: { estado: next, actualizadoEn: new Date() },
      });
      return this.getDetailedReservation(transaction, id);
    });
  }

  private async lockManagerActor(
    transaction: Prisma.TransactionClient,
    userId: number,
  ): Promise<CurrentActorRow> {
    const rows = await transaction.$queryRaw<CurrentActorRow[]>`
      SELECT
        u."id" AS "id",
        u."estado" AS "estado",
        u."sucursal_id" AS "sucursalId",
        r."nombre" AS "role"
      FROM "usuarios" AS u
      INNER JOIN "roles" AS r ON r."id" = u."rol_id"
      WHERE u."id" = ${userId}
      FOR SHARE OF u
    `;
    const actor = rows[0];
    if (!actor || actor.estado !== ACTIVE_STATUS) {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }
    if (actor.role !== ACTOR_ROLE.ENCARGADO_SUCURSAL) {
      throw new ForbiddenException(
        'Solo los encargados de sucursal pueden cambiar el estado de una reserva.',
      );
    }
    if (actor.sucursalId === null) {
      throw new ForbiddenException(
        'El encargado no tiene una sucursal asignada.',
      );
    }
    return actor;
  }

  private async lockReservationForBranch(
    transaction: Prisma.TransactionClient,
    id: number,
    branchId: number,
  ): Promise<LockedReservationRow> {
    const rows = await transaction.$queryRaw<LockedReservationRow[]>`
      SELECT "id", "estado", "sucursal_id" AS "sucursalId"
      FROM "reservas"
      WHERE "id" = ${id} AND "sucursal_id" = ${branchId}
      FOR UPDATE
    `;
    const reservation = rows[0];
    if (!reservation) throw this.reservationNotFound();
    return reservation;
  }

  private async lockOwnedReservation(
    transaction: Prisma.TransactionClient,
    id: number,
    clienteId: number,
  ): Promise<LockedReservationRow> {
    const rows = await transaction.$queryRaw<LockedReservationRow[]>`
      SELECT "id", "estado", "sucursal_id" AS "sucursalId"
      FROM "reservas"
      WHERE "id" = ${id} AND "cliente_id" = ${clienteId}
      FOR UPDATE
    `;
    const reservation = rows[0];
    if (!reservation) throw this.reservationNotFound();
    return reservation;
  }

  private async getDetailedReservation(
    transaction: Prisma.TransactionClient,
    id: number,
  ) {
    return transaction.reserva.findUniqueOrThrow({
      where: { id },
      select: reservationDetailSelect,
    });
  }

  private assertClient(user: AuthenticatedUser): void {
    if (user.role !== ACTOR_ROLE.CLIENTE) {
      throw new ForbiddenException(
        'Solo los clientes pueden gestionar reservas.',
      );
    }
  }

  private assertPending(
    reservation: LockedReservationRow,
    action: string,
  ): void {
    if (reservation.estado !== EstadoReserva.PENDIENTE) {
      throw new ConflictException(
        `La reserva no se puede ${action} cuando está ${reservation.estado}.`,
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

  private reservationNotFound(): NotFoundException {
    return new NotFoundException('No se encontró la reserva solicitada.');
  }

  private detailNotFound(): NotFoundException {
    return new NotFoundException(
      'No se encontró el detalle solicitado en la reserva.',
    );
  }
}
