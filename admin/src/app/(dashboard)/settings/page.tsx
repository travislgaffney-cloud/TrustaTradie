"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [commissionPct, setCommissionPct] = useState<string>("");
  const [rewardThreshold, setRewardThreshold] = useState<string>("");
  const [rewardMaxAgeDays, setRewardMaxAgeDays] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.commission_pct != null) {
          setCommissionPct((Number(data.commission_pct) * 100).toString());
          setUpdatedAt(data.updated_at);
        }
        if (data.reward_auto_approve_threshold != null) {
          setRewardThreshold(String(Number(data.reward_auto_approve_threshold)));
        }
        if (data.reward_slip_max_age_days != null) {
          setRewardMaxAgeDays(String(Number(data.reward_slip_max_age_days)));
        }
        setLoading(false);
      });
  }, []);

  async function handleSave() {
    setMessage(null);
    const pct = Number(commissionPct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setMessage({ type: "error", text: "Enter a percentage between 0 and 100." });
      return;
    }
    const threshold = Number(rewardThreshold);
    if (isNaN(threshold) || threshold < 0) {
      setMessage({ type: "error", text: "Enter a valid reward auto-approve threshold." });
      return;
    }
    const maxAgeDays = Number(rewardMaxAgeDays);
    if (isNaN(maxAgeDays) || maxAgeDays < 1) {
      setMessage({ type: "error", text: "Enter a valid number of days (at least 1)." });
      return;
    }

    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commissionPct: pct / 100,
        rewardAutoApproveThreshold: threshold,
        rewardSlipMaxAgeDays: maxAgeDays,
      }),
    });
    setSaving(false);

    if (res.ok) {
      setMessage({ type: "success", text: "Settings updated." });
      setUpdatedAt(new Date().toISOString());
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error ?? "Failed to save." });
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Platform-wide configuration.</p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Commission Rate</h2>
        <p className="text-sm text-gray-500 mb-5">
          The percentage Trust-a-Tradie retains from every released job payment. Applies to
          quotes accepted after this change &mdash; jobs already in progress keep the rate they
          were quoted under.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading&hellip;</p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Supplier Rewards</h2>
        <p className="text-sm text-gray-500 mb-5">
          A slip under this amount, with no checks flagged, auto-approves without review. A
          slip older than the configured window (or dated in the future) is flagged for review.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading&hellip;</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-56">Auto-approve threshold</span>
              <span className="text-sm text-gray-600">R</span>
              <input
                type="number"
                min={0}
                step={50}
                value={rewardThreshold}
                onChange={(e) => setRewardThreshold(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-56">Max slip age</span>
              <input
                type="number"
                min={1}
                step={1}
                value={rewardMaxAgeDays}
                onChange={(e) => setRewardMaxAgeDays(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <span className="text-sm text-gray-600">days</span>
            </div>
          </div>
        )}
      </div>

      {!loading && (
        <>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#1B2D4F] text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save All"}
          </button>

          {message && (
            <p className={`mt-3 text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}

          {updatedAt && (
            <p className="mt-3 text-xs text-gray-400">
              Last updated {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}
