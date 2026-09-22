import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeName } from '../catalogos/catalogos.utils.js';

const transformBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class CreateTallaDto {
  @ApiProperty({ example: 'M' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  nombre!: string;
}

export class UpdateTallaDto {
  @ApiPropertyOptional({ example: 'M' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeName(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class ListTallasQueryDto {
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

export class TallaResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'M' })
  nombre!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' })
  estado!: string;
}

export class TallaListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}

export class TallaListResponseDto {
  @ApiProperty({ type: [TallaResponseDto] })
  data!: TallaResponseDto[];

  @ApiProperty({ type: TallaListMetaDto })
  meta!: TallaListMetaDto;
}

export class DeactivateTallaResponseDto {
  @ApiProperty({ example: 'Talla desactivada.' })
  message!: string;

  @ApiProperty({ type: TallaResponseDto })
  talla!: TallaResponseDto;
}
