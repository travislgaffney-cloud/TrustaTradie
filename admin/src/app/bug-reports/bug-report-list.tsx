"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface BugReport {
  id: string;
  user_id: string | null;
  error_message: string;
  stack_trace: string | null;
  screen: string | null;
  device_info: {
    brand?: string;
    modelName?: string;
    osName?: string;
    osVersion?: string;
    platform?: string;
    platformVersion?: string | number;
    isDevice?: boolean;
  } | null;
  app_version: string | null;
  resolved: boolean;
  created_at: string;
  user: { full_name: string; role: string; phone: string | null } | null;
}

export function BugReportList({ reports: initial }: { reports: BugReport[] }) {
  const [reports, setReports] = useState(initial);
  const [filter, setFilter] = useState<"unresolved" | "resolved" | "all">("unresolved");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = reports.filter((r) => {
    if (filter === "unresolved") return !r.resolved;
    if (filter === "resolved") return r.resolved;
    return true;
  });

  async function handleToggleResolved(id: string, resolved: boolean) {
    setLoading(id);
    const res = await fetch("/api/bug-reports/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved }),
    });
    if (res.ok) {
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, resolved } : r))
      );
    }
    setLoading(null);
  }

  return (
    <>
      <div className="flex gap-2 mb-4">
        {(["unresolved", "resolved", "all"] as const).map((f) => (
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
            {f === "unresolved" && ` (${reports.filter((r) => !r.resolved).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">🐛</p>
          <p>No {filter === "unresolved" ? "unresolved " : ""}bug reports</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => {
            const isExpanded = expanded === report.id;
            const device = report.device_info;

            return (
              <div
                key={report.id}
                className={`bg-white border rounded-xl overflow-hidden ${
                  report.resolved ? "border-gray-200" : "border-red-200"
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50/50 flex items-center gap-4"
                  onClick={() => setExpanded(isExpanded ? null : report.id)}
                >
                  <span className="text-xl">{report.resolved ? "✅" : "🐛"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {report.error_message}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {report.user?.full_name ?? "Unknown user"}
                      {report.user?.role && ` (${report.user.role})`}
                      {" · "}
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                      {report.screen && ` · ${report.screen}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {device && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                        {device.platform} {device.osVersion}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleResolved(report.id, !report.resolved);
                      }}
                      disabled={loading === report.id}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                        report.resolved
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {loading === report.id
                        ? "..."
                        : report.resolved
                        ? "Reopen"
                        : "Resolve"}
                    </button>
                    <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    {/* Device info */}
                    {device && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Device</p>
                        <div className="grid grid-cols-4 gap-2 text-sm">
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-400">Platform</p>
                            <p className="font-medium">{device.platform}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-400">OS</p>
                            <p className="font-medium">{device.osName} {device.osVersion}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-400">Device</p>
                            <p className="font-medium">{device.brand} {device.modelName}</p>
                          </div>
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs text-gray-400">App Version</p>
                            <p className="font-medium">{report.app_version ?? "—"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Error</p>
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                        <p className="text-sm text-red-800 font-mono">{report.error_message}</p>
                      </div>
                    </div>

                    {/* Stack trace */}
                    {report.stack_trace && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Stack Trace</p>
                        <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto max-h-60 overflow-y-auto">
                          <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono">
                            {report.stack_trace}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* User info */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">User</p>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <p><span className="text-gray-400">Name:</span> {report.user?.full_name ?? "Unknown"}</p>
                        <p><span className="text-gray-400">Role:</span> {report.user?.role ?? "—"}</p>
                        <p><span className="text-gray-400">Phone:</span> {report.user?.phone ?? "—"}</p>
                        <p><span className="text-gray-400">User ID:</span> <span className="font-mono text-xs">{report.user_id ?? "—"}</span></p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
