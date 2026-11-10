import Link from "next/link";
import Image from "next/image";

const APP_STORE_URL = "https://apps.apple.com/app/id6828108001";
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.trustatradie.app";

function StoreButtons({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a href={APP_STORE_URL} className="inline-flex items-center">
        <Image
          src="/app-store-badge.svg"
          alt="Download on the App Store"
          width={167}
          height={56}
          className="h-14 w-auto"
        />
      </a>
      <a href={PLAY_STORE_URL} className="inline-flex items-center">
        <Image
          src="/google-play-badge.svg"
          alt="Get it on Google Play"
          width={189}
          height={56}
          className="h-14 w-auto"
        />
      </a>
    </div>
  );
}

const CUSTOMER_STEPS = [
  {
    icon: "📝",
    title: "Post your job",
    body: "Describe what you need done and add a few photos. It takes less than a minute.",
  },
  {
    icon: "💬",
    title: "Compare quotes",
    body: "Vetted tradies nearby request a site visit or send you a quote directly in the app.",
  },
  {
    icon: "🔒",
    title: "Pay safely",
    body: "Your payment is held securely in escrow and only released once you confirm the job is done.",
  },
];

const TRADIE_STEPS = [
  {
    icon: "📍",
    title: "Find nearby jobs",
    body: "Browse job posts in your area and in your trade categories.",
  },
  {
    icon: "📄",
    title: "Send a quote",
    body: "Request a site visit or quote the job directly — no cold calling, no middlemen.",
  },
  {
    icon: "💰",
    title: "Get paid",
    body: "Once the customer confirms the job's complete, your payout lands straight in your bank account.",
  },
];

const FEATURES = [
  {
    icon: "✅",
    title: "Vetted tradies",
    body: "Licences, insurance, and certifications are checked before a tradie can take on jobs.",
  },
  {
    icon: "🔒",
    title: "Escrow-protected payments",
    body: "Funds are held securely until you confirm the work is done — powered by TradeSafe.",
  },
  {
    icon: "💬",
    title: "In-app messaging",
    body: "Keep every conversation about a job in one place, from quote to completion.",
  },
  {
    icon: "⭐",
    title: "Ratings & reviews",
    body: "See how a tradie has performed on real jobs before you accept their quote.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Image
              src="/icon.png"
              alt="TrustaTradie"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="text-lg font-extrabold text-[#1B2D4F]">
              TrustaTradie
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 sm:flex">
            <a href="#customers" className="hover:text-[#1B2D4F]">
              For Customers
            </a>
            <a href="#tradies" className="hover:text-[#1B2D4F]">
              For Tradies
            </a>
            <a href="#features" className="hover:text-[#1B2D4F]">
              Features
            </a>
          </nav>
          <a
            href={APP_STORE_URL}
            className="rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#EA6C0A] transition-colors"
          >
            Get the app
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#1B2D4F]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Find a trusted tradie,{" "}
              <span className="text-[#FBBF24]">without the guesswork.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-white/70">
              Post a job, get quotes from vetted tradies near you, and pay
              safely through secure escrow — all from one app.
            </p>
            <StoreButtons className="mt-8" />
          </div>
          <div className="flex justify-center">
            <div className="flex h-72 w-72 items-center justify-center rounded-3xl bg-white/10 sm:h-80 sm:w-80">
              <Image
                src="/icon.png"
                alt="TrustaTradie app icon"
                width={160}
                height={160}
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* For customers */}
      <section id="customers" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-[#F97316]">
            For Customers
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-[#1B2D4F]">
            Get your job done right
          </h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {CUSTOMER_STEPS.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-3xl">
                {step.icon}
              </div>
              <p className="mb-1 text-xs font-bold text-gray-400">
                STEP {i + 1}
              </p>
              <h3 className="mb-2 text-lg font-bold text-[#1B2D4F]">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* For tradies */}
      <section id="tradies" className="bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-[#F97316]">
              For Tradies
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-[#1B2D4F]">
              Grow your business, your way
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {TRADIE_STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                  {step.icon}
                </div>
                <p className="mb-1 text-xs font-bold text-gray-400">
                  STEP {i + 1}
                </p>
                <h3 className="mb-2 text-lg font-bold text-[#1B2D4F]">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold text-[#1B2D4F]">
            Built for trust, from the ground up
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-100 p-6 shadow-sm"
            >
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="mb-1.5 font-bold text-[#1B2D4F]">{f.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1B2D4F] py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to get started?
          </h2>
          <p className="mt-3 text-white/70">
            Download TrustaTradie today — it&apos;s free to join as a
            customer or a tradie.
          </p>
          <StoreButtons className="mt-8 justify-center" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-gray-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} TrustaTradie. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#1B2D4F]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[#1B2D4F]">
              Terms of Service
            </Link>
            <a
              href="mailto:admin@trustatradie.co.za"
              className="hover:text-[#1B2D4F]"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
