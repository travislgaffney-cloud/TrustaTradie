export const metadata = {
  title: "Terms of Service — Trust-a-Tradie",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Trust-a-Tradie Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Effective date: 11 November 2026</p>

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
              Trust-a-Tradie is a marketplace that connects customers and tradies. When a customer accepts a
              quote, the resulting contract for that work is formed directly between the customer and the
              tradie. Trust-a-Tradie is not a party to that contract and is not responsible for performing,
              supervising, or guaranteeing any trade work — our role is to provide the App, facilitate escrow
              payments, and support dispute resolution as described in these Terms. Tradies on the App are
              independent contractors, not employees or agents of Trust-a-Tradie.
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
              <li>If you do not confirm completion or raise a dispute within 72 hours of the tradie marking the job as complete, the tradie may ask us to review the job and release payment on your behalf. We may do so at our discretion; any dispute you raise before we act will still be honoured and will pause the release.</li>
              <li>Trust-a-Tradie does not guarantee the quality, safety, or legality of any tradie&apos;s work.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. For Tradies</h2>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>You may browse nearby jobs, request site visits, and submit quotes to customers.</li>
              <li>
                Any licences, insurance, certifications, VAT, or CIPC information you provide must be accurate
                and current. We may remove documents or suspend accounts that provide false information. Where
                we show a &quot;Verified&quot; or &quot;Gold Verified&quot; badge on your profile, this means we
                have reviewed the ID document, licence, insurance, qualification, or association documents you
                uploaded and found them to appear authentic and current on their face. It is not a guarantee,
                warranty, or endorsement of the quality, safety, or legality of any work you perform, and
                customers should not rely on it as such.
              </li>
              <li>You are solely responsible for your own tax, VAT, and other statutory obligations arising from work performed through the App. Trust-a-Tradie does not act as your accountant, tax practitioner, or employer.</li>
              <li>Once a customer confirms a job complete and releases payment, funds (minus our commission, described below) are paid out to the banking details on your profile.</li>
              <li>You must complete accepted jobs to a professional standard and communicate honestly with customers.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Indemnity</h2>
            <p>
              If you are a tradie, you agree to indemnify and hold harmless Trust-a-Tradie, its directors,
              employees, and agents against any claim, loss, damage, fine, or reasonable legal cost arising
              from work you performed or failed to perform, including claims brought by a customer, a third
              party, or a regulator.
            </p>
            <p className="mt-3">
              Both customers and tradies agree to indemnify Trust-a-Tradie against any claim, loss, or cost
              arising from: a breach of these Terms; inaccurate, false, or misleading information you provide
              (including licence, insurance, qualification, CIPC, VAT, or banking details); or your violation
              of any law or a third party&apos;s rights in connection with your use of the App. This indemnity
              survives the deletion or termination of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Payments, Escrow &amp; Fees</h2>
            <p>
              Payments are processed and held in escrow by TradeSafe, a licensed escrow payment provider. Trust-a-Tradie
              charges a commission on each completed job, deducted from the amount paid out to the tradie; the
              current commission rate is shown in the payment breakdown before a customer accepts a quote.
              (Trust-a-Tradie&apos;s TradeSafe integration is currently in sandbox/test mode — no real payments are
              processed while this is the case, and this will be updated once live payments are enabled.)
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Disputes, Mediation &amp; Escalation</h2>
            <p>
              If a customer or tradie is unsatisfied with how a job is progressing, they should first try to
              resolve it through in-app messaging. If that fails, a customer may raise a formal dispute before
              releasing payment, which freezes the escrowed funds while we review it.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">7.1 Internal Review</h3>
            <p>
              We will review the information provided by both parties and give a decision on releasing,
              withholding, or adjusting the disputed payment, within a reasonable time. We may request further
              information or evidence from either party.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">7.2 Mediation</h3>
            <p>
              If either party is unhappy with our internal decision, either party may request mediation before
              taking the matter further. We will attempt, in good faith, to agree with both parties on a
              mutually acceptable independent mediator. Mediation is non-binding — if it does not resolve the
              dispute, either party may still escalate it as described below.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">
              7.3 Consumer Goods and Services Ombud &amp; Courts
            </h3>
            <p>
              If a dispute remains unresolved after internal review and mediation, a customer may refer the
              matter to the Consumer Goods and Services Ombud (CGSO), or either party may approach a court of
              competent jurisdiction. Nothing in these Terms limits a consumer&apos;s right to refer a complaint
              to the CGSO, or another applicable ombud or regulator, at any time.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">7.4 Costs</h3>
            <p>
              Unless a court or the CGSO directs otherwise, each party is responsible for their own costs
              (including legal fees) incurred in resolving a dispute.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-5 mb-2">7.5 Escrow During a Dispute</h3>
            <p>
              Funds subject to a dispute remain held in escrow until the dispute is resolved under this
              section, or until a court of competent jurisdiction orders otherwise.
            </p>
            <p className="mt-3">
              If a customer does not confirm a job as complete or raise a dispute within 72 hours of a tradie
              marking the job complete, the tradie may submit a request asking us to release the payment. We
              will review the job and may, at our sole discretion, release the escrowed payment to the tradie
              without the customer&apos;s confirmation. If the customer raises a dispute at any point before we
              act on such a request, the dispute will be honoured and the release will not proceed until it is
              resolved under this section.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Ratings &amp; Reviews</h2>
            <p>
              Customers may rate and review tradies after a job is completed. Reviews must be honest and based on
              genuine experience. We may remove reviews that are abusive, fraudulent, or unrelated to an actual
              job on the App.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Prohibited Conduct</h2>
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
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Intellectual Property &amp; Restrictions on Use</h2>
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
              this section.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Disclaimers &amp; Limitation of Liability</h2>
            <p>
              The App is provided &quot;as is&quot;. To the maximum extent permitted by law, Trust-a-Tradie is not
              liable for the quality, safety, legality, or outcome of any job performed by a tradie, for any
              dispute between a customer and a tradie beyond our dispute-resolution process described above, or
              for indirect or consequential losses arising from use of the App.
            </p>
            <p className="mt-3">
              To the maximum extent permitted by law, our total liability to you arising out of or in connection
              with these Terms or your use of the App, in respect of any single job, is limited to the
              commission we earned on that job, or, where we earned no commission on it, to R500. This
              limitation does not apply to liability that cannot be excluded or limited under South African
              law, including liability arising from our own fraud or gross negligence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will post the updated version on this page with a
              new effective date. Continued use of the App after a change means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Republic of South Africa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Contact Us</h2>
            <p>
              If you have questions about these Terms, contact us at{" "}
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
