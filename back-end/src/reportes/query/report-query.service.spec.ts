import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MINIMUM_ROLE_KEY, ACTOR_ROLE } from '../../auth/auth.constants.js';
import type { AuthenticatedUser } from '../../auth/guards/jwt-auth.guard.js';
import { ReportQueryController } from './report-query.controller.js';
import {
  ReportGroupBy,
  ReportMetric,
  ReportQueryDto,
  ReportSelectField,
} from './report-query.dto.js';
import { ReportQueryService } from './report-query.service.js';

describe('ReportQueryService', () => {
  const prisma = { $queryRaw: vi.fn(), usuario: { findUnique: vi.fn() } };
  const inventarioService = { aggregateForReport: vi.fn() };
  const admin: AuthenticatedUser = {
    id: 1,
    email: 'admin@example.test',
    nombre: 'Admin',
    role: ACTOR_ROLE.ADMINISTRADOR,
  };
  let service: ReportQueryService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new ReportQueryService(prisma as never, inventarioService as never);
  });

  it('calcula revenue con Venta.total y restringe la consulta a ventas pagadas', async () => {
    prisma.$queryRaw.mockResolvedValue([{ value: new Prisma.Decimal('125.50') }]);

    const result = await service.query({ metrics: [ReportMetric.REVENUE] }, admin);
    const query = prisma.$queryRaw.mock.calls[0]![0] as Prisma.Sql;

    expect(query.sql).toContain('SUM(v."total")');
    expect(query.sql).toContain('v."estado" =');
    expect(query.sql).toContain('::"EstadoVenta"');
    expect(query.values).toContain('PAGADA');
    expect(result.data).toEqual([{ revenue: 125.5 }]);
  });

  it('cuenta únicamente ventas pagadas', async () => {
    prisma.$queryRaw.mockResolvedValue([{ value: 3n }]);

    const result = await service.query({ metrics: [ReportMetric.SALES_COUNT] }, admin);
    const query = prisma.$queryRaw.mock.calls[0]![0] as Prisma.Sql;

    expect(query.sql).toContain('COUNT(DISTINCT v."id")');
    expect(query.values).toContain('PAGADA');
    expect(result.data).toEqual([{ salesCount: 3 }]);
  });

  it('suma cantidades de detalles y no el total monetario de la venta', async () => {
    prisma.$queryRaw.mockResolvedValue([{ value: 8n }]);

    const result = await service.query({ metrics: [ReportMetric.UNITS_SOLD] }, admin);
    const query = prisma.$queryRaw.mock.calls[0]![0] as Prisma.Sql;

    expect(query.sql).toContain('SUM(d."cantidad")');
    expect(query.sql).toContain('INNER JOIN "detalles_venta"');
    expect(result.data).toEqual([{ unitsSold: 8 }]);
  });

  it('aplica ambos límites de fecha como días inclusivos de La Paz', async () => {
    prisma.$queryRaw.mockResolvedValue([{ value: 1n }]);

    await service.query({
      metrics: [ReportMetric.SALES_COUNT],
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    }, admin);
    const query = prisma.$queryRaw.mock.calls[0]![0] as Prisma.Sql;

    expect(query.sql.match(/AT TIME ZONE 'America\/La_Paz'/g)).toHaveLength(2);
    expect(query.values).toContain('2026-09-01');
    expect(query.values).toContain('2026-09-30');
    expect(query.sql).toContain('v."fecha" <');
  });

  it('filtra por producto sin multiplicar Venta.total por sus líneas', async () => {
    prisma.$queryRaw.mockResolvedValue([{ value: new Prisma.Decimal('50.00') }]);

    await service.query({
      metrics: [ReportMetric.REVENUE],
      filters: { branchId: 2, productId: 7 },
    }, admin);
    const query = prisma.$queryRaw.mock.calls[0]![0] as Prisma.Sql;

    expect(query.sql).toContain('SUM(v."total")');
    expect(query.sql).toContain('EXISTS (');
    expect(query.sql).toContain('FROM "detalles_venta" AS df');
    expect(query.values).toContain(2);
    expect(query.values).toContain(7);
  });

  it('agrupa unidades por producto y devuelve identificador y nombre', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { productId: 3, product: 'Polera Oversize', value: 45n },
    ]);

    const result = await service.query({
      metrics: [ReportMetric.UNITS_SOLD],
      groupBy: [ReportGroupBy.PRODUCT],
    }, admin);

    expect(result.data).toEqual([
      { productId: 3, product: 'Polera Oversize', unitsSold: 45 },
    ]);
  });

  it('agrupa ventas por sucursal', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { branchId: 2, branch: 'Central', value: new Prisma.Decimal('900.25') },
    ]);

    const result = await service.query({
      metrics: [ReportMetric.REVENUE],
      groupBy: [ReportGroupBy.BRANCH],
    }, admin);

    expect(result.data).toEqual([
      { branchId: 2, branch: 'Central', revenue: 900.25 },
    ]);
  });

  it('proyecta solamente branch y revenue con los nombres de select', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { branchId: 2, branch: 'Sucursal Centro', value: new Prisma.Decimal('15000') },
    ]);

    const result = await service.query({
      metrics: [ReportMetric.REVENUE],
      groupBy: [ReportGroupBy.BRANCH],
      select: [ReportSelectField.BRANCH, ReportSelectField.REVENUE],
    }, admin);

    expect(result.data).toEqual([
      { branch: 'Sucursal Centro', revenue: 15000 },
    ]);
  });

  it('proyecta date desde day y sales_count con la clave solicitada', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { day: '2026-09-01', value: 6n },
    ]);

    const result = await service.query({
      metrics: [ReportMetric.SALES_COUNT],
      groupBy: [ReportGroupBy.DAY],
      select: [ReportSelectField.DATE, ReportSelectField.SALES_COUNT],
    }, admin);

    expect(result.data).toEqual([
      { date: '2026-09-01', sales_count: 6 },
    ]);
  });

  it('permite seleccionar un subconjunto de varias métricas calculadas', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([
        { branchId: 2, branch: 'Central', value: new Prisma.Decimal('150') },
      ])
      .mockResolvedValueOnce([
        { branchId: 2, branch: 'Central', value: 3n },
      ]);

    const result = await service.query({
      metrics: [ReportMetric.REVENUE, ReportMetric.SALES_COUNT],
      groupBy: [ReportGroupBy.BRANCH],
      select: [ReportSelectField.REVENUE],
    }, admin);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual([{ revenue: 150 }]);
  });

  it('rechaza seleccionar una métrica que no se solicitó antes de consultar', async () => {
    await expect(service.query({
      metrics: [ReportMetric.SALES_COUNT],
      select: [ReportSelectField.UNITS_SOLD],
    }, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('rechaza seleccionar una dimensión que no está en groupBy', async () => {
    await expect(service.query({
      metrics: [ReportMetric.REVENUE],
      groupBy: [ReportGroupBy.BRANCH],
      select: [ReportSelectField.PRODUCT, ReportSelectField.REVENUE],
    }, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('rechaza date cuando no hay período agrupado o cuando day y month son ambiguos', async () => {
    await expect(service.query({
      metrics: [ReportMetric.SALES_COUNT],
      select: [ReportSelectField.DATE],
    }, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.query({
      metrics: [ReportMetric.SALES_COUNT],
      groupBy: [ReportGroupBy.DAY, ReportGroupBy.MONTH],
      select: [ReportSelectField.DATE],
    }, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('rechaza revenue por producto porque el contrato exige Venta.total', async () => {
    await expect(
      service.query({
        metrics: [ReportMetric.REVENUE],
        groupBy: [ReportGroupBy.PRODUCT],
      }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('une métricas de ventas e inventario y completa las métricas ausentes con cero', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { branchId: 1, branch: 'Central', value: 4n },
    ]);
    inventarioService.aggregateForReport.mockResolvedValue([
      { branchId: 2, branch: 'Norte', availableStock: 9 },
    ]);

    const result = await service.query({
      metrics: [ReportMetric.SALES_COUNT, ReportMetric.AVAILABLE_STOCK],
      groupBy: [ReportGroupBy.BRANCH],
    }, admin);

    expect(result.data).toEqual([
      { branchId: 1, branch: 'Central', salesCount: 4, availableStock: 0 },
      { branchId: 2, branch: 'Norte', salesCount: 0, availableStock: 9 },
    ]);
  });

  it('rechaza fechas para consultas exclusivamente de inventario y agrupación temporal mixta', async () => {
    await expect(
      service.query({
        metrics: [ReportMetric.RESERVED_STOCK],
        dateFrom: '2026-09-01',
      }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.query({
        metrics: [ReportMetric.UNITS_SOLD, ReportMetric.AVAILABLE_STOCK],
        groupBy: [ReportGroupBy.DAY],
      }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve data vacía y no sustituye resultados inexistentes por mocks', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.query({ metrics: [ReportMetric.SALES_COUNT] }, admin);

    expect(result.data).toEqual([]);
  });

  it('mantiene data vacía también cuando se solicitó una proyección', async () => {
    prisma.$queryRaw.mockResolvedValue([]);

    const result = await service.query({
      metrics: [ReportMetric.SALES_COUNT],
      groupBy: [ReportGroupBy.DAY],
      select: [ReportSelectField.DATE, ReportSelectField.SALES_COUNT],
    }, admin);

    expect(result.data).toEqual([]);
  });

  it('restringe encargados a su sucursal y rechaza filtros que intenten ampliarla', async () => {
    const manager: AuthenticatedUser = {
      id: 8,
      email: 'manager@example.test',
      nombre: 'Manager',
      role: ACTOR_ROLE.ENCARGADO_SUCURSAL,
    };
    prisma.usuario.findUnique.mockResolvedValue({
      estado: 'ACTIVO',
      sucursalId: 5,
    });
    prisma.$queryRaw.mockResolvedValue([{ value: 2n }]);

    await service.query({ metrics: [ReportMetric.SALES_COUNT] }, manager);
    const query = prisma.$queryRaw.mock.calls[0]![0] as Prisma.Sql;
    expect(query.values).toContain(5);

    await expect(
      service.query(
        { metrics: [ReportMetric.SALES_COUNT], filters: { branchId: 6 } },
        manager,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe('ReportQueryDto y acceso', () => {
  async function validatePayload(payload: Record<string, unknown>) {
    const dto = plainToInstance(ReportQueryDto, payload);
    return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  }

  it('rechaza métricas y agrupaciones fuera de las listas permitidas', async () => {
    expect(
      await validatePayload({ metrics: ['sql'], groupBy: ['table'] }),
    ).not.toHaveLength(0);
  });

  it('rechaza select vacío, duplicado, desconocido o con nombres SQL', async () => {
    for (const select of [
      [],
      null,
      ['revenue', 'revenue'],
      ['unknown'],
      ['Venta.fecha'],
      ['venta.total'],
    ]) {
      expect(
        await validatePayload({ metrics: [ReportMetric.REVENUE], select }),
      ).not.toHaveLength(0);
    }
  });

  it('rechaza límites fuera del rango y filtros arbitrarios', async () => {
    expect(
      await validatePayload({
        metrics: [ReportMetric.UNITS_SOLD],
        limit: 101,
        filters: { branchId: 1, rawSql: 'DROP TABLE' },
      }),
    ).not.toHaveLength(0);
  });

  it('rechaza un rango invertido y fechas que no son días ISO válidos', async () => {
    expect(
      await validatePayload({
        metrics: [ReportMetric.REVENUE],
        dateFrom: '2026-09-30',
        dateTo: '2026-09-01',
      }),
    ).not.toHaveLength(0);
    expect(
      await validatePayload({
        metrics: [ReportMetric.REVENUE],
        dateFrom: '2026-02-30',
      }),
    ).not.toHaveLength(0);
  });

  it('exige el rol de encargado o superior para la ruta interna', () => {
    const handler = Object.getOwnPropertyDescriptor(
      ReportQueryController.prototype,
      'query',
    )?.value as object;
    expect(
      Reflect.getMetadata(MINIMUM_ROLE_KEY, handler),
    ).toBe(ACTOR_ROLE.ENCARGADO_SUCURSAL);
    expect(Reflect.getMetadata('__httpCode__', handler)).toBe(200);
  });

});
