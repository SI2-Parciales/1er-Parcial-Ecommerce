import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACTOR_ROLE } from '../../auth/auth.constants.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { MinRole } from '../../auth/decorators/min-role.decorator.js';
import type { AuthenticatedUser } from '../../auth/guards/jwt-auth.guard.js';
import { ReportQueryDto, ReportQueryResponseDto } from './report-query.dto.js';
import { ReportQueryService } from './report-query.service.js';

@ApiTags('Reportes internos')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({ description: 'Se requiere un token JWT válido.' })
@ApiForbiddenResponse({ description: 'El usuario no puede consultar este reporte.' })
@Controller('internal/reports')
export class ReportQueryController {
  constructor(private readonly reportQueryService: ReportQueryService) {}

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @MinRole(ACTOR_ROLE.ENCARGADO_SUCURSAL)
  @ApiOperation({
    summary: 'Consultar métricas estructuradas para reportes',
    description:
      'Requiere JWT vigente y rol ENCARGADO_SUCURSAL o ADMINISTRADOR.',
  })
  @ApiOkResponse({ type: ReportQueryResponseDto })
  query(
    @Body() dto: ReportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReportQueryResponseDto> {
    return this.reportQueryService.query(dto, user);
  }
}
