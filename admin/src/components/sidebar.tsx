"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/documents", label: "Documents", icon: "📄" },
  { href: "/payouts", label: "Payouts", icon: "💰" },
  { href: "/users", label: "Users", icon: "👥" },
  { href: "/disputes", label: "Disputes", icon: "⚖️" },
  { href: "/rewards/review", label: "Reward Review Queue", icon: "🧾" },
  { href: "/rewards/reports", label: "Reward Reports", icon: "📊" },
  { href: "/rewards/suppliers", label: "Supplier Rewards", icon: "🎁" },
  { href: "/bug-reports", label: "Bug Reports", icon: "🐛" },
  { href: "/reports", label: "Reports", icon: "🧾" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#1B2D4F] text-white flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-lg font-extrabold tracking-tight">TrustaTradie</h1>
        <p className="text-xs text-white/50 mt-1">Admin Dashboard</p>
      </div>

      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/15 text-white border-r-2 border-orange-400"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 flex flex-col gap-2">
        <button
          onClick={handleLogout}
          className="text-left text-xs font-medium text-white/70 hover:text-white transition"
        >
          🚪 Log out
        </button>
        <p className="text-xs text-white/40">Gaffney Labs &copy; {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
