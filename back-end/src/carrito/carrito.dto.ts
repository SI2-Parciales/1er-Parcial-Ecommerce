import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

export class SelectCarritoSucursalDto {
  @ApiProperty({ example: 3, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sucursalId!: number;
}

export class AddCarritoDetalleDto {
  @ApiProperty({ example: 12, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  varianteProductoId!: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INTEGER)
  cantidad!: number;
}

export class UpdateCarritoDetalleDto {
  @ApiProperty({ example: 3, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INTEGER)
  cantidad!: number;
}

class CarritoSucursalDto {
  @ApiProperty({ example: 3 })
  id!: number;

  @ApiProperty({ example: 'Sucursal Central' })
  nombre!: string;

  @ApiProperty({ example: 'Av. Principal 123' })
  ubicacion!: string;

  @ApiProperty({ example: 'ACTIVO' })
  estado!: string;
}

class CarritoProductoDto {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 'Polera básica' })
  nombre!: string;

  @ApiPropertyOptional({ example: '/uploads/productos/polera.webp', nullable: true })
  imagenUrl!: string | null;

  @ApiProperty({ example: 'ACTIVO' })
  estado!: string;
}

class CarritoCatalogoDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'M' })
  nombre!: string;

  @ApiProperty({ example: 'ACTIVO' })
  estado!: string;
}

class CarritoColorDto extends CarritoCatalogoDto {
  @ApiProperty({ example: '#000000' })
  codigoHex!: string;
}

class CarritoVarianteDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'POL-NEG-M' })
  sku!: string;

  @ApiProperty({ example: 'ACTIVO' })
  estado!: string;

  @ApiProperty({ type: CarritoProductoDto })
  producto!: CarritoProductoDto;

  @ApiProperty({ type: CarritoCatalogoDto })
  talla!: CarritoCatalogoDto;

  @ApiProperty({ type: CarritoColorDto })
  color!: CarritoColorDto;
}

class CarritoDetalleResponseDto {
  @ApiProperty({ example: 7 })
  id!: number;

  @ApiProperty({ example: 2 })
  cantidad!: number;

  @ApiProperty({ example: 129.9 })
  precioUnitario!: number;

  @ApiProperty({ example: 259.8 })
  subtotal!: number;

  @ApiProperty({ example: 5 })
  cantidadDisponible!: number;

  @ApiProperty({ example: true })
  comercializable!: boolean;

  @ApiProperty({ example: true })
  disponible!: boolean;

  @ApiProperty({ type: CarritoVarianteDto })
  variante!: CarritoVarianteDto;
}

export class CarritoResponseDto {
  @ApiProperty({ example: 5 })
  id!: number;

  @ApiPropertyOptional({ type: CarritoSucursalDto, nullable: true })
  sucursal!: CarritoSucursalDto | null;

  @ApiProperty({ example: '2026-09-22T12:00:00.000Z' })
  creadoEn!: Date;

  @ApiProperty({ example: '2026-09-22T12:10:00.000Z' })
  actualizadoEn!: Date;

  @ApiProperty({ type: [CarritoDetalleResponseDto] })
  detalles!: CarritoDetalleResponseDto[];

  @ApiProperty({ example: 259.8 })
  total!: number;
}
