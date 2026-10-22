"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface ContactMessage {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  responded: boolean;
  created_at: string;
  user: { full_name: string; role: string; phone: string | null } | null;
}

export function ContactMessageList({ messages: initial }: { messages: ContactMessage[] }) {
  const [messages, setMessages] = useState(initial);
  const [filter, setFilter] = useState<"awaiting" | "responded" | "all">("awaiting");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = messages.filter((m) => {
    if (filter === "awaiting") return !m.responded;
    if (filter === "responded") return m.responded;
    return true;
  });

  async function handleToggleResponded(id: string, responded: boolean) {
    setLoading(id);
    const res = await fetch("/api/contact-messages/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, responded }),
    });
    if (res.ok) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, responded } : m)));
    }
    setLoading(null);
  }

  return (
    <>
      <div className="flex gap-2 mb-4">
        {(["awaiting", "responded", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === f ? "bg-[#1B2D4F] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === "awaiting" && ` (${messages.filter((m) => !m.responded).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">✉️</p>
          <p>No {filter === "awaiting" ? "messages awaiting a response" : "contact messages"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const isExpanded = expanded === m.id;
            return (
              <div
                key={m.id}
                className={`bg-white border rounded-xl overflow-hidden ${
                  m.responded ? "border-gray-200" : "border-amber-200"
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50/50 flex items-center gap-4"
                  onClick={() => setExpanded(isExpanded ? null : m.id)}
                >
                  <span className="text-xl">{m.responded ? "✅" : "✉️"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {m.first_name} {m.last_name} — {m.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {m.user?.full_name ?? "Unknown user"}
                      {m.user?.role && ` (${m.user.role})`}
                      {" · "}
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleResponded(m.id, !m.responded);
                      }}
                      disabled={loading === m.id}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                        m.responded
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {loading === m.id ? "..." : m.responded ? "Reopen" : "Mark Responded"}
                    </button>
                    <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Message</p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.message}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">From</p>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-0.5">
                        <p><span className="text-gray-400">Name:</span> {m.first_name} {m.last_name}</p>
                        <p>
                          <span className="text-gray-400">Email:</span>{" "}
                          <a href={`mailto:${m.email}`} className="text-blue-600 hover:underline">{m.email}</a>
                        </p>
                        <p><span className="text-gray-400">Account:</span> {m.user?.full_name ?? "Unknown"} {m.user?.role && `(${m.user.role})`}</p>
                        <p><span className="text-gray-400">Phone:</span> {m.user?.phone ?? "—"}</p>
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
