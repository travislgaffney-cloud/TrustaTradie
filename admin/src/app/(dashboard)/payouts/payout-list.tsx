"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Payout {
  id: string;
  tradie_id: string;
  amount: number;
  status: string;
  bank_reference: string | null;
  created_at: string;
  processed_at: string | null;
  tradie: {
    full_name: string;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_branch_code: string | null;
    bank_account_type: string | null;
  } | null;
}

export function PayoutList({ payouts: initial }: { payouts: Payout[] }) {
  const [payouts, setPayouts] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "processed" | "all">("pending");

  const filtered = payouts.filter((p) => {
    if (filter === "pending") return p.status === "pending";
    if (filter === "processed") return p.status === "processed";
    return true;
  });

  async function handleProcess(id: string) {
    const ref = prompt("Enter bank reference number:");
    if (!ref) return;

    setLoading(id);
    const res = await fetch("/api/payouts/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, bankReference: ref }),
    });
    if (res.ok) {
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "processed", bank_reference: ref, processed_at: new Date().toISOString() }
            : p
        )
      );
    }
    setLoading(null);
  }

  return (
    <>
      <div className="flex gap-2 mb-4">
        {(["pending", "processed", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f
                ? "bg-[#1B2D4F] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "pending" && ` (${payouts.filter((p) => p.status === "pending").length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">💰</p>
          <p>No {filter === "pending" ? "pending " : ""}payouts</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tradie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Bank Details</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {p.tradie?.full_name ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.tradie?.bank_name ? (
                      <span>
                        {p.tradie.bank_name} · ****{p.tradie.bank_account_number?.slice(-4)}
                        <br />
                        <span className="text-xs text-gray-400">
                          Branch: {p.tradie.bank_branch_code} · {p.tradie.bank_account_type}
                        </span>
                      </span>
                    ) : (
                      <span className="text-red-500 text-xs">No bank details</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    R{p.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "pending" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        ✓ Processed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    {p.bank_reference && (
                      <span className="block text-gray-400">Ref: {p.bank_reference}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status === "pending" && (
                      <button
                        onClick={() => handleProcess(p.id)}
                        disabled={loading === p.id}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {loading === p.id ? "..." : "Mark Paid"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
