import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { ACTIVE_STATUS } from '../catalogos/catalogos.utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  QueryDetalleInventarioDto,
  QueryInventarioDto,
  UpdateDisponibilidadDto,
} from './inventario.dto.js';

type DatabaseInteger = bigint | number;

interface CantidadesDatabaseRow {
  cantidadFisica: DatabaseInteger;
  cantidadReservada: DatabaseInteger;
  cantidadNoDisponible: DatabaseInteger;
  cantidadDisponible: DatabaseInteger;
  agotado: boolean;
}

interface InventarioAgregadoRow extends CantidadesDatabaseRow {
  inventarioId: number | null;
  varianteId: number;
  sku: string;
  varianteEstado: string;
  productoId: number;
  productoNombre: string;
  productoEstado: string;
  tallaId: number;
  tallaNombre: string;
  tallaEstado: string;
  colorId: number;
  colorNombre: string;
  colorCodigoHex: string;
  colorEstado: string;
}

interface SucursalInventarioRow extends CantidadesDatabaseRow {
  inventarioId: number | null;
  id: number;
  nombre: string;
  ubicacion: string;
  estado: string;
  actualizadoEn: Date | null;
}

interface DisponibilidadPublicaSucursalRow {
  id: number;
  nombre: string;
  ubicacion: string;
  cantidadDisponible: DatabaseInteger;
  agotado: boolean;
}

interface CountRow {
  total: DatabaseInteger;
}

interface CurrentActorRow {
  id: number;
  estado: string;
  sucursalId: number | null;
  role: string;
}

interface LockedInventoryRow {
  id: number;
  sucursalId: number;
  cantidadFisica: number;
  cantidadReservada: number;
  cantidadNoDisponible: number;
}

interface LockedAvailabilityRow extends LockedInventoryRow {
  varianteProductoId: number;
}

interface AvailableQuantityRow {
  varianteProductoId: number;
  cantidadDisponible: DatabaseInteger;
}

export interface CantidadInventarioSolicitada {
  varianteProductoId: number;
  cantidad: number;
}

const MAX_POSTGRES_INTEGER = 2_147_483_647;

const availabilitySelect = {
  id: true,
  cantidadFisica: true,
  cantidadReservada: true,
  cantidadNoDisponible: true,
  actualizadoEn: true,
  sucursal: {
    select: { id: true, nombre: true, ubicacion: true, estado: true },
  },
  varianteProducto: {
    select: {
      id: true,
      sku: true,
      estado: true,
      producto: { select: { id: true, nombre: true, estado: true } },
      talla: { select: { id: true, nombre: true, estado: true } },
      color: {
        select: { id: true, nombre: true, codigoHex: true, estado: true },
      },
    },
  },
} satisfies Prisma.InventarioSelect;

type AvailabilityRecord = Prisma.InventarioGetPayload<{
  select: typeof availabilitySelect;
}>;

