import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { normalizeName } from '../catalogos/catalogos.utils.js';
import { normalizeSku } from '../productos/productos.utils.js';

export class QueryInventarioDto {
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

  @ApiPropertyOptional({ example: 'Chaqueta' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional({ example: 'CHAQ-NEG-M' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeSku(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productoId?: number;

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tallaId?: number;

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colorId?: number;

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sucursalId?: number;

  @ApiPropertyOptional({
    type: Boolean,
    example: true,
    description:
      'true devuelve variantes sin unidades disponibles; false devuelve las que sí tienen disponibilidad.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  agotado?: boolean;
}

export class QueryDetalleInventarioDto {
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
}

export class UpdateDisponibilidadDto {
  @ApiProperty({
    example: 3,
    minimum: 0,
    description: 'Nuevo valor absoluto de unidades temporalmente apartadas.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidadNoDisponible!: number;

  @ApiProperty({
    example: 0,
    minimum: 0,
    description:
      'Valor observado anteriormente; permite detectar modificaciones concurrentes.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidadNoDisponibleEsperada!: number;
}

export class InventarioEstadoNombreDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Chaqueta' })
  nombre!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'] })
  estado!: string;
}

export class InventarioColorDto extends InventarioEstadoNombreDto {
  @ApiProperty({ example: '#000000' })
  codigoHex!: string;
}

export class InventarioVarianteDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'CHAQ-NEG-M' })
  sku!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'] })
  estado!: string;

  @ApiProperty({ type: InventarioEstadoNombreDto })
  producto!: InventarioEstadoNombreDto;

  @ApiProperty({ type: InventarioEstadoNombreDto })
  talla!: InventarioEstadoNombreDto;

  @ApiProperty({ type: InventarioColorDto })
  color!: InventarioColorDto;
}

export class CantidadesInventarioDto {
  @ApiProperty({ example: 10, minimum: 0 })
  cantidadFisica!: number;

  @ApiProperty({ example: 3, minimum: 0 })
  cantidadReservada!: number;

  @ApiProperty({ example: 2, minimum: 0 })
  cantidadNoDisponible!: number;

  @ApiProperty({ example: 5, minimum: 0 })
  cantidadDisponible!: number;

  @ApiProperty({ example: false })
  agotado!: boolean;
}

export class InventarioItemDto extends CantidadesInventarioDto {
  @ApiProperty({
    example: 25,
    nullable: true,
    description:
      'ID modificable del inventario local; null en agregados globales o cuando no existe una fila.',
  })
  inventarioId!: number | null;

  @ApiProperty({ type: InventarioVarianteDto })
  variante!: InventarioVarianteDto;
}

export class InventarioMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 45 })
  total!: number;
}

export class InventarioListResponseDto {
  @ApiProperty({ type: [InventarioItemDto] })
  data!: InventarioItemDto[];

  @ApiProperty({ type: InventarioMetaDto })
  meta!: InventarioMetaDto;
}

export class InventarioSucursalItemDto extends CantidadesInventarioDto {
  @ApiProperty({ example: 25, nullable: true })
  inventarioId!: number | null;

  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Sucursal Central' })
  nombre!: string;

  @ApiProperty({ example: 'Av. Principal #123, La Paz' })
  ubicacion!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'] })
  estado!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Fecha del último cambio; null cuando no existe una fila de inventario.',
  })
  actualizadoEn!: Date | null;
}

export class InventarioSucursalesResponseDto {
  @ApiProperty({ type: [InventarioSucursalItemDto] })
  data!: InventarioSucursalItemDto[];

  @ApiProperty({ type: InventarioMetaDto })
  meta!: InventarioMetaDto;
}

export class InventarioVarianteDetalleResponseDto {
  @ApiProperty({ type: InventarioVarianteDto })
  variante!: InventarioVarianteDto;

  @ApiProperty({ type: CantidadesInventarioDto })
  totales!: CantidadesInventarioDto;

  @ApiProperty({ type: InventarioSucursalesResponseDto })
  sucursales!: InventarioSucursalesResponseDto;
}

export class InventarioSucursalResumenDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Sucursal Central' })
  nombre!: string;

  @ApiProperty({ example: 'Av. Principal #123, La Paz' })
  ubicacion!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'] })
  estado!: string;
}

export class InventarioDisponibilidadResponseDto extends CantidadesInventarioDto {
  @ApiProperty({ example: 25 })
  inventarioId!: number;

  @ApiProperty({ type: InventarioSucursalResumenDto })
  sucursal!: InventarioSucursalResumenDto;

  @ApiProperty({ type: InventarioVarianteDto })
  variante!: InventarioVarianteDto;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn!: Date;
}

export class DisponibilidadPublicaProductoDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Zapatilla urbana' })
  nombre!: string;
}

export class DisponibilidadPublicaTallaDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: '40' })
  nombre!: string;
}

export class DisponibilidadPublicaColorDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ example: 'Marfil' })
  nombre!: string;

  @ApiProperty({ example: '#E8E1D5' })
  codigoHex!: string;
}

export class DisponibilidadPublicaVarianteDto {
  @ApiProperty({ example: 15 })
  id!: number;

  @ApiProperty({ example: 'ZAP-CRU-40' })
  sku!: string;

  @ApiProperty({ type: DisponibilidadPublicaProductoDto })
  producto!: DisponibilidadPublicaProductoDto;

  @ApiProperty({ type: DisponibilidadPublicaTallaDto })
  talla!: DisponibilidadPublicaTallaDto;

  @ApiProperty({ type: DisponibilidadPublicaColorDto })
  color!: DisponibilidadPublicaColorDto;
}

export class DisponibilidadPublicaSucursalDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'Sucursal Central' })
  nombre!: string;

  @ApiProperty({ example: 'Av. Principal 123' })
  ubicacion!: string;

  @ApiProperty({ example: 3, minimum: 0 })
  cantidadDisponible!: number;

  @ApiProperty({ example: false })
  agotado!: boolean;
}

export class DisponibilidadPublicaMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 2 })
  total!: number;
}

export class DisponibilidadPublicaSucursalesDto {
  @ApiProperty({ type: [DisponibilidadPublicaSucursalDto] })
  data!: DisponibilidadPublicaSucursalDto[];

  @ApiProperty({ type: DisponibilidadPublicaMetaDto })
  meta!: DisponibilidadPublicaMetaDto;
}

export class DisponibilidadPublicaVarianteResponseDto {
  @ApiProperty({ type: DisponibilidadPublicaVarianteDto })
  variante!: DisponibilidadPublicaVarianteDto;

  @ApiProperty({ type: DisponibilidadPublicaSucursalesDto })
  sucursales!: DisponibilidadPublicaSucursalesDto;
}
