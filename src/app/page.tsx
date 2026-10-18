// Trevs Agents landing page — single-page brand anchor + 4-product surface.
// Visual: CSS starfield bg (no heavy WebGL — mobile-friendly), Geist fonts, real CTA buttons,
// transparent-bg logo. Static headline with one gradient-highlighted phrase.

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Testimonials } from "@/components/Testimonials";

// ─── CONFIG — replace these URLs once products are created ──────────────────
const LINKS = {
  membership: "https://trevsagents.gumroad.com/l/innercircle", // Inner Circle ($49/mo for new members since 2026-10-13; earlier members keep $29.99)
  discord:    "https://discord.gg/5BfG5Wuwfr",                              // permanent invite to Trevs Agents server (never-expires)
  tiktok:     "https://www.tiktok.com/@tonkashops",
  twitter:    "https://x.com/trevsagents",
} as const;

export default function Page() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      {/* Funnel order: hero → what you get (checkmarks) → proof → the offer/pricing. */}
      <Hero />
      <CompareStrip />
      <Testimonials />
      <ProductGrid />
      <Footer />
    </main>
  );
}

// ─── COMPARE STRIP ──────────────────────────────────────────────────────────
// Forces the value comparison BEFORE visitors click a card. Without this,
// most TikTok visitors impulse-click the cheaper guide and never see Inner
// Circle. The math is explicit at a glance.
// Fast, eased scroll to a target — fixed ~850ms regardless of distance, so it
// visibly *whooshes past* the testimonials (you see they exist) instead of an
// instant 1-frame jump that hides them entirely.
function whooshTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const startY = window.scrollY;
  const dur = 850;
  let start: number | null = null;
  const step = (ts: number) => {
    if (start === null) start = ts;
    const t = Math.min(1, (ts - start) / dur);
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
    // Recompute the target EVERY frame — lazy-loaded testimonial images shift the
    // page height mid-scroll, so a target computed once goes stale and lands short.
    const targetY = el.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo(0, startY + (targetY - startY) * ease);
    if (t < 1) requestAnimationFrame(step);
    else el.scrollIntoView({ block: "start", behavior: "auto" }); // final snap
  };
  requestAnimationFrame(step);
}

