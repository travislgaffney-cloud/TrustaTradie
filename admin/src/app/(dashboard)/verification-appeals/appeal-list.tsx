"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Appeal {
  id: string;
  tradie_id: string;
  id_number: string;
  status: string;
  amount: number;
  id_check_passed: boolean | null;
  id_check_result: unknown;
  cipc_check_passed: boolean | null;
  cipc_check_result: unknown;
  bank_check_passed: boolean | null;
  bank_check_result: unknown;
  appeal_note: string | null;
  appeal_submitted_at: string | null;
  created_at: string;
  tradie: { full_name: string; phone: string | null; avatar_url: string | null } | null;
}

function CheckBadge({ label, passed }: { label: string; passed: boolean | null }) {
  const color =
    passed === true ? "bg-green-100 text-green-800" : passed === false ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-600";
  const icon = passed === true ? "✓" : passed === false ? "✕" : "—";
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${color}`}>
      {icon} {label}
    </span>
  );
}

export function AppealList({ appeals: initial }: { appeals: Appeal[] }) {
  const [appeals, setAppeals] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleDecision(appealId: string, decision: "approve" | "reject") {
    setLoading(appealId);
    const res = await fetch(`/api/verification-appeals/${decision}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationId: appealId }),
    });
    if (res.ok) {
      setAppeals((prev) => prev.filter((a) => a.id !== appealId));
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? `Could not ${decision} this appeal.`);
    }
    setLoading(null);
  }

  if (appeals.length === 0) return null;

  return (
    <div className="space-y-4">
      {appeals.map((appeal) => {
        const isExpanded = expanded === appeal.id;
        return (
          <div key={appeal.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{appeal.tradie?.full_name ?? "Unknown tradie"}</p>
                <p className="text-sm text-gray-500">{appeal.tradie?.phone ?? "No phone on file"}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Appealed {appeal.appeal_submitted_at ? formatDistanceToNow(new Date(appeal.appeal_submitted_at), { addSuffix: true }) : ""}
                </p>
              </div>
              <button
                onClick={() => setExpanded(isExpanded ? null : appeal.id)}
                className="text-sm text-blue-600 hover:underline shrink-0"
              >
                {isExpanded ? "Hide details" : "View details"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <CheckBadge label="ID" passed={appeal.id_check_passed} />
              <CheckBadge label="CIPC" passed={appeal.cipc_check_passed} />
              <CheckBadge label="Bank" passed={appeal.bank_check_passed} />
            </div>

            <div className="mt-3 bg-gray-50 border border-gray-200 rounded px-3 py-2">
              <p className="text-xs font-semibold text-gray-500 mb-1">Tradie&apos;s appeal note</p>
              <p className="text-sm text-gray-700">{appeal.appeal_note || "(no note provided)"}</p>
            </div>

            {isExpanded && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500">ID number: {appeal.id_number}</p>
                <pre className="text-xs bg-gray-900 text-gray-100 rounded p-3 overflow-x-auto">
                  {JSON.stringify(
                    { id: appeal.id_check_result, cipc: appeal.cipc_check_result, bank: appeal.bank_check_result },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleDecision(appeal.id, "approve")}
                disabled={loading === appeal.id}
                className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:opacity-50"
              >
                Approve — mark Verified
              </button>
              <button
                onClick={() => handleDecision(appeal.id, "reject")}
                disabled={loading === appeal.id}
                className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
