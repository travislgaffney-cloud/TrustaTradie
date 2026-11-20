import Link from "next/link";

export function SiteFooter() {
  return (
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
          <a href="mailto:admin@trustatradie.co.za" className="hover:text-[#1B2D4F]">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