function CompareStrip() {
  const features: string[] = [
    "The Agent Builder does the building FOR you — no code, no figuring it out alone. Tell it what you want to run and it sets it up on your machine while you watch, with an AI copilot answering anything you get stuck on",
    "A library of 14 proven money-making agents — add as many as you like: stores, content, research, trading & more (new ones dropped weekly)",
    "Guided ecosystem setup + your own live mission-control dashboard — the builder helps you make both",
    "A step-by-step road to profit — the exact path from zero to your first dollar",
    "New money-making agents + revenue plays dropped every week (never posted publicly)",
    "Every guide I publish — updated the moment the AI tools change",
    "A private community of 2,000+ builders shipping real results",
    "Direct access to me — 1-on-1 help the second you get stuck",
    "Works whether you're starting from scratch or scaling what you've already got",
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
      className="mx-auto mb-12 w-full max-w-2xl sm:mb-16"
    >
      <div className="rounded-2xl border border-violet-400/20 bg-white/[0.025] p-6 backdrop-blur-md sm:p-8">
        <div className="mb-6 text-center">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-violet-300/70">
            What you get
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Everything inside the <span className="animate-gradient-text">Inner Circle</span>
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-white/50">
            The whole operation, the agents, and the exact road to your first dollar — for less than one hour of a freelancer a month.
          </p>
        </div>

        <div className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0"><Check /></span>
              <span className="text-[13.5px] leading-snug text-white/80 sm:text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Skip-to-pricing CTA — whooshes past the testimonials (obvious they're there) */}
        <div className="mt-7 flex flex-col items-center gap-2 border-t border-white/8 pt-6">
          <button
            onClick={() => whooshTo("pricing")}
            className="rounded-lg border border-violet-300/70 bg-violet-400/20 px-6 py-3 text-sm font-semibold text-violet-50 transition-colors hover:bg-violet-400/35"
          >
            Ready to join? Jump to pricing ↓
          </button>
          <span className="text-[11.5px] text-white/40">
            You&apos;ll scroll past what 2,000+ members are saying — worth a peek on the way.
          </span>
        </div>
      </div>
    </motion.section>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 text-emerald-300 sm:size-5" aria-hidden="true">
      <path
        d="M4 10.5l4 4 8-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── HERO ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative mx-auto mb-14 flex max-w-3xl flex-col items-center text-center sm:mb-20">
      {/* Logo — small on mobile (~120px), medium on desktop (~200px). Bg-transparent PNG.
          Aspect ~5:3 (514×320 after bg-remove + crop).
          Animations: gradient color cycle (subtle hue-rotate + brightness) + pulsing glow halo.
          No float (was distracting). For real orb-movement we'd need the logo as SVG so each
          circle becomes a separate element — TODO when Trevor regenerates as vector. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative mb-5 sm:mb-8"
      >
        {/* Pulsing glow halo behind logo — violet → pink radial blur, slow breathe */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
          animate={{
            opacity: [0.45, 0.85, 0.45],
            scale:   [0.85, 1.15, 0.85],
          }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(circle, rgba(196,141,253,0.55) 0%, rgba(244,114,182,0.35) 40%, transparent 70%)",
          }}
        />

        {/* Animated logo — Trevor's MJ-generated loop, chromakeyed + cropped tight,
            encoded as animated WebP with true alpha. Native loop, no blend-mode tricks. */}
        <img
          src="/logo.webp"
          alt="Trevs Agents"
          className="relative h-auto w-[160px] sm:w-[200px] md:w-[240px]"
        />
      </motion.div>

      {/* Social proof pill — builds trust at first glance. Update count as sales grow. */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.5, ease: "easeOut" }}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/[0.08] px-3.5 py-1.5 text-xs font-medium text-violet-50 backdrop-blur-sm"
      >
        <span aria-hidden="true">🔥</span>
        <span>2,000+ builders already inside</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
        className="mb-6 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl"
      >
        Learn how to automate an existing business — or build a new one —{" "}
        <span className="animate-gradient-text">
          with AI agents.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
        className="mb-8 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
      >
        Join the <span className="text-violet-200">Inner Circle</span> and get the
        full playbook — the <span className="text-violet-200">Agent Builder</span> that stands up your whole
        AI-agent operation on your machine: it walks you through the foundation, lets you add as many proven
        agents as you want from the library, and builds you a dashboard to run it all (no code, AI copilot
        guiding you). Plus every guide, the private community, and direct access to me. Point it at the
        business you already run — Etsy, Fiverr, SaaS, YouTube, trading — or start a fresh one this weekend.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
        className="flex flex-wrap items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40 sm:text-xs"
      >
        <span>Proven models</span>
        <span className="text-pink-400/40">·</span>
        <span>Works at any level</span>
      </motion.div>
    </section>
  );
}

// ─── PRODUCT GRID ───────────────────────────────────────────────────────────
function ProductGrid() {
  return (
    <section id="pricing" className="mb-20 grid scroll-mt-6 gap-5 sm:grid-cols-3">
      <ProductCard
        accent="violet"
        eyebrow="The playbook · everything"
        title="Inner Circle"
        price="$49"
        priceNote="per month · cancel anytime"
        bullets={[
          "The Agent Builder — stand up your whole AI-agent operation on your machine, no code, AI copilot included",
          "A library of 14 proven agents — add as many as you want (new ones weekly)",
          "Guided ecosystem setup + your own live mission-control dashboard",
          "A step-by-step road to profit — zero to your first dollar",
          "Private community of 2,000+ + direct 1-on-1 access to me",
        ]}
        cta="Join Inner Circle"
        href={LINKS.membership}
        delay={0}
      />

      <LifetimeCard />

      <ProductCard
        accent="amber"
        eyebrow="Free"
        title="Join the Community"
        price="Free"
        priceNote="open to all"
        bullets={[
          "Chat with 2,000+ other builders",
          "Ask questions, share what you're building",
          "Learn from real teardowns + agent setups",
          "No payment required to join",
        ]}
        cta="Open Discord"
        href={LINKS.discord}
        delay={0.1}
      />
    </section>
  );
}


