import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
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
  InventarioDisponibilidadResponseDto,
  InventarioListResponseDto,
  InventarioVarianteDetalleResponseDto,
  QueryDetalleInventarioDto,
  QueryInventarioDto,
  UpdateDisponibilidadDto,
} from './inventario.dto.js';
import { InventarioService } from './inventario.service.js';

@ApiTags('Inventario')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido, expiró o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'Solo ENCARGADO_SUCURSAL o ADMINISTRADOR pueden consultar.',
})
@ApiBadRequestResponse({
  description: 'Uno o más filtros o identificadores no son válidos.',
})
@Controller('inventario')
@MinRole(ACTOR_ROLE.ENCARGADO_SUCURSAL)
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get()
  @ApiOperation({
    summary: 'Consultar inventario consolidado o de una sucursal',
    description:
      'Sin sucursalId suma todas las sucursales. Con sucursalId conserva las variantes sin inventario y devuelve cantidades cero.',
  })
  @ApiOkResponse({
    description: 'Inventario paginado, cantidades y disponibilidad calculada.',
    type: InventarioListResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La sucursal indicada no existe.' })
  findAll(@Query() query: QueryInventarioDto) {
    return this.inventarioService.findAll(query);
  }

  @Get('variantes/:varianteId')
  @ApiOperation({
    summary: 'Consultar una variante en todas las sucursales',
    description:
      'Incluye los totales globales y sucursales sin fila de inventario con cantidades cero.',
  })
  @ApiParam({ name: 'varianteId', example: 12 })
  @ApiOkResponse({
    description: 'Variante, totales globales y desglose paginado por sucursal.',
    type: InventarioVarianteDetalleResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La variante indicada no existe.' })
  findVariant(
    @Param('varianteId', ParseIntPipe) varianteId: number,
    @Query() query: QueryDetalleInventarioDto,
  ) {
    return this.inventarioService.findVariant(varianteId, query);
  }

  @Patch(':id/disponibilidad')
  @ApiOperation({
    summary: 'Apartar o habilitar unidades de un inventario local',
    description:
      'El encargado solo puede modificar su sucursal. El administrador puede modificar cualquier sucursal. Se exige el valor anterior para detectar concurrencia.',
  })
  @ApiParam({ name: 'id', example: 25 })
  @ApiOkResponse({
    description:
      'Disponibilidad actualizada sin alterar existencia física ni reservada.',
    type: InventarioDisponibilidadResponseDto,
  })
  @ApiNotFoundResponse({ description: 'El inventario indicado no existe.' })
  @ApiConflictResponse({
    description: 'La cantidad no disponible fue modificada por otra solicitud.',
  })
  updateAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDisponibilidadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventarioService.updateAvailability(id, dto, user);
  }
}
