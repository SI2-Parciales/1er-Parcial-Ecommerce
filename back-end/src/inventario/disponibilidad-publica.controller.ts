import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import {
  DisponibilidadPublicaVarianteResponseDto,
  QueryDetalleInventarioDto,
} from './inventario.dto.js';
import { InventarioService } from './inventario.service.js';

@ApiTags('Disponibilidad pública')
@Controller('inventario/publico')
export class DisponibilidadPublicaController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get('variantes/:varianteId')
  @Public()
  @ApiOperation({
    summary: 'Consultar disponibilidad de una variante en sucursales activas',
    description:
      'Consulta pública para clientes. Solo expone ubicación y unidades disponibles.',
  })
  @ApiParam({ name: 'varianteId', example: 15 })
  @ApiOkResponse({
    description:
      'Variante visible y disponibilidad paginada por sucursal activa.',
    type: DisponibilidadPublicaVarianteResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'El identificador o la paginación no son válidos.',
  })
  @ApiNotFoundResponse({
    description: 'La variante no existe o no está disponible públicamente.',
  })
  findVariant(
    @Param('varianteId', ParseIntPipe) varianteId: number,
    @Query() query: QueryDetalleInventarioDto,
  ) {
    return this.inventarioService.findPublicVariantAvailability(
      varianteId,
      query,
    );
  }
}
