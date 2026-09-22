import { ApiProperty } from '@nestjs/swagger';

export class PublicUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Juan' })
  nombre!: string;

  @ApiProperty({ example: 'Perez' })
  apellido!: string;

  @ApiProperty({ example: '73168919' })
  telefono!: string;

  @ApiProperty({ example: 'juan@example.com' })
  email!: string;

  @ApiProperty({ example: 'ACTIVO' })
  estado!: string;

  @ApiProperty({ example: 'CLIENTE' })
  rol!: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Registro exitoso.' })
  message!: string;

  @ApiProperty({ type: PublicUserDto })
  user!: PublicUserDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT de acceso. Contiene los claims sub y role.',
  })
  accessToken!: string;
}
