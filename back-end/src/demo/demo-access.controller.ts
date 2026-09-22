import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { MinRole } from '../auth/decorators/min-role.decorator.js';

@ApiTags('Demostración de permisos')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({ description: 'Falta el token, es inválido o la cuenta no está activa.' })
@ApiForbiddenResponse({ description: 'El rol no alcanza el nivel mínimo requerido.' })
@Controller('demo/acceso')
export class DemoAccessController {
  @Get('cliente')
  @MinRole(ACTOR_ROLE.CLIENTE)
  @ApiOperation({ summary: 'Endpoint de demostración para CLIENTE o rol superior' })
  @ApiOkResponse({ description: 'El token pertenece a un actor con nivel CLIENTE o superior.' })
  cliente() {
    return { message: 'Acceso permitido al grupo CLIENTE.', nivelMinimo: ACTOR_ROLE.CLIENTE };
  }

  @Get('cajero')
  @MinRole(ACTOR_ROLE.CAJERO)
  @ApiOperation({ summary: 'Endpoint de demostración para CAJERO o rol superior' })
  @ApiOkResponse({ description: 'El token pertenece a un actor con nivel CAJERO o superior.' })
  cajero() {
    return { message: 'Acceso permitido al grupo CAJERO.', nivelMinimo: ACTOR_ROLE.CAJERO };
  }

  @Get('encargado-sucursal')
  @MinRole(ACTOR_ROLE.ENCARGADO_SUCURSAL)
  @ApiOperation({ summary: 'Endpoint de demostración para ENCARGADO_SUCURSAL o superior' })
  @ApiOkResponse({
    description: 'El token pertenece a un actor con nivel ENCARGADO_SUCURSAL o superior.',
  })
  encargadoSucursal() {
    return {
      message: 'Acceso permitido al grupo ENCARGADO_SUCURSAL.',
      nivelMinimo: ACTOR_ROLE.ENCARGADO_SUCURSAL,
    };
  }

  @Get('administrador')
  @MinRole(ACTOR_ROLE.ADMINISTRADOR)
  @ApiOperation({ summary: 'Endpoint de demostración solo para ADMINISTRADOR' })
  @ApiOkResponse({ description: 'El token pertenece a un administrador.' })
  administrador() {
    return {
      message: 'Acceso permitido al grupo ADMINISTRADOR.',
      nivelMinimo: ACTOR_ROLE.ADMINISTRADOR,
    };
  }
}
