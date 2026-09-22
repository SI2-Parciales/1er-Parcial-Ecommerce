import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MinRole } from '../auth/decorators/min-role.decorator.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import { CreateVentaPresencialDto, VentaResponseDto } from './ventas.dto.js';
import { VentasService } from './ventas.service.js';

@ApiTags('Ventas')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido, expiró o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'El actor no puede registrar ventas o no tiene sucursal.',
})
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post('presenciales')
  @MinRole(ACTOR_ROLE.CAJERO)
  @ApiOperation({
    summary: 'Registrar una venta presencial pendiente de pago',
    description:
      'Valida catálogo y existencias, calcula importes y conserva el inventario hasta el cobro.',
  })
  @ApiCreatedResponse({
    description: 'Venta registrada y preparada para el proceso de pago.',
    type: VentaResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'La facturación, los detalles o las cantidades no son válidos.',
  })
  @ApiNotFoundResponse({
    description: 'No existe una variante o el cliente indicado.',
  })
  @ApiConflictResponse({
    description:
      'Algún recurso está inactivo o no hay existencias suficientes.',
  })
  createPresencial(
    @Body() input: CreateVentaPresencialDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ventasService.createPresencial(input, user);
  }
}
