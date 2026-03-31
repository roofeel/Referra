import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReferrerTypeStat } from './dashboardData';

type DashboardInsightsProps = {
  referrerTypeStats: ReferrerTypeStat[];
};

const chartColors = ['#1d4ed8', '#3b82f6', '#60a5fa', '#94a3b8', '#14b8a6', '#f59e0b'];

function DonutChart({ stats }: { stats: ReferrerTypeStat[] }) {
  const size = 140;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = stats.reduce((sum, item) => sum + item.count, 0);

  let acc = 0;
  const segments = stats
    .filter((item) => item.count > 0)
    .map((item, index) => {
      const ratio = total > 0 ? item.count / total : 0;
      const dash = ratio * circumference;
      const offset = circumference - acc;
      acc += dash;
      return {
        key: `${item.referrerType}-${index}`,
        color: chartColors[index % chartColors.length],
        dash,
        offset,
      };
    });

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        {segments.map((segment) => (
          <circle
            key={segment.key}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={stroke}
            strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
            strokeDashoffset={segment.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
    </div>
  );
}

export function DashboardInsights({ referrerTypeStats }: DashboardInsightsProps) {
  const topStats = referrerTypeStats.slice(0, 6);
  const barData = referrerTypeStats.slice(0, 8).map((item, index) => ({
    referrerType: item.referrerType || 'unknown',
    count: item.count,
    color: chartColors[index % chartColors.length],
  }));
  const barChartHeight = Math.max(220, barData.length * 36);

  return (
    <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-xl border border-slate-200/15 bg-white p-6 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900">Referrer Type Bar Chart</h3>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Grouped by referrer_type
          </span>
        </div>

        <div className="mb-6" style={{ height: `${barChartHeight}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="referrerType"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                width={120}
                tickFormatter={(value: string) => {
                  const text = String(value ?? '');
                  return text.length > 16 ? `${text.slice(0, 16)}...` : text;
                }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148, 163, 184, 0.14)' }}
                formatter={(value) => [
                  new Intl.NumberFormat('en-US').format(Number(value ?? 0)),
                  'Count',
                ]}
                labelFormatter={(label) => `Referrer Type: ${String(label ?? '')}`}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                {barData.map((entry) => (
                  <Cell key={entry.referrerType} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/15 bg-white p-6">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-tight text-slate-900">Referrer Type Donut Chart</h3>
        <DonutChart stats={topStats} />
        <div className="mt-4 space-y-2">
          {topStats.map((item, index) => (
            <div key={item.referrerType} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: chartColors[index % chartColors.length] }}
                />
                <span className="truncate text-slate-700" title={item.referrerType}>
                  {item.referrerType}
                </span>
              </div>
              <span className="font-semibold text-slate-900">{item.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
