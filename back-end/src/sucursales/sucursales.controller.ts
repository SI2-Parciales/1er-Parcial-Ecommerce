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
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { MinRole } from '../auth/decorators/min-role.decorator.js';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator.js';
import {
  CreateSucursalDto,
  DeactivateSucursalResponseDto,
  ListSucursalesQueryDto,
  AssignPersonalDto,
  SucursalListResponseDto,
  SucursalPersonalDto,
  SucursalResponseDto,
  UpdateSucursalDto,
} from './sucursales.dto.js';
import { SucursalesService } from './sucursales.service.js';

@ApiTags('Sucursales')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'El rol no tiene permiso para esta operación.',
})
@ApiBadRequestResponse({
  description: 'El identificador o los datos enviados no son válidos.',
})
@Controller('sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Post()
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear una sucursal' })
  @ApiCreatedResponse({
    description: 'Sucursal creada.',
    type: SucursalResponseDto,
  })
  create(@Body() dto: CreateSucursalDto) {
    return this.sucursalesService.create(dto);
  }

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: 'Listar sucursales con paginación' })
  @ApiOkResponse({
    description: 'Sucursales y metadatos de paginación.',
    type: SucursalListResponseDto,
  })
  findAll(@Query() query: ListSucursalesQueryDto) {
    return this.sucursalesService.findAll(query);
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOperation({ summary: 'Consultar una sucursal' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Sucursal encontrada.',
    type: SucursalResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La sucursal no existe.' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.findById(id);
  }

  @Patch(':id')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar datos o estado de una sucursal' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Sucursal actualizada.',
    type: SucursalResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La sucursal no existe.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSucursalDto,
  ) {
    return this.sucursalesService.update(id, dto);
  }

  @Delete(':id')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar una sucursal sin borrarla de la base' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Sucursal marcada como INACTIVO.',
    type: DeactivateSucursalResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La sucursal no existe.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.deactivate(id);
  }

  @Get(':id/personal')
  @MinRole(ACTOR_ROLE.ENCARGADO_SUCURSAL)
  @ApiOperation({ summary: 'Listar personal asignado a una sucursal' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Lista pública de personal; puede estar vacía.',
    type: [SucursalPersonalDto],
  })
  @ApiNotFoundResponse({ description: 'La sucursal no existe.' })
  findPersonal(@Param('id', ParseIntPipe) id: number) {
    return this.sucursalesService.findPersonal(id);
  }

  @Post(':id/personal')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Asignar o reasignar personal a una sucursal' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiCreatedResponse({
    description: 'Usuario asignado o reasignado.',
    type: SucursalPersonalDto,
  })
  @ApiNotFoundResponse({ description: 'No existe la sucursal o el usuario.' })
  @ApiConflictResponse({
    description:
      'La sucursal está inactiva o el usuario ya está asignado allí.',
  })
  assignPersonal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPersonalDto,
  ) {
    return this.sucursalesService.assignPersonal(id, dto);
  }

  @Delete(':id/personal/:usuarioId')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desasignar un usuario de su sucursal' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'usuarioId', example: 12 })
  @ApiOkResponse({
    description: 'Usuario conservado y desasignado.',
    type: SucursalPersonalDto,
  })
  @ApiNotFoundResponse({
    description: 'La sucursal no existe o el usuario no pertenece a ella.',
  })
  unassignPersonal(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
  ) {
    return this.sucursalesService.unassignPersonal(id, usuarioId);
  }
}
