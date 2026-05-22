// Trevs Agents landing page — built to Linear's DESIGN.md spec.
// See /DESIGN.md at the project root for the full design system reference.
//
// Linear's "near-black canvas + single chromatic accent + software-craft documentation"
// aesthetic — but with our brand gradient (violet → pink → cyan) substituted in for
// Linear's lavender. Surfaces and hairlines are verbatim from the spec.

"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const LINKS = {
  guide:      "https://trevsagents.gumroad.com/l/tonkas-dungeon-build-guide",
  bundle:     "https://trevsagents.gumroad.com/l/REPLACE-ME-bundle",
  membership: "https://trevsagents.gumroad.com/l/REPLACE-ME-inner-circle",
  discord:    "https://discord.gg/REPLACE-ME-INVITE",
  tiktok:     "https://www.tiktok.com/@REPLACE-ME",
  twitter:    "https://x.com/REPLACE-ME",
} as const;

export default function Page() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-[1120px] flex-col px-5 py-12 sm:px-8 sm:py-20">
      <Hero />
      <ProductGrid />
      <Footer />
    </main>
  );
}

// ─── HERO ───────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative mx-auto mb-20 flex max-w-[760px] flex-col items-center text-center sm:mb-28">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-7"
      >
        {/* Soft brand-color halo behind logo, slow breathe */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
          animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(circle, rgba(196,141,253,0.45) 0%, rgba(244,114,182,0.28) 40%, transparent 70%)",
          }}
        />
        <Image
          src="/logo.png"
          alt="Trevs Agents"
          width={514}
          height={320}
          priority
          className="relative h-auto w-[140px] sm:w-[180px] md:w-[220px]"
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.55, ease: "easeOut" }}
        className="t-display-lg mb-5 text-[color:var(--ink)]"
      >
        Run an autonomous business
        <br />
        <span className="bg-gradient-to-r from-pink-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
          with AI agents.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.55, ease: "easeOut" }}
        className="t-body-lg mb-9 max-w-[620px] text-[color:var(--ink-muted)]"
      >
        The build guide gives you a proven model and the agent stack to run it —
        whether you already have a business or you&apos;re starting from scratch.
        Etsy, Fiverr, SaaS, YouTube, or your own idea. Drop the guide into your LLM
        and walk out with a working operation that runs while you sleep.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.45, ease: "easeOut" }}
        className="flex flex-wrap items-center justify-center gap-3 t-eyebrow text-[color:var(--ink-tertiary)]"
      >
        <span>Proven models</span>
        <span className="text-[color:var(--hairline-strong)]">·</span>
        <span>Works at any level</span>
        <span className="text-[color:var(--hairline-strong)]">·</span>
        <span>Bring your own LLM</span>
      </motion.div>
    </section>
  );
}

// ─── PRODUCT GRID ───────────────────────────────────────────────────────────
function ProductGrid() {
  return (
    <section className="mb-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ProductCard
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

// ─── CARD ───────────────────────────────────────────────────────────────────
// Per Linear DESIGN.md `pricing-card` + `pricing-card-featured`:
//   surface-1 (#0f1011) for default, surface-2 (#141516) for featured
//   rounded.lg = 12px, padding = 24px
//   Hairline border throughout. Featured gets the brand-gradient ring.
function ProductCard({
  eyebrow, title, price, priceNote, bullets, cta, href, featured, delay = 0,
}: {
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      className={`relative flex flex-col rounded-[12px] border p-6 transition-colors duration-200 ${
        featured
          ? "border-[color:var(--hairline-strong)] bg-[color:var(--surface-2)]"
          : "border-[color:var(--hairline)] bg-[color:var(--surface-1)] hover:border-[color:var(--hairline-strong)]"
      }`}
      style={
        featured
          ? {
              boxShadow:
                "0 0 0 1px rgba(196,141,253,0.18), 0 12px 40px -12px rgba(196,141,253,0.25)",
            }
          : undefined
      }
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full border border-[color:var(--hairline-strong)] bg-[color:var(--surface-3)] px-3 py-[3px] font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--brand-violet)]">
            Most Popular
          </span>
        </div>
      )}

      <div className="t-eyebrow mb-3 text-[color:var(--ink-tertiary)]">{eyebrow}</div>

      <h3 className="t-card-title mb-5 text-[color:var(--ink)]">{title}</h3>

      <div className="mb-6 flex items-baseline gap-2">
        <span className="text-[32px] font-semibold leading-none tracking-tight text-[color:var(--ink)]">{price}</span>
        <span className="t-caption text-[color:var(--ink-subtle)]">{priceNote}</span>
      </div>

      <ul className="mb-7 flex-1 space-y-2.5">
        {bullets.map((b, i) => (
          <li key={i} className="t-body-sm flex items-start gap-2.5 text-[color:var(--ink-muted)]">
            <span className="mt-[7px] inline-block size-1 shrink-0 rounded-full bg-[color:var(--ink-subtle)]" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* Button — Linear's button-primary spec: rounded.md (8px), padding 8px 14px,
          accent fill for featured, surface-3 for non-featured. */}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-auto inline-flex items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 t-button transition-all duration-200 ${
          featured
            ? "border border-transparent bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-[0_2px_12px_-2px_rgba(196,141,253,0.45)] hover:shadow-[0_2px_18px_-2px_rgba(196,141,253,0.7)]"
            : "border border-[color:var(--hairline-strong)] bg-[color:var(--surface-2)] text-[color:var(--ink)] hover:border-[color:var(--ink-subtle)] hover:bg-[color:var(--surface-3)]"
        }`}
      >
        <span>{cta}</span>
        <span aria-hidden="true">→</span>
      </a>
    </motion.div>
  );
}

// ─── FOOTER ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-3 border-t border-[color:var(--hairline)] pt-8 text-center">
      <div className="flex items-center gap-4 t-body-sm text-[color:var(--ink-subtle)]">
        <a href={LINKS.tiktok}  target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[color:var(--ink)]">TikTok</a>
        <span className="text-[color:var(--hairline-strong)]">·</span>
        <a href={LINKS.twitter} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[color:var(--ink)]">X</a>
        <span className="text-[color:var(--hairline-strong)]">·</span>
        <a href={LINKS.discord} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[color:var(--ink)]">Discord</a>
      </div>
      <div className="t-caption text-[color:var(--ink-tertiary)]">© 2026 Trevs Agents</div>
    </footer>
  );
}
