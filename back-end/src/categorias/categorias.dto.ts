import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  normalizeName,
  normalizeOptionalText,
} from '../catalogos/catalogos.utils.js';

const transformBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Ropa deportiva' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiPropertyOptional({
    example: 'Prendas para entrenamiento y actividad física.',
    nullable: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' || value === null
      ? normalizeOptionalText(value)
      : value,
  )
  @IsOptional()
  @IsString()
  descripcion?: string | null;
}

export class UpdateCategoriaDto {
  @ApiPropertyOptional({ example: 'Ropa deportiva' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @ApiPropertyOptional({
    example: 'Prendas para entrenamiento.',
    nullable: true,
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
  descripcion?: string | null;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class ListCategoriasQueryDto {
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

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Incluye registros INACTIVO.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(transformBoolean)
  @IsBoolean()
  includeInactive: boolean = false;
}

export class CategoriaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Ropa deportiva' })
  nombre!: string;

  @ApiProperty({ example: 'Prendas para entrenamiento.', nullable: true })
  descripcion!: string | null;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' })
  estado!: string;
}

export class CategoriaListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}

export class CategoriaListResponseDto {
  @ApiProperty({ type: [CategoriaResponseDto] })
  data!: CategoriaResponseDto[];

  @ApiProperty({ type: CategoriaListMetaDto })
  meta!: CategoriaListMetaDto;
}

export class DeactivateCategoriaResponseDto {
  @ApiProperty({ example: 'Categoría desactivada.' })
  message!: string;

  @ApiProperty({ type: CategoriaResponseDto })
  categoria!: CategoriaResponseDto;
}
