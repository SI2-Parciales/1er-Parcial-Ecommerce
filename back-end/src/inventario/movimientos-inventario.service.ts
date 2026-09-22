import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, TipoMovimiento } from '@prisma/client';
import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { InventarioService } from './inventario.service.js';
import {
  CreateMovimientoInventarioDto,
  QueryMovimientosInventarioDto,
} from './movimientos-inventario.dto.js';

interface CurrentActorRow {
  id: number;
  nombre: string;
  apellido: string;
  estado: string;
  sucursalId: number | null;
  role: string;
}

interface LockedVariantRow {
  id: number;
  sku: string;
  estado: string;
}

interface LockedBranchRow {
  id: number;
  nombre: string;
  estado: string;
}

interface NormalizedMovementInput {
  tipo: TipoMovimiento;
  varianteProductoId: number;
  cantidad: number;
  sucursalOrigenId: number | null;
  sucursalDestinoId: number | null;
  observacion: string | null;
  cantidadNoDisponible: number | null;
  origenUnidades: 'DISPONIBLE' | 'NO_DISPONIBLE' | null;
}

const movementSelect = {
  id: true,
  tipo: true,
  cantidad: true,
  fecha: true,
  observacion: true,
  usuario: { select: { id: true, nombre: true, apellido: true } },
  varianteProducto: { select: { id: true, sku: true } },
  sucursalOrigen: { select: { id: true, nombre: true } },
  sucursalDestino: { select: { id: true, nombre: true } },
} satisfies Prisma.MovimientoInventarioSelect;

type MovementRecord = Prisma.MovimientoInventarioGetPayload<{
  select: typeof movementSelect;
}>;

