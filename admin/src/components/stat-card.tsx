interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, color = "text-gray-900", sub }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {sub && <span className="text-xs text-gray-400">{sub}</span>}
      </div>
      <p className={`text-2xl font-black mt-2 ${color}`}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
