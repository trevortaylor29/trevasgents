import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Trevs Agents",
  description:
    "What Trevs Agents collects, what it does with it, and what it does with Google user data.",
};

/* Written for Google's OAuth verification as much as for members: the consent screen refuses to go
   to production without a privacy policy, and Google reads this page. Every claim here has to stay
   true of what the site and the agents actually do. */
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16 text-white/90">
      <div>
        <a href="/" className="text-sm text-cyan-300 transition-colors hover:text-cyan-200">
          ← Back to Trevs Agents
        </a>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-white/50">Last updated: 17 October 2026</p>
      </div>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
        <p className="text-[15px] leading-relaxed">
          Trevs Agents is operated by Trevor Taylor. We keep the smallest amount of information that
          lets the product work: an email address to sign you in, your membership status, and the
          agents you build. We do not sell data, we do not run advertising trackers, and we do not
          use your data to train models.
        </p>
      </section>

      <section className="space-y-4 text-[14px] leading-relaxed text-white/75">
        <h2 className="text-lg font-semibold text-white/90">What we hold</h2>
        <p>
          <strong className="text-white/85">Your account.</strong> An email address and a sign-in
          link, handled by Supabase. Sign-in is by magic link, so we never hold a password.
        </p>
        <p>
          <strong className="text-white/85">Your membership.</strong> Purchases run through Gumroad,
          which tells us the email on the order, whether the subscription is active, and the Discord
          handle you give at checkout so the community role can be granted. Card details never reach
          us — Gumroad is the merchant of record.
        </p>
        <p>
          <strong className="text-white/85">What you build.</strong> The agents you configure in the
          builder, kept so you can come back to them. Your agents run on your own machine and your
          own AI account; their work, their files and their output stay there and are never sent to us.
        </p>
        <p>
          <strong className="text-white/85">Support messages.</strong> Anything you send us by email
          or Discord, kept so we can answer it.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white/90">Google user data</h2>
        <p>
          Some of our own agents connect to Google services — specifically the YouTube Data,
          YouTube Analytics and YouTube Reporting APIs — when the operator authorises them. That
          access is used for one thing: to run the operator&apos;s own agents against the
          operator&apos;s own YouTube channel, on the operator&apos;s own server.
        </p>
        <p>
          Data retrieved from Google is stored only on that server, is used only to produce the
          reports, comment triage and video uploads the operator asked for, and is{" "}
          <strong className="text-white/85">never sold, never shared with third parties, never used
          for advertising, and never used to train any model</strong>. Tokens are held in a
          restricted file readable only by the server account, and access can be revoked at any time
          from{" "}
          <a href="https://myaccount.google.com/permissions" className="text-cyan-300 hover:text-cyan-200" target="_blank" rel="noreferrer">
            your Google account permissions
          </a>
          , which immediately ends our access. Our use of information received from Google APIs
          follows the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-cyan-300 hover:text-cyan-200" target="_blank" rel="noreferrer">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white/90">Who else sees it</h2>
        <p>
          Only the services that make the product run: Supabase (accounts), Gumroad (payments and
          subscription status), Resend (sign-in and notification email), Discord (community roles),
          and Vercel (hosting). Each sees only what it needs. There are no analytics or advertising
          trackers on this site.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white/90">How long we keep it</h2>
        <p>
          Your account and the agents you built are kept while your account exists. Email us and we
          will delete them. Purchase records are kept as long as the law requires for bookkeeping.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white/90">Your choices</h2>
        <p>
          Ask us for a copy of what we hold, ask us to correct it, or ask us to delete it. Revoke any
          Google access from your Google account at any time. Cancel your membership in your Gumroad
          library whenever you like.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white/90">Children</h2>
        <p>Trevs Agents is for adults. It is not directed at anyone under 18.</p>

        <h2 className="pt-2 text-lg font-semibold text-white/90">Changes</h2>
        <p>
          If this policy changes in a way that matters, the date at the top changes with it and
          members are told.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-white/90">Contact</h2>
        <p>
          <a href="mailto:trev@trevsagents.com" className="text-cyan-300 hover:text-cyan-200">
            trev@trevsagents.com
          </a>
        </p>
      </section>
    </main>
  );
}
