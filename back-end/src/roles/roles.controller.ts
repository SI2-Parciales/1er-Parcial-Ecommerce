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
import { RoleSummaryDto } from './roles.dto.js';
import { RolesService } from './roles.service.js';

@ApiTags('Roles')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({ description: 'Falta un token válido o la cuenta está inactiva.' })
@ApiForbiddenResponse({ description: 'Solo un administrador puede consultar los roles.' })
@Controller('roles')
@MinRole(ACTOR_ROLE.ADMINISTRADOR)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar el catálogo fijo de roles' })
  @ApiOkResponse({ description: 'Roles disponibles para asignar a usuarios.', type: [RoleSummaryDto] })
  findAll() {
    return this.rolesService.findAll();
  }
}
