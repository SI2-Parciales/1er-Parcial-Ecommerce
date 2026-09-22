import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeHex, normalizeName } from '../catalogos/catalogos.utils.js';

const transformBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class CreateColorDto {
  @ApiProperty({ example: 'Rojo intenso' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: '#FF5733', pattern: '^#[0-9A-Fa-f]{6}$' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeHex(value) : value,
  )
  @IsString()
  @Matches(/^#[0-9A-F]{6}$/)
  codigoHex!: string;
}

export class UpdateColorDto {
  @ApiPropertyOptional({ example: 'Rojo intenso' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @ApiPropertyOptional({ example: '#FF5733', pattern: '^#[0-9A-Fa-f]{6}$' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeHex(value) : value,
  )
  @IsString()
  @Matches(/^#[0-9A-F]{6}$/)
  codigoHex?: string;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class ListColoresQueryDto {
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

export class ColorResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Rojo intenso' })
  nombre!: string;

  @ApiProperty({ example: '#FF5733' })
  codigoHex!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' })
  estado!: string;
}

export class ColorListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}

export class ColorListResponseDto {
  @ApiProperty({ type: [ColorResponseDto] })
  data!: ColorResponseDto[];

  @ApiProperty({ type: ColorListMetaDto })
  meta!: ColorListMetaDto;
}

export class DeactivateColorResponseDto {
  @ApiProperty({ example: 'Color desactivado.' })
  message!: string;

  @ApiProperty({ type: ColorResponseDto })
  color!: ColorResponseDto;
}
