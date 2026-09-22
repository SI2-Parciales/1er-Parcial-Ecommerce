import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoMovimiento } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { InventarioDisponibilidadResponseDto } from './inventario.dto.js';

export const ORIGEN_UNIDADES = {
  DISPONIBLE: 'DISPONIBLE',
  NO_DISPONIBLE: 'NO_DISPONIBLE',
} as const;

export type OrigenUnidades =
  (typeof ORIGEN_UNIDADES)[keyof typeof ORIGEN_UNIDADES];

export const TIPOS_MOVIMIENTO_MANUALES = [
  TipoMovimiento.RECEPCION,
  TipoMovimiento.TRANSFERENCIA,
  TipoMovimiento.DEVOLUCION,
  TipoMovimiento.MERMA,
] as const;

export class CreateMovimientoInventarioDto {
  @ApiProperty({
    enum: TIPOS_MOVIMIENTO_MANUALES,
    example: TipoMovimiento.TRANSFERENCIA,
  })
  @IsIn(TIPOS_MOVIMIENTO_MANUALES)
  tipo!: TipoMovimiento;

  @ApiProperty({ example: 15, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  varianteProductoId!: number;

  @ApiProperty({ example: 3, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  cantidad!: number;

  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  sucursalOrigenId?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  sucursalDestinoId?: number;

  @ApiPropertyOptional({ example: 'Transferencia de chaquetas talla M' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  observacion?: string;

  @ApiPropertyOptional({
    example: 1,
    minimum: 0,
    description:
      'Unidades devueltas que permanecerán fuera de disponibilidad. Solo aplica a DEVOLUCION.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  cantidadNoDisponible?: number;

  @ApiPropertyOptional({
    enum: ORIGEN_UNIDADES,
    example: ORIGEN_UNIDADES.NO_DISPONIBLE,
    description: 'Grupo del que se descontará una MERMA.',
  })
  @IsOptional()
  @IsEnum(ORIGEN_UNIDADES)
  origenUnidades?: OrigenUnidades;
}

export class QueryMovimientosInventarioDto {
  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1, default: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page: number = 1;

  @ApiPropertyOptional({
    type: Number,
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ enum: TipoMovimiento })
  @IsOptional()
  @IsEnum(TipoMovimiento)
  tipo?: TipoMovimiento;

  @ApiPropertyOptional({ type: Number, example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sucursalId?: number;

  @ApiPropertyOptional({ type: Number, example: 15, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  varianteProductoId?: number;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  fechaDesde?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-09-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  fechaHasta?: string;
}

export class MovimientoUsuarioDto {
  @ApiProperty({ example: 20 })
  id!: number;

  @ApiProperty({ example: 'Ana' })
  nombre!: string;

  @ApiProperty({ example: 'Pérez' })
  apellido!: string;
}

export class MovimientoVarianteDto {
  @ApiProperty({ example: 15 })
  id!: number;

  @ApiProperty({ example: 'CHAQ-NEG-M' })
  sku!: string;
}

export class MovimientoSucursalDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'Sucursal Central' })
  nombre!: string;
}

export class MovimientoInventarioDto {
  @ApiProperty({ example: 80 })
  id!: number;

  @ApiProperty({ enum: TipoMovimiento })
  tipo!: TipoMovimiento;

  @ApiProperty({ example: 3 })
  cantidad!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  fecha!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Mercadería recibida' })
  observacion!: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 25,
    description: 'Venta asociada cuando el movimiento es una salida VENTA.',
  })
  ventaId!: number | null;

  @ApiProperty({ type: MovimientoUsuarioDto })
  usuario!: MovimientoUsuarioDto;

  @ApiProperty({ type: MovimientoVarianteDto })
  variante!: MovimientoVarianteDto;

  @ApiPropertyOptional({ type: MovimientoSucursalDto, nullable: true })
  sucursalOrigen!: MovimientoSucursalDto | null;

  @ApiPropertyOptional({ type: MovimientoSucursalDto, nullable: true })
  sucursalDestino!: MovimientoSucursalDto | null;
}

export class MovimientoInventarioResponseDto {
  @ApiProperty({ type: MovimientoInventarioDto })
  movimiento!: MovimientoInventarioDto;

  @ApiPropertyOptional({
    type: InventarioDisponibilidadResponseDto,
    nullable: true,
  })
  inventarioOrigen!: InventarioDisponibilidadResponseDto | null;

  @ApiPropertyOptional({
    type: InventarioDisponibilidadResponseDto,
    nullable: true,
  })
  inventarioDestino!: InventarioDisponibilidadResponseDto | null;
}

export class MovimientoInventarioMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 40 })
  total!: number;
}

export class MovimientoInventarioListResponseDto {
  @ApiProperty({ type: [MovimientoInventarioDto] })
  data!: MovimientoInventarioDto[];

  @ApiProperty({ type: MovimientoInventarioMetaDto })
  meta!: MovimientoInventarioMetaDto;
}
