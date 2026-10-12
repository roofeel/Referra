import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const tooltipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(15,23,42,.08)', fontSize: 12 };

export function ReasonCountChart({ data }: { data: Array<{ reason: string; count: number }> }) {
  return (
    <article className="rounded-xl border border-slate-200/80 bg-white p-5 xl:col-start-4 xl:col-span-2">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Reason count by category</h3>
        <p className="mt-1 text-xs text-slate-500">Bid responses grouped by extracted Reason · selected line item</p>
      </div>
      {data.length ? (
        <div className="mt-5 h-[270px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#eef2f6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(Number(value))} />
              <YAxis type="category" dataKey="reason" width={150} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [new Intl.NumberFormat('en-US').format(Number(value)), 'Reason count']} />
              <Bar dataKey="count" name="Reason count" fill="#2563eb" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="flex h-[270px] items-center justify-center text-xs text-slate-500">No reason counts for this line item and date range.</div>}
    </article>
  );
}
