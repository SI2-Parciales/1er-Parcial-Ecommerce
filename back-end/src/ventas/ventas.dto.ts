import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { normalizeSku } from '../productos/productos.utils.js';

const MAX_POSTGRES_INTEGER = 2_147_483_647;

export class CreateVentaDetalleDto {
  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @ValidateIf((item: CreateVentaDetalleDto) => item.sku === undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  varianteProductoId?: number;

  @ApiPropertyOptional({ example: 'POL-NEG-M', maxLength: 100 })
  @ValidateIf(
    (item: CreateVentaDetalleDto) => item.varianteProductoId === undefined,
  )
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeSku(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_POSTGRES_INTEGER)
  cantidad!: number;
}

export class CreateVentaPresencialDto {
  @ApiPropertyOptional({ example: 25, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clienteId?: number;

  @ApiPropertyOptional({ example: 'María López', maxLength: 200 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombreFacturacion?: string;

  @ApiPropertyOptional({ example: '1234567', maxLength: 50 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  documentoFacturacion?: string;

  @ApiProperty({ type: [CreateVentaDetalleDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateVentaDetalleDto)
  detalles!: CreateVentaDetalleDto[];
}

export class VentaPersonaResumenDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'María' })
  nombre!: string;

  @ApiProperty({ example: 'López' })
  apellido!: string;
}

export class VentaSucursalResumenDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Sucursal Central' })
  nombre!: string;
}

export class VentaProductoResumenDto {
  @ApiProperty({ example: 4 })
  id!: number;

  @ApiProperty({ example: 'Polera Oversize' })
  nombre!: string;
}

export class VentaTallaResumenDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'M' })
  nombre!: string;
}

export class VentaColorResumenDto extends VentaTallaResumenDto {
  @ApiProperty({ example: '#000000' })
  codigoHex!: string;
}

export class VentaVarianteResumenDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'POL-NEG-M' })
  sku!: string;

  @ApiProperty({ type: VentaProductoResumenDto })
  producto!: VentaProductoResumenDto;

  @ApiProperty({ type: VentaTallaResumenDto })
  talla!: VentaTallaResumenDto;

  @ApiProperty({ type: VentaColorResumenDto })
  color!: VentaColorResumenDto;
}

export class VentaDetalleResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 2 })
  cantidad!: number;

  @ApiProperty({ example: 129.9, type: Number })
  precioUnitario!: number;

  @ApiProperty({ example: 259.8, type: Number })
  subtotal!: number;

  @ApiProperty({ type: VentaVarianteResumenDto })
  variante!: VentaVarianteResumenDto;
}

export class VentaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ enum: ['PRESENCIAL'] })
  canal!: string;

  @ApiProperty({ type: VentaSucursalResumenDto })
  sucursal!: VentaSucursalResumenDto;

  @ApiProperty({ type: VentaPersonaResumenDto, nullable: true })
  cajero!: VentaPersonaResumenDto | null;

  @ApiProperty({ type: VentaPersonaResumenDto, nullable: true })
  cliente!: VentaPersonaResumenDto | null;

  @ApiProperty({ example: 'CONSUMIDOR FINAL' })
  nombreFacturacion!: string;

  @ApiProperty({ example: '0' })
  documentoFacturacion!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  fecha!: Date;

  @ApiProperty({ example: 259.8, type: Number })
  total!: number;

  @ApiProperty({ enum: ['PENDIENTE_PAGO'] })
  estado!: string;

  @ApiProperty({ type: [VentaDetalleResponseDto] })
  detalles!: VentaDetalleResponseDto[];
}
