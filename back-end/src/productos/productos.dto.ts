import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  normalizeName,
  normalizeOptionalText,
} from '../catalogos/catalogos.utils.js';
import { VarianteProductoResponseDto } from './variantes/variantes.dto.js';

export class CreateProductoDto {
  @ApiProperty({ example: 'Polera Oversize', maxLength: 150 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @ApiPropertyOptional({
    example: 'Polera de algodón.',
    nullable: true,
    maxLength: 2000,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || value === null
      ? normalizeOptionalText(value)
      : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @ApiProperty({ example: 129.9, minimum: 0.01, type: Number })
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  precio!: number;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId!: number;
}

export class UpdateProductoDto {
  @ApiPropertyOptional({ example: 'Polera Oversize', maxLength: 150 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional({
    example: 'Polera de algodón.',
    nullable: true,
    maxLength: 2000,
  })
  @ValidateIf(
    (_object, value: unknown) => value !== undefined && value !== null,
  )
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || value === null
      ? normalizeOptionalText(value)
      : value,
  )
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @ApiPropertyOptional({ example: 129.9, minimum: 0.01, type: Number })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  precio?: number;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId?: number;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'] })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class QueryProductosDto {
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

  @ApiPropertyOptional({ example: 'Polera' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @ApiPropertyOptional({ type: Number, example: 20, minimum: 1, maximum: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limite?: number;

  @ApiPropertyOptional({ example: 'Polera' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  buscar?: string;

  @ApiPropertyOptional({ type: Number, example: 1, minimum: 1 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoriaId?: number;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class ProductoCategoriaDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Poleras' })
  nombre!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'] })
  estado!: string;
}

export class ProductoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Polera Oversize' })
  nombre!: string;

  @ApiProperty({ example: 'Polera de algodón.', nullable: true })
  descripcion!: string | null;

  @ApiProperty({
    example: '/imagenes/productos/550e8400-e29b-41d4-a716-446655440000.webp',
    nullable: true,
  })
  imagenUrl!: string | null;

  @ApiProperty({ example: 129.9, type: Number })
  precio!: number;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'] })
  estado!: string;

  @ApiProperty({ type: ProductoCategoriaDto })
  categoria!: ProductoCategoriaDto;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn!: Date;
}

export class ProductoDetalleResponseDto extends ProductoResponseDto {
  @ApiProperty({ type: [VarianteProductoResponseDto] })
  variantes!: VarianteProductoResponseDto[];
}

export class ProductoListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 10 })
  total!: number;
}

export class ProductoListResponseDto {
  @ApiProperty({ type: [ProductoResponseDto] })
  data!: ProductoResponseDto[];

  @ApiProperty({ type: ProductoListMetaDto })
  meta!: ProductoListMetaDto;
}

export class DeactivateProductoResponseDto {
  @ApiProperty({ example: 'Producto desactivado.' })
  message!: string;

  @ApiProperty({ type: ProductoResponseDto })
  producto!: ProductoResponseDto;
}

export class DeleteProductoImageResponseDto {
  @ApiProperty({ example: 'Imagen del producto eliminada.' })
  message!: string;

  @ApiProperty({ type: ProductoResponseDto })
  producto!: ProductoResponseDto;
}
