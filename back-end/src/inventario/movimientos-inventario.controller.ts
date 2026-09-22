import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MinRole } from '../auth/decorators/min-role.decorator.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import {
  CreateMovimientoInventarioDto,
  MovimientoInventarioListResponseDto,
  MovimientoInventarioResponseDto,
  QueryMovimientosInventarioDto,
} from './movimientos-inventario.dto.js';
import { MovimientosInventarioService } from './movimientos-inventario.service.js';

@ApiTags('Inventario')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido, expiró o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'El actor no puede operar o consultar la sucursal indicada.',
})
@Controller('inventario/movimientos')
@MinRole(ACTOR_ROLE.ENCARGADO_SUCURSAL)
export class MovimientosInventarioController {
  constructor(
    private readonly movimientosService: MovimientosInventarioService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar un movimiento de inventario',
    description:
      'Aplica recepción, transferencia, devolución o merma de forma atómica e idempotente.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
    description: 'UUID v4 único para esta operación lógica.',
  })
  @ApiCreatedResponse({
    description: 'Movimiento confirmado e inventarios resultantes.',
    type: MovimientoInventarioResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El cuerpo, la cantidad o las sucursales no son válidos.',
  })
  @ApiNotFoundResponse({
    description: 'La variante o alguna sucursal no existe.',
  })
  @ApiConflictResponse({
    description:
      'Existencias insuficientes, recurso inactivo o clave idempotente reutilizada con otro cuerpo.',
  })
  create(
    @Body() input: CreateMovimientoInventarioDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.movimientosService.create(input, user, idempotencyKey);
  }

  @Get()
  @ApiOperation({
    summary: 'Consultar el historial de movimientos de inventario',
    description:
      'El administrador consulta el historial global; el encargado queda limitado a su sucursal.',
  })
  @ApiOkResponse({
    description: 'Historial paginado y filtrado.',
    type: MovimientoInventarioListResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Los filtros no son válidos.' })
  @ApiNotFoundResponse({ description: 'La sucursal indicada no existe.' })
  findAll(
    @Query() query: QueryMovimientosInventarioDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.movimientosService.findAll(query, user);
  }
}
