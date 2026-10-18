"use client";

import { useState } from "react";

interface Line {
  id: string;
  tradieName: string;
  accountNumber: string;
  slipCount: number;
  totalSpend: number;
  creditToLoad: number;
  loadedAt: string | null;
}

export function ConfirmReport({ token, lines: initial }: { token: string; lines: Line[] }) {
  const [lines, setLines] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleConfirm(lineId: string) {
    setLoading(lineId);
    const res = await fetch("/api/reports/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, lineId }),
    });
    if (res.ok) {
      setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, loadedAt: new Date().toISOString() } : l)));
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not confirm this line.");
    }
    setLoading(null);
  }

  return (
    <table className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden">
      <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase">
        <tr>
          <th className="px-4 py-3">Tradie</th>
          <th className="px-4 py-3">Account</th>
          <th className="px-4 py-3">Slips</th>
          <th className="px-4 py-3">Spend</th>
          <th className="px-4 py-3">Credit to load</th>
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
            <td className="px-4 py-3">
              {l.loadedAt ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Loaded</span>
              ) : (
                <button
                  onClick={() => handleConfirm(l.id)}
                  disabled={loading === l.id}
                  className="rounded-lg bg-[#1B2D4F] text-white text-xs font-medium px-3 py-1.5 hover:opacity-90 disabled:opacity-50"
                >
                  {loading === l.id ? "Saving…" : "Mark as loaded"}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
