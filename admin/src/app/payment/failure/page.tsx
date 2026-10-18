"use client";

import { Suspense } from "react";
import { PaymentBounce } from "@/components/payment-bounce";

export default function PaymentFailurePage() {
  return (
    <Suspense>
      <PaymentBounce
        deepLinkPath="payment/failure"
        icon="⚠️"
        title="Payment failed"
        message="Something went wrong processing your payment. Redirecting you back to Trust-a-Tradie…"
      />
    </Suspense>
  );
}