@Injectable()
export class InventarioService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableQuantities(
    transaction: Prisma.TransactionClient,
    sucursalId: number,
    variantIds: number[],
  ): Promise<Map<number, number>> {
    const uniqueIds = [...new Set(variantIds)].sort(
      (left, right) => left - right,
    );
    if (uniqueIds.length === 0) return new Map();

    const rows = await transaction.$queryRaw<AvailableQuantityRow[]>(Prisma.sql`
      SELECT
        "variante_producto_id" AS "varianteProductoId",
        ("cantidad_fisica" - "cantidad_reservada" - "cantidad_no_disponible")::bigint
          AS "cantidadDisponible"
      FROM "inventarios"
      WHERE "sucursal_id" = ${sucursalId}
        AND "variante_producto_id" IN (${Prisma.join(uniqueIds)})
      ORDER BY "variante_producto_id" ASC
    `);
    const quantities = new Map<number, number>(
      uniqueIds.map((variantId) => [variantId, 0]),
    );
    for (const row of rows) {
      quantities.set(
        row.varianteProductoId,
        this.toSafeNumber(row.cantidadDisponible),
      );
    }
    return quantities;
  }

  async ensureAvailability(
    transaction: Prisma.TransactionClient,
    sucursalId: number,
    requested: CantidadInventarioSolicitada[],
  ): Promise<void> {
    if (requested.length === 0) return;
    const variantIds = requested.map((item) => item.varianteProductoId);
    const inventories = await transaction.$queryRaw<LockedAvailabilityRow[]>(
      Prisma.sql`
        SELECT
          "id" AS "id",
          "sucursal_id" AS "sucursalId",
          "variante_producto_id" AS "varianteProductoId",
          "cantidad_fisica" AS "cantidadFisica",
          "cantidad_reservada" AS "cantidadReservada",
          "cantidad_no_disponible" AS "cantidadNoDisponible"
        FROM "inventarios"
        WHERE "sucursal_id" = ${sucursalId}
          AND "variante_producto_id" IN (${Prisma.join(variantIds)})
        ORDER BY "variante_producto_id" ASC
        FOR SHARE
      `,
    );
    const byVariant = new Map(
      inventories.map((inventory) => [inventory.varianteProductoId, inventory]),
    );

    for (const item of requested) {
      const inventory = byVariant.get(item.varianteProductoId);
      const available = inventory
        ? inventory.cantidadFisica -
          inventory.cantidadReservada -
          inventory.cantidadNoDisponible
        : 0;
      if (available < item.cantidad) {
        throw new ConflictException(
          'No existen suficientes unidades disponibles para una de las variantes.',
        );
      }
    }
  }

  async applySaleOutput(
    transaction: Prisma.TransactionClient,
    sucursalId: number,
    requested: CantidadInventarioSolicitada[],
  ) {
    if (requested.length === 0) return [];
    const ordered = [...requested].sort(
      (left, right) => left.varianteProductoId - right.varianteProductoId,
    );
    const variantIds = ordered.map((item) => item.varianteProductoId);
    const inventories = await transaction.$queryRaw<LockedAvailabilityRow[]>(
      Prisma.sql`
        SELECT
          "id" AS "id",
          "sucursal_id" AS "sucursalId",
          "variante_producto_id" AS "varianteProductoId",
          "cantidad_fisica" AS "cantidadFisica",
          "cantidad_reservada" AS "cantidadReservada",
          "cantidad_no_disponible" AS "cantidadNoDisponible"
        FROM "inventarios"
        WHERE "sucursal_id" = ${sucursalId}
          AND "variante_producto_id" IN (${Prisma.join(variantIds)})
        ORDER BY "variante_producto_id" ASC
        FOR UPDATE
      `,
    );
    const byVariant = new Map(
      inventories.map((inventory) => [inventory.varianteProductoId, inventory]),
    );

    for (const item of ordered) {
      const inventory = byVariant.get(item.varianteProductoId);
      const available = inventory
        ? inventory.cantidadFisica -
          inventory.cantidadReservada -
          inventory.cantidadNoDisponible
        : 0;
      if (available < item.cantidad) {
        throw new ConflictException(
          'No existen suficientes unidades disponibles para completar la venta.',
        );
      }
    }

    const updated = [];
    for (const item of ordered) {
      const inventory = byVariant.get(item.varianteProductoId)!;
      const record = await transaction.inventario.update({
        where: { id: inventory.id },
        data: { cantidadFisica: { decrement: item.cantidad } },
        select: availabilitySelect,
      });
      updated.push(this.mapAvailabilityRecord(record));
    }
    return updated;
  }

  async findAll(query: QueryInventarioDto) {
    if (query.sucursalId !== undefined) {
      const sucursal = await this.prisma.sucursal.findUnique({
        where: { id: query.sucursalId },
        select: { id: true },
      });
      if (!sucursal) {
        throw new NotFoundException('No se encontró la sucursal solicitada.');
      }
    }

    const aggregatedQuery = this.buildAggregatedQuery(query);
    const skip = (query.page - 1) * query.limit;
    const [rows, totals] = await Promise.all([
      this.prisma.$queryRaw<InventarioAgregadoRow[]>(Prisma.sql`
        ${aggregatedQuery}
        ORDER BY "varianteId" DESC
        LIMIT ${query.limit} OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "total"
        FROM (${aggregatedQuery}) AS "inventario_agregado"
      `),
    ]);

    return {
      data: rows.map((row) => this.mapAggregatedRow(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total: this.toSafeNumber(totals[0]?.total ?? 0),
      },
    };
  }

  async findVariant(varianteId: number, query: QueryDetalleInventarioDto) {
    const variante = await this.prisma.varianteProducto.findUnique({
      where: { id: varianteId },
      select: {
        id: true,
        sku: true,
        estado: true,
        producto: { select: { id: true, nombre: true, estado: true } },
        talla: { select: { id: true, nombre: true, estado: true } },
        color: {
          select: { id: true, nombre: true, codigoHex: true, estado: true },
        },
      },
    });
    if (!variante) {
      throw new NotFoundException('No se encontró la variante solicitada.');
    }

    const skip = (query.page - 1) * query.limit;
    const [branches, totalBranches, aggregate] = await Promise.all([
      this.prisma.$queryRaw<SucursalInventarioRow[]>(Prisma.sql`
        SELECT
          i."id" AS "inventarioId",
          s."id" AS "id",
          s."nombre" AS "nombre",
          s."ubicacion" AS "ubicacion",
          s."estado" AS "estado",
          COALESCE(i."cantidad_fisica", 0) AS "cantidadFisica",
          COALESCE(i."cantidad_reservada", 0) AS "cantidadReservada",
          COALESCE(i."cantidad_no_disponible", 0) AS "cantidadNoDisponible",
          COALESCE(i."cantidad_fisica" - i."cantidad_reservada" - i."cantidad_no_disponible", 0) AS "cantidadDisponible",
          COALESCE(i."cantidad_fisica" - i."cantidad_reservada" - i."cantidad_no_disponible", 0) = 0 AS "agotado",
          i."actualizado_en" AS "actualizadoEn"
        FROM "sucursales" AS s
        LEFT JOIN "inventarios" AS i
          ON i."sucursal_id" = s."id"
          AND i."variante_producto_id" = ${varianteId}
        ORDER BY s."id" ASC
        LIMIT ${query.limit} OFFSET ${skip}
      `),
      this.prisma.sucursal.count(),
      this.prisma.$queryRaw<CantidadesDatabaseRow[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(i."cantidad_fisica"), 0)::bigint AS "cantidadFisica",
          COALESCE(SUM(i."cantidad_reservada"), 0)::bigint AS "cantidadReservada",
          COALESCE(SUM(i."cantidad_no_disponible"), 0)::bigint AS "cantidadNoDisponible",
          COALESCE(SUM(i."cantidad_fisica" - i."cantidad_reservada" - i."cantidad_no_disponible"), 0)::bigint AS "cantidadDisponible",
          COALESCE(SUM(i."cantidad_fisica" - i."cantidad_reservada" - i."cantidad_no_disponible"), 0) = 0 AS "agotado"
        FROM "inventarios" AS i
        WHERE i."variante_producto_id" = ${varianteId}
      `),
    ]);

    return {
      variante,
      totales: this.mapDatabaseQuantities(aggregate[0]),
      sucursales: {
        data: branches.map((branch) => ({
          inventarioId: branch.inventarioId,
          id: branch.id,
          nombre: branch.nombre,
          ubicacion: branch.ubicacion,
          estado: branch.estado,
          ...this.mapDatabaseQuantities(branch),
          actualizadoEn: branch.actualizadoEn,
        })),
        meta: { page: query.page, limit: query.limit, total: totalBranches },
      },
    };
  }

  async findPublicVariantAvailability(
    varianteId: number,
    query: QueryDetalleInventarioDto,
  ) {
    const variante = await this.prisma.varianteProducto.findUnique({
      where: { id: varianteId },
      select: {
        id: true,
        sku: true,
        estado: true,
        producto: {
          select: {
            id: true,
            nombre: true,
            estado: true,
            categoria: { select: { estado: true } },
          },
        },
        talla: { select: { id: true, nombre: true, estado: true } },
        color: {
          select: { id: true, nombre: true, codigoHex: true, estado: true },
        },
      },
    });
    if (
      !variante ||
      variante.estado !== ACTIVE_STATUS ||
      variante.producto.estado !== ACTIVE_STATUS ||
      variante.producto.categoria.estado !== ACTIVE_STATUS ||
      variante.talla.estado !== ACTIVE_STATUS ||
      variante.color.estado !== ACTIVE_STATUS
    ) {
      throw new NotFoundException('No se encontró la variante solicitada.');
    }

    const skip = (query.page - 1) * query.limit;
    const [branches, totalBranches] = await Promise.all([
      this.prisma.$queryRaw<DisponibilidadPublicaSucursalRow[]>(Prisma.sql`
        SELECT
          s."id" AS "id",
          s."nombre" AS "nombre",
          s."ubicacion" AS "ubicacion",
          COALESCE(i."cantidad_fisica" - i."cantidad_reservada" - i."cantidad_no_disponible", 0)::bigint AS "cantidadDisponible",
          COALESCE(i."cantidad_fisica" - i."cantidad_reservada" - i."cantidad_no_disponible", 0) = 0 AS "agotado"
        FROM "sucursales" AS s
        LEFT JOIN "inventarios" AS i
          ON i."sucursal_id" = s."id"
          AND i."variante_producto_id" = ${varianteId}
        WHERE s."estado" = ${ACTIVE_STATUS}
        ORDER BY s."id" ASC
        LIMIT ${query.limit} OFFSET ${skip}
      `),
      this.prisma.sucursal.count({ where: { estado: ACTIVE_STATUS } }),
    ]);

    return {
      variante: {
        id: variante.id,
        sku: variante.sku,
        producto: {
          id: variante.producto.id,
          nombre: variante.producto.nombre,
        },
        talla: { id: variante.talla.id, nombre: variante.talla.nombre },
        color: {
          id: variante.color.id,
          nombre: variante.color.nombre,
          codigoHex: variante.color.codigoHex,
        },
      },
      sucursales: {
        data: branches.map((branch) => ({
          id: branch.id,
          nombre: branch.nombre,
          ubicacion: branch.ubicacion,
          cantidadDisponible: this.toSafeNumber(branch.cantidadDisponible),
          agotado: branch.agotado,
        })),
        meta: { page: query.page, limit: query.limit, total: totalBranches },
      },
    };
  }

  async updateAvailability(
    id: number,
    input: UpdateDisponibilidadDto,
    authenticatedUser: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const actorRows = await transaction.$queryRaw<CurrentActorRow[]>`
        SELECT
          u."id" AS "id",
          u."estado" AS "estado",
          u."sucursal_id" AS "sucursalId",
          r."nombre" AS "role"
        FROM "usuarios" AS u
        INNER JOIN "roles" AS r ON r."id" = u."rol_id"
        WHERE u."id" = ${authenticatedUser.id}
        FOR SHARE OF u
      `;
      const actor = actorRows[0];
      if (!actor || actor.estado !== 'ACTIVO') {
        throw new UnauthorizedException('La cuenta no está disponible.');
      }

      const inventoryRows = await transaction.$queryRaw<LockedInventoryRow[]>`
        SELECT
          "id" AS "id",
          "sucursal_id" AS "sucursalId",
          "cantidad_fisica" AS "cantidadFisica",
          "cantidad_reservada" AS "cantidadReservada",
          "cantidad_no_disponible" AS "cantidadNoDisponible"
        FROM "inventarios"
        WHERE "id" = ${id}
        FOR UPDATE
      `;
      const inventory = inventoryRows[0];
      if (!inventory) {
        throw new NotFoundException('No se encontró el inventario solicitado.');
      }

      const isAdministrator = actor.role === ACTOR_ROLE.ADMINISTRADOR;
      const managesOwnBranch =
        actor.role === ACTOR_ROLE.ENCARGADO_SUCURSAL &&
        actor.sucursalId !== null &&
        actor.sucursalId === inventory.sucursalId;
      if (!isAdministrator && !managesOwnBranch) {
        throw new ForbiddenException(
          'Solo puedes modificar la disponibilidad de tu sucursal.',
        );
      }

      if (
        inventory.cantidadNoDisponible !== input.cantidadNoDisponibleEsperada
      ) {
        throw new ConflictException(
          'La disponibilidad cambió desde la última consulta. Vuelve a consultar el inventario.',
        );
      }

      const maximumUnavailable =
        inventory.cantidadFisica - inventory.cantidadReservada;
      if (input.cantidadNoDisponible > maximumUnavailable) {
        throw new BadRequestException(
          'La cantidad no disponible supera las unidades que pueden apartarse.',
        );
      }

      const updated = await transaction.inventario.update({
        where: { id },
        data: { cantidadNoDisponible: input.cantidadNoDisponible },
        select: availabilitySelect,
      });
      return this.mapAvailabilityRecord(updated);
    });
  }

  async applyStockEntry(
    transaction: Prisma.TransactionClient,
    sucursalId: number,
    varianteProductoId: number,
    cantidadFisica: number,
    cantidadNoDisponible = 0,
  ) {
    await this.createInventoryIfMissing(
      transaction,
      sucursalId,
      varianteProductoId,
    );
    const inventory = await this.lockInventory(
      transaction,
      sucursalId,
      varianteProductoId,
    );

    if (
      inventory.cantidadFisica > MAX_POSTGRES_INTEGER - cantidadFisica ||
      inventory.cantidadNoDisponible >
        MAX_POSTGRES_INTEGER - cantidadNoDisponible
    ) {
      throw new ConflictException(
        'La operación supera la capacidad máxima del inventario.',
      );
    }

    const updated = await transaction.inventario.update({
      where: { id: inventory.id },
      data: {
        cantidadFisica: { increment: cantidadFisica },
        cantidadNoDisponible: { increment: cantidadNoDisponible },
      },
      select: availabilitySelect,
    });
    return this.mapAvailabilityRecord(updated);
  }

  async applyTransfer(
    transaction: Prisma.TransactionClient,
    varianteProductoId: number,
    sucursalOrigenId: number,
    sucursalDestinoId: number,
    cantidad: number,
  ) {
    await this.createInventoryIfMissing(
      transaction,
      sucursalDestinoId,
      varianteProductoId,
    );

    const inventories = await transaction.$queryRaw<LockedInventoryRow[]>`
      SELECT
        "id" AS "id",
        "sucursal_id" AS "sucursalId",
        "cantidad_fisica" AS "cantidadFisica",
        "cantidad_reservada" AS "cantidadReservada",
        "cantidad_no_disponible" AS "cantidadNoDisponible"
      FROM "inventarios"
      WHERE "variante_producto_id" = ${varianteProductoId}
        AND "sucursal_id" IN (${sucursalOrigenId}, ${sucursalDestinoId})
      ORDER BY "sucursal_id" ASC
      FOR UPDATE
    `;
    const origin = inventories.find(
      (inventory) => inventory.sucursalId === sucursalOrigenId,
    );
    const destination = inventories.find(
      (inventory) => inventory.sucursalId === sucursalDestinoId,
    );
    if (!origin || !destination) {
      throw new ConflictException(
        'La sucursal de origen no tiene inventario para la variante.',
      );
    }

    const available =
      origin.cantidadFisica -
      origin.cantidadReservada -
      origin.cantidadNoDisponible;
    if (available < cantidad) {
      throw new ConflictException(
        'No existen suficientes unidades disponibles para la transferencia.',
      );
    }
    if (destination.cantidadFisica > MAX_POSTGRES_INTEGER - cantidad) {
      throw new ConflictException(
        'La operación supera la capacidad máxima del inventario destino.',
      );
    }

    const updatedOrigin = await transaction.inventario.update({
      where: { id: origin.id },
      data: { cantidadFisica: { decrement: cantidad } },
      select: availabilitySelect,
    });
    const updatedDestination = await transaction.inventario.update({
      where: { id: destination.id },
      data: { cantidadFisica: { increment: cantidad } },
      select: availabilitySelect,
    });

    return {
      origin: this.mapAvailabilityRecord(updatedOrigin),
      destination: this.mapAvailabilityRecord(updatedDestination),
    };
  }

  async applyShrinkage(
    transaction: Prisma.TransactionClient,
    sucursalId: number,
    varianteProductoId: number,
    cantidad: number,
    source: 'DISPONIBLE' | 'NO_DISPONIBLE',
  ) {
    const inventory = await this.lockInventory(
      transaction,
      sucursalId,
      varianteProductoId,
      false,
    );
    if (!inventory) {
      throw new ConflictException(
        'La sucursal no tiene inventario para la variante.',
      );
    }

    if (source === 'NO_DISPONIBLE') {
      if (inventory.cantidadNoDisponible < cantidad) {
        throw new ConflictException(
          'No existen suficientes unidades no disponibles para la merma.',
        );
      }
    } else {
      const available =
        inventory.cantidadFisica -
        inventory.cantidadReservada -
        inventory.cantidadNoDisponible;
      if (available < cantidad) {
        throw new ConflictException(
          'No existen suficientes unidades disponibles para la merma.',
        );
      }
    }

    const updated = await transaction.inventario.update({
      where: { id: inventory.id },
      data: {
        cantidadFisica: { decrement: cantidad },
        ...(source === 'NO_DISPONIBLE'
          ? { cantidadNoDisponible: { decrement: cantidad } }
          : {}),
      },
      select: availabilitySelect,
    });
    return this.mapAvailabilityRecord(updated);
  }

  private buildAggregatedQuery(query: QueryInventarioDto): Prisma.Sql {
    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (query.nombre !== undefined) {
      conditions.push(
        Prisma.sql`POSITION(LOWER(${query.nombre}) IN LOWER(p."nombre")) > 0`,
      );
    }
    if (query.sku !== undefined) {
      conditions.push(Prisma.sql`POSITION(${query.sku} IN v."sku") > 0`);
    }
    if (query.productoId !== undefined) {
      conditions.push(Prisma.sql`v."producto_id" = ${query.productoId}`);
    }
    if (query.tallaId !== undefined) {
      conditions.push(Prisma.sql`v."talla_id" = ${query.tallaId}`);
    }
    if (query.colorId !== undefined) {
      conditions.push(Prisma.sql`v."color_id" = ${query.colorId}`);
    }

    const branchJoin =
      query.sucursalId === undefined
        ? Prisma.empty
        : Prisma.sql`AND i."sucursal_id" = ${query.sucursalId}`;
    const availableExpression = Prisma.sql`
      COALESCE(SUM(i."cantidad_fisica" - i."cantidad_reservada" - i."cantidad_no_disponible"), 0)
    `;
    const inventoryIdExpression =
      query.sucursalId === undefined
        ? Prisma.sql`NULL::integer`
        : Prisma.sql`MAX(i."id")`;
    const exhaustedFilter =
      query.agotado === undefined
        ? Prisma.empty
        : query.agotado
          ? Prisma.sql`HAVING ${availableExpression} = 0`
          : Prisma.sql`HAVING ${availableExpression} > 0`;

    return Prisma.sql`
      SELECT
        ${inventoryIdExpression} AS "inventarioId",
        v."id" AS "varianteId",
        v."sku" AS "sku",
        v."estado" AS "varianteEstado",
        p."id" AS "productoId",
        p."nombre" AS "productoNombre",
        p."estado" AS "productoEstado",
        t."id" AS "tallaId",
        t."nombre" AS "tallaNombre",
        t."estado" AS "tallaEstado",
        c."id" AS "colorId",
        c."nombre" AS "colorNombre",
        c."codigo_hex" AS "colorCodigoHex",
        c."estado" AS "colorEstado",
        COALESCE(SUM(i."cantidad_fisica"), 0)::bigint AS "cantidadFisica",
        COALESCE(SUM(i."cantidad_reservada"), 0)::bigint AS "cantidadReservada",
        COALESCE(SUM(i."cantidad_no_disponible"), 0)::bigint AS "cantidadNoDisponible",
        ${availableExpression}::bigint AS "cantidadDisponible",
        ${availableExpression} = 0 AS "agotado"
      FROM "variantes_producto" AS v
      INNER JOIN "productos" AS p ON p."id" = v."producto_id"
      INNER JOIN "tallas" AS t ON t."id" = v."talla_id"
      INNER JOIN "colores" AS c ON c."id" = v."color_id"
      LEFT JOIN "inventarios" AS i
        ON i."variante_producto_id" = v."id"
        ${branchJoin}
      WHERE ${Prisma.join(conditions, ' AND ')}
      GROUP BY
        v."id",
        p."id",
        t."id",
        c."id"
      ${exhaustedFilter}
    `;
  }

  private async createInventoryIfMissing(
    transaction: Prisma.TransactionClient,
    sucursalId: number,
    varianteProductoId: number,
  ): Promise<void> {
    await transaction.$executeRaw`
      INSERT INTO "inventarios" (
        "sucursal_id",
        "variante_producto_id",
        "cantidad_fisica",
        "cantidad_reservada",
        "cantidad_no_disponible",
        "actualizado_en"
      )
      VALUES (${sucursalId}, ${varianteProductoId}, 0, 0, 0, CURRENT_TIMESTAMP)
      ON CONFLICT ("sucursal_id", "variante_producto_id") DO NOTHING
    `;
  }

  private async lockInventory(
    transaction: Prisma.TransactionClient,
    sucursalId: number,
    varianteProductoId: number,
    required?: true,
  ): Promise<LockedInventoryRow>;
  private async lockInventory(
    transaction: Prisma.TransactionClient,
    sucursalId: number,
    varianteProductoId: number,
    required: false,
  ): Promise<LockedInventoryRow | undefined>;
  private async lockInventory(
    transaction: Prisma.TransactionClient,
    sucursalId: number,
    varianteProductoId: number,
    required = true,
  ): Promise<LockedInventoryRow | undefined> {
    const rows = await transaction.$queryRaw<LockedInventoryRow[]>`
      SELECT
        "id" AS "id",
        "sucursal_id" AS "sucursalId",
        "cantidad_fisica" AS "cantidadFisica",
        "cantidad_reservada" AS "cantidadReservada",
        "cantidad_no_disponible" AS "cantidadNoDisponible"
      FROM "inventarios"
      WHERE "sucursal_id" = ${sucursalId}
        AND "variante_producto_id" = ${varianteProductoId}
      FOR UPDATE
    `;
    const inventory = rows[0];
    if (!inventory && required) {
      throw new InternalServerErrorException(
        'No se pudo preparar el inventario para la operación.',
      );
    }
    return inventory;
  }

  private mapAggregatedRow(row: InventarioAgregadoRow) {
    return {
      inventarioId: row.inventarioId,
      variante: {
        id: row.varianteId,
        sku: row.sku,
        estado: row.varianteEstado,
        producto: {
          id: row.productoId,
          nombre: row.productoNombre,
          estado: row.productoEstado,
        },
        talla: {
          id: row.tallaId,
          nombre: row.tallaNombre,
          estado: row.tallaEstado,
        },
        color: {
          id: row.colorId,
          nombre: row.colorNombre,
          codigoHex: row.colorCodigoHex,
          estado: row.colorEstado,
        },
      },
      ...this.mapDatabaseQuantities(row),
    };
  }

  private mapDatabaseQuantities(row: CantidadesDatabaseRow | undefined) {
    const cantidadFisica = this.toSafeNumber(row?.cantidadFisica ?? 0);
    const cantidadReservada = this.toSafeNumber(row?.cantidadReservada ?? 0);
    const cantidadNoDisponible = this.toSafeNumber(
      row?.cantidadNoDisponible ?? 0,
    );
    const cantidadDisponible = this.toSafeNumber(row?.cantidadDisponible ?? 0);
    return {
      cantidadFisica,
      cantidadReservada,
      cantidadNoDisponible,
      cantidadDisponible,
      agotado: row?.agotado ?? true,
    };
  }

  private mapAvailabilityRecord(record: AvailabilityRecord) {
    const cantidadDisponible =
      record.cantidadFisica -
      record.cantidadReservada -
      record.cantidadNoDisponible;
    return {
      inventarioId: record.id,
      sucursal: record.sucursal,
      variante: {
        id: record.varianteProducto.id,
        sku: record.varianteProducto.sku,
        estado: record.varianteProducto.estado,
        producto: record.varianteProducto.producto,
        talla: record.varianteProducto.talla,
        color: record.varianteProducto.color,
      },
      cantidadFisica: record.cantidadFisica,
      cantidadReservada: record.cantidadReservada,
      cantidadNoDisponible: record.cantidadNoDisponible,
      cantidadDisponible,
      agotado: cantidadDisponible === 0,
      actualizadoEn: record.actualizadoEn,
    };
  }

  private toSafeNumber(value: DatabaseInteger): number {
    const numericValue = Number(value);
    if (!Number.isSafeInteger(numericValue) || numericValue < 0) {
      throw new InternalServerErrorException(
        'La cantidad almacenada no puede representarse de forma segura.',
      );
    }
    return numericValue;
  }
}
