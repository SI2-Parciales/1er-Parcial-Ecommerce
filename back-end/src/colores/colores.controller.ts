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
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator.js';
import {
  ColorListResponseDto,
  ColorResponseDto,
  CreateColorDto,
  DeactivateColorResponseDto,
  ListColoresQueryDto,
  UpdateColorDto,
} from './colores.dto.js';
import { ColoresService } from './colores.service.js';

@ApiTags('Colores')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'Solo un administrador puede gestionar colores.',
})
@ApiBadRequestResponse({
  description: 'El identificador, consulta o datos enviados no son válidos.',
})
@Controller('colores')
export class ColoresController {
  constructor(private readonly coloresService: ColoresService) {}

  @Post()
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear un color' })
  @ApiCreatedResponse({ description: 'Color creado.', type: ColorResponseDto })
  @ApiConflictResponse({ description: 'Ya existe un color con ese nombre.' })
  create(@Body() dto: CreateColorDto) {
    return this.coloresService.create(dto);
  }

  @Get()
  @OptionalAuth()
  @ApiOperation({ summary: 'Listar colores activos con paginación' })
  @ApiOkResponse({
    description: 'Colores y metadatos de paginación.',
    type: ColorListResponseDto,
  })
  findAll(@Query() query: ListColoresQueryDto) {
    return this.coloresService.findAll(query);
  }

  @Get(':id')
  @OptionalAuth()
  @ApiOperation({ summary: 'Consultar un color, incluso si está inactivo' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Color encontrado.', type: ColorResponseDto })
  @ApiNotFoundResponse({ description: 'El color no existe.' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.coloresService.findById(id);
  }

  @Patch(':id')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar o reactivar un color' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({ description: 'Color actualizado.', type: ColorResponseDto })
  @ApiNotFoundResponse({ description: 'El color no existe.' })
  @ApiConflictResponse({ description: 'Ya existe un color con ese nombre.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateColorDto) {
    return this.coloresService.update(id, dto);
  }

  @Delete(':id')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar un color sin eliminarla' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Color marcado como INACTIVO.',
    type: DeactivateColorResponseDto,
  })
  @ApiNotFoundResponse({ description: 'El color no existe.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.coloresService.deactivate(id);
  }
}
