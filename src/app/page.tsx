// Trevs Agents landing page — single-page brand anchor + 4-product surface.
// Visual: CSS starfield bg (no heavy WebGL — mobile-friendly), Geist fonts, real CTA buttons,
// transparent-bg logo. Static headline with one gradient-highlighted phrase.

"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// ─── CONFIG — replace these URLs once products are created ──────────────────
const LINKS = {
  guide:      "https://trevsagents.gumroad.com/l/tonkas-dungeon-build-guide",
  bundle:     "https://trevsagents.gumroad.com/l/REPLACE-ME-bundle",       // $100 guide + 30min call
  membership: "https://trevsagents.gumroad.com/l/REPLACE-ME-inner-circle", // $34.99/mo
  discord:    "https://discord.gg/REPLACE-ME-INVITE",                       // permanent invite link
  tiktok:     "https://www.tiktok.com/@REPLACE-ME",
  twitter:    "https://x.com/REPLACE-ME",
} as const;

export default function Page() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8 sm:py-12">
      <Hero />
      <ProductGrid />
      <Footer />
    </main>
  );
}

// ─── HERO ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative mx-auto mb-14 flex max-w-3xl flex-col items-center text-center sm:mb-20">
      {/* Logo — small on mobile (~120px), medium on desktop (~200px). Bg-transparent PNG.
          Aspect ~5:3 (514×320 after bg-remove + crop). Two animations stacked:
            1. Subtle float (parent motion.div, ±6px y-axis on a 6s loop)
            2. Pulsing radial glow behind the logo (absolute child, hue-rotated)
          Both keyed on `repeat: Infinity`. No GPU cost beyond a blur filter. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: [0, -6, 0, 6, 0] }}
        transition={{
          opacity: { duration: 0.6, ease: "easeOut" },
          y: { duration: 6, repeat: Infinity, ease: "easeInOut", repeatType: "loop" },
        }}
        className="relative mb-5 sm:mb-8"
      >
        {/* Pulsing glow halo behind logo — color cycles violet → pink → cyan */}
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

        <Image
          src="/logo.png"
          alt="Trevs Agents"
          width={514}
          height={320}
          priority
          className="relative h-auto w-[120px] sm:w-[160px] md:w-[200px]"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
        className="mb-6 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl"
      >
        Run an autonomous business{" "}
        <span className="bg-gradient-to-r from-pink-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
          with AI agents.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
        className="mb-8 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
      >
        The build guide gives you a proven model and the agent stack to run it —
        whether you already have a business or you&apos;re starting from scratch.
        Etsy, Fiverr, SaaS, YouTube, or your own idea — drop the guide into your
        LLM and walk out with a working operation that runs while you sleep.
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
        <span className="text-pink-400/40">·</span>
        <span>Bring your own LLM</span>
      </motion.div>
    </section>
  );
}

// ─── PRODUCT GRID ───────────────────────────────────────────────────────────
function ProductGrid() {
  return (
    <section className="mb-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <ProductCard
        accent="cyan"
        eyebrow="One-time purchase"
        title="The Build Guide"
        price="$29"
        priceNote="one-time · yours forever"
        bullets={[
          "17-file plug-n-play pattern pack",
          "Drop into your LLM — it adapts to your stack",
          "Day Zero walkthrough for beginners",
          "Use any LLM: Codex, Claude, OpenClaw",
        ]}
        cta="Get the guide"
        href={LINKS.guide}
        delay={0}
      />

      <ProductCard
        accent="violet"
        eyebrow="Most popular"
        title="Inner Circle"
        price="$34.99"
        priceNote="per month · cancel anytime"
        bullets={[
          "Every guide — past, present, and future",
          "Locked Discord channels + premium vault",
          "#ask-trevor channel — direct support from me",
          "Early access to new tools + agent recipes",
        ]}
        cta="Join Inner Circle"
        href={LINKS.membership}
        featured
        delay={0.05}
      />

      <ProductCard
        accent="pink"
        eyebrow="With me"
        title="Guide + Setup Call"
        price="$99"
        priceNote="one-time · guide + 30 min"
        bullets={[
          "Everything in the build guide",
          "Live 30-minute setup call",
          "I walk you through deployment",
          "Personal stack review + first agent",
        ]}
        cta="Book the call"
        href={LINKS.bundle}
        delay={0.1}
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
        delay={0.15}
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
  accent, eyebrow, title, price, priceNote, bullets, cta, href, featured, delay = 0,
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
  delay?: number;
}) {
  const c = ACCENT[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col rounded-xl border bg-black/55 p-5 backdrop-blur-md transition-all duration-200 ${c.border} ${c.ring} ${featured ? c.glow : ""}`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-violet-300/80 bg-violet-500/30 px-3 py-0.5 font-mono text-[9px] uppercase tracking-widest text-violet-100 shadow-[0_0_18px_rgba(167,139,250,0.55)]">
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

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-auto inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 ${c.btn}`}
      >
        {cta}
        <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
      </a>
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
