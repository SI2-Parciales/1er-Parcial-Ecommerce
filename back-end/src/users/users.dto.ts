import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleSummaryDto } from '../roles/roles.dto.js';

export class ListUsersQueryDto {
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

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Juan', maxLength: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Perez', maxLength: 100 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido?: string;

  @ApiPropertyOptional({ example: '73168919', maxLength: 30 })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telefono?: string;

  @ApiPropertyOptional({
    example: 'juan@example.com',
    format: 'email',
    maxLength: 254,
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    description: 'ID de un rol existente.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rolId?: number;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class CreateUserDto {
  @ApiProperty({ example: 'Juan', maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @ApiProperty({ example: 'Perez', maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  apellido!: string;

  @ApiProperty({ example: '73168919', maxLength: 30 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telefono!: string;

  @ApiProperty({
    example: 'juan@example.com',
    format: 'email',
    maxLength: 254,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    example: 'Admin123,',
    minLength: 8,
    maxLength: 100,
    description: 'Contraseña para la cuenta del usuario.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  password!: string;

  @ApiProperty({
    example: 3,
    minimum: 1,
    description: 'ID de un rol existente (1=CLIENTE, 2=CAJERO, 3=ENCARGADO_SUCURSAL, 4=ADMINISTRADOR).',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rolId!: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    example: 1,
    description: 'ID de la sucursal física asignada.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sucursalId?: number | null;

  @ApiPropertyOptional({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO', default: 'ACTIVO' })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado?: string;
}

export class ManagedUserDto {
  @ApiProperty({ example: 12 })
  id!: number;

  @ApiProperty({ example: 'Juan' })
  nombre!: string;

  @ApiProperty({ example: 'Perez' })
  apellido!: string;

  @ApiProperty({ example: '73168919' })
  telefono!: string;

  @ApiProperty({ example: 'juan@example.com' })
  email!: string;

  @ApiProperty({ enum: ['ACTIVO', 'INACTIVO'], example: 'ACTIVO' })
  estado!: string;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: null,
    description: 'Sucursal actual; null si no está asignado.',
  })
  sucursalId!: number | null;

  @ApiProperty({ type: RoleSummaryDto })
  rol!: RoleSummaryDto;
}

export class UserListMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;
}

export class UserListResponseDto {
  @ApiProperty({ type: [ManagedUserDto] })
  data!: ManagedUserDto[];

  @ApiProperty({ type: UserListMetaDto })
  meta!: UserListMetaDto;
}

export class DeactivateUserResponseDto {
  @ApiProperty({ example: 'Usuario desactivado.' })
  message!: string;

  @ApiProperty({ type: ManagedUserDto })
  user!: ManagedUserDto;
}
