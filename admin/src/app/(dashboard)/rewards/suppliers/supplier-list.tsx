"use client";

import { useState } from "react";

interface Supplier {
  id: string;
  name: string;
  logo_url: string | null;
  report_emails: string[];
  reward_pct: number;
  commission_pct: number;
  min_slip_amount: number;
  is_active: boolean;
}

const EMPTY_FORM = {
  name: "",
  reportEmails: "",
  rewardPct: "",
  commissionPct: "0",
  minSlipAmount: "0",
};

export function SupplierList({ suppliers: initial }: { suppliers: Supplier[] }) {
  const [suppliers, setSuppliers] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  function startEdit(s: Supplier) {
    setEditingId(s.id);
    setAdding(false);
    setForm({
      name: s.name,
      reportEmails: s.report_emails.join(", "),
      rewardPct: String(s.reward_pct * 100),
      commissionPct: String(s.commission_pct * 100),
      minSlipAmount: String(s.min_slip_amount),
    });
  }

  function startAdd() {
    setAdding(true);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) return alert("Supplier name is required.");
    const rewardPct = Number(form.rewardPct) / 100;
    if (!Number.isFinite(rewardPct) || rewardPct < 0 || rewardPct > 1) {
      return alert("Reward % must be between 0 and 100.");
    }

    setLoading(true);
    const payload = {
      id: editingId ?? undefined,
      name: form.name.trim(),
      reportEmails: form.reportEmails.split(",").map((e) => e.trim()).filter(Boolean),
      rewardPct,
      commissionPct: Number(form.commissionPct) / 100 || 0,
      minSlipAmount: Number(form.minSlipAmount) || 0,
    };

    const res = await fetch(`/api/rewards/suppliers/${editingId ? "update" : "create"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (editingId) {
        setSuppliers((prev) => prev.map((s) => (s.id === editingId ? data.supplier : s)));
      } else {
        setSuppliers((prev) => [data.supplier, ...prev]);
      }
      cancel();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Could not save this supplier.");
    }
    setLoading(false);
  }

  async function handleToggleActive(s: Supplier) {
    if (!confirm(`${s.is_active ? "Deactivate" : "Reactivate"} ${s.name}?`)) return;
    setLoading(true);
    const res = await fetch("/api/rewards/suppliers/deactivate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, isActive: !s.is_active }),
    });
    if (res.ok) {
      setSuppliers((prev) => prev.map((row) => (row.id === s.id ? { ...row, is_active: !row.is_active } : row)));
    } else {
      alert("Could not update this supplier.");
    }
    setLoading(false);
  }

  const showForm = adding || editingId !== null;

  return (
    <div className="space-y-4">
      {!showForm && (
        <button
          onClick={startAdd}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1B2D4F] text-white hover:bg-[#152340] transition"
        >
          + Add Supplier
        </button>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-gray-900">{editingId ? "Edit Supplier" : "New Supplier"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block text-xs font-medium text-gray-500 mb-1">Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-gray-500 mb-1">Report email(s), comma-separated</span>
              <input
                value={form.reportEmails}
                onChange={(e) => setForm({ ...form, reportEmails: e.target.value })}
                placeholder="reports@supplier.co.za"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-gray-500 mb-1">Reward %</span>
              <input
                type="number" min={0} max={100} step={0.5}
                value={form.rewardPct}
                onChange={(e) => setForm({ ...form, rewardPct: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-gray-500 mb-1">Our commission % (optional)</span>
              <input
                type="number" min={0} max={100} step={0.5}
                value={form.commissionPct}
                onChange={(e) => setForm({ ...form, commissionPct: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs font-medium text-gray-500 mb-1">Minimum slip amount (R)</span>
              <input
                type="number" min={0} step={1}
                value={form.minSlipAmount}
                onChange={(e) => setForm({ ...form, minSlipAmount: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#1B2D4F] text-white hover:bg-[#152340] transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
            <button onClick={cancel} className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {suppliers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">🎁</p>
          <p className="text-lg">No suppliers yet</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Reward %</th>
                <th className="text-left px-4 py-2">Commission %</th>
                <th className="text-left px-4 py-2">Min Slip</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-2">{(s.reward_pct * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2">{(s.commission_pct * 100).toFixed(1)}%</td>
                  <td className="px-4 py-2">R{s.min_slip_amount.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2 space-x-3">
                    <button onClick={() => startEdit(s)} className="text-blue-600 hover:underline text-xs font-medium">Edit</button>
                    <button onClick={() => handleToggleActive(s)} className="text-gray-500 hover:underline text-xs font-medium">
                      {s.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
