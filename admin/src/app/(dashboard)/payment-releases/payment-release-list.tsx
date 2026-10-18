"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface ReleaseRequest {
  id: string;
  requestedAt: string;
  jobId: string;
  jobTitle: string;
  completionMarkedAt: string | null;
  customerName: string;
  tradieName: string;
}

export function PaymentReleaseList({ requests: initial }: { requests: ReleaseRequest[] }) {
  const [requests, setRequests] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  async function handleRelease(id: string) {
    setLoading(id);
    const res = await fetch("/api/payment-releases/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not release this payment.");
    }
    setLoading(null);
  }

  async function handleDecline(id: string) {
    setLoading(id);
    const res = await fetch("/api/payment-releases/decline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, note: note[id] ?? "" }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not decline this request.");
    }
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      {requests.map((r) => (
        <div key={r.id} className="bg-white border border-amber-200 rounded-xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-gray-900">{r.jobTitle}</h3>
              <p className="text-sm text-gray-500">
                {r.tradieName} → {r.customerName}
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              {r.completionMarkedAt && <p>Marked complete {formatDistanceToNow(new Date(r.completionMarkedAt))} ago</p>}
              <p>Requested {formatDistanceToNow(new Date(r.requestedAt))} ago</p>
            </div>
          </div>

          <textarea
            placeholder="Decline reason (optional unless declining)"
            value={note[r.id] ?? ""}
            onChange={(e) => setNote((prev) => ({ ...prev, [r.id]: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3"
            rows={2}
          />

          <div className="flex gap-2">
            <button
              onClick={() => handleRelease(r.id)}
              disabled={loading === r.id}
              className="rounded-lg bg-[#1B2D4F] text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
            >
              Release Payment
            </button>
            <button
              onClick={() => handleDecline(r.id)}
              disabled={loading === r.id}
              className="rounded-lg border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
