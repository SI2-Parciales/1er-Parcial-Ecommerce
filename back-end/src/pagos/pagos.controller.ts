import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MinRole } from '../auth/decorators/min-role.decorator.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import {
  ProcessCashPaymentDto,
  ProcessCashPaymentResponseDto,
} from './pagos.dto.js';
import { PagosService } from './pagos.service.js';

@ApiTags('Pagos')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido, expiró o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'El actor no puede procesar pagos de la sucursal de la venta.',
})
@Controller('ventas/:ventaId/pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post('caja')
  @MinRole(ACTOR_ROLE.CAJERO)
  @ApiOperation({ summary: 'Confirmar un pago simulado en caja' })
  @ApiParam({ name: 'ventaId', example: 20 })
  @ApiCreatedResponse({
    description: 'Pago confirmado, venta pagada e inventario actualizado.',
    type: ProcessCashPaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Los datos del método de pago no son válidos.',
  })
  @ApiNotFoundResponse({ description: 'No existe la venta solicitada.' })
  @ApiConflictResponse({
    description:
      'La venta no está pendiente, no es presencial o no hay existencias suficientes.',
  })
  processCashierPayment(
    @Param('ventaId', ParseIntPipe) ventaId: number,
    @Body() input: ProcessCashPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.pagosService.processCashierPayment(ventaId, input, user);
  }
}
