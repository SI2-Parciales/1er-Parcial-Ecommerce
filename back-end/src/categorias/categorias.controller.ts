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
  CategoriaListResponseDto,
  CategoriaResponseDto,
  CreateCategoriaDto,
  DeactivateCategoriaResponseDto,
  ListCategoriasQueryDto,
  UpdateCategoriaDto,
} from './categorias.dto.js';
import { CategoriasService } from './categorias.service.js';

@ApiTags('Categorías')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'Solo un administrador puede gestionar categorías.',
})
@ApiBadRequestResponse({
  description: 'El identificador, consulta o datos enviados no son válidos.',
})
@Controller('categorias')
@MinRole(ACTOR_ROLE.ADMINISTRADOR)
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una categoría' })
  @ApiCreatedResponse({
    description: 'Categoría creada.',
    type: CategoriaResponseDto,
  })
  @ApiConflictResponse({
    description: 'Ya existe una categoría con ese nombre.',
  })
  create(@Body() dto: CreateCategoriaDto) {
    return this.categoriasService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorías activas con paginación' })
  @ApiOkResponse({
    description: 'Categorías y metadatos de paginación.',
    type: CategoriaListResponseDto,
  })
  findAll(@Query() query: ListCategoriasQueryDto) {
    return this.categoriasService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar una categoría, incluso si está inactiva',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Categoría encontrada.',
    type: CategoriaResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La categoría no existe.' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar o reactivar una categoría' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Categoría actualizada.',
    type: CategoriaResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La categoría no existe.' })
  @ApiConflictResponse({
    description: 'Ya existe una categoría con ese nombre.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoriaDto,
  ) {
    return this.categoriasService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar una categoría sin eliminarla' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Categoría marcada como INACTIVO.',
    type: DeactivateCategoriaResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La categoría no existe.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.categoriasService.deactivate(id);
  }
}
