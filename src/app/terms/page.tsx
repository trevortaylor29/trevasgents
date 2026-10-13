import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Sale — Trevs Agents",
  description:
    "Terms of sale for Trevs Agents products and Inner Circle subscription.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16 text-white/90">
      <div>
        <a
          href="/"
          className="text-sm text-cyan-300 transition-colors hover:text-cyan-200"
        >
          ← Back to Trevs Agents
        </a>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Terms of Sale</h1>
        <p className="mt-2 text-sm text-white/50">Last updated: August 2026</p>
      </div>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
        <p className="text-[15px] leading-relaxed">
          Inner Circle auto-renews monthly at $49 for members who joined on or after October 13, 2026 (earlier members keep the price they joined at), cancel anytime in your
          Gumroad library. Inner Circle Lifetime is a single payment for access for as long as the Inner Circle runs (see &quot;Lifetime access&quot; below). All sales final — no refunds on recurring charges or
          one-time purchases.
        </p>
      </section>

      <section className="space-y-4 text-[14px] leading-relaxed text-white/75">
        <h2 className="text-lg font-semibold text-white/90">Purchase &amp; billing</h2>
        <p>
          All purchases and subscriptions are handled by Gumroad. Payment
          processing, receipts, and subscription management (including
          cancellation) live in your Gumroad library. See Gumroad&apos;s{" "}
          <a
            href="https://gumroad.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200"
          >
            Terms of Service
          </a>{" "}
          for their marketplace policies.
        </p>

        <h2 className="text-lg font-semibold text-white/90">Digital delivery</h2>
        <p>
          Guides and Inner Circle content are delivered digitally. Because
          access is granted immediately upon purchase, all sales are final. This
          includes one-time guide purchases and all recurring Inner Circle
          subscription charges.
        </p>

        <h2 className="text-lg font-semibold text-white/90">Lifetime access</h2>
        <p>
          &quot;Lifetime&quot; means the lifetime of the Inner Circle, not yours: a Lifetime
          purchase gives you everything a monthly member gets, with no further charges,
          for as long as the Inner Circle operates. It is not a guarantee that the Inner
          Circle will run for any particular length of time, and the content, agents,
          tools and community may change over that time.
        </p>
        <p>
          If the Inner Circle is ever discontinued, Lifetime members get at least 30
          days&apos; notice and a downloadable copy of the guides and templates that exist
          at that time, so what you paid for stays yours. Because access is delivered in
          full from day one, no refund is owed on discontinuation. Lifetime access is
          personal to the buyer and cannot be transferred or resold.
        </p>

        <h2 className="text-lg font-semibold text-white/90">Auto-renewal</h2>
        <p>
          Inner Circle is a monthly subscription. Your card will be billed
          the monthly price you joined at ($49 for members since October 13, 2026) every month until you cancel. You can cancel at any time before
          your next billing date from your Gumroad library — no email, no
          phone call, no retention flow. Cancelling stops future charges;
          previously-charged periods are not refunded.
        </p>

        <h2 className="text-lg font-semibold text-white/90">Agents, trading &amp; risk</h2>
        <p>
          The agents you build are educational tools and automation blueprints —
          not financial, investment, tax, or betting advice. Any trading, crypto,
          or sports-betting agents are provided as examples and default to{" "}
          <span className="text-white/90">paper (simulated) money</span>. If you
          choose to connect real money, accounts, or place real wagers, you do so
          entirely at your own risk and are solely responsible for the outcomes,
          any losses, and compliance with all laws that apply to you. Betting and
          gambling features are intended only for adults of legal age (18+/21+)
          where such activity is lawful. Trevs Agents makes no guarantee of
          profit, accuracy, or results. Always verify an agent&apos;s output
          before acting on it.
        </p>

        <h2 className="text-lg font-semibold text-white/90">Fuel (AI usage credits)</h2>
        <p>
          Fuel is prepaid credit that powers the agents you build — it&apos;s what they &quot;think&quot;
          with. It provides metered access to third-party large language models, provisioned and billed
          through us on your behalf; you&apos;re paying for the AI compute your agents use, simplified into
          one prepaid balance. A few things to know:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="text-white/90">One-time top-ups, not a subscription.</span> Fuel is purchased
            in one-time top-ups via Stripe. It does <span className="text-white/90">not</span> auto-renew —
            nothing is billed again unless you choose to top up.
          </li>
          <li>
            <span className="text-white/90">Non-refundable, no cash value.</span> Fuel top-ups are final and
            non-refundable. Fuel can only be used to run agents on Trevs Agents; any unused balance has no
            cash value and is not redeemable for cash.
          </li>
          <li>
            <span className="text-white/90">Provided &quot;as is.&quot;</span> We don&apos;t guarantee any
            specific model, uptime, speed, or the accuracy of any output. The underlying models, prices, and
            available tiers may change over time. Always verify an agent&apos;s output before acting on it.
          </li>
          <li>
            <span className="text-white/90">Your key is yours.</span> Your fuel key is tied only to your
            account. Don&apos;t share it or resell access — it authorizes your own usage only.
          </li>
          <li>
            <span className="text-white/90">Data.</span> To run your agents, the prompts and data they send
            are processed by third-party AI providers. Don&apos;t send anything through fuel you wouldn&apos;t
            be comfortable sending to a cloud AI service.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-white/90">Questions</h2>
        <p>
          For product-specific questions or issues, reach out in the Trevs
          Agents Discord (linked in the site footer).
        </p>
      </section>
    </main>
  );
}
