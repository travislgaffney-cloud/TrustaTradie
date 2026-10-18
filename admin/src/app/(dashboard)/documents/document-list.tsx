"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface Doc {
  id: string;
  tradie_id: string;
  type: string;
  label: string;
  url: string;
  expiry_date: string | null;
  is_verified: boolean;
  created_at: string;
  tradie: { full_name: string; avatar_url: string | null; phone: string | null } | null;
}

export function DocumentList({ documents: initial }: { documents: Doc[] }) {
  const [documents, setDocuments] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("pending");
  const [preview, setPreview] = useState<string | null>(null);

  const filtered = documents.filter((d) => {
    if (filter === "pending") return !d.is_verified;
    if (filter === "verified") return d.is_verified;
    return true;
  });

  async function handleVerify(id: string) {
    setLoading(id);
    const res = await fetch("/api/documents/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_verified: true } : d))
      );
    }
    setLoading(null);
  }

  async function handleReject(id: string) {
    if (!confirm("Delete this document? The tradie will need to re-upload.")) return;
    setLoading(id);
    const res = await fetch("/api/documents/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
    setLoading(null);
  }

  return (
    <>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(["pending", "verified", "all"] as const).map((f) => (
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
            {f === "pending" && ` (${documents.filter((d) => !d.is_verified).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">✅</p>
          <p>No {filter === "pending" ? "pending" : ""} documents to review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <div
              key={doc.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4"
            >
              {/* Doc preview thumbnail */}
              <button
                onClick={() => setPreview(doc.url)}
                className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl hover:bg-gray-200 transition shrink-0"
              >
                {doc.url?.match(/\.(jpg|jpeg|png|gif|webp)/i) ? "🖼️" : "📄"}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{doc.label}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    {doc.type}
                  </span>
                  {doc.is_verified ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {doc.tradie?.full_name ?? "Unknown tradie"}
                  {doc.tradie?.phone && ` · ${doc.tradie.phone}`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Uploaded {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  {doc.expiry_date && ` · Expires ${new Date(doc.expiry_date).toLocaleDateString("en-ZA")}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 shrink-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                >
                  View
                </a>
                {!doc.is_verified && (
                  <>
                    <button
                      onClick={() => handleVerify(doc.id)}
                      disabled={loading === doc.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {loading === doc.id ? "..." : "✓ Verify"}
                    </button>
                    <button
                      onClick={() => handleReject(doc.id)}
                      disabled={loading === doc.id}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl max-h-[80vh] overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            {preview.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
              <img src={preview} alt="Document" className="max-w-full rounded" />
            ) : (
              <iframe src={preview} className="w-[700px] h-[80vh] rounded" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
