import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ACTOR_ROLE } from '../../auth/auth.constants.js';
import type { AuthenticatedUser } from '../../auth/guards/jwt-auth.guard.js';
import {
  FiltrosInventarioReporte,
  GrupoInventarioReporte,
  InventarioService,
} from '../../inventario/inventario.service.js';
import {
  ReportGroupBy,
  ReportMetric,
  ReportQueryDto,
  ReportQueryResponseDto,
} from './report-query.dto.js';
import { validateReportSelection } from './report-query.policy.js';
import { projectReportRows } from './report-query.mapper.js';

type SalesMetric =
  | ReportMetric.REVENUE
  | ReportMetric.SALES_COUNT
  | ReportMetric.UNITS_SOLD;
type InventoryMetric =
  | ReportMetric.AVAILABLE_STOCK
  | ReportMetric.RESERVED_STOCK;
type ReportRow = Record<string, number | string>;

interface RawMetricRow extends Record<string, unknown> {
  value?: number | bigint | Prisma.Decimal | string | null;
}

const TIME_ZONE = 'America/La_Paz';
const joinSql = (parts: Prisma.Sql[], separator = ','): Prisma.Sql =>
  parts.length ? Prisma.join(parts, separator) : Prisma.empty;
const metricField: Record<ReportMetric, string> = {
  [ReportMetric.REVENUE]: 'revenue',
  [ReportMetric.SALES_COUNT]: 'salesCount',
  [ReportMetric.UNITS_SOLD]: 'unitsSold',
  [ReportMetric.AVAILABLE_STOCK]: 'availableStock',
  [ReportMetric.RESERVED_STOCK]: 'reservedStock',
};

const dimensionSql: Record<ReportGroupBy, { fields: Prisma.Sql; groups: Prisma.Sql }> = {
  [ReportGroupBy.BRANCH]: {
    fields: Prisma.sql`s."id" AS "branchId", s."nombre" AS "branch"`,
    groups: Prisma.sql`s."id", s."nombre"`,
  },
  [ReportGroupBy.PRODUCT]: {
    fields: Prisma.sql`p."id" AS "productId", p."nombre" AS "product"`,
    groups: Prisma.sql`p."id", p."nombre"`,
  },
  [ReportGroupBy.CATEGORY]: {
    fields: Prisma.sql`c."id" AS "categoryId", c."nombre" AS "category"`,
    groups: Prisma.sql`c."id", c."nombre"`,
  },
  [ReportGroupBy.DAY]: {
    fields: Prisma.sql`((v."fecha" AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date::text AS "day"`,
    groups: Prisma.sql`((v."fecha" AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date`,
  },
  [ReportGroupBy.MONTH]: {
    fields: Prisma.sql`date_trunc('month', (v."fecha" AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date::text AS "month"`,
    groups: Prisma.sql`date_trunc('month', (v."fecha" AT TIME ZONE 'UTC') AT TIME ZONE 'America/La_Paz')::date`,
  },
};