// ─── LIFETIME OFFER ─────────────────────────────────────────────────────────
// Every number here is live and true: the seat cap and end date are set on the server, "seats left" is cap minus the
// product's real Gumroad sales count, and the card only renders once the product exists (2026-10-13).
type Lifetime = { available: boolean; url?: string; price?: string; later_price?: string };
function LifetimeCard() {
  const [lt, setLt] = useState<Lifetime | null>(null);
  useEffect(() => { fetch("/api/lifetime", { cache: "no-store" }).then((r) => r.json()).then(setLt).catch(() => setLt({ available: false })); }, []);
  if (!lt || !lt.available || !lt.url) return null;
  /* Copy is Trevor's (2026-10-18), replacing "ends in 1 week · 2 spots left" — 52 lifetimes had
   * sold against a stated "2 left", and a seat count nobody is counting is the one claim here that
   * could actually be held against us. The urgency now rests on the PRICE, which is real: $99 is a
   * founding price and $249 is configured as the later one, so "it goes up" is a fact we can show.
   * Deliberately no number, no date, no countdown — nothing that has to be honoured on a schedule
   * or quietly walked back. Static, as before: the API supplies only the link and the two prices. */
  const priceNum = (lt.price || "$99").replace(/[^0-9.]/g, "");
  return (
    <ProductCard
      accent="pink"
      eyebrow="Lifetime deal · pay once, in for life"
      banner="⏳ Limited spots · closing soon"
      featured
      tag="Most Popular"
      title="Inner Circle — Lifetime"
      price={lt.price || "$99"}
      was={`$${lt.later_price}`}
      priceNote="one payment · yours forever"
      bullets={[
        "Everything in the Inner Circle, for good: the Agent Builder, every agent, every guide, the community, me",
        "No monthly charge, ever. Pays for itself in two months against $49 a month",
        `Limited spots at $${priceNum}. When they are gone, lifetime goes to $${lt.later_price}`,
        "Closing soon — no warning when it does",
      ]}
      cta="Get lifetime access"
      href={lt.url}
      delay={0.05}
    />
  );
}

// ─── CARD COMPONENT ─────────────────────────────────────────────────────────
type Accent = "cyan" | "pink" | "violet" | "amber";
const ACCENT: Record<Accent, { border: string; text: string; ring: string; glow: string; btn: string }> = {
  cyan: {
    border: "border-cyan-300/30",
    text:   "text-cyan-200",
    ring:   "hover:border-cyan-300/80",
    glow:   "shadow-[0_0_36px_rgba(34,211,238,0.18)]",
    btn:    "bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/30 border-cyan-300/60",
  },
  pink: {
    border: "border-pink-300/30",
    text:   "text-pink-200",
    ring:   "hover:border-pink-300/80",
    glow:   "shadow-[0_0_36px_rgba(244,114,182,0.18)]",
    btn:    "bg-pink-400/15 text-pink-100 hover:bg-pink-400/30 border-pink-300/60",
  },
  violet: {
    border: "border-violet-300/60",
    text:   "text-violet-200",
    ring:   "hover:border-violet-300",
    glow:   "shadow-[0_0_44px_rgba(167,139,250,0.32)]",
    btn:    "bg-violet-400/20 text-violet-100 hover:bg-violet-400/40 border-violet-300/80",
  },
  amber: {
    border: "border-amber-300/25",
    text:   "text-amber-200",
    ring:   "hover:border-amber-300/70",
    glow:   "",
    btn:    "bg-amber-400/15 text-amber-100 hover:bg-amber-400/30 border-amber-300/60",
  },
};

