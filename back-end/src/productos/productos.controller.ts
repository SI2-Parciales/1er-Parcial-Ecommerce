import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConsumes,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MinRole } from '../auth/decorators/min-role.decorator.js';
import { OptionalAuth } from '../auth/decorators/optional-auth.decorator.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import {
  CreateProductoDto,
  DeactivateProductoResponseDto,
  DeleteProductoImageResponseDto,
  ProductoDetalleResponseDto,
  ProductoListResponseDto,
  ProductoResponseDto,
  QueryProductosDto,
  UpdateProductoDto,
} from './productos.dto.js';
import { MAX_PRODUCT_IMAGE_BYTES } from './product-images.constants.js';
import type { UploadedProductImage } from './product-images-storage.service.js';
import { ProductosService } from './productos.service.js';

@ApiTags('Productos')
@ApiUnauthorizedResponse({
  description: 'El token enviado es inválido o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'El rol no tiene permiso para esta operación o filtro.',
})
@ApiBadRequestResponse({
  description: 'El identificador o los datos enviados no son válidos.',
})
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @ApiBearerAuth('bearerAuth')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear un producto' })
  @ApiCreatedResponse({
    description: 'Producto creado.',
    type: ProductoResponseDto,
  })
  @ApiNotFoundResponse({ description: 'La categoría no existe.' })
  create(@Body() dto: CreateProductoDto) {
    return this.productosService.create(dto);
  }

  @Get()
  @OptionalAuth()
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary:
      'Listar productos activos; un administrador puede filtrar inactivos',
    description:
      'El JWT es opcional para el catálogo activo. Usa Authorize para consultar INACTIVO.',
  })
  @ApiOkResponse({
    description: 'Productos y metadatos de paginación.',
    type: ProductoListResponseDto,
  })
  findAll(
    @Query() query: QueryProductosDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.productosService.findAll(query, user);
  }

  @Get(':id')
  @OptionalAuth()
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Consultar un producto con sus variantes',
    description:
      'El JWT es opcional; los recursos inactivos solo son visibles para ADMINISTRADOR.',
  })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Producto, categoría y variantes.',
    type: ProductoDetalleResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'El producto no existe o no es visible públicamente.',
  })
  findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.productosService.findById(id, user);
  }

  @Patch(':id')
  @ApiBearerAuth('bearerAuth')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar o reactivar un producto' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Producto actualizado.',
    type: ProductoResponseDto,
  })
  @ApiNotFoundResponse({ description: 'El producto o la categoría no existe.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductoDto,
  ) {
    return this.productosService.update(id, dto);
  }

  @Put(':id/imagen')
  @ApiBearerAuth('bearerAuth')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @UseInterceptors(
    FileInterceptor('imagen', {
      limits: { fileSize: MAX_PRODUCT_IMAGE_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['imagen'],
      properties: {
        imagen: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Subir o reemplazar la imagen de un producto' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Producto con la nueva URL pública de imagen.',
    type: ProductoResponseDto,
  })
  @ApiNotFoundResponse({ description: 'El producto no existe.' })
  uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: UploadedProductImage,
  ) {
    return this.productosService.uploadImage(id, file);
  }

  @Delete(':id/imagen')
  @ApiBearerAuth('bearerAuth')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar la imagen de un producto' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'La imagen dejó de estar asociada al producto.',
    type: DeleteProductoImageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'El producto no existe.' })
  deleteImage(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.deleteImage(id);
  }

  @Delete(':id')
  @ApiBearerAuth('bearerAuth')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar un producto sin borrar sus variantes' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiOkResponse({
    description: 'Producto marcado como INACTIVO.',
    type: DeactivateProductoResponseDto,
  })
  @ApiNotFoundResponse({ description: 'El producto no existe.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.productosService.deactivate(id);
  }
}
