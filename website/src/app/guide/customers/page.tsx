import Image from "next/image";
import Link from "next/link";
import { StoreButtons } from "@/components/store-buttons";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "How TrustaTradie Works for Customers",
};

const STEPS = [
  {
    icon: "📲",
    title: "Create your account",
    body: "Download the app and sign up as a customer with your name, email, and phone number. Confirm your email address and you're in.",
  },
  {
    icon: "📝",
    title: "Post your job",
    body: "Describe the work you need done, choose a trade category (electrical, plumbing, building, and more), add a few photos, and set a budget range if you have one.",
  },
  {
    icon: "🪖",
    title: "Get quotes from vetted tradies",
    body: "Nearby tradies who work in that category can request a site visit or send you a quote directly in the app — no cold calling, no middlemen.",
  },
  {
    icon: "⭐",
    title: "Compare & accept a quote",
    body: "Check each tradie's rating, reviews, and verification badges before you decide. When you accept a quote, your payment is held securely in escrow via TradeSafe — it isn't paid out to the tradie yet.",
  },
  {
    icon: "💬",
    title: "Track the job",
    body: "Message your tradie directly in the app, and see the date they've booked to start the work.",
  },
  {
    icon: "✅",
    title: "Confirm completion",
    body: "Once the tradie marks the job as complete, review the work. You have 72 hours to confirm it's done or raise a dispute — your payment stays safely in escrow the whole time.",
  },
  {
    icon: "💰",
    title: "Pay & rate",
    body: "Release payment once you're happy, and it's paid straight to the tradie. Then rate and review your experience to help other customers choose with confidence.",
  },
];

export default function CustomerGuidePage() {
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
        <p className="text-sm font-bold uppercase tracking-wide text-[#F97316]">For Customers</p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#1B2D4F] sm:text-4xl">
          How TrustaTradie works
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          From posting a job to paying a tradie you trust — here's the whole journey, step by step.
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

        <div className="mt-14 rounded-2xl border border-green-200 bg-green-50 p-8">
          <h2 className="text-xl font-extrabold text-[#1B2D4F]">What does ✓ Verified mean?</h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            A tradie with the <strong>✓ Verified </strong>badge has paid for and passed TrustaTradie&apos;s
            verification checks: their <strong>ID number</strong>, <strong>CIPC business registration</strong>,
            and <strong>bank account </strong>were all independently checked and came back clean. This confirms
            their identity and that their business and banking details are genuine — it doesn&apos;t guarantee
            the quality of their work, so it&apos;s still worth checking ratings and reviews before you accept
            a quote.
          </p>
        </div>

        <div className="mt-10 rounded-2xl bg-[#1B2D4F] p-10 text-center">
          <h2 className="text-2xl font-extrabold text-white">Ready to post your first job?</h2>
          <p className="mt-2 text-white/70">It's free to join, and payment stays protected until you're happy.</p>
          <StoreButtons className="mt-7 justify-center" />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
