"use client";

import { Suspense } from "react";
import { PaymentBounce } from "@/components/payment-bounce";

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentBounce
        deepLinkPath="payment/success"
        icon="✅"
        title="Payment successful"
        message="Redirecting you back to Trust-a-Tradie…"
      />
    </Suspense>
  );
}
