// Tonka's Dungeon landing page — single-page brand anchor + 4-product surface.
// Visual: V5 station aesthetic (dark space, pixel/mono fonts, cyan/violet/pink/amber accents).
// All product links route directly to Gumroad / Discord — no internal cart, no storefront.
// Trevor swaps the placeholder URLs once the Gumroad listings exist.

"use client";

import { motion } from "framer-motion";

// ─── CONFIG — replace these URLs once products are created ──────────────────
const LINKS = {
  guide:      "https://trevsagents.gumroad.com/l/tonkas-dungeon-build-guide",
  bundle:     "https://trevsagents.gumroad.com/l/REPLACE-ME-bundle",       // $100 guide + 30min call
  membership: "https://trevsagents.gumroad.com/l/REPLACE-ME-inner-circle", // $34.99/mo
  discord:    "https://discord.gg/REPLACE-ME-INVITE",                       // permanent invite link
  tiktok:     "https://www.tiktok.com/@REPLACE-ME",                          // Trevor's AI account
  twitter:    "https://x.com/REPLACE-ME",                                   // rebranded X
} as const;

// ─── Top-level page ─────────────────────────────────────────────────────────
export default function Page() {
  return (
    <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-10 font-mono text-amber-100 sm:px-8 sm:py-16">
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-3 font-pixel text-[10px] uppercase tracking-[0.5em] text-pink-300/80 sm:text-xs"
      >
        ▸ Tonka's Dungeon ◂
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
        className="mb-6 font-pixel text-[20px] leading-[1.4] text-amber-100 sm:text-3xl"
      >
        I run autonomous businesses<br />
        with <span className="text-cyan-300">AI agents</span>.{" "}
        <span className="text-violet-300">Build yours.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
        className="mb-8 max-w-2xl text-sm leading-relaxed text-amber-100/75 sm:text-base"
      >
        My agents design products, edit videos, write content, and handle support — autonomously,
        while I sleep. The guides below walk you through cloning the pattern. The community is free.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
        className="flex flex-wrap items-center justify-center gap-4 text-[10px] uppercase tracking-[0.3em] text-amber-200/40 sm:text-xs"
      >
        <span>9 AGENTS</span>
        <span className="text-pink-400/60">·</span>
        <span>2 BUSINESSES</span>
        <span className="text-pink-400/60">·</span>
        <span>$24/MO STACK</span>
      </motion.div>
    </section>
  );
}

// ─── PRODUCT GRID ───────────────────────────────────────────────────────────
// Order: Guide (entry) → Inner Circle (middle, highlighted) → Bundle (high-touch) → Discord (free).
// Inner Circle sits in the visual middle since it's the middle-price product and has the
// "Most Popular" badge.
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
          "All file types covered: Codex, Claude, OpenClaw",
        ]}
        cta="Get the guide →"
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
        cta="Join Inner Circle →"
        href={LINKS.membership}
        featured
        delay={0.05}
      />

      <ProductCard
        accent="pink"
        eyebrow="With me"
        title="Guide + Setup Call"
        price="$100"
        priceNote="one-time · guide + 30 min"
        bullets={[
          "Everything in the build guide",
          "Live 30-minute setup call with Trev",
          "I walk you through deployment",
          "Personal stack review + first agent",
        ]}
        cta="Book the call →"
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
          "Discord server, no payment required",
          "Watch the build in public",
          "Daily Maverick experiment updates",
          "Talk to other builders",
        ]}
        cta="Open Discord →"
        href={LINKS.discord}
        delay={0.15}
      />
    </section>
  );
}

// ─── CARD COMPONENT ─────────────────────────────────────────────────────────
type Accent = "cyan" | "pink" | "violet" | "amber";
const ACCENT: Record<Accent, { border: string; text: string; ring: string; glow: string }> = {
  cyan:   { border: "border-cyan-300/40",   text: "text-cyan-200",   ring: "hover:border-cyan-300/80 hover:shadow-glow",        glow: "shadow-[0_0_36px_rgba(34,211,238,0.18)]"  },
  pink:   { border: "border-pink-300/40",   text: "text-pink-200",   ring: "hover:border-pink-300/80 hover:shadow-glow-pink",   glow: "shadow-[0_0_36px_rgba(244,114,182,0.18)]" },
  violet: { border: "border-violet-300/60", text: "text-violet-200", ring: "hover:border-violet-300 hover:shadow-glow-violet",  glow: "shadow-[0_0_44px_rgba(167,139,250,0.32)]" },
  amber:  { border: "border-amber-300/30",  text: "text-amber-200",  ring: "hover:border-amber-300/70",                          glow: "" },
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
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className={`group relative flex flex-col rounded-xl border bg-black/40 p-5 backdrop-blur-sm transition-all duration-200 ${c.border} ${c.ring} ${featured ? c.glow : ""}`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded border border-violet-300/80 bg-violet-500/30 px-2 py-0.5 font-pixel text-[8px] uppercase tracking-widest text-violet-100 shadow-glow-violet">
          🔥 Most Popular
        </div>
      )}

      <div className={`mb-2 text-[9px] uppercase tracking-[0.3em] ${c.text} opacity-70`}>
        {eyebrow}
      </div>

      <h3 className={`mb-4 font-pixel text-[13px] leading-tight ${c.text}`}>
        {title}
      </h3>

      <div className="mb-5">
        <div className={`text-3xl font-bold ${c.text}`}>{price}</div>
        <div className="text-[10px] uppercase tracking-wider text-amber-200/50">{priceNote}</div>
      </div>

      <ul className="mb-6 flex-1 space-y-2 text-[12px] text-amber-100/80">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-0.5 ${c.text} opacity-80`}>▸</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className={`mt-auto border-t border-current/15 pt-3 text-center text-xs font-bold tracking-wide ${c.text} transition-all group-hover:tracking-widest`}>
        {cta}
      </div>
    </motion.a>
  );
}

// ─── FOOTER ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="mt-auto flex flex-col items-center gap-4 border-t border-amber-200/10 pt-8 text-center">
      <div className="font-pixel text-[8px] uppercase tracking-[0.4em] text-amber-200/40">
        Run by Trev · Solo builder · Austin, TX
      </div>
      <div className="flex items-center gap-5 text-[11px] text-amber-200/60">
        <a href={LINKS.tiktok}  target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-cyan-300">TikTok</a>
        <span className="text-pink-400/40">·</span>
        <a href={LINKS.twitter} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-cyan-300">X / Twitter</a>
        <span className="text-pink-400/40">·</span>
        <a href={LINKS.discord} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-violet-300">Discord</a>
      </div>
      <div className="text-[10px] text-amber-200/30">© 2026 Tonka's Dungeon</div>
    </footer>
  );
}
