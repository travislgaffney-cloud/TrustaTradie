"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

interface User {
  id: string;
  role: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  address_text: string | null;
  suburb: string | null;
  province: string | null;
  is_suspended: boolean;
  onboarding_complete: boolean;
  created_at: string;
  tradie_profiles: {
    categories: string[];
    average_rating: number;
    total_reviews: number;
    completed_jobs: number;
    is_verified: boolean;
    years_experience: number | null;
  } | null;
}

export function UserList({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState(initial);
  const [filter, setFilter] = useState<"all" | "customer" | "tradie" | "suspended">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = users.filter((u) => {
    if (filter === "customer" && u.role !== "customer") return false;
    if (filter === "tradie" && u.role !== "tradie") return false;
    if (filter === "suspended" && !u.is_suspended) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.suburb?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  async function handleToggleSuspend(id: string, suspend: boolean) {
    if (!confirm(suspend ? "Suspend this user?" : "Unsuspend this user?")) return;
    setLoading(id);
    const res = await fetch("/api/users/suspend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, suspend }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_suspended: suspend } : u))
      );
    }
    setLoading(null);
  }

  async function handleVerifyTradie(id: string) {
    setLoading(id);
    const res = await fetch("/api/users/verify-tradie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id && u.tradie_profiles
            ? { ...u, tradie_profiles: { ...u.tradie_profiles, is_verified: true } }
            : u
        )
      );
    }
    setLoading(null);
  }

  return (
    <>
      <div className="flex gap-3 mb-4 items-center">
        <div className="flex gap-2">
          {(["all", "customer", "tradie", "suspended"] as const).map((f) => (
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
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by name, phone, or suburb..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-4 py-1.5 rounded-lg border border-gray-200 text-sm w-72 focus:outline-none focus:border-blue-400"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">👥</p>
          <p>No users found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Location</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <>
                  <tr
                    key={u.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer"
                    onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                          {u.full_name?.charAt(0) ?? "?"}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.full_name || "No name"}</p>
                          <p className="text-xs text-gray-400">{u.phone ?? "No phone"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === "tradie"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.suburb ?? u.province ?? u.address_text ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_suspended ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Suspended
                        </span>
                      ) : !u.onboarding_complete ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          Incomplete
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSuspend(u.id, !u.is_suspended);
                        }}
                        disabled={loading === u.id}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                          u.is_suspended
                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                      >
                        {loading === u.id ? "..." : u.is_suspended ? "Unsuspend" : "Suspend"}
                      </button>
                    </td>
                  </tr>
                  {expanded === u.id && (
                    <tr key={`${u.id}-detail`} className="bg-gray-50">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="grid grid-cols-3 gap-6 text-sm">
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Profile</p>
                            <p className="text-gray-500">{u.bio ?? "No bio"}</p>
                            <p className="text-gray-400 text-xs mt-1">
                              {u.address_text ?? "No address"}
                            </p>
                          </div>
                          {u.tradie_profiles && (
                            <>
                              <div>
                                <p className="font-medium text-gray-700 mb-1">Tradie Info</p>
                                <p className="text-gray-500">
                                  Categories: {u.tradie_profiles.categories?.join(", ") || "None"}
                                </p>
                                <p className="text-gray-500">
                                  Experience: {u.tradie_profiles.years_experience ?? "—"} years
                                </p>
                                <p className="text-gray-500">
                                  Completed: {u.tradie_profiles.completed_jobs} jobs
                                </p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700 mb-1">Reputation</p>
                                <p className="text-gray-500">
                                  ⭐ {u.tradie_profiles.average_rating > 0 ? u.tradie_profiles.average_rating.toFixed(1) : "—"}
                                  {" "}({u.tradie_profiles.total_reviews} reviews)
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {u.tradie_profiles.is_verified ? (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                      ✓ Verified Tradie
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleVerifyTradie(u.id)}
                                      disabled={loading === u.id}
                                      className="px-3 py-1 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                                    >
                                      {loading === u.id ? "..." : "Verify Tradie"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
