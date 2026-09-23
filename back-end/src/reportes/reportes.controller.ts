import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ACTOR_ROLE } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { MinRole } from '../auth/decorators/min-role.decorator.js';
import type { AuthenticatedUser } from '../auth/guards/jwt-auth.guard.js';
import {
  GenerarReporteDto,
  ReporteEjecutivoResponseDto,
  AudioTranscribeDto,
} from './reportes.dto.js';
import { ReportesService } from './reportes.service.js';

@ApiTags('Reportes Ejecutivos')
@ApiBearerAuth('bearerAuth')
@ApiUnauthorizedResponse({
  description: 'Falta un token válido, expiró o la cuenta está inactiva.',
})
@ApiForbiddenResponse({
  description: 'Solo ENCARGADO_SUCURSAL o ADMINISTRADOR pueden generar reportes.',
})
@Controller('reportes')
@MinRole(ACTOR_ROLE.ENCARGADO_SUCURSAL)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post('generar')
  @ApiOperation({
    summary: 'Generar reporte ejecutivo dinámico por texto o comando de voz',
    description:
      'Interpreta la solicitud en lenguaje natural, filtra datos reales o híbridos y estructura una tabla formal con KPIs, gráficos y acciones.',
  })
  @ApiCreatedResponse({
    description: 'Reporte ejecutivo estructurado formalmente.',
    type: ReporteEjecutivoResponseDto,
  })
  generarReporte(
    @Body() dto: GenerarReporteDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReporteEjecutivoResponseDto> {
    return this.reportesService.generarReporte(dto, user);
  }

  @Post('audio')
  @ApiOperation({
    summary: 'Procesar dictado por audio o voz para reporte dinámico',
  })
  @ApiCreatedResponse({
    description: 'Transcripción y generación directa del reporte.',
  })
  async procesarAudio(
    @Body() dto: AudioTranscribeDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ReporteEjecutivoResponseDto> {
    const prompt = dto.text || 'Reporte de ventas e inventario del mes';
    return this.reportesService.generarReporte({ prompt }, user);
  }

  @Get('sugerencias')
  @ApiOperation({
    summary: 'Obtener sugerencias contextuales de reportes según el rol y sucursal',
  })
  @ApiOkResponse({
    description: 'Lista de prompts recomendados para el usuario.',
  })
  obtenerSugerencias(@CurrentUser() user: AuthenticatedUser): { prompts: string[] } {
    return {
      prompts: this.reportesService.getSuggestedPrompts(user),
    };
  }
}
