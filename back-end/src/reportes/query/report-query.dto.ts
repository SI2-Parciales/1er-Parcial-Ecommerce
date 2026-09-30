import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidatorConstraint,
  ValidationArguments,
  ValidatorConstraintInterface,
} from 'class-validator';

export enum ReportMetric {
  REVENUE = 'revenue',
  SALES_COUNT = 'sales_count',
  UNITS_SOLD = 'units_sold',
  AVAILABLE_STOCK = 'available_stock',
  RESERVED_STOCK = 'reserved_stock',
}

export enum ReportGroupBy {
  BRANCH = 'branch',
  PRODUCT = 'product',
  CATEGORY = 'category',
  DAY = 'day',
  MONTH = 'month',
}

export enum ReportSelectField {
  DATE = 'date',
  BRANCH = 'branch',
  PRODUCT = 'product',
  CATEGORY = 'category',
  REVENUE = 'revenue',
  SALES_COUNT = 'sales_count',
  UNITS_SOLD = 'units_sold',
  AVAILABLE_STOCK = 'available_stock',
  RESERVED_STOCK = 'reserved_stock',
}

@ValidatorConstraint({ name: 'validReportDateRange', async: false })
class ValidReportDateRange implements ValidatorConstraintInterface {
  validate(_value: unknown, args?: ValidationArguments): boolean {
    const { dateFrom, dateTo } = (args?.object ?? {}) as ReportQueryDto;
    return !dateFrom || !dateTo || dateFrom <= dateTo;
  }

  defaultMessage(): string {
    return 'dateFrom debe ser menor o igual que dateTo.';
  }
}

export class ReportQueryFiltersDto {
  @ApiPropertyOptional({ minimum: 1, example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  branchId?: number;

  @ApiPropertyOptional({ minimum: 1, example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({ minimum: 1, example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;
}

export class ReportQueryDto {
  @ApiProperty({ enum: ReportMetric, isArray: true, minItems: 1 })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ReportMetric, { each: true })
  metrics!: ReportMetric[];

  @ApiPropertyOptional({ enum: ReportGroupBy, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ReportGroupBy, { each: true })
  groupBy?: ReportGroupBy[];

  @ApiPropertyOptional({ enum: ReportSelectField, isArray: true, minItems: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsEnum(ReportSelectField, { each: true })
  select?: ReportSelectField[];

  @ApiPropertyOptional({ format: 'date', example: '2026-09-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  @Validate(ValidReportDateRange)
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-09-30' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateTo?: string;

  @ApiPropertyOptional({ type: ReportQueryFiltersDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ReportQueryFiltersDto)
  filters?: ReportQueryFiltersDto;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class ReportQueryPeriodDto {
  @ApiProperty({ nullable: true })
  from!: string | null;

  @ApiProperty({ nullable: true })
  to!: string | null;

  @ApiProperty({ example: 'America/La_Paz' })
  timeZone!: string;
}

export class ReportQueryResponseDto {
  @ApiProperty({ enum: ReportMetric, isArray: true })
  metrics!: ReportMetric[];

  @ApiProperty({ enum: ReportGroupBy, isArray: true })
  groupBy!: ReportGroupBy[];

  @ApiProperty({ type: ReportQueryPeriodDto })
  period!: ReportQueryPeriodDto;

  @ApiProperty({ type: [Object] })
  data!: Array<Record<string, number | string>>;
}
