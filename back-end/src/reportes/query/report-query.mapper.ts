import {
  ReportGroupBy,
  ReportSelectField,
} from './report-query.dto.js';

type ReportRow = Record<string, number | string>;

const responseFieldForSelection: Partial<Record<ReportSelectField, string>> = {
  [ReportSelectField.BRANCH]: 'branch',
  [ReportSelectField.PRODUCT]: 'product',
  [ReportSelectField.CATEGORY]: 'category',
  [ReportSelectField.REVENUE]: 'revenue',
  [ReportSelectField.SALES_COUNT]: 'salesCount',
  [ReportSelectField.UNITS_SOLD]: 'unitsSold',
  [ReportSelectField.AVAILABLE_STOCK]: 'availableStock',
  [ReportSelectField.RESERVED_STOCK]: 'reservedStock',
};

export function projectReportRows(
  rows: ReportRow[],
  select: ReportSelectField[] | undefined,
  groupBy: ReportGroupBy[],
): ReportRow[] {
  if (select === undefined) return rows;

  return rows.map((row) => {
    const projected: ReportRow = {};
    for (const field of select) {
      const sourceField =
        field === ReportSelectField.DATE
          ? groupBy.includes(ReportGroupBy.DAY)
            ? 'day'
            : 'month'
          : responseFieldForSelection[field];
      if (sourceField !== undefined && row[sourceField] !== undefined) {
        projected[field] = row[sourceField]!;
      }
    }
    return projected;
  });
}
