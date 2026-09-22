import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeSku } from '../productos.utils.js';

export class CreateVarianteProductoDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tallaId!: number;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colorId!: number;

  @ApiProperty({ example: 'POL-001', maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeSku(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  sku!: string;
}

export class UpdateVarianteProductoDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tallaId?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  colorId?: number;

  @ApiPropertyOptional({ example: 'POL-001', maxLength: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeSku(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[A-Z0-9][A-Z0-9_-]*$/)
  sku?: string;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'] })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class QueryVariantesDto {
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

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class VarianteTallaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'M' })
  nombre!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'] })
  estado!: string;
}

export class VarianteColorDto extends VarianteTallaDto {
  @ApiProperty({ example: '#000000' })
  codigoHex!: string;
}

export class VarianteProductoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'POL-001' })
  sku!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'] })
  estado!: string;

  @ApiProperty({ type: VarianteTallaDto })
  talla!: VarianteTallaDto;

  @ApiProperty({ type: VarianteColorDto })
  color!: VarianteColorDto;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn!: Date;
}

export class VarianteListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}

export class VarianteListResponseDto {
  @ApiProperty({ type: [VarianteProductoResponseDto] })
  data!: VarianteProductoResponseDto[];

  @ApiProperty({ type: VarianteListMetaDto })
  meta!: VarianteListMetaDto;
}

export class DeactivateVarianteResponseDto {
  @ApiProperty({ example: 'Variante desactivada.' })
  message!: string;

  @ApiProperty({ type: VarianteProductoResponseDto })
  variante!: VarianteProductoResponseDto;
}
