import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPago, MetodoPago } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

const MAX_PAYMENT_AMOUNT = 999_999_999_999.99;

export class ProcessCashPaymentDto {
  @ApiProperty({ enum: MetodoPago, example: MetodoPago.EFECTIVO })
  @IsEnum(MetodoPago)
  metodo!: MetodoPago;

  @ApiPropertyOptional({
    example: 200,
    minimum: 0.01,
    description: 'Obligatorio únicamente para EFECTIVO.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(MAX_PAYMENT_AMOUNT)
  montoRecibido?: number;

  @ApiPropertyOptional({
    example: 'AUT-SIM-12345',
    maxLength: 100,
    description: 'Referencia simulada opcional para TARJETA o QR.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  referencia?: string;
}

export class ProcessElectronicPaymentDto {
  @ApiProperty({
    enum: [MetodoPago.TARJETA, MetodoPago.QR],
    example: MetodoPago.TARJETA,
  })
  @IsEnum(MetodoPago)
  @IsIn([MetodoPago.TARJETA, MetodoPago.QR])
  metodo!: MetodoPago;
}

export class PagoConfirmadoDto {
  @ApiProperty({ example: 15 })
  id!: number;

  @ApiProperty({ example: 20 })
  ventaId!: number;

  @ApiProperty({ enum: MetodoPago })
  metodo!: MetodoPago;

  @ApiProperty({ example: 129.9, type: Number })
  monto!: number;

  @ApiPropertyOptional({ example: 150, nullable: true, type: Number })
  montoRecibido!: number | null;

  @ApiPropertyOptional({ example: 20.1, nullable: true, type: Number })
  cambio!: number | null;

  @ApiPropertyOptional({ example: 'AUT-SIM-12345', nullable: true })
  referencia!: string | null;

  @ApiProperty({ example: true })
  simulado!: boolean;

  @ApiProperty({ enum: EstadoPago })
  estado!: EstadoPago;

  @ApiProperty({ type: String, format: 'date-time' })
  fecha!: Date;
}

export class VentaPagadaResumenDto {
  @ApiProperty({ example: 20 })
  id!: number;

  @ApiProperty({ enum: ['PAGADA'] })
  estado!: string;

  @ApiProperty({ example: 129.9, type: Number })
  total!: number;
}

export class ProcessCashPaymentResponseDto {
  @ApiProperty({ type: PagoConfirmadoDto })
  pago!: PagoConfirmadoDto;

  @ApiProperty({ type: VentaPagadaResumenDto })
  venta!: VentaPagadaResumenDto;
}
