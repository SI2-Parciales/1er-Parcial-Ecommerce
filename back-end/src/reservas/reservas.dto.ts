import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EstadoReserva } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

export class CreateReservaDetalleDto {
  @ApiProperty({ example: 12, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INTEGER)
  varianteProductoId!: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INTEGER)
  cantidad!: number;
}

export class CreateReservaDto {
  @ApiProperty({ example: 3, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INTEGER)
  sucursalId!: number;

  @ApiProperty({ example: '2026-10-15T14:30:00-04:00' })
  @IsDateString({ strict: true })
  fechaHora!: string;

  @ApiProperty({ type: [CreateReservaDetalleDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateReservaDetalleDto)
  items!: CreateReservaDetalleDto[];
}

export class UpdateReservaDetalleDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INTEGER)
  cantidad!: number;
}

export class ListReservasQueryDto {
  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page = 1;

  @ApiPropertyOptional({
    type: Number,
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: EstadoReserva })
  @IsOptional()
  @IsEnum(EstadoReserva)
  estado?: EstadoReserva;

  @ApiPropertyOptional({ type: Number, example: 2, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INTEGER)
  sucursalId?: number;

  @ApiPropertyOptional({ type: Number, example: 12, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INTEGER)
  clienteId?: number;
}

export class ReservaSucursalDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 'Sucursal Central' })
  nombre!: string;

  @ApiProperty({ example: 'Av. Principal 123' })
  ubicacion!: string;
}

export class ReservaCatalogoDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'M' })
  nombre!: string;
}

export class ReservaColorDto extends ReservaCatalogoDto {
  @ApiProperty({ example: '#000000' })
  codigoHex!: string;
}

export class ReservaProductoDto {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 'Polera básica' })
  nombre!: string;

  @ApiPropertyOptional({
    example: '/uploads/productos/polera.webp',
    nullable: true,
  })
  imagenUrl!: string | null;
}

export class ReservaVarianteDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'POL-NEG-M' })
  sku!: string;

  @ApiProperty({ type: ReservaProductoDto })
  producto!: ReservaProductoDto;

  @ApiProperty({ type: ReservaCatalogoDto })
  talla!: ReservaCatalogoDto;

  @ApiProperty({ type: ReservaColorDto })
  color!: ReservaColorDto;
}

export class ReservaDetalleResponseDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ example: 2 })
  cantidad!: number;

  @ApiProperty({ type: ReservaVarianteDto })
  varianteProducto!: ReservaVarianteDto;
}

export class ReservaClienteDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ example: 'Ana' })
  nombre!: string;

  @ApiProperty({ example: 'Pérez' })
  apellido!: string;

  @ApiProperty({ example: '70000000' })
  telefono!: string;
}

export class ReservaListItemDto {
  @ApiProperty({ example: 31 })
  id!: number;

  @ApiProperty({ example: '2026-10-15T18:30:00.000Z' })
  fechaHora!: Date;

  @ApiProperty({ enum: EstadoReserva, example: EstadoReserva.PENDIENTE })
  estado!: EstadoReserva;

  @ApiProperty({ example: '2026-09-29T12:00:00.000Z' })
  creadoEn!: Date;

  @ApiProperty({ example: '2026-09-29T12:00:00.000Z' })
  actualizadoEn!: Date;

  @ApiProperty({ type: ReservaSucursalDto })
  sucursal!: ReservaSucursalDto;

  @ApiProperty({ type: ReservaClienteDto })
  cliente!: ReservaClienteDto;
}

export class ReservaDetailDto extends ReservaListItemDto {
  @ApiProperty({ type: [ReservaDetalleResponseDto] })
  detalles!: ReservaDetalleResponseDto[];
}

export class ReservaListResponseDto {
  @ApiProperty({ type: [ReservaListItemDto] })
  data!: ReservaListItemDto[];

  @ApiProperty({ example: { page: 1, limit: 20, total: 3 } })
  meta!: { page: number; limit: number; total: number };
}
