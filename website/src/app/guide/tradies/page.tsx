import Image from "next/image";
import Link from "next/link";
import { StoreButtons } from "@/components/store-buttons";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "How to Sign Up as a Tradie — TrustaTradie",
};

const STEPS = [
  {
    icon: "📲",
    title: "Download the app & choose \"I'm a Tradie\"",
    body: "Install TrustaTradie and select the tradie account type when you sign up.",
  },
  {
    icon: "📝",
    title: "Create your account",
    body: "Enter your name, email, phone number, and a password, then confirm your email address.",
  },
  {
    icon: "🪖",
    title: "Add your trade details",
    body: "Select the trade categories you work in — electrical, plumbing, building, carpentry, and more — plus your years of experience and hourly rate.",
  },
  {
    icon: "📍",
    title: "Set your service area",
    body: "Choose the towns you service so nearby customers can find and book you.",
  },
  {
    icon: "🪪",
    title: "Upload your documents",
    body: "Add your licence, insurance, and any other documents for Trust-a-Tradie admin to review and build trust with customers.",
  },
  {
    icon: "🏦",
    title: "Add your banking details",
    body: "This is where your payouts land once a customer confirms a job is complete.",
  },
  {
    icon: "💰",
    title: "How you get paid",
    body: "There's no deposit — the full quoted amount is held securely in escrow from the moment a customer accepts your quote. Once you mark the job complete and the customer confirms, you're paid out your portion (the quoted amount minus TrustaTradie's commission) in one payment.",
  },
  {
    icon: "✓",
    title: "Get Verified (optional)",
    body: "For a once-off R99 fee, we automatically check your ID number, CIPC registration, and bank account. Verified tradies get a trust badge and appear first in search results.",
  },
  {
    icon: "🔍",
    title: "Start browsing & quoting",
    body: "You're ready to browse nearby jobs, request site visits, and start sending quotes.",
  },
];

export default function TradieGuidePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/icon.png" alt="TrustaTradie" width={28} height={28} className="rounded-lg" />
            <span className="text-base font-extrabold text-[#1B2D4F]">TrustaTradie</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-gray-500 hover:text-[#1B2D4F]">
            ← Back to home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm font-bold uppercase tracking-wide text-[#F97316]">For Tradies</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#1B2D4F] sm:text-4xl">
          How to sign up as a tradie
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Getting set up takes a few minutes — here's exactly what to expect.
        </p>

        <ol className="mt-12 space-y-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-5">
              <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-orange-50 text-2xl">
                {step.icon}
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-gray-400">STEP {i + 1}</p>
                <h2 className="mb-1.5 text-lg font-bold text-[#1B2D4F]">{step.title}</h2>
                <p className="text-sm leading-relaxed text-gray-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-2xl bg-[#1B2D4F] p-10 text-center">
          <h2 className="text-2xl font-extrabold text-white">Ready to grow your business?</h2>
          <p className="mt-2 text-white/70">It's free to join — no cold calling, no middlemen.</p>
          <StoreButtons className="mt-7 justify-center" />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
