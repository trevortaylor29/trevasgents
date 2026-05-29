// Trevs Agents landing page — single-page brand anchor + 4-product surface.
// Visual: CSS starfield bg (no heavy WebGL — mobile-friendly), Geist fonts, real CTA buttons,
// transparent-bg logo. Static headline with one gradient-highlighted phrase.

"use client";

import { motion } from "framer-motion";

// ─── CONFIG — replace these URLs once products are created ──────────────────
const LINKS = {
  guide:      "https://trevsagents.gumroad.com/l/tonkas-dungeon-build-guide",
  bundle:     "https://trevsagents.gumroad.com/l/REPLACE-ME-bundle",       // $100 guide + 30min call
  membership: "https://trevsagents.gumroad.com/l/innercircle", // $34.99/mo
  discord:    "https://discord.gg/5BfG5Wuwfr",                              // permanent invite to Trevs Agents server (never-expires)
  tiktok:     "https://www.tiktok.com/@REPLACE-ME",
  twitter:    "https://x.com/REPLACE-ME",
} as const;

export default function Page() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <Hero />
      <CompareStrip />
      <ProductGrid />
      <Footer />
    </main>
  );
}

// ─── COMPARE STRIP ──────────────────────────────────────────────────────────
// Forces the value comparison BEFORE visitors click a card. Without this,
// most TikTok visitors impulse-click the cheaper guide and never see Inner
// Circle. The math is explicit at a glance.
function CompareStrip() {
  const rows: { feature: string; inGuide: boolean }[] = [
    { feature: "Initial setup — a few core agents",   inGuide: true  },
    { feature: "Basic dashboard visuals",             inGuide: true  },
    { feature: "In-depth builds — more agents, advanced visuals", inGuide: false },
    { feature: "Every new guide as I publish",        inGuide: false },
    { feature: "New agent + revenue ideas, weekly",   inGuide: false },
    { feature: "Private Discord community",           inGuide: false },
    { feature: "Direct access to me · 1-on-1 support", inGuide: false },
    { feature: "Early access to new tools",           inGuide: false },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
      className="mx-auto mb-10 w-full max-w-2xl sm:mb-14"
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 backdrop-blur-md sm:p-7">
        <div className="mb-5 text-center">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-violet-300/70">
            Which one?
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
            Build Guide vs. Inner Circle
          </h2>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1.6fr_0.7fr_0.7fr] items-end gap-2 border-b border-white/10 pb-3 sm:gap-4">
          <div />
          <div className="text-center">
            <div className="text-xs font-semibold text-cyan-200 sm:text-sm">Build Guide</div>
            <div className="font-mono text-[10px] text-white/50">$24.99 once</div>
          </div>
          <div className="text-center">
            <div className="text-xs font-semibold text-violet-200 sm:text-sm">Inner Circle</div>
            <div className="font-mono text-[10px] text-white/50">$29.99/mo</div>
          </div>
        </div>

        {/* Feature rows */}
        {rows.map((row, i) => (
          <div
            key={row.feature}
            className={`grid grid-cols-[1.6fr_0.7fr_0.7fr] items-center gap-2 py-2.5 text-[13px] sm:gap-4 sm:text-sm ${
              i < rows.length - 1 ? "border-b border-white/5" : ""
            }`}
          >
            <div className="leading-snug text-white/80">{row.feature}</div>
            <div className="flex justify-center">
              {row.inGuide ? <Check /> : <Dash />}
            </div>
            <div className="flex justify-center">
              <Check />
            </div>
          </div>
        ))}

        <div className="mt-4 text-center text-[11px] text-white/50">
          The Build Guide gets you running. Inner Circle takes you deeper — for <span className="text-white/70">$5/mo more</span>.
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

function Dash() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 text-white/25 sm:size-5" aria-hidden="true">
      <path d="M4 10h12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
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
        <span>40+ builders already inside</span>
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
        Pick your depth. The <span className="text-cyan-200">Build Guide</span> is
        the initial setup — a few core agents, basic visuals, working operation.{" "}
        <span className="text-violet-200">Inner Circle</span> is the in-depth
        playbook — every guide, more agents, advanced builds, the private
        community, and direct access to me as you scale.
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
    <section className="mb-20 grid gap-5 sm:grid-cols-3">
      <ProductCard
        accent="cyan"
        eyebrow="One-time · initial setup"
        title="The Build Guide"
        price="$24.99"
        priceNote="one-time · yours forever"
        bullets={[
          "Initial setup with a few core agents",
          "Basic dashboard + visuals",
          "Day Zero walkthrough — works even if you've never built before",
          "Tailors itself to YOUR business",
          "Note: Inner Circle includes this guide. Don't buy both.",
        ]}
        cta="Get the build guide"
        href={LINKS.guide}
        delay={0}
      />

      <ProductCard
        accent="violet"
        eyebrow="In-depth · everything else"
        title="Inner Circle"
        price="$29.99"
        priceNote="per month · cancel anytime"
        bullets={[
          "👉 Build Guide INCLUDED (no need to buy it separately)",
          "In-depth builds — more agents, advanced visuals",
          "Every new guide as I publish it",
          "Private Discord community access",
          "Direct access to me — 1-on-1 support",
          "New agent ideas + revenue plays I don't post publicly",
          "Early access to new tools + templates",
        ]}
        cta="Join Inner Circle"
        href={LINKS.membership}
        featured
        delay={0.05}
      />

      <ProductCard
        accent="amber"
        eyebrow="Free"
        title="Join the Community"
        price="Free"
        priceNote="open to all"
        bullets={[
          "Chat with other builders",
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
  accent, eyebrow, title, price, priceNote, bullets, cta, href, featured, comingSoon, delay = 0,
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
          🔥 Most Popular
        </div>
      )}

      <div className={`mb-2 font-mono text-[9px] uppercase tracking-[0.3em] ${c.text} opacity-70`}>
        {eyebrow}
      </div>

      <h3 className={`mb-4 text-lg font-semibold tracking-tight ${c.text}`}>{title}</h3>

      <div className="mb-5">
        <div className={`text-3xl font-bold ${c.text}`}>{price}</div>
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
      </div>
      <div className="font-mono text-[10px] text-white/30">© 2026 Trevs Agents</div>
    </footer>
  );
}
