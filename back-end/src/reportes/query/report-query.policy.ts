import { BadRequestException } from '@nestjs/common';
import {
  ReportGroupBy,
  ReportMetric,
  ReportQueryDto,
  ReportSelectField,
} from './report-query.dto.js';

const metricForField: Partial<Record<ReportSelectField, ReportMetric>> = {
  [ReportSelectField.REVENUE]: ReportMetric.REVENUE,
  [ReportSelectField.SALES_COUNT]: ReportMetric.SALES_COUNT,
  [ReportSelectField.UNITS_SOLD]: ReportMetric.UNITS_SOLD,
  [ReportSelectField.AVAILABLE_STOCK]: ReportMetric.AVAILABLE_STOCK,
  [ReportSelectField.RESERVED_STOCK]: ReportMetric.RESERVED_STOCK,
};

const groupForField: Partial<Record<ReportSelectField, ReportGroupBy>> = {
  [ReportSelectField.BRANCH]: ReportGroupBy.BRANCH,
  [ReportSelectField.PRODUCT]: ReportGroupBy.PRODUCT,
  [ReportSelectField.CATEGORY]: ReportGroupBy.CATEGORY,
};

export function validateReportSelection(dto: ReportQueryDto): void {
  const { metrics, groupBy = [] } = dto;
  const select = dto.select as ReportSelectField[] | null | undefined;
  if (select === undefined) return;
  if (!Array.isArray(select) || select.length === 0) {
    throw new BadRequestException('select debe ser una lista no vacía de campos permitidos.');
  }

  const uniqueFields = new Set(select);
  if (uniqueFields.size !== select.length) {
    throw new BadRequestException('select no puede contener campos duplicados.');
  }

  const metricSet = new Set(metrics);
  const groupSet = new Set(groupBy);
  for (const field of select) {
    if (!Object.values(ReportSelectField).includes(field)) {
      throw new BadRequestException(`El campo select "${field}" no está permitido.`);
    }
    if (field === ReportSelectField.DATE) {
      const hasDay = groupSet.has(ReportGroupBy.DAY);
      const hasMonth = groupSet.has(ReportGroupBy.MONTH);
      if (!hasDay && !hasMonth) {
        throw new BadRequestException(
          'select date requiere groupBy day o month.',
        );
      }
      if (hasDay && hasMonth) {
        throw new BadRequestException(
          'select date es ambiguo cuando groupBy incluye day y month.',
        );
      }
      continue;
    }

    const metric = metricForField[field];
    if (metric) {
      if (!metricSet.has(metric)) {
        throw new BadRequestException(
          `El campo select "${field}" requiere incluir esa métrica en metrics.`,
        );
      }
      continue;
    }

    const group = groupForField[field];
    if (!group || !groupSet.has(group)) {
      throw new BadRequestException(
        `El campo select "${field}" requiere incluir su dimensión en groupBy.`,
      );
    }
  }
}
