"use client";

import { useState } from "react";
import { format } from "date-fns";

interface ReportRow {
  transactionId: string;
  invoiceNumber: string | null;
  releasedDate: string;
  jobTitle: string | null;
  jobCategory: string | null;
  customerName: string | null;
  customerPhone: string | null;
  tradieName: string | null;
  tradiePhone: string | null;
  tradieVatNumber: string | null;
  tradieCipcNumber: string | null;
  grossAmount: number;
  commissionPct: number;
  commissionAmount: number;
  tradiePayout: number;
  invoiceVatAmount: number | null;
  invoiceType: string | null;
}

interface Totals {
  count: number;
  totalGross: number;
  totalCommission: number;
  totalPayout: number;
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const CSV_COLUMNS: { key: keyof ReportRow; label: string }[] = [
  { key: "invoiceNumber", label: "Invoice Number" },
  { key: "transactionId", label: "Transaction ID" },
  { key: "releasedDate", label: "Date Released" },
  { key: "jobTitle", label: "Job Title" },
  { key: "jobCategory", label: "Category" },
  { key: "customerName", label: "Customer Name" },
  { key: "customerPhone", label: "Customer Phone" },
  { key: "tradieName", label: "Tradie Name" },
  { key: "tradiePhone", label: "Tradie Phone" },
  { key: "tradieVatNumber", label: "Tradie VAT Number" },
  { key: "tradieCipcNumber", label: "Tradie CIPC Number" },
  { key: "grossAmount", label: "Gross Job Amount (ZAR)" },
  { key: "commissionPct", label: "Commission %" },
  { key: "commissionAmount", label: "Commission Revenue (ZAR)" },
  { key: "tradiePayout", label: "Tradie Payout (ZAR)" },
  { key: "invoiceVatAmount", label: "Tradie Invoice VAT (ZAR)" },
  { key: "invoiceType", label: "Invoice Type" },
];

function toCsvValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ReportsPage() {
  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(today());
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports/invoices?start=${start}&end=${end}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate report");
      setRows(data.rows);
      setTotals(data.totals);
      setHasRun(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    const header = CSV_COLUMNS.map((c) => toCsvValue(c.label)).join(",");
    const lines = rows.map((r) =>
      CSV_COLUMNS.map((c) => toCsvValue(r[c.key])).join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trustatradie-invoices-${start}_to_${end}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Invoice Report</h1>
      <p className="text-sm text-gray-500 mb-6">
        Released transactions for a date range, formatted for SARS submission.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex items-end gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !start || !end}
          className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#1B2D4F] text-white hover:bg-[#243b66] transition disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
        {hasRun && rows.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition"
          >
            📥 Export CSV
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasRun && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Transactions</p>
              <p className="text-2xl font-extrabold text-gray-900">{totals?.count ?? 0}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Gross Job Value</p>
              <p className="text-2xl font-extrabold text-gray-900">
                R{(totals?.totalGross ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white border border-emerald-200 bg-emerald-50 rounded-xl p-4">
              <p className="text-xs text-emerald-700 mb-1">Commission Revenue (taxable)</p>
              <p className="text-2xl font-extrabold text-emerald-800">
                R{(totals?.totalCommission ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Paid to Tradies</p>
              <p className="text-2xl font-extrabold text-gray-900">
                R{(totals?.totalPayout ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Commission Revenue is TrustaTradie&apos;s taxable income for this period — gross job value passes
            through to tradies and is not TrustaTradie&apos;s revenue. Tradie Invoice VAT (if shown) belongs to
            the tradie&apos;s own invoice, not TrustaTradie. This report is a data export, not tax advice —
            confirm treatment with your accountant before filing.
          </p>

          {rows.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🧾</p>
              <p>No released transactions in this date range</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Date Released</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Job</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Tradie</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Gross</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Commission</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.transactionId} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700">{r.invoiceNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {format(new Date(r.releasedDate), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.jobTitle ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{r.customerName ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">{r.tradieName ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        R{r.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">
                        R{r.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        R{r.tradiePayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
