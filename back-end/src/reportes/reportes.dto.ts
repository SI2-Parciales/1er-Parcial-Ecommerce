import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsEnum } from 'class-validator';

export enum ReportTimeframe {
  TODAY = 'TODAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  THIS_MONTH = 'THIS_MONTH',
  CURRENT_SEASON = 'CURRENT_SEASON',
  YEAR_TO_DATE = 'YEAR_TO_DATE',
  CUSTOM = 'CUSTOM',
}

export class GenerarReporteDto {
  @ApiProperty({
    description: 'Instrucción o solicitud del reporte en lenguaje natural (ej: "ventas de vestidos este mes por sucursal")',
    example: 'Quiero un reporte de ventas de vestidos de gala este mes mostrando sucursal, cliente, cantidad y total',
  })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiPropertyOptional({
    description: 'ID o código de sucursal específica a auditar. Si no se indica, consolida todas las permitidas.',
    example: 'branch-1',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Rango temporal predeterminado',
    enum: ReportTimeframe,
    default: ReportTimeframe.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(ReportTimeframe)
  timeframe?: ReportTimeframe;

  @ApiPropertyOptional({
    description: 'Fecha de inicio para rango personalizado (ISO 8601 YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin para rango personalizado (ISO 8601 YYYY-MM-DD)',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}

export class AudioTranscribeDto {
  @ApiPropertyOptional({
    description: 'Audio en formato Base64 o texto transcripto directo',
  })
  @IsOptional()
  @IsString()
  audioBase64?: string;

  @ApiPropertyOptional({
    description: 'Texto transcrito por el cliente',
  })
  @IsOptional()
  @IsString()
  text?: string;
}

export interface ReporteKpiItem {
  label: string;
  valor: string | number;
  subtexto?: string;
  tipo?: 'moneda' | 'numero' | 'porcentaje';
  tendencia?: 'up' | 'down' | 'neutral';
}

export interface ReporteColumnaDef {
  key: string;
  header: string;
  type?: 'text' | 'currency' | 'number' | 'date' | 'badge';
  align?: 'left' | 'center' | 'right';
}

export interface ReporteGraficoConfig {
  type: 'BAR' | 'LINE' | 'AREA' | 'PIE' | 'NONE';
  xAxisKey: string;
  series: Array<{
    dataKey: string;
    label: string;
    color?: string;
  }>;
  data: Array<Record<string, any>>;
}

export interface ReporteAccionSugerida {
  id: string;
  title: string;
  description: string;
  actionType: 'NAVIGATE' | 'OPEN_MODAL' | 'APPLY_FILTER';
  targetRoute?: string;
  metadata?: Record<string, unknown>;
}

export class ReporteEjecutivoResponseDto {
  @ApiProperty()
  queryId!: string;

  @ApiProperty()
  codigoReporte!: string;

  @ApiProperty()
  titulo!: string;

  @ApiProperty()
  ambito!: string;

  @ApiProperty()
  periodo!: string;

  @ApiProperty()
  solicitante!: string;

  @ApiProperty()
  kpis!: ReporteKpiItem[];

  @ApiProperty()
  summaryMarkdown!: string;

  @ApiProperty()
  tabularData!: Array<Record<string, any>>;

  @ApiProperty()
  columns!: ReporteColumnaDef[];

  @ApiPropertyOptional()
  totales?: Record<string, string | number>;

  @ApiPropertyOptional()
  chart?: ReporteGraficoConfig;

  @ApiProperty()
  suggestedActions!: ReporteAccionSugerida[];

  @ApiProperty()
  generatedAt!: string;
}