@Injectable()
export class ReportQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventarioService: InventarioService,
  ) {}

  async query(
    dto: ReportQueryDto,
    user: AuthenticatedUser,
  ): Promise<ReportQueryResponseDto> {
    const groupBy = dto.groupBy ?? [];
    validateReportSelection(dto);
    this.validateCombination(dto, groupBy);
    const filters = await this.scopeFilters(dto.filters ?? {}, user);
    const order = dto.order ?? 'desc';
    const limit = dto.limit ?? 20;

    const grouped = new Map<string, ReportRow>();
    const groupKeyNames = groupBy.flatMap((dimension) =>
      this.dimensionKeyNames(dimension),
    );
    for (const metric of dto.metrics) {
      const rows = this.isInventoryMetric(metric)
        ? await this.queryInventoryMetric(metric, groupBy, filters, order, limit)
        : await this.querySalesMetric(metric, groupBy, filters, dto, order, limit);

      for (const row of rows) {
        const dimensions = Object.fromEntries(
          groupKeyNames
            .filter((key) => row[key] !== undefined)
            .map((key) => [key, row[key]!]),
        ) as ReportRow;
        const key = JSON.stringify(dimensions);
        const current = grouped.get(key) ?? { ...dimensions };
        current[metricField[metric]] = this.toNumber(
          row.value ?? row[metricField[metric]] ?? 0,
        );
        grouped.set(key, current);
      }
    }

    const data = [...grouped.values()];
    for (const row of data) {
      for (const metric of dto.metrics) {
        row[metricField[metric]] ??= 0;
      }
    }
    data.sort((left, right) => {
      const field = metricField[dto.metrics[0]!];
      const difference = Number(left[field] ?? 0) - Number(right[field] ?? 0);
      if (difference !== 0) return order === 'asc' ? difference : -difference;
      return JSON.stringify(left).localeCompare(JSON.stringify(right));
    });

    return {
      metrics: dto.metrics,
      groupBy,
      period: {
        from: dto.dateFrom ?? null,
        to: dto.dateTo ?? null,
        timeZone: TIME_ZONE,
      },
      data: projectReportRows(
        data.slice(0, limit),
        dto.select,
        groupBy,
      ),
    };
  }

  private async scopeFilters(
    filters: NonNullable<ReportQueryDto['filters']>,
    user: AuthenticatedUser,
  ): Promise<NonNullable<ReportQueryDto['filters']>> {
    if (user.role === ACTOR_ROLE.ADMINISTRADOR) return filters;
    if (user.role !== ACTOR_ROLE.ENCARGADO_SUCURSAL) {
      throw new ForbiddenException('Tu rol no puede consultar reportes internos.');
    }
    const actor = await this.prisma.usuario.findUnique({
      where: { id: user.id },
      select: { estado: true, sucursalId: true },
    });
    if (!actor || actor.estado !== 'ACTIVO') {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }
    if (actor.sucursalId === null) {
      throw new ForbiddenException('El encargado no tiene una sucursal asignada.');
    }
    if (
      filters.branchId !== undefined &&
      filters.branchId !== actor.sucursalId
    ) {
      throw new ForbiddenException(
        'Solo puedes consultar reportes de tu sucursal asignada.',
      );
    }
    return {
      branchId: actor.sucursalId,
      productId: filters.productId,
      categoryId: filters.categoryId,
    };
  }

  private validateCombination(dto: ReportQueryDto, groupBy: ReportGroupBy[]): void {
    const metrics = new Set(dto.metrics);
    const hasSales = dto.metrics.some((metric) => !this.isInventoryMetric(metric));
    const hasInventory = dto.metrics.some((metric) => this.isInventoryMetric(metric));
    if (dto.dateFrom && dto.dateTo && dto.dateFrom > dto.dateTo) {
      throw new BadRequestException('dateFrom debe ser menor o igual que dateTo.');
    }
    if (!hasSales && (dto.dateFrom || dto.dateTo)) {
      throw new BadRequestException(
        'Los filtros de fecha solo aplican a métricas de ventas.',
      );
    }
    if (
      metrics.has(ReportMetric.REVENUE) &&
      groupBy.some((dimension) =>
        [ReportGroupBy.PRODUCT, ReportGroupBy.CATEGORY].includes(dimension),
      )
    ) {
      throw new BadRequestException(
        'revenue no puede agruparse por producto o categoría porque debe usar Venta.total.',
      );
    }
    if (
      hasInventory &&
      groupBy.some((dimension) =>
        [ReportGroupBy.DAY, ReportGroupBy.MONTH].includes(dimension),
      )
    ) {
      throw new BadRequestException(
        'El inventario es actual y no admite agrupaciones temporales.',
      );
    }
  }

  private async querySalesMetric(
    metric: SalesMetric,
    groupBy: ReportGroupBy[],
    filters: NonNullable<ReportQueryDto['filters']>,
    dto: ReportQueryDto,
    order: 'asc' | 'desc',
    limit: number,
  ): Promise<RawMetricRow[]> {
    const needsDetails =
      metric === ReportMetric.UNITS_SOLD ||
      groupBy.some((dimension) =>
        [ReportGroupBy.PRODUCT, ReportGroupBy.CATEGORY].includes(dimension),
      );
    const needsProductDimensions = groupBy.some((dimension) =>
      [ReportGroupBy.PRODUCT, ReportGroupBy.CATEGORY].includes(dimension),
    );
    const needsProductFilterJoins =
      metric === ReportMetric.UNITS_SOLD &&
      (filters.productId !== undefined || filters.categoryId !== undefined);
    const needsProducts = needsProductDimensions || needsProductFilterJoins;
    const needsCategories =
      groupBy.includes(ReportGroupBy.CATEGORY) ||
      (needsProducts && filters.categoryId !== undefined);
    const needsBranch = groupBy.includes(ReportGroupBy.BRANCH);
    const joins: Prisma.Sql[] = [];
    if (needsDetails) {
      joins.push(
        Prisma.sql`INNER JOIN "detalles_venta" AS d ON d."venta_id" = v."id"`,
      );
    }
    if (needsProducts) {
      if (!needsDetails) {
        joins.push(
          Prisma.sql`INNER JOIN "detalles_venta" AS d ON d."venta_id" = v."id"`,
        );
      }
      joins.push(
        Prisma.sql`INNER JOIN "variantes_producto" AS vp ON vp."id" = d."variante_producto_id"`,
      );
      joins.push(
        Prisma.sql`INNER JOIN "productos" AS p ON p."id" = vp."producto_id"`,
      );
    }
    if (needsCategories) {
      joins.push(
        Prisma.sql`INNER JOIN "categorias" AS c ON c."id" = p."categoria_id"`,
      );
    }
    if (needsBranch) {
      joins.push(
        Prisma.sql`INNER JOIN "sucursales" AS s ON s."id" = v."sucursal_id"`,
      );
    }

    const groups = groupBy.map((dimension) => dimensionSql[dimension].groups);
    const selections = groupBy.map(
      (dimension) => dimensionSql[dimension].fields,
    );
    const where: Prisma.Sql[] = [
      Prisma.sql`v."estado" = ${'PAGADA'}::"EstadoVenta"`,
    ];
    if (filters.branchId !== undefined) {
      where.push(Prisma.sql`v."sucursal_id" = ${filters.branchId}`);
    }
    if (dto.dateFrom) {
      where.push(
        Prisma.sql`v."fecha" >= (${dto.dateFrom}::date::timestamp AT TIME ZONE 'America/La_Paz' AT TIME ZONE 'UTC')`,
      );
    }
    if (dto.dateTo) {
      where.push(
        Prisma.sql`v."fecha" < ((${dto.dateTo}::date + 1)::timestamp AT TIME ZONE 'America/La_Paz' AT TIME ZONE 'UTC')`,
      );
    }
    if (needsProductDimensions || metric === ReportMetric.UNITS_SOLD) {
      if (filters.productId !== undefined) {
        where.push(Prisma.sql`p."id" = ${filters.productId}`);
      }
      if (filters.categoryId !== undefined) {
        where.push(Prisma.sql`p."categoria_id" = ${filters.categoryId}`);
      }
    } else if (
      filters.productId !== undefined ||
      filters.categoryId !== undefined
    ) {
      const detailConditions: Prisma.Sql[] = [];
      if (filters.productId !== undefined) {
        detailConditions.push(Prisma.sql`pf."id" = ${filters.productId}`);
      }
      if (filters.categoryId !== undefined) {
        detailConditions.push(
          Prisma.sql`pf."categoria_id" = ${filters.categoryId}`,
        );
      }
      where.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "detalles_venta" AS df
        INNER JOIN "variantes_producto" AS vf ON vf."id" = df."variante_producto_id"
        INNER JOIN "productos" AS pf ON pf."id" = vf."producto_id"
        WHERE df."venta_id" = v."id" AND ${Prisma.join(detailConditions, ' AND ')}
      )`);
    }

    const aggregation =
      metric === ReportMetric.REVENUE
        ? Prisma.sql`SUM(v."total")`
        : metric === ReportMetric.SALES_COUNT
          ? Prisma.sql`COUNT(DISTINCT v."id")`
          : Prisma.sql`SUM(d."cantidad")`;
    const groupClause = groups.length
      ? Prisma.sql`GROUP BY ${Prisma.join(groups, ', ')}`
      : Prisma.empty;
    const tieBreak = groups.length
      ? Prisma.sql`, ${Prisma.join(groups, ', ')}`
      : Prisma.empty;
    const havingClause = groups.length
      ? Prisma.empty
      : Prisma.sql`HAVING COUNT(DISTINCT v."id") > 0`;
    return this.prisma.$queryRaw<RawMetricRow[]>(Prisma.sql`
      SELECT
        ${joinSql(selections)}
        ${selections.length ? Prisma.sql`,` : Prisma.empty}
        ${aggregation} AS "value"
      FROM "ventas" AS v
      ${joinSql(joins, ' ')}
      WHERE ${Prisma.join(where, ' AND ')}
      ${groupClause}
      ${havingClause}
      ORDER BY "value" ${Prisma.raw(order === 'asc' ? 'ASC' : 'DESC')}${tieBreak}
      LIMIT ${limit}
    `);
  }

  private async queryInventoryMetric(
    metric: InventoryMetric,
    groupBy: ReportGroupBy[],
    filters: NonNullable<ReportQueryDto['filters']>,
    order: 'asc' | 'desc',
    limit: number,
  ): Promise<RawMetricRow[]> {
    const dimensions = groupBy.filter(
      (
        dimension,
      ): dimension is
        | ReportGroupBy.BRANCH
        | ReportGroupBy.PRODUCT
        | ReportGroupBy.CATEGORY =>
        [
          ReportGroupBy.BRANCH,
          ReportGroupBy.PRODUCT,
          ReportGroupBy.CATEGORY,
        ].includes(dimension),
    );
    const inventoryFilters: FiltrosInventarioReporte = filters;
    const rows = await this.inventarioService.aggregateForReport(
      dimensions as GrupoInventarioReporte[],
      inventoryFilters,
      order,
      limit,
      metricField[metric] as 'availableStock' | 'reservedStock',
    );
    const field = metricField[metric];
    return rows.map((row) => ({ ...row, value: row[field] ?? 0 }));
  }

  private isInventoryMetric(metric: ReportMetric): metric is InventoryMetric {
    return (
      metric === ReportMetric.AVAILABLE_STOCK ||
      metric === ReportMetric.RESERVED_STOCK
    );
  }

  private dimensionKeyNames(dimension: ReportGroupBy): string[] {
    switch (dimension) {
      case ReportGroupBy.BRANCH:
        return ['branchId', 'branch'];
      case ReportGroupBy.PRODUCT:
        return ['productId', 'product'];
      case ReportGroupBy.CATEGORY:
        return ['categoryId', 'category'];
      case ReportGroupBy.DAY:
        return ['day'];
      case ReportGroupBy.MONTH:
        return ['month'];
    }
  }

  private toNumber(value: unknown): number {
    if (value instanceof Prisma.Decimal) return value.toNumber();
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    return 0;
  }
}
