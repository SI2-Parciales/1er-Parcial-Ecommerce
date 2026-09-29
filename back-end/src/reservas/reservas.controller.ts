import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
  CreateReservaDto,
  ListReservasQueryDto,
  ReservaDetailDto,
  ReservaListResponseDto,
  UpdateReservaDetalleDto,
} from './reservas.dto.js';
import { ReservasService } from './reservas.service.js';

@ApiTags('Reservas')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({ description: 'Se requiere un token válido.' })
@ApiForbiddenResponse({
  description: 'Solo los clientes pueden gestionar reservas.',
})
@ApiBadRequestResponse({ description: 'Los datos enviados no son válidos.' })
@Controller('reservas')
@MinRole(ACTOR_ROLE.CLIENTE)
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una reserva de prendas' })
  @ApiCreatedResponse({
    description: 'Reserva creada.',
    type: ReservaDetailDto,
  })
  @ApiNotFoundResponse({
    description: 'La sucursal, variante o inventario no existe.',
  })
  @ApiConflictResponse({
    description: 'Sucursal inactiva o stock insuficiente.',
  })
  create(
    @Body() input: CreateReservaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservasService.create(input, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar las reservas del cliente autenticado' })
  @ApiOkResponse({
    description: 'Reservas y metadatos de paginación.',
    type: ReservaListResponseDto,
  })
  findAll(
    @Query() query: ListReservasQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservasService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar el detalle de una reserva propia' })
  @ApiOkResponse({
    description: 'Reserva encontrada.',
    type: ReservaDetailDto,
  })
  @ApiNotFoundResponse({ description: 'No se encontró la reserva solicitada.' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservasService.findOne(id, user);
  }

  @Patch(':id/detalles/:detalleId')
  @ApiOperation({ summary: 'Reducir la cantidad de una prenda reservada' })
  @ApiOkResponse({
    description: 'Detalle actualizado.',
    type: ReservaDetailDto,
  })
  @ApiNotFoundResponse({ description: 'No se encontró la reserva o detalle.' })
  @ApiConflictResponse({ description: 'La reserva no permite modificaciones.' })
  updateDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detailId: number,
    @Body() input: UpdateReservaDetalleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservasService.updateDetail(id, detailId, input, user);
  }

  @Delete(':id/detalles/:detalleId')
  @ApiOperation({ summary: 'Quitar una prenda de una reserva' })
  @ApiOkResponse({
    description: 'Detalle quitado; la reserva se cancela si quedó vacía.',
    type: ReservaDetailDto,
  })
  @ApiNotFoundResponse({ description: 'No se encontró la reserva o detalle.' })
  @ApiConflictResponse({ description: 'La reserva no permite modificaciones.' })
  removeDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('detalleId', ParseIntPipe) detailId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservasService.removeDetail(id, detailId, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar una reserva pendiente' })
  @ApiOkResponse({
    description: 'Reserva cancelada.',
    type: ReservaDetailDto,
  })
  @ApiNotFoundResponse({ description: 'No se encontró la reserva solicitada.' })
  @ApiConflictResponse({ description: 'La reserva no permite cancelación.' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservasService.cancel(id, user);
  }
}
