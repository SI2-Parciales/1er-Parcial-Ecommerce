import { ApiProperty } from '@nestjs/swagger';

export class RoleSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'CLIENTE' })
  nombre!: string;

  @ApiProperty({ example: 'Cliente de FashionStore' })
  descripcion!: string;
}