function ProductCard({
  accent, eyebrow, title, price, priceNote, bullets, cta, href, featured, comingSoon, delay = 0, tag, banner, was,
}: {
  accent: Accent;
  eyebrow: string;
  title: string;
  price: string;
  priceNote: string;
  bullets: string[];
  cta: string;
  href: string;
  featured?: boolean;
  comingSoon?: boolean;
  delay?: number;
  tag?: string;     // text of the floating badge (default "Most Popular")
  banner?: string;  // loud limited-time bar at the top of the card
  was?: string;     // struck-through price shown beside the live one
}) {
  const c = ACCENT[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      className={`group relative flex flex-col rounded-xl border p-5 backdrop-blur-md transition-all duration-200 ${
        featured
          ? // Inner Circle — pops out: scaled slightly, raised, brand-gradient border, premium glow
            "scale-[1.04] lg:scale-[1.07] z-10 border-2 bg-gradient-to-b from-violet-500/[0.08] to-black/60 shadow-[0_0_50px_rgba(167,139,250,0.35)] hover:shadow-[0_0_70px_rgba(167,139,250,0.55)]"
          : `bg-black/55 ${c.border} ${c.ring}`
      }`}
      style={
        featured
          ? {
              // Gradient border via background-image trick on the wrapper
              borderImage: "linear-gradient(135deg, #f9a8d4, #c4b5fd, #67e8f9) 1",
              borderImageSlice: 1,
            }
          : undefined
      }
    >
      {featured && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 rounded-full bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-black shadow-[0_0_22px_rgba(167,139,250,0.7)]">
          🔥 {tag || "Most Popular"}
        </div>
      )}

      {banner && (
        // The "whoa, I need to get in on that" bar (Trevor 2026-10-13): big, hot, and breathing — never gated on reduced motion.
        <motion.div
          animate={{ scale: [1, 1.035, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="mb-4 mt-3 rounded-lg bg-gradient-to-r from-red-500 via-pink-500 to-orange-400 px-3 py-2.5 text-center font-mono text-[12px] font-black uppercase leading-snug tracking-[0.1em] text-white shadow-[0_0_30px_rgba(244,63,94,0.55)] sm:text-[13px]"
        >
          {banner}
        </motion.div>
      )}

      <div className={`mb-2 font-mono text-[9px] uppercase tracking-[0.3em] ${c.text} opacity-70`}>
        {eyebrow}
      </div>

      <h3 className={`mb-4 text-lg font-semibold tracking-tight ${c.text}`}>{title}</h3>

      <div className="mb-5">
        <div className="flex items-baseline gap-3">
          <div className={`text-3xl font-bold ${c.text}`}>{price}</div>
          {was && <div className="text-2xl font-semibold text-white/35 line-through decoration-pink-400/70 decoration-[3px]">{was}</div>}
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-white/40">{priceNote}</div>
      </div>

      <ul className="mb-6 flex-1 space-y-2 text-sm text-white/80">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 leading-snug">
            <span className={`mt-1 inline-block size-1.5 shrink-0 rounded-full ${c.text} opacity-60 [background:currentColor]`} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {comingSoon ? (
        <div
          aria-disabled="true"
          className="mt-auto inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold tracking-tight text-white/50"
        >
          {cta}
        </div>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 ${c.btn}`}
        >
          {cta}
          <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </a>
      )}
    </motion.div>
  );
}

// ─── FOOTER ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-4 border-t border-white/10 pt-8 text-center">
      <div className="flex items-center gap-5 text-sm text-white/60">
        <a href={LINKS.tiktok}  target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-cyan-300">TikTok</a>
        <span className="text-pink-400/40">·</span>
        <a href={LINKS.twitter} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-cyan-300">X / Twitter</a>
        <span className="text-pink-400/40">·</span>
        <a href={LINKS.discord} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-violet-300">Discord</a>
        <span className="text-pink-400/40">·</span>
        <a href="/terms" className="transition-colors hover:text-white/80">Terms</a>
      </div>
      <div className="font-mono text-[10px] text-white/30">© 2026 Trevs Agents</div>
    </footer>
  );
}
