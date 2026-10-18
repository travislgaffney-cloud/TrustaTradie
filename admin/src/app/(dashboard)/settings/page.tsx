"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [commissionPct, setCommissionPct] = useState<string>("");
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

    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionPct: pct / 100 }),
    });
    setSaving(false);

    if (res.ok) {
      setMessage({ type: "success", text: "Commission rate updated." });
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

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Commission Rate</h2>
        <p className="text-sm text-gray-500 mb-5">
          The percentage Trust-a-Tradie retains from every released job payment. Applies to
          quotes accepted after this change &mdash; jobs already in progress keep the rate they
          were quoted under.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading&hellip;</p>
        ) : (
          <>
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
              <button
                onClick={handleSave}
                disabled={saving}
                className="ml-3 rounded-lg bg-[#1B2D4F] text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>

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
    </div>
  );
}
