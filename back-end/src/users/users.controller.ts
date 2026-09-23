import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import {
  DeactivateUserResponseDto,
  ListUsersQueryDto,
  ManagedUserDto,
  UpdateUserDto,
  UserListResponseDto,
} from './users.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Usuarios')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({ description: 'Falta un token válido o la cuenta está inactiva.' })
@ApiForbiddenResponse({ description: 'Solo un administrador puede gestionar usuarios.' })
@ApiBadRequestResponse({ description: 'Parámetros, ID o cuerpo de solicitud inválidos.' })
@Controller('users')
@MinRole(ACTOR_ROLE.ADMINISTRADOR)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @MinRole(ACTOR_ROLE.CLIENTE)
  @ApiOperation({ summary: 'Consultar el perfil del usuario autenticado' })
  @ApiOkResponse({ description: 'Datos del usuario autenticado.' })
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const fullUser = await this.usersService.findById(user.id);
    return {
      id: fullUser.id,
      nombre: fullUser.nombre,
      apellido: fullUser.apellido,
      telefono: fullUser.telefono,
      email: fullUser.email,
      estado: fullUser.estado,
      rol: fullUser.rol.nombre,
      sucursalId: fullUser.sucursalId,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Listar usuarios con paginación' })
  @ApiOkResponse({ description: 'Usuarios y metadatos de paginación.', type: UserListResponseDto })
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar un usuario' })
  @ApiParam({ name: 'id', example: 12 })
  @ApiOkResponse({ description: 'Datos públicos del usuario.', type: ManagedUserDto })
  @ApiNotFoundResponse({ description: 'El usuario no existe.' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar datos, rol o estado de un usuario' })
  @ApiParam({ name: 'id', example: 12 })
  @ApiOkResponse({ description: 'Usuario actualizado.', type: ManagedUserDto })
  @ApiNotFoundResponse({ description: 'No existe el usuario o el rol solicitado.' })
  @ApiConflictResponse({ description: 'Email duplicado o se intenta quitar el último administrador.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un usuario sin borrar su historial' })
  @ApiParam({ name: 'id', example: 12 })
  @ApiOkResponse({ description: 'Usuario marcado como INACTIVO.', type: DeactivateUserResponseDto })
  @ApiNotFoundResponse({ description: 'El usuario no existe.' })
  @ApiConflictResponse({ description: 'No se puede desactivar el último administrador activo.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deactivate(id);
  }
}
