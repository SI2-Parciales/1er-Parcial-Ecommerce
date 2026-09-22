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
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { MinRole } from '../auth/decorators/min-role.decorator.js';
import {
  CreateTallaDto,
  DeactivateTallaResponseDto,
  ListTallasQueryDto,
  TallaListResponseDto,
  TallaResponseDto,
  UpdateTallaDto,
} from './tallas.dto.js';
import { TallasService } from './tallas.service.js';

@ApiTags('Tallas')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'Solo un administrador puede gestionar tallas.',
})
@ApiBadRequestResponse({
  description: 'El identificador, consulta o datos enviados no son válidos.',
})
@Controller('tallas')
@MinRole(ACTOR_ROLE.ADMINISTRADOR)
export class TallasController {
  constructor(private readonly tallasService: TallasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una talla' })
  @ApiCreatedResponse({ description: 'Talla creada.', type: TallaResponseDto })
  @ApiConflictResponse({ description: 'Ya existe una talla con ese nombre.' })
  create(@Body() dto: CreateTallaDto) {
    return this.tallasService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tallas activas con paginación' })
  @ApiOkResponse({
    description: 'Tallas y metadatos de paginación.',
    type: TallaListResponseDto,
  })
  findAll(@Query() query: ListTallasQueryDto) {
    return this.tallasService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar una talla, incluso si está inactiva' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Talla encontrada.', type: TallaResponseDto })
  @ApiNotFoundResponse({ description: 'La talla no existe.' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.tallasService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar o reactivar una talla' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Talla actualizada.', type: TallaResponseDto })
  @ApiNotFoundResponse({ description: 'La talla no existe.' })
  @ApiConflictResponse({ description: 'Ya existe una talla con ese nombre.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTallaDto) {
    return this.tallasService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una talla sin eliminarla' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Talla marcada como INACTIVO.',
    type: DeactivateTallaResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La talla no existe.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.tallasService.deactivate(id);
  }
}