@Injectable()
export class MovimientosInventarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventarioService: InventarioService,
  ) {}

  async create(
    input: CreateMovimientoInventarioDto,
    authenticatedUser: AuthenticatedUser,
    idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey || !isUUID(idempotencyKey, '4')) {
      throw new BadRequestException(
        'El encabezado Idempotency-Key debe contener un UUID v4 válido.',
      );
    }
    const normalized = this.normalizeAndValidate(input);
    const requestHash = this.hashRequest(authenticatedUser.id, normalized);
    const previous = await this.findIdempotentResult(
      authenticatedUser.id,
      idempotencyKey,
    );
    if (previous) {
      return this.resolveIdempotentResult(previous, requestHash);
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const actor = await this.lockActor(transaction, authenticatedUser.id);
        this.authorize(actor, normalized);
        const { variant, branches } = await this.lockResources(
          transaction,
          normalized,
        );

        const movement = await transaction.movimientoInventario.create({
          data: {
            tipo: normalized.tipo,
            cantidad: normalized.cantidad,
            observacion: normalized.observacion,
            usuarioId: actor.id,
            varianteProductoId: variant.id,
            sucursalOrigenId: normalized.sucursalOrigenId,
            sucursalDestinoId: normalized.sucursalDestinoId,
            claveIdempotencia: idempotencyKey,
            hashSolicitud: requestHash,
            resultadoIdempotente: {},
          },
          select: { id: true, fecha: true },
        });

        let inventarioOrigen: unknown = null;
        let inventarioDestino: unknown = null;

        switch (normalized.tipo) {
          case TipoMovimiento.RECEPCION:
            inventarioDestino = await this.inventarioService.applyStockEntry(
              transaction,
              normalized.sucursalDestinoId!,
              normalized.varianteProductoId,
              normalized.cantidad,
            );
            break;
          case TipoMovimiento.DEVOLUCION:
            inventarioDestino = await this.inventarioService.applyStockEntry(
              transaction,
              normalized.sucursalDestinoId!,
              normalized.varianteProductoId,
              normalized.cantidad,
              normalized.cantidadNoDisponible ?? 0,
            );
            break;
          case TipoMovimiento.TRANSFERENCIA: {
            const updated = await this.inventarioService.applyTransfer(
              transaction,
              normalized.varianteProductoId,
              normalized.sucursalOrigenId!,
              normalized.sucursalDestinoId!,
              normalized.cantidad,
            );
            inventarioOrigen = updated.origin;
            inventarioDestino = updated.destination;
            break;
          }
          case TipoMovimiento.MERMA:
            inventarioOrigen = await this.inventarioService.applyShrinkage(
              transaction,
              normalized.sucursalOrigenId!,
              normalized.varianteProductoId,
              normalized.cantidad,
              normalized.origenUnidades!,
            );
            break;
        }

        const origin =
          normalized.sucursalOrigenId === null
            ? null
            : branches.get(normalized.sucursalOrigenId)!;
        const destination =
          normalized.sucursalDestinoId === null
            ? null
            : branches.get(normalized.sucursalDestinoId)!;
        const response = JSON.parse(
          JSON.stringify({
            movimiento: {
              id: movement.id,
              tipo: normalized.tipo,
              cantidad: normalized.cantidad,
              fecha: movement.fecha.toISOString(),
              observacion: normalized.observacion,
              usuario: {
                id: actor.id,
                nombre: actor.nombre,
                apellido: actor.apellido,
              },
              variante: { id: variant.id, sku: variant.sku },
              sucursalOrigen: origin
                ? { id: origin.id, nombre: origin.nombre }
                : null,
              sucursalDestino: destination
                ? { id: destination.id, nombre: destination.nombre }
                : null,
            },
            inventarioOrigen,
            inventarioDestino,
          }),
        ) as Prisma.InputJsonObject;

        await transaction.movimientoInventario.update({
          where: { id: movement.id },
          data: { resultadoIdempotente: response },
        });
        return response;
      });
    } catch (error: unknown) {
      if (!this.isPrismaError(error, 'P2002')) throw error;

      const concurrent = await this.findIdempotentResult(
        authenticatedUser.id,
        idempotencyKey,
      );
      if (!concurrent) throw error;
      return this.resolveIdempotentResult(concurrent, requestHash);
    }
  }

  async findAll(
    query: QueryMovimientosInventarioDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    const actor = await this.prisma.usuario.findUnique({
      where: { id: authenticatedUser.id },
      select: {
        id: true,
        estado: true,
        sucursalId: true,
        rol: { select: { nombre: true } },
      },
    });
    if (!actor || actor.estado !== 'ACTIVO') {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }
    const isAdministrator = actor.rol.nombre === ACTOR_ROLE.ADMINISTRADOR;
    if (
      !isAdministrator &&
      actor.rol.nombre !== ACTOR_ROLE.ENCARGADO_SUCURSAL
    ) {
      throw new ForbiddenException(
        'Tu rol no puede consultar movimientos de inventario.',
      );
    }
    if (!isAdministrator && actor.sucursalId === null) {
      throw new ForbiddenException(
        'El encargado no tiene una sucursal asignada.',
      );
    }
    if (
      !isAdministrator &&
      query.sucursalId !== undefined &&
      query.sucursalId !== actor.sucursalId
    ) {
      throw new ForbiddenException(
        'Solo puedes consultar movimientos de tu sucursal.',
      );
    }

    const fechaDesde = query.fechaDesde
      ? new Date(query.fechaDesde)
      : undefined;
    const fechaHasta = query.fechaHasta
      ? new Date(query.fechaHasta)
      : undefined;
    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      throw new BadRequestException(
        'fechaDesde no puede ser posterior a fechaHasta.',
      );
    }

    if (query.sucursalId !== undefined) {
      const branch = await this.prisma.sucursal.findUnique({
        where: { id: query.sucursalId },
        select: { id: true },
      });
      if (!branch) {
        throw new NotFoundException('No se encontró la sucursal solicitada.');
      }
    }

    const branchScope = isAdministrator ? query.sucursalId : actor.sucursalId!;
    const where: Prisma.MovimientoInventarioWhereInput = {
      ...(query.tipo === undefined ? {} : { tipo: query.tipo }),
      ...(query.varianteProductoId === undefined
        ? {}
        : { varianteProductoId: query.varianteProductoId }),
      ...(fechaDesde || fechaHasta
        ? {
            fecha: {
              ...(fechaDesde ? { gte: fechaDesde } : {}),
              ...(fechaHasta ? { lte: fechaHasta } : {}),
            },
          }
        : {}),
      ...(branchScope === undefined
        ? {}
        : {
            OR: [
              { sucursalOrigenId: branchScope },
              { sucursalDestinoId: branchScope },
            ],
          }),
    };
    const skip = (query.page - 1) * query.limit;
    const [records, total] = await Promise.all([
      this.prisma.movimientoInventario.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        select: movementSelect,
      }),
      this.prisma.movimientoInventario.count({ where }),
    ]);

    return {
      data: records.map((record) => this.mapMovement(record)),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  private normalizeAndValidate(
    input: CreateMovimientoInventarioDto,
  ): NormalizedMovementInput {
    const normalized: NormalizedMovementInput = {
      tipo: input.tipo,
      varianteProductoId: input.varianteProductoId,
      cantidad: input.cantidad,
      sucursalOrigenId: input.sucursalOrigenId ?? null,
      sucursalDestinoId: input.sucursalDestinoId ?? null,
      observacion: input.observacion?.trim() || null,
      cantidadNoDisponible: input.cantidadNoDisponible ?? null,
      origenUnidades: input.origenUnidades ?? null,
    };

    switch (normalized.tipo) {
      case TipoMovimiento.RECEPCION:
        this.requireBranchShape(normalized, false, true);
        this.rejectSpecialFields(normalized);
        break;
      case TipoMovimiento.TRANSFERENCIA:
        this.requireBranchShape(normalized, true, true);
        if (normalized.sucursalOrigenId === normalized.sucursalDestinoId) {
          throw new BadRequestException(
            'Las sucursales de origen y destino deben ser diferentes.',
          );
        }
        this.rejectSpecialFields(normalized);
        break;
      case TipoMovimiento.DEVOLUCION:
        this.requireBranchShape(normalized, false, true);
        if (normalized.origenUnidades !== null) {
          throw new BadRequestException(
            'origenUnidades solo puede enviarse para una merma.',
          );
        }
        if ((normalized.cantidadNoDisponible ?? 0) > normalized.cantidad) {
          throw new BadRequestException(
            'La cantidad no disponible no puede superar la cantidad devuelta.',
          );
        }
        break;
      case TipoMovimiento.MERMA:
        this.requireBranchShape(normalized, true, false);
        if (normalized.cantidadNoDisponible !== null) {
          throw new BadRequestException(
            'cantidadNoDisponible solo puede enviarse para una devolución.',
          );
        }
        if (normalized.origenUnidades === null) {
          throw new BadRequestException(
            'Debes indicar el grupo de unidades afectado por la merma.',
          );
        }
        if (normalized.observacion === null) {
          throw new BadRequestException(
            'La observación es obligatoria para registrar una merma.',
          );
        }
        break;
    }
    return normalized;
  }

  private requireBranchShape(
    input: NormalizedMovementInput,
    requiresOrigin: boolean,
    requiresDestination: boolean,
  ): void {
    if ((input.sucursalOrigenId !== null) !== requiresOrigin) {
      throw new BadRequestException(
        requiresOrigin
          ? 'La sucursal de origen es obligatoria para este movimiento.'
          : 'Este movimiento no admite una sucursal de origen.',
      );
    }
    if ((input.sucursalDestinoId !== null) !== requiresDestination) {
      throw new BadRequestException(
        requiresDestination
          ? 'La sucursal de destino es obligatoria para este movimiento.'
          : 'Este movimiento no admite una sucursal de destino.',
      );
    }
  }

  private rejectSpecialFields(input: NormalizedMovementInput): void {
    if (input.cantidadNoDisponible !== null) {
      throw new BadRequestException(
        'cantidadNoDisponible solo puede enviarse para una devolución.',
      );
    }
    if (input.origenUnidades !== null) {
      throw new BadRequestException(
        'origenUnidades solo puede enviarse para una merma.',
      );
    }
  }

  private async lockActor(
    transaction: Prisma.TransactionClient,
    userId: number,
  ): Promise<CurrentActorRow> {
    const rows = await transaction.$queryRaw<CurrentActorRow[]>`
      SELECT
        u."id" AS "id",
        u."nombre" AS "nombre",
        u."apellido" AS "apellido",
        u."estado" AS "estado",
        u."sucursal_id" AS "sucursalId",
        r."nombre" AS "role"
      FROM "usuarios" AS u
      INNER JOIN "roles" AS r ON r."id" = u."rol_id"
      WHERE u."id" = ${userId}
      FOR SHARE OF u
    `;
    const actor = rows[0];
    if (!actor || actor.estado !== 'ACTIVO') {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }
    return actor;
  }

  private authorize(
    actor: CurrentActorRow,
    input: NormalizedMovementInput,
  ): void {
    if (actor.role === ACTOR_ROLE.ADMINISTRADOR) return;
    if (actor.role !== ACTOR_ROLE.ENCARGADO_SUCURSAL) {
      throw new ForbiddenException(
        'Tu rol no puede registrar movimientos de inventario.',
      );
    }
    if (actor.sucursalId === null) {
      throw new ForbiddenException(
        'El encargado no tiene una sucursal asignada.',
      );
    }

    const managedBranch =
      input.tipo === TipoMovimiento.RECEPCION ||
      input.tipo === TipoMovimiento.DEVOLUCION
        ? input.sucursalDestinoId
        : input.sucursalOrigenId;
    if (managedBranch !== actor.sucursalId) {
      throw new ForbiddenException(
        'Solo puedes registrar movimientos autorizados para tu sucursal.',
      );
    }
  }

  private async lockResources(
    transaction: Prisma.TransactionClient,
    input: NormalizedMovementInput,
  ) {
    const variantRows = await transaction.$queryRaw<LockedVariantRow[]>`
      SELECT "id", "sku", "estado"
      FROM "variantes_producto"
      WHERE "id" = ${input.varianteProductoId}
      FOR SHARE
    `;
    const variant = variantRows[0];
    if (!variant) {
      throw new NotFoundException('No se encontró la variante solicitada.');
    }

    const branchIds = [input.sucursalOrigenId, input.sucursalDestinoId].filter(
      (id): id is number => id !== null,
    );
    const branchRows = await transaction.$queryRaw<LockedBranchRow[]>(
      Prisma.sql`
        SELECT "id", "nombre", "estado"
        FROM "sucursales"
        WHERE "id" IN (${Prisma.join(branchIds)})
        ORDER BY "id" ASC
        FOR SHARE
      `,
    );
    if (branchRows.length !== branchIds.length) {
      throw new NotFoundException(
        'No se encontró una de las sucursales solicitadas.',
      );
    }

    if (input.tipo !== TipoMovimiento.MERMA) {
      if (variant.estado !== 'ACTIVO') {
        throw new ConflictException(
          'La variante debe estar activa para registrar este movimiento.',
        );
      }
      if (branchRows.some((branch) => branch.estado !== 'ACTIVO')) {
        throw new ConflictException(
          'Las sucursales deben estar activas para registrar este movimiento.',
        );
      }
    }

    return {
      variant,
      branches: new Map(branchRows.map((branch) => [branch.id, branch])),
    };
  }

  private hashRequest(userId: number, input: NormalizedMovementInput): string {
    return createHash('sha256')
      .update(JSON.stringify({ userId, ...input }))
      .digest('hex');
  }

  private findIdempotentResult(userId: number, idempotencyKey: string) {
    return this.prisma.movimientoInventario.findUnique({
      where: {
        usuarioId_claveIdempotencia: {
          usuarioId: userId,
          claveIdempotencia: idempotencyKey,
        },
      },
      select: { hashSolicitud: true, resultadoIdempotente: true },
    });
  }

  private resolveIdempotentResult(
    previous: {
      hashSolicitud: string;
      resultadoIdempotente: Prisma.JsonValue;
    },
    requestHash: string,
  ) {
    if (previous.hashSolicitud !== requestHash) {
      throw new ConflictException(
        'La clave de idempotencia ya fue utilizada con otra solicitud.',
      );
    }
    return previous.resultadoIdempotente;
  }

  private mapMovement(record: MovementRecord) {
    return {
      id: record.id,
      tipo: record.tipo,
      cantidad: record.cantidad,
      fecha: record.fecha.toISOString(),
      observacion: record.observacion,
      usuario: record.usuario,
      variante: record.varianteProducto,
      sucursalOrigen: record.sucursalOrigen,
      sucursalDestino: record.sucursalDestino,
    };
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
