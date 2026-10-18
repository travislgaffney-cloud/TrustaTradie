"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// TradeSafe's success/fail redirect fields require a real https:// URL — a
// trustatradie:// deep link entered directly there never fires. This page is
// the bounce: TradeSafe redirects the customer's mobile browser here, and we
// immediately hand off to the app's deep link, forwarding whatever query
// params TradeSafe appended (transaction id, reference, etc.) untouched.
export function PaymentBounce({
  deepLinkPath,
  icon,
  title,
  message,
}: {
  deepLinkPath: string;
  icon: string;
  title: string;
  message: string;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const deepLink = `trustatradie://${deepLinkPath}${query ? `?${query}` : ""}`;

  useEffect(() => {
    window.location.href = deepLink;
  }, [deepLink]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">{icon}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <a
          href={deepLink}
          className="inline-block rounded-lg bg-[#1B2D4F] text-white text-sm font-medium px-5 py-2.5 hover:opacity-90"
        >
          Open Trust-a-Tradie
        </a>
        <p className="text-xs text-gray-400 mt-4">
          Nothing happened? Tap the button above to return to the app.
        </p>
      </div>
    </div>
  );
}
