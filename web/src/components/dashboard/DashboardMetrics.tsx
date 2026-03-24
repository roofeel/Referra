import { MetricCard } from './MetricCard';
import type { Metric } from './dashboardData';

type DashboardMetricsProps = {
  metrics: Metric[];
};

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  return (
    <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </section>
  );
}
