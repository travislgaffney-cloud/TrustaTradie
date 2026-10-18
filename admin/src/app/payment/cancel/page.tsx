"use client";

import { Suspense } from "react";
import { PaymentBounce } from "@/components/payment-bounce";

export default function PaymentCancelPage() {
  return (
    <Suspense>
      <PaymentBounce
        deepLinkPath="payment/cancel"
        icon="✕"
        title="Payment cancelled"
        message="Redirecting you back to Trust-a-Tradie…"
      />
    </Suspense>
  );
}
