"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface DisputedJob {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  address_text: string;
  suburb: string | null;
  created_at: string;
  updated_at: string;
  customer: { id: string; full_name: string; phone: string | null } | null;
  quotes: {
    tradie_id: string;
    amount: number;
    status: string;
    tradie: { id: string; full_name: string; phone: string | null } | null;
  }[];
}

interface DisputeNote {
  id: string;
  job_id: string;
  note: string;
  action_taken: string | null;
  created_at: string;
  admin: { full_name: string } | null;
}

const ACTION_OPTIONS = [
  { value: "note_only", label: "Add Note Only" },
  { value: "reverted_to_in_progress", label: "Revert to In Progress" },
  { value: "marked_completed", label: "Mark Completed" },
  { value: "marked_cancelled", label: "Cancel & Refund" },
];

export function DisputeList({
  jobs: initial,
  notes: initialNotes,
}: {
  jobs: DisputedJob[];
  notes: DisputeNote[];
}) {
  const [jobs, setJobs] = useState(initial);
  const [notes, setNotes] = useState(initialNotes);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [action, setAction] = useState("note_only");

  async function handleSubmit(jobId: string) {
    if (!noteText.trim()) return alert("Please add a note.");
    setLoading(jobId);

    const res = await fetch("/api/disputes/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, note: noteText, action }),
    });

    if (res.ok) {
      const data = await res.json();
      setNotes((prev) => [data.note, ...prev]);
      setNoteText("");
      setAction("note_only");

      if (action !== "note_only") {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
      }
    }
    setLoading(null);
  }

  if (jobs.length === 0) return null;

  return (
    <div className="space-y-4">
      {jobs.map((job) => {
        const quote = job.quotes[0];
        const jobNotes = notes.filter((n) => n.job_id === job.id);
        const isExpanded = expanded === job.id;

        return (
          <div
            key={job.id}
            className="bg-white border border-red-200 rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50/50 flex items-center justify-between"
              onClick={() => setExpanded(isExpanded ? null : job.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{job.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    Disputed
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {job.suburb ?? job.address_text} · {job.category}
                  {" · "}Disputed {formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}
                </p>
              </div>
              <span className="text-gray-400 text-lg">{isExpanded ? "▼" : "▶"}</span>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4 space-y-4">
                {/* Parties */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-600 mb-1">Customer</p>
                    <p className="font-medium text-gray-900">{job.customer?.full_name ?? "Unknown"}</p>
                    <p className="text-sm text-gray-500">{job.customer?.phone ?? "No phone"}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-green-600 mb-1">Tradie</p>
                    <p className="font-medium text-gray-900">{quote?.tradie?.full_name ?? "Unknown"}</p>
                    <p className="text-sm text-gray-500">{quote?.tradie?.phone ?? "No phone"}</p>
                    {quote && (
                      <p className="text-sm font-bold text-gray-900 mt-1">Quote: R{quote.amount.toLocaleString()}</p>
                    )}
                  </div>
                </div>

                {/* Job description */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Job Description</p>
                  <p className="text-sm text-gray-700">{job.description}</p>
                </div>

                {/* Previous notes */}
                {jobNotes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Admin Notes</p>
                    <div className="space-y-2">
                      {jobNotes.map((n) => (
                        <div key={n.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{n.admin?.full_name ?? "Admin"}</span>
                            <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                          </div>
                          <p className="text-gray-700">{n.note}</p>
                          {n.action_taken && n.action_taken !== "note_only" && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              Action: {n.action_taken.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution form */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Take Action</p>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a note about this dispute..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <select
                      value={action}
                      onChange={(e) => setAction(e.target.value)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                    >
                      {ACTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSubmit(job.id)}
                      disabled={loading === job.id}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium bg-[#1B2D4F] text-white hover:bg-[#152340] transition disabled:opacity-50"
                    >
                      {loading === job.id ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
