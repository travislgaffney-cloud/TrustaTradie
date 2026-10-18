export const metadata = {
  title: "Terms of Service — Trust-a-Tradie",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Trust-a-Tradie Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: 1 September 2026</p>

        <div className="space-y-10 text-gray-700 leading-relaxed">
          <section>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of the Trust-a-Tradie mobile application
              (&quot;the App&quot;), which connects customers seeking home-improvement and trade services with
              independent tradespeople (&quot;tradies&quot;) in South Africa. By creating an account or using the
              App, you agree to these Terms. If you do not agree, do not use the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. What Trust-a-Tradie Is</h2>
            <p>
              Trust-a-Tradie is a marketplace that connects customers and tradies. We are not a party to the
              work agreement between a customer and a tradie, and we do not ourselves perform, supervise, or
              guarantee any trade work. Tradies on the App are independent contractors, not employees or agents
              of Trust-a-Tradie.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Eligibility &amp; Accounts</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>You must be at least 18 years old and able to enter a binding contract under South African law.</li>
              <li>You must provide accurate information when creating your account and keep it up to date.</li>
              <li>You are responsible for all activity on your account and for keeping your login credentials secure.</li>
              <li>You may delete your account at any time from Profile → Delete Account. See our Privacy Policy for what is removed and what is retained.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. For Customers</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>You can post a job describing the work you need done, and tradies may request a site visit or submit a quote.</li>
              <li>When you accept a quote, you agree to pay the full quoted amount, which is held securely in escrow via our payment partner, TradeSafe, until you confirm the job is complete.</li>
              <li>You are responsible for reviewing the completed work before releasing payment. Once you release payment, it is paid out to the tradie and cannot be automatically reversed.</li>
              <li>If you are unhappy with completed work, you may raise a dispute instead of releasing payment, which freezes the funds while our team investigates.</li>
              <li>Trust-a-Tradie does not guarantee the quality, safety, or legality of any tradie&apos;s work.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. For Tradies</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>You may browse nearby jobs, request site visits, and submit quotes to customers.</li>
              <li>Any licences, insurance, certifications, VAT, or CIPC information you provide must be accurate and current. We may verify this information and may remove documents or suspend accounts that provide false information.</li>
              <li>You are solely responsible for your own tax, VAT, and other statutory obligations arising from work performed through the App. Trust-a-Tradie does not act as your accountant, tax practitioner, or employer.</li>
              <li>Once a customer confirms a job complete and releases payment, funds (minus our commission, described below) are paid out to the banking details on your profile.</li>
              <li>You must complete accepted jobs to a professional standard and communicate honestly with customers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Payments, Escrow &amp; Fees</h2>
            <p>
              Payments are processed and held in escrow by TradeSafe, a licensed escrow payment provider. Trust-a-Tradie
              charges a commission on each completed job, deducted from the amount paid out to the tradie; the
              current commission rate is shown in the payment breakdown before a customer accepts a quote.
              (Trust-a-Tradie&apos;s TradeSafe integration is currently in sandbox/test mode — no real payments are
              processed while this is the case, and this will be updated once live payments are enabled.)
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Disputes &amp; Cancellations</h2>
            <p>
              If a customer or tradie is unsatisfied with how a job is progressing, they should first try to
              resolve it through in-app messaging. If that fails, a customer may raise a formal dispute before
              releasing payment, which freezes the escrowed funds until our team reviews and resolves it. We may
              request information from both parties and make a final decision on releasing, withholding, or
              adjusting a disputed payment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Ratings &amp; Reviews</h2>
            <p>
              Customers may rate and review tradies after a job is completed. Reviews must be honest and based on
              genuine experience. We may remove reviews that are abusive, fraudulent, or unrelated to an actual
              job on the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Prohibited Conduct</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Circumventing the App to arrange payment outside Trust-a-Tradie to avoid fees or escrow protection.</li>
              <li>Providing false identity, business, licensing, or banking information.</li>
              <li>Harassing, threatening, or discriminating against another user.</li>
              <li>Posting fraudulent jobs, quotes, reviews, or completion photos.</li>
              <li>Using the App for anything unlawful.</li>
            </ul>
            <p className="mt-3">
              We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              The App is provided &quot;as is&quot;. To the maximum extent permitted by law, Trust-a-Tradie is not
              liable for the quality, safety, legality, or outcome of any job performed by a tradie, for any
              dispute between a customer and a tradie beyond our dispute-resolution process described above, or
              for indirect or consequential losses arising from use of the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will post the updated version on this page with a
              new effective date. Continued use of the App after a change means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of South Africa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Contact Us</h2>
            <p>
              If you have questions about these Terms, contact us at{" "}
              <span className="font-medium text-gray-900">[INSERT CONTACT EMAIL]</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
