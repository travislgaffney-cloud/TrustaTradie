"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface PendingSlip {
  id: string;
  slip_number: string;
  slip_date: string;
  total_amount: number;
  flagged_reason: string | null;
  ocr_supplier_name: string | null;
  ocr_total: number | null;
  ocr_date: string | null;
  ocr_confidence: number | null;
  created_at: string;
  imageUrl: string | null;
  tradie: { full_name: string; phone: string | null } | null;
  supplier: { name: string; reward_pct: number; min_slip_amount: number } | null;
}

export function ReviewList({ slips: initial }: { slips: PendingSlip[] }) {
  const [slips, setSlips] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function handleApprove(slipId: string) {
    setLoading(slipId);
    const res = await fetch("/api/rewards/slips/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slipId }),
    });
    if (res.ok) {
      setSlips((prev) => prev.filter((s) => s.id !== slipId));
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not approve this slip.");
    }
    setLoading(null);
  }

  async function handleReject(slipId: string) {
    if (!reason.trim()) return alert("Add a reason for rejecting this slip.");
    setLoading(slipId);
    const res = await fetch("/api/rewards/slips/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slipId, reason }),
    });
    if (res.ok) {
      setSlips((prev) => prev.filter((s) => s.id !== slipId));
      setReason("");
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not reject this slip.");
    }
    setLoading(null);
  }

  if (slips.length === 0) return null;

  return (
    <div className="space-y-4">
      {slips.map((slip) => {
        const isExpanded = expanded === slip.id;
        const estReward = slip.supplier ? slip.total_amount * slip.supplier.reward_pct : 0;

        return (
          <div key={slip.id} className="bg-white border border-amber-200 rounded-xl overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50/50 flex items-center justify-between"
              onClick={() => setExpanded(isExpanded ? null : slip.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{slip.supplier?.name ?? "Supplier"}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    R{Number(slip.total_amount).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {slip.tradie?.full_name ?? "Unknown tradie"} · Submitted{" "}
                  {formatDistanceToNow(new Date(slip.created_at), { addSuffix: true })}
                  {slip.flagged_reason && (
                    <span className="text-red-600 font-medium"> · {slip.flagged_reason.replace(/_/g, " ").replace(/,/g, ", ")}</span>
                  )}
                </p>
              </div>
              <span className="text-gray-400 text-lg">{isExpanded ? "▼" : "▶"}</span>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {slip.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slip.imageUrl} alt="Till slip" className="rounded-lg border border-gray-200 w-full object-contain max-h-80" />
                  ) : (
                    <div className="rounded-lg border border-gray-200 h-40 flex items-center justify-center text-gray-400 text-sm">
                      Image unavailable
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <span className="text-gray-500">Slip #</span><span className="font-medium">{slip.slip_number}</span>
                      <span className="text-gray-500">Slip date</span><span className="font-medium">{slip.slip_date}</span>
                      <span className="text-gray-500">Total (entered)</span><span className="font-medium">R{Number(slip.total_amount).toLocaleString()}</span>
                      <span className="text-gray-500">Total (OCR)</span>
                      <span className="font-medium">{slip.ocr_total != null ? `R${Number(slip.ocr_total).toLocaleString()}` : "—"}</span>
                      <span className="text-gray-500">Supplier (OCR)</span>
                      <span className="font-medium">{slip.ocr_supplier_name ?? "—"}</span>
                      <span className="text-gray-500">OCR confidence</span>
                      <span className="font-medium">{slip.ocr_confidence != null ? `${(slip.ocr_confidence * 100).toFixed(0)}%` : "—"}</span>
                      <span className="text-gray-500">Est. reward</span>
                      <span className="font-medium text-green-700">R{estReward.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason (required to reject)"
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={() => handleApprove(slip.id)}
                    disabled={loading === slip.id}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {loading === slip.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(slip.id)}
                    disabled={loading === slip.id}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {loading === slip.id ? "…" : "Reject"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
