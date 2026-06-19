// Post-purchase claim page for Inner Circle members.
// Buyer goes here from a link in the Inner Circle product's Content tab on
// Gumroad. They type their email + Discord username; we match the email
// against our subscriber log and grant the role.
//
// Also supports a ?sale=<id> URL param (in case Trevor's Gumroad account
// supports the post-purchase redirect template variable {{purchase_id}}).
// If sale_id present, the email field is hidden — sale_id is more specific.

"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

type ClaimState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string; discord_username: string }
  | { kind: "error"; message: string };

function ClaimInner() {
  const params = useSearchParams();
  // Reject literal Gumroad template placeholders — if Gumroad didn't substitute
  // {{purchase_id}} for any reason, the URL has `?sale={{purchase_id}}` (literal).
  // Treat that as "no sale_id" so the email field stays visible and the buyer
  // can complete the claim with their email instead of hitting a 404.
  const rawSale = params.get("sale") || "";
  const looksLikeTemplate = /\{\{|\}\}|^purchase_id$/i.test(rawSale);
  const saleId = looksLikeTemplate ? "" : rawSale;
  const [email,           setEmail]           = useState("");
  const [discordUsername, setDiscordUsername] = useState("");
  const [state, setState] = useState<ClaimState>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!discordUsername.trim()) {
      setState({ kind: "error", message: "Type your Discord username first." });
      return;
    }
    // If we don't have a usable sale_id, require email
    if (!saleId && !email.trim()) {
      setState({ kind: "error", message: "Enter the email you used at Gumroad checkout." });
      return;
    }
    setState({ kind: "submitting" });
    try {
      // Always send email if the buyer typed one — backend uses it as fallback
      // when sale_id lookup misses (stale links, mid-flight migrations, etc).
      const body: Record<string, string> = { discord_username: discordUsername.trim() };
      if (saleId)         body.sale_id = saleId;
      if (email.trim())   body.email   = email.trim();

      // Same-origin proxy → VPS (avoids HTTPS-to-HTTP mixed-content block)
      const r = await fetch("/api/claim", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) {
        setState({ kind: "error", message: j.message || j.error || "Couldn't claim — try again." });
      } else {
        setState({
          kind: "success",
          message: j.message || "You're in. Open Discord to see your role.",
          discord_username: j.discord_username || discordUsername.trim(),
        });
      }
    } catch (err) {
      setState({ kind: "error", message: `Network error: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-12 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full rounded-2xl border border-violet-400/30 bg-gradient-to-b from-violet-500/[0.08] to-black/60 p-7 backdrop-blur-md shadow-[0_0_50px_rgba(167,139,250,0.25)]"
      >
        <div className="mb-1 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-violet-300/70">
          Inner Circle
        </div>
        <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          One step left — unlock your role
        </h1>

        {state.kind === "success" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/[0.06] p-4 text-center">
              <div className="mb-2 text-2xl">✓</div>
              <p className="text-sm leading-relaxed text-emerald-100">
                Linked <span className="font-semibold text-white">{state.discord_username}</span> to your subscription.
              </p>
              <p className="mt-2 text-xs text-white/70">{state.message}</p>
            </div>
            <a
              href="https://discord.gg/5BfG5Wuwfr"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg border border-violet-300/60 bg-violet-400/20 px-4 py-3 text-center text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-400/35"
            >
              Open Discord →
            </a>
            <p className="text-center text-[11px] text-white/40">
              If your role doesn&apos;t appear within a minute, double-check your username matches your Discord profile exactly (case-sensitive, no #).
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {!saleId && (
              <div>
                <label htmlFor="email" className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-white/60">
                  Email you used at Gumroad checkout
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={state.kind === "submitting"}
                  className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400/30 disabled:opacity-50"
                />
              </div>
            )}

            <div>
              <label htmlFor="discord" className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-white/60">
                Your Discord username
              </label>
              <input
                id="discord"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="trevortaylor29"
                value={discordUsername}
                onChange={(e) => setDiscordUsername(e.target.value)}
                disabled={state.kind === "submitting"}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400/30 disabled:opacity-50"
              />
              <p className="mt-1.5 text-[11px] text-white/40">
                Your full Discord handle — no <span className="font-mono">@</span>, no <span className="font-mono">#</span>. Find it in Discord → Settings → My Account.
              </p>
            </div>

            {state.kind === "error" && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/[0.06] p-3 text-sm text-red-200">
                {state.message}
              </div>
            )}

            <button
              type="submit"
              disabled={state.kind === "submitting"}
              className="w-full rounded-lg border border-violet-300/60 bg-violet-400/20 px-4 py-3 text-sm font-semibold text-violet-100 transition-colors hover:bg-violet-400/35 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {state.kind === "submitting" ? "Linking…" : "Unlock Inner Circle"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[10px] text-white/30">
          Need help? Ping Trevor in the free Discord:{" "}
          <a href="https://discord.gg/5BfG5Wuwfr" className="underline hover:text-white/60">join here</a>
        </p>
      </motion.div>
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={null}>
      <ClaimInner />
    </Suspense>
  );
}
