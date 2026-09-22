import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSucursalDto {
  @ApiProperty({ example: 'Sucursal Central' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: 'Av. Principal #123, La Paz' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  ubicacion!: string;

  @ApiPropertyOptional({ example: 4, minimum: 0, default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidadVestidores: number = 0;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'], default: 'ACTIVO' })
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado: string = 'ACTIVO';
}

export class UpdateSucursalDto {
  @ApiPropertyOptional({ example: 'Sucursal Central' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @ApiPropertyOptional({ example: 'Av. Principal #123, La Paz' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  ubicacion?: string;

  @ApiPropertyOptional({ example: 4, minimum: 0 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cantidadVestidores?: number;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'] })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class ListSucursalesQueryDto {
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

export class SucursalResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Sucursal Central' })
  nombre!: string;

  @ApiProperty({ example: 'Av. Principal #123, La Paz' })
  ubicacion!: string;

  @ApiProperty({ example: 4 })
  cantidadVestidores!: number;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' })
  estado!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn!: Date;
}

export class SucursalListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  total!: number;
}

export class SucursalListResponseDto {
  @ApiProperty({ type: [SucursalResponseDto] })
  data!: SucursalResponseDto[];

  @ApiProperty({ type: SucursalListMetaDto })
  meta!: SucursalListMetaDto;
}

export class DeactivateSucursalResponseDto {
  @ApiProperty({ example: 'Sucursal desactivada.' })
  message!: string;

  @ApiProperty({ type: SucursalResponseDto })
  sucursal!: SucursalResponseDto;
}

export class AssignPersonalDto {
  @ApiProperty({
    example: 12,
    minimum: 1,
    description: 'ID de un usuario activo con rol de personal.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuarioId!: number;
}

export class SucursalPersonalDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'María' })
  nombre!: string;

  @ApiProperty({ example: 'López' })
  apellido!: string;

  @ApiProperty({ example: 'maria@example.com' })
  email!: string;

  @ApiProperty({
    example: 'CAJERO',
    enum: ['CAJERO', 'ENCARGADO_SUCURSAL', 'ADMINISTRADOR'],
  })
  rol!: string;
}
