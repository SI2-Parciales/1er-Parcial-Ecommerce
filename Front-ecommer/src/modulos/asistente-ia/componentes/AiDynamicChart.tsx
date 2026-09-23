import {
 ResponsiveContainer,
 BarChart,
 Bar,
 LineChart,
 Line,
 AreaChart,
 Area,
 PieChart,
 Pie,
 Cell,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 Legend,
} from 'recharts';
import type { AiChartConfig } from '../tipos/ai.types';

interface AiDynamicChartProps {
 config: AiChartConfig;
}

const DEFAULT_PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function AiDynamicChart({ config }: AiDynamicChartProps) {
 if (!config || !config.data || config.data.length === 0 || config.type === 'NONE') {
 return null;
 }

 const renderChart = () => {
 switch (config.type) {
 case 'LINE':
 return (
 <LineChart data={config.data}>
 <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
 <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <Tooltip
 contentStyle={{
 backgroundColor: 'rgba(17, 24, 39, 0.95)',
 borderColor: '#374151',
 borderRadius: '0.5rem',
 color: '#fff',
 fontSize: '12px',
 }}
 />
 <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
 {config.series.map((s, idx) => (
 <Line
 key={s.dataKey}
 type="monotone"
 dataKey={s.dataKey}
 name={s.label}
 stroke={s.color || DEFAULT_PIE_COLORS[idx % DEFAULT_PIE_COLORS.length]}
 strokeWidth={2.5}
 dot={{ r: 4 }}
 activeDot={{ r: 6 }}
 />
 ))}
 </LineChart>
 );

 case 'AREA':
 return (
 <AreaChart data={config.data}>
 <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
 <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <Tooltip
 contentStyle={{
 backgroundColor: 'rgba(17, 24, 39, 0.95)',
 borderColor: '#374151',
 borderRadius: '0.5rem',
 color: '#fff',
 fontSize: '12px',
 }}
 />
 <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
 {config.series.map((s, idx) => {
 const color = s.color || DEFAULT_PIE_COLORS[idx % DEFAULT_PIE_COLORS.length];
 return (
 <Area
 key={s.dataKey}
 type="monotone"
 dataKey={s.dataKey}
 name={s.label}
 stroke={color}
 fill={color}
 fillOpacity={0.25}
 />
 );
 })}
 </AreaChart>
 );

 case 'PIE':
 const pieKey = config.series[0]?.dataKey || 'value';
 return (
 <PieChart>
 <Tooltip
 contentStyle={{
 backgroundColor: 'rgba(17, 24, 39, 0.95)',
 borderColor: '#374151',
 borderRadius: '0.5rem',
 color: '#fff',
 fontSize: '12px',
 }}
 />
 <Legend wrapperStyle={{ fontSize: '11px' }} />
 <Pie
 data={config.data}
 dataKey={pieKey}
 nameKey={config.xAxisKey}
 cx="50%"
 cy="50%"
 outerRadius={105}
 innerRadius={45}
 paddingAngle={4}
 label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
 >
 {config.data.map((_, index) => (
 <Cell
 key={`cell-${index}`}
 fill={DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length]}
 />
 ))}
 </Pie>
 </PieChart>
 );

 case 'BAR':
 default:
 return (
 <BarChart data={config.data}>
 <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
 <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 11 }} />
 <YAxis tick={{ fontSize: 11 }} />
 <Tooltip
 contentStyle={{
 backgroundColor: 'rgba(17, 24, 39, 0.95)',
 borderColor: '#374151',
 borderRadius: '0.5rem',
 color: '#fff',
 fontSize: '12px',
 }}
 />
 <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
 {config.series.map((s, idx) => (
 <Bar
 key={s.dataKey}
 dataKey={s.dataKey}
 name={s.label}
 fill={s.color || DEFAULT_PIE_COLORS[idx % DEFAULT_PIE_COLORS.length]}
 radius={[4, 4, 0, 0]}
 />
 ))}
 </BarChart>
 );
 }
 };

 return (
 <div className="w-full my-4 p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
 <div className="h-72 w-full">
 <ResponsiveContainer width="100%" height="100%">
 {renderChart()}
 </ResponsiveContainer>
 </div>
 </div>
 );
}
