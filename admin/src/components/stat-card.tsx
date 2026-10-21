export interface WeeklyTrend {
  // null when last week had zero to compare against — a percentage there
  // is either undefined (0 -> 0) or technically infinite (0 -> N), so
  // it's rendered as "New" instead of a number.
  pctChange: number | null;
  thisWeek: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  sub?: string;
  trend?: WeeklyTrend;
}

export function StatCard({ label, value, icon, color = "text-gray-900", sub, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      <p className={`text-2xl font-black mt-2 ${color}`}>{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        {trend && <TrendBadge trend={trend} />}
      </div>
    </div>
  );
}

function TrendBadge({ trend }: { trend: WeeklyTrend }) {
  if (trend.pctChange === null) {
    if (trend.thisWeek === 0) return null;
    return <span className="text-xs font-medium text-blue-600 whitespace-nowrap">New</span>;
  }
  if (trend.pctChange === 0) {
    return <span className="text-xs font-medium text-gray-400 whitespace-nowrap">– 0%</span>;
  }
  const up = trend.pctChange > 0;
  return (
    <span className={`text-xs font-medium whitespace-nowrap ${up ? "text-green-600" : "text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(trend.pctChange).toFixed(0)}%
    </span>
  );
}
