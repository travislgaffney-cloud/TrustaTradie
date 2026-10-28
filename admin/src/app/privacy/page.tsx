export const metadata = {
  title: "Privacy Policy — Trust-a-Tradie",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Trust-a-Tradie Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: 1 September 2026</p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          <section>
            <p>
              Trust-a-Tradie (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the Trust-a-Tradie mobile
              application, which connects customers with independent tradespeople (&quot;tradies&quot;) for home
              improvement and trade services in South Africa. This policy explains what personal information we
              collect from customers and tradies, why we collect it, who we share it with, and the choices and
              rights you have — including how to delete your account.
            </p>
            <p className="mt-3">
              This policy applies to both the customer side and the tradie side of the app — the same
              information practices apply regardless of which role you sign up as.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">Account &amp; profile information</h3>
            <p>
              Name, email address, phone number, profile photo, bio, and address/suburb/province. If you sign up
              or sign in with Google, we receive your name, email address, and profile photo from Google.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">Tradie business information</h3>
            <p>
              For tradie accounts: trade categories, years of experience, hourly rate, CIPC and VAT numbers,
              licence/insurance/certification documents, portfolio images, and banking details (bank name,
              account number, branch code, account type) used to pay out completed jobs.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">Job, quote &amp; transaction information</h3>
            <p>
              Job postings and photos, quotes, site-visit scheduling, messages exchanged between a customer and
              tradie about a job, completed-job photos, ratings and reviews, and records of quote acceptance,
              escrow status, commission, and payout amounts.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">Payment information</h3>
            <p>
              Payments are processed through TradeSafe, a licensed escrow payment provider. We do not store your
              card or bank login details ourselves — TradeSafe processes the payment and we store only the resulting
              transaction status and amounts. (Trust-a-Tradie&apos;s TradeSafe integration is currently in sandbox/test
              mode; no real payments are processed while this is the case.)
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">Location information</h3>
            <p>
              With your permission, we use your device&apos;s location to show tradies jobs posted nearby, and to
              show customers tradies operating in their area.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">Device &amp; diagnostic information</h3>
            <p>
              If you send us a bug report, we collect the error message, a stack trace, the screen you were on,
              app version, and basic device information (device model, OS name and version) to help us fix the
              issue. We also store a push notification token so we can send you job, message, and payment
              notifications.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>To operate the marketplace — matching customers with tradies, managing quotes, jobs, site visits, and messaging.</li>
              <li>To process payments and hold funds in escrow via TradeSafe until a job is confirmed complete.</li>
              <li>To pay tradies for completed work using the banking details they provide.</li>
              <li>To send notifications about job activity, messages, and payments.</li>
              <li>To verify tradie qualifications and maintain trust and safety on the platform.</li>
              <li>To respond to support requests and diagnose bugs.</li>
              <li>To meet our legal, tax, and financial record-keeping obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Who We Share Information With</h2>
            <p>We do not sell your personal information. We share information with:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li><span className="font-medium text-gray-900">Supabase</span>, our database, authentication, and file storage provider, which hosts the information described above.</li>
              <li><span className="font-medium text-gray-900">TradeSafe</span>, our escrow payment provider, to process and hold job payments.</li>
              <li><span className="font-medium text-gray-900">Google</span>, if you choose to sign in with Google.</li>
              <li><span className="font-medium text-gray-900">Expo</span>, our push notification delivery service, to send you app notifications.</li>
              <li>The other party to a job — a customer and tradie can see each other&apos;s name, photo, relevant job details, and messages while working together on a job.</li>
              <li>Law enforcement or regulators, where required by law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Retention</h2>
            <p>
              We retain your information for as long as your account is active. If you delete your account (see
              below), we anonymize your personal information. Job, quote, transaction, payment, invoice, rating,
              and message records are retained even after account deletion, because they form part of the other
              party&apos;s records and because South African tax law requires us to retain financial records for a
              statutory period regardless of an account deletion request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Your Rights &amp; Deleting Your Account</h2>
            <p>
              Under South Africa&apos;s Protection of Personal Information Act (POPIA), you have the right to access,
              correct, and request deletion of your personal information. You can update most of your information
              at any time from your profile. You can also delete your account directly from the app, under
              Profile → Delete Account.
            </p>
            <p className="mt-3">Deleting your account:</p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Permanently locks you out of the account — it cannot be reactivated or signed into again.</li>
              <li>Removes your name, photo, phone number, bio, address, bank details, portfolio images, and licence/insurance documents.</li>
              <li>Clears tradie business details such as your VAT and CIPC numbers.</li>
              <li>Retains job, quote, transaction, payment, invoice, rating, and message records under an anonymized &quot;Deleted User&quot; profile, for the reasons described in Data Retention above.</li>
            </ul>
            <p className="mt-3">
              If you have a complaint about how we handle your information, you may also contact South Africa&apos;s
              Information Regulator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Security</h2>
            <p>
              We use industry-standard measures to protect your information, including encryption in transit and
              database access controls that restrict each user to their own data. No method of transmission or
              storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Children&apos;s Privacy</h2>
            <p>
              Trust-a-Tradie is intended for users who are 18 years or older. We do not knowingly collect
              information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Intellectual Property &amp; Restrictions on Use</h2>
            <p>
              The App, including its software, design, graphics, logos, trademarks, and all content we provide
              (excluding content users submit, such as job descriptions, photos, and reviews), is owned by
              Trust-a-Tradie or our licensors and is protected by copyright, trademark, and other intellectual
              property laws. We grant you a limited, personal, non-transferable licence to use the App for its
              intended purpose. Except as that licence allows, you may not:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mt-2">
              <li>Copy, reproduce, distribute, or create derivative works based on the App or its content.</li>
              <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the App.</li>
              <li>Scrape, crawl, harvest, or use any automated means (bots, scripts, data-mining tools) to extract data from the App, including job listings, tradie profiles, pricing, or reviews.</li>
              <li>Circumvent, disable, or interfere with security-related or access-control features of the App.</li>
              <li>Use the Trust-a-Tradie name, logo, or branding without our prior written permission.</li>
              <li>Build or offer a competing product or service using data or functionality obtained from the App.</li>
            </ul>
            <p className="mt-3">
              We may suspend or terminate the account of, and pursue legal remedies against, anyone who violates
              this section. See our Terms of Service for the full terms governing use of the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. We will post the updated version on this page with a
              new effective date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contact Us</h2>
            <p>
              If you have questions about this policy or how your information is handled, contact us at{" "}
              <a href="mailto:admin@trustatradie.co.za" className="font-medium text-gray-900 underline">
                admin@trustatradie.co.za
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
