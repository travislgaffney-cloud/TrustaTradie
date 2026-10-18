"use client";

import Link from "next/link";

interface ReportRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  sentAt: string | null;
  supplierName: string;
  lineCount: number;
  confirmedCount: number;
  totalCredit: number;
}

export function ReportList({ reports }: { reports: ReportRow[] }) {
  if (reports.length === 0) {
    return <p className="text-sm text-gray-500">No reports generated yet — these are created automatically on the 1st of each month.</p>;
  }

  return (
    <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden">
      <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
        <tr>
          <th className="px-4 py-3">Supplier</th>
          <th className="px-4 py-3">Period</th>
          <th className="px-4 py-3">Credit to load</th>
          <th className="px-4 py-3">Confirmed</th>
          <th className="px-4 py-3">Sent</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 text-sm">
        {reports.map((r) => (
          <tr key={r.id}>
            <td className="px-4 py-3 font-medium text-gray-900">{r.supplierName}</td>
            <td className="px-4 py-3 text-gray-600">{r.periodStart} – {r.periodEnd}</td>
            <td className="px-4 py-3 text-gray-900">R{r.totalCredit.toLocaleString()}</td>
            <td className="px-4 py-3">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.confirmedCount === r.lineCount ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {r.confirmedCount} of {r.lineCount} confirmed
              </span>
            </td>
            <td className="px-4 py-3 text-gray-500">{r.sentAt ? new Date(r.sentAt).toLocaleDateString() : "Not sent"}</td>
            <td className="px-4 py-3">
              <Link href={`/rewards/reports/${r.id}`} className="text-[#1B2D4F] text-sm font-medium hover:underline">
                View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
