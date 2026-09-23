export type AiTimeframe = 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CURRENT_SEASON' | 'YEAR_TO_DATE';

export type AiChartType = 'BAR' | 'LINE' | 'PIE' | 'AREA' | 'NONE';

export interface AiChartDataPoint {
  label: string;
  [key: string]: string | number;
}

export interface AiChartConfig {
  type: AiChartType;
  xAxisKey: string;
  series: Array<{
    dataKey: string;
    label: string;
    color?: string;
  }>;
  data: AiChartDataPoint[];
}

export interface AiActionSuggestion {
  id: string;
  title: string;
  description: string;
  actionType: 'NAVIGATE' | 'APPLY_FILTER' | 'OPEN_MODAL';
  targetRoute: string;
  metadata?: Record<string, unknown>;
}

export interface ReportKpiItem {
  label: string;
  value: string | number;
  subtext?: string;
  type?: 'moneda' | 'numero' | 'porcentaje';
  trend?: 'up' | 'down' | 'neutral';
}

export interface ReportColumnDef {
  key: string;
  header: string;
  type?: 'text' | 'currency' | 'number' | 'date' | 'badge';
  align?: 'left' | 'center' | 'right';
}

export interface AiReportResponse {
  queryId: string;
  prompt: string;
  reportCode?: string;
  title?: string;
  scope?: string;
  period?: string;
  requester?: string;
  summaryMarkdown: string;
  kpis?: ReportKpiItem[];
  columns?: ReportColumnDef[];
  tabularData?: Array<Record<string, string | number>>;
  totals?: Record<string, string | number>;
  chart?: AiChartConfig;
  suggestedActions?: AiActionSuggestion[];
  generatedAt: string;
}

export interface AiPromptPayload {
  prompt: string;
  branchId?: string;
  timeframe?: AiTimeframe;
  startDate?: string;
  endDate?: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT';
  content: string;
  reportData?: AiReportResponse;
  isLoading?: boolean;
  timestamp: string;
}
