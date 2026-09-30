import { ApiProperty } from '@nestjs/swagger';

export class PublicUserDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'Juan' })
  nombre!: string;

  @ApiProperty({ type: String, example: 'Perez' })
  apellido!: string;

  @ApiProperty({ type: String, example: '73168919' })
  telefono!: string;

  @ApiProperty({ type: String, example: 'juan@example.com' })
  email!: string;

  @ApiProperty({ type: String, example: 'ACTIVO' })
  estado!: string;

  @ApiProperty({ type: String, example: 'CLIENTE' })
  rol!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: String, example: 'Registro exitoso.' })
  message!: string;

  @ApiProperty({ type: () => PublicUserDto })
  user!: PublicUserDto;

  @ApiProperty({
    type: String,
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT de acceso. Contiene los claims sub y role.',
  })
  accessToken!: string;
}
