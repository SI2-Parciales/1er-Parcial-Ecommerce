import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
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
  AddCarritoDetalleDto,
  CarritoResponseDto,
  SelectCarritoSucursalDto,
  UpdateCarritoDetalleDto,
} from './carrito.dto.js';
import { CarritoService } from './carrito.service.js';

@ApiTags('Carrito')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido, expiró o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'Solo los clientes pueden gestionar un carrito.',
})
@ApiBadRequestResponse({
  description: 'El identificador o la cantidad no son válidos.',
})
@Controller('carrito')
@MinRole(ACTOR_ROLE.CLIENTE)
export class CarritoController {
  constructor(private readonly carritoService: CarritoService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener o crear el carrito del cliente' })
  @ApiOkResponse({ type: CarritoResponseDto })
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.carritoService.get(user);
  }

  @Put('sucursal')
  @ApiOperation({ summary: 'Seleccionar la sucursal del carrito' })
  @ApiOkResponse({ type: CarritoResponseDto })
  @ApiNotFoundResponse({ description: 'La sucursal no existe.' })
  @ApiConflictResponse({ description: 'La sucursal está inactiva.' })
  selectBranch(
    @Body() input: SelectCarritoSucursalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.carritoService.selectBranch(input, user);
  }

  @Post('detalles')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Agregar una variante al carrito' })
  @ApiOkResponse({ type: CarritoResponseDto })
  @ApiNotFoundResponse({ description: 'La variante no existe.' })
  @ApiConflictResponse({
    description:
      'Falta seleccionar sucursal, un recurso está inactivo o no hay existencias suficientes.',
  })
  addDetail(
    @Body() input: AddCarritoDetalleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.carritoService.addDetail(input, user);
  }

  @Patch('detalles/:detalleId')
  @ApiOperation({ summary: 'Actualizar la cantidad de un artículo' })
  @ApiOkResponse({ type: CarritoResponseDto })
  @ApiNotFoundResponse({ description: 'El detalle o la variante no existe.' })
  @ApiConflictResponse({
    description:
      'Falta seleccionar sucursal, un recurso está inactivo o no hay existencias suficientes.',
  })
  updateDetail(
    @Param('detalleId', ParseIntPipe) detailId: number,
    @Body() input: UpdateCarritoDetalleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.carritoService.updateDetail(detailId, input, user);
  }

  @Delete('detalles/:detalleId')
  @ApiOperation({ summary: 'Eliminar un artículo del carrito' })
  @ApiOkResponse({ type: CarritoResponseDto })
  @ApiNotFoundResponse({
    description: 'El detalle no existe en el carrito del cliente.',
  })
  removeDetail(
    @Param('detalleId', ParseIntPipe) detailId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.carritoService.removeDetail(detailId, user);
  }
}
