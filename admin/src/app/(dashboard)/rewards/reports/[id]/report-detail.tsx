"use client";

import { useState } from "react";

interface ReportLine {
  id: string;
  tradieName: string;
  accountNumber: string;
  slipCount: number;
  totalSpend: number;
  rewardPct: number;
  creditToLoad: number;
  commissionDue: number;
  loadedAt: string | null;
}

interface ReportData {
  id: string;
  sentAt: string | null;
  reportEmails: string[];
  lines: ReportLine[];
}

export function ReportDetail({ report }: { report: ReportData }) {
  const [lines, setLines] = useState(report.lines);
  const [sentAt, setSentAt] = useState(report.sentAt);
  const [loading, setLoading] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  async function handleMarkLoaded(lineId: string) {
    setLoading(lineId);
    const res = await fetch("/api/rewards/reports/mark-loaded", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId }),
    });
    if (res.ok) {
      setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, loadedAt: new Date().toISOString() } : l)));
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not mark this line as loaded.");
    }
    setLoading(null);
  }

  async function handleResend() {
    setResending(true);
    const res = await fetch("/api/rewards/reports/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id }),
    });
    if (res.ok) {
      setSentAt(new Date().toISOString());
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not resend this report.");
    }
    setResending(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Sent to {report.reportEmails.join(", ") || "no report email configured"}
          {sentAt && ` on ${new Date(sentAt).toLocaleString()}`}
        </p>
        <button
          onClick={handleResend}
          disabled={resending || report.reportEmails.length === 0}
          className="rounded-lg bg-[#1B2D4F] text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
        >
          {resending ? "Sending…" : "Re-send email"}
        </button>
      </div>

      <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden">
        <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
          <tr>
            <th className="px-4 py-3">Tradie</th>
            <th className="px-4 py-3">Account</th>
            <th className="px-4 py-3">Slips</th>
            <th className="px-4 py-3">Spend</th>
            <th className="px-4 py-3">Credit to load</th>
            <th className="px-4 py-3">Commission due</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-sm">
          {lines.map((l) => (
            <tr key={l.id}>
              <td className="px-4 py-3 font-medium text-gray-900">{l.tradieName}</td>
              <td className="px-4 py-3 text-gray-600">{l.accountNumber}</td>
              <td className="px-4 py-3 text-gray-600">{l.slipCount}</td>
              <td className="px-4 py-3 text-gray-600">R{l.totalSpend.toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-900">R{l.creditToLoad.toLocaleString()}</td>
              <td className="px-4 py-3 text-gray-600">R{l.commissionDue.toLocaleString()}</td>
              <td className="px-4 py-3">
                {l.loadedAt ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Loaded</span>
                ) : (
                  <button
                    onClick={() => handleMarkLoaded(l.id)}
                    disabled={loading === l.id}
                    className="text-[#1B2D4F] text-sm font-medium hover:underline disabled:opacity-50"
                  >
                    Mark as loaded
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
