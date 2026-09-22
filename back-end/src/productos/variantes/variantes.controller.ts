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
import { ACTOR_ROLE } from '../../auth/auth.constants.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { MinRole } from '../../auth/decorators/min-role.decorator.js';
import { OptionalAuth } from '../../auth/decorators/optional-auth.decorator.js';
import type { AuthenticatedUser } from '../../auth/guards/jwt-auth.guard.js';
import {
  CreateVarianteProductoDto,
  DeactivateVarianteResponseDto,
  QueryVariantesDto,
  UpdateVarianteProductoDto,
  VarianteListResponseDto,
  VarianteProductoResponseDto,
} from './variantes.dto.js';
import { VariantesService } from './variantes.service.js';

@ApiTags('Variantes de producto')
@ApiUnauthorizedResponse({
  description: 'El token enviado es inválido o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'El rol no tiene permiso para esta operación o filtro.',
})
@ApiBadRequestResponse({
  description: 'El identificador o los datos enviados no son válidos.',
})
@Controller('productos/:productoId/variantes')
export class VariantesController {
  constructor(private readonly variantesService: VariantesService) {}

  @Post()
  @ApiBearerAuth('bearerAuth')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear una variante de producto' })
  @ApiParam({ name: 'productoId', example: 1 })
  @ApiCreatedResponse({
    description: 'Variante creada.',
    type: VarianteProductoResponseDto,
  })
  @ApiNotFoundResponse({ description: 'No existe el producto, talla o color.' })
  @ApiConflictResponse({
    description: 'SKU o combinación de producto, talla y color duplicada.',
  })
  create(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() dto: CreateVarianteProductoDto,
  ) {
    return this.variantesService.create(productoId, dto);
  }

  @Get()
  @OptionalAuth()
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary:
      'Listar variantes activas; un administrador puede filtrar inactivas',
    description: 'El JWT es opcional para las variantes públicas activas.',
  })
  @ApiParam({ name: 'productoId', example: 1 })
  @ApiOkResponse({
    description: 'Variantes y metadatos de paginación.',
    type: VarianteListResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'El producto no existe o no es visible públicamente.',
  })
  findAll(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Query() query: QueryVariantesDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.variantesService.findAll(productoId, query, user);
  }

  @Get(':id')
  @OptionalAuth()
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Consultar una variante del producto indicado' })
  @ApiParam({ name: 'productoId', example: 1 })
  @ApiParam({ name: 'id', example: 5 })
  @ApiOkResponse({
    description: 'Variante con talla y color.',
    type: VarianteProductoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'El producto o la variante no existe o no es visible.',
  })
  findById(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.variantesService.findById(productoId, id, user);
  }

  @Patch(':id')
  @ApiBearerAuth('bearerAuth')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar o reactivar una variante' })
  @ApiParam({ name: 'productoId', example: 1 })
  @ApiParam({ name: 'id', example: 5 })
  @ApiOkResponse({
    description: 'Variante actualizada.',
    type: VarianteProductoResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe el producto, variante, talla o color.',
  })
  @ApiConflictResponse({ description: 'SKU o combinación duplicada.' })
  update(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVarianteProductoDto,
  ) {
    return this.variantesService.update(productoId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar una variante sin eliminarla' })
  @ApiParam({ name: 'productoId', example: 1 })
  @ApiParam({ name: 'id', example: 5 })
  @ApiOkResponse({
    description: 'Variante marcada como INACTIVO.',
    type: DeactivateVarianteResponseDto,
  })
  @ApiNotFoundResponse({ description: 'El producto o la variante no existe.' })
  deactivate(
    @Param('productoId', ParseIntPipe) productoId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.variantesService.deactivate(productoId, id);
  }
}
