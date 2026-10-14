"use client";

// Trevs Agents Builder — /builder
// Guided agent builder for Inner Circle members. See BUILDER_SPEC.md.
// Accounts persist SERVER-side (VPS via /api/builder proxy) so members get the
// same account + fuel key on any device. localStorage is only a cache/offline
// fallback. Real payments/DB backend swaps in later without changing this flow.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, supabaseReady } from "@/lib/supabase";
import {
  AGENT_TEMPLATES,
  DASHBOARD_THEMES,
  SETUP_STEPS,
  buildAgentInstruction,
  buildCustomAgentInstruction,
  buildDashboardInstruction,
  buildSetupInstruction,
  copilotAnswer,
  generateFuelKey,
  type AgentTemplate,
  type CustomAgentSpec,
  type BuildMode,
  type Runtime,
  type SetupStage,
} from "@/components/builder/templates";

// ─── account layer ───────────────────────────────────────────────────────────
type BuildRecord = {
  ts: string;
  kind: "agent" | "dashboard";
  id: string;
  name: string;
  instruction: string;
};
type SetupState = { runtime: Runtime | null; done: string[] }; // done ⊆ ["claude","orient","backbone"]
type Account = {
  name: string;
  email: string;
  fuelKey: string;
  path: BuildMode;
  onboarded: boolean;
  builds: BuildRecord[];
  setup: SetupState;
  offline?: boolean; // created without server reach — resyncs when possible
};
const LS_KEY = "ta_builder_account";
const IC_CODE_FALLBACK = "TONKA2026"; // offline-only fallback; the server is the real gate

function loadCached(): Account | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Partial<Account>;
    // Harden against stale/partial caches from an older app version: a missing field
    // would crash the render (white screen). If the essentials are gone, fall back to
    // the sign-in gate; otherwise coerce every field to a safe default.
    if (!a || typeof a.email !== "string" || typeof a.fuelKey !== "string") return null;
    return {
      name: a.name || a.email.split("@")[0],
      email: a.email,
      fuelKey: a.fuelKey,
      path: a.path === "existing" ? "existing" : "fresh",
      onboarded: !!a.onboarded,
      builds: Array.isArray(a.builds) ? a.builds : [],
      setup:
        a.setup && typeof a.setup === "object"
          ? { runtime: a.setup.runtime ?? null, done: Array.isArray(a.setup.done) ? a.setup.done : [] }
          : { runtime: null, done: [] },
      offline: a.offline,
    };
  } catch {
    return null;
  }
}
function cache(a: Account) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(a));
  } catch {}
}
type ServerAccount = {
  name: string;
  email: string;
  fuel_key: string;
  path: BuildMode;
  onboarded: boolean;
  builds?: Array<Partial<BuildRecord>>;
  setup?: { runtime?: Runtime | null; done?: string[] };
};
function fromServer(s: ServerAccount): Account {
  return {
    name: s.name,
    email: s.email,
    fuelKey: s.fuel_key,
    path: s.path === "existing" ? "existing" : "fresh",
    onboarded: !!s.onboarded,
    builds: (s.builds || []).map((b) => ({
      ts: b.ts || "",
      kind: b.kind === "dashboard" ? "dashboard" : "agent",
      id: b.id || "",
      name: b.name || "",
      instruction: b.instruction || "",
    })),
    setup: {
      runtime: s.setup?.runtime === "vps" || s.setup?.runtime === "local" ? s.setup.runtime : null,
      done: Array.isArray(s.setup?.done) ? s.setup!.done! : [],
    },
  };
}
async function api(action: "register" | "sync" | "reset" | "copilot" | "custom-agent" | "skills", body: Record<string, unknown>) {
  const r = await fetch("/api/builder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const j = await r.json().catch(() => null);
  return {
    status: r.status,
    json: j as {
      ok?: boolean;
      error?: string;
      message?: string;
      account_safe?: boolean;
      answer?: string;
      account?: ServerAccount;
      spec?: CustomAgentSpec;
    } | null,
  };
}

// Small labeled value with a one-tap copy button — used in the fuel-connect walkthrough.
function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5">
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
        <div className={`truncate text-[11px] text-cyan-200 ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
      <button
        onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); } catch {} }}
        className="shrink-0 rounded border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-100 transition-all hover:bg-cyan-400/20 active:scale-95"
      >
        {done ? "✓" : "Copy"}
      </button>
    </div>
  );
}

// ─── shared styling ──────────────────────────────────────────────────────────
// Every class is a COMPLETE static string (incl. hover variants) — Tailwind
// scans source literally and can't generate classes assembled at runtime.
const ACCENTS: Record<
  string,
  { border: string; hoverBorder: string; chip: string; hoverGlow: string; text: string }
> = {
  emerald: {
    border: "border-emerald-300/25",
    hoverBorder: "hover:border-emerald-300/70",
    chip: "border-emerald-300/40 bg-emerald-400/10 text-emerald-200",
    hoverGlow: "hover:shadow-[0_0_0_1.5px_rgba(52,211,153,0.45)]",
    text: "text-emerald-300",
  },
  violet: {
    border: "border-violet-300/25",
    hoverBorder: "hover:border-violet-300/70",
    chip: "border-violet-300/40 bg-violet-400/10 text-violet-200",
    hoverGlow: "hover:shadow-[0_0_0_1.5px_rgba(196,181,253,0.45)]",
    text: "text-violet-300",
  },
  pink: {
    border: "border-pink-300/25",
    hoverBorder: "hover:border-pink-300/70",
    chip: "border-pink-300/40 bg-pink-400/10 text-pink-200",
    hoverGlow: "hover:shadow-[0_0_0_1.5px_rgba(249,168,212,0.45)]",
    text: "text-pink-300",
  },
  cyan: {
    border: "border-cyan-300/25",
    hoverBorder: "hover:border-cyan-300/70",
    chip: "border-cyan-300/40 bg-cyan-400/10 text-cyan-200",
    hoverGlow: "hover:shadow-[0_0_0_1.5px_rgba(103,232,249,0.45)]",
    text: "text-cyan-300",
  },
  amber: {
    border: "border-amber-300/25",
    hoverBorder: "hover:border-amber-300/70",
    chip: "border-amber-300/40 bg-amber-400/10 text-amber-200",
    hoverGlow: "hover:shadow-[0_0_0_1.5px_rgba(252,211,77,0.45)]",
    text: "text-amber-300",
  },
  sky: {
    border: "border-sky-300/25",
    hoverBorder: "hover:border-sky-300/70",
    chip: "border-sky-300/40 bg-sky-400/10 text-sky-200",
    hoverGlow: "hover:shadow-[0_0_0_1.5px_rgba(125,211,252,0.45)]",
    text: "text-sky-300",
  },
};

function SpriteTile({ t, size = 72 }: { t: AgentTemplate; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
      style={{ width: size, height: size }}
    >
      {t.sprite && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={t.sprite}
          alt={t.name}
          width={size - 12}
          height={size - 12}
          style={{ imageRendering: "pixelated" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span style={{ fontSize: size * 0.5 }}>{t.emoji}</span>
      )}
    </div>
  );
}

function GradientTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`animate-gradient-text ${className}`}>{children}</span>;
}

// ─── page ────────────────────────────────────────────────────────────────────
type Tab = "home" | "build" | "dashboards" | "armory" | "fuel" | "copilot";
type BuildView =
  | { kind: "gallery" }
  | { kind: "foundation" }
  | { kind: "configure"; template: AgentTemplate }
  | { kind: "custom" }
  | { kind: "output"; title: string; sub: string; instruction: string };
type DashView =
  | { kind: "gallery" }
  | { kind: "output"; title: string; sub: string; instruction: string };

export default function BuilderPage() {
  const [hydrated, setHydrated] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lapsed, setLapsed] = useState(false); // active IC sub ended — locked out, but account/fuel preserved
  const [tab, setTab] = useState<Tab>("home");
  const [buildView, setBuildView] = useState<BuildView>({ kind: "gallery" });
  const [dashView, setDashView] = useState<DashView>({ kind: "gallery" });
  const [fuelNotice, setFuelNotice] = useState<null | "success" | "cancelled">(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Stripe fuel checkout bounces back to ?fuel=success or ?fuel=cancelled. Without handling it,
  // a member who abandons checkout lands on a scary "cancelled" URL with no explanation (and a
  // member who PAID gets no confirmation at all). Show a clear banner, then clean the URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search).get("fuel");
    if (p === "success" || p === "cancelled") {
      setFuelNotice(p);
      setTab("fuel");
      const url = new URL(window.location.href);
      url.searchParams.delete("fuel");
      window.history.replaceState({}, "", url.pathname + url.search);
      if (p === "success") setTimeout(() => setFuelNotice(null), 8000);
    }
  }, []);

  // After a member clicks their magic link (or has a persisted Supabase session), exchange
  // the VERIFIED session token for their builder account. The token proves they control the
  // inbox — that's what replaces the old shared access code.
  const signInWithSession = async (accessToken: string, email: string) => {
    const pendingName =
      (typeof localStorage !== "undefined" && localStorage.getItem("builder-pending-name")) || "";
    const { status, json } = await api("register", {
      supabase_token: accessToken,
      email,
      name: pendingName || email.split("@")[0],
    });
    if (json?.ok && json.account) {
      try { localStorage.removeItem("builder-pending-name"); } catch {}
      const a = fromServer(json.account);
      cache(a);
      setAccount(a);
      setAuthError(null);
      return;
    }
    // Verified email, but not an active member (or another rejection) — sign them back out.
    try { await supabase.auth.signOut(); } catch {}
    setAuthError(
      json?.message ||
        (status === 403
          ? "That email isn't an active Inner Circle member. Use the email you bought Inner Circle with on Gumroad."
          : "Couldn't sign you in. Try again in a minute.")
    );
  };

  // Persist a change: cache locally immediately, push to the server best-effort.
  const persist = (next: Account) => {
    cache(next);
    setAccount(next);
    api("sync", {
      email: next.email,
      fuel_key: next.fuelKey,
      data: { path: next.path, onboarded: next.onboarded, builds: next.builds, setup: next.setup },
    })
      .then(({ status, json }) => {
        if (status === 403 && (json?.error === "NOT_ACTIVE_SUB" || json?.account_safe)) setLapsed(true);
      })
      .catch(() => {});
  };

  // Start over: full wipe back to a blank slate. Account, membership, and fuel stay;
  // setup progress + built agents are cleared server-side (with a recoverable backup).
  const doStartOver = async () => {
    if (!account) return;
    setResetting(true);
    try { await api("reset", { email: account.email, fuel_key: account.fuelKey }); } catch {}
    const fresh: Account = { ...account, path: "fresh", onboarded: false, builds: [], setup: { runtime: null, done: [] } };
    cache(fresh);
    setAccount(fresh);
    setTab("home");
    setBuildView({ kind: "gallery" });
    setDashView({ kind: "gallery" });
    setResetting(false);
    setConfirmReset(false);
  };

  useEffect(() => {
    const cached = loadCached();
    setAccount(cached);
    setHydrated(true);

    // Magic-link auth: if there's a verified Supabase session (just clicked the link, or
    // persisted) and we don't already have an account cached, exchange it for the account.
    if (supabaseReady && !cached) {
      supabase.auth.getSession().then(({ data }) => {
        const s = data.session;
        if (s?.access_token && s.user?.email) signInWithSession(s.access_token, s.user.email);
      });
      supabase.auth.onAuthStateChange((_e, s) => {
        if (s?.access_token && s.user?.email && !loadCached()) {
          signInWithSession(s.access_token, s.user.email);
        }
      });
    }

    // Background refresh: pull the latest server copy (cross-device changes).
    if (cached && !cached.offline) {
      api("sync", { email: cached.email, fuel_key: cached.fuelKey })
        .then(({ status, json }) => {
          if (json?.ok && json.account) {
            const fresh = fromServer(json.account);
            // Keep local-only progress if the server copy is behind
            const merged: Account = {
              ...fresh,
              onboarded: fresh.onboarded || cached.onboarded,
              path: cached.onboarded ? cached.path : fresh.path,
              builds: fresh.builds.length >= cached.builds.length ? fresh.builds : cached.builds,
              // keep whichever setup progressed further (more completed steps)
              setup: (cached.setup?.done.length ?? 0) > fresh.setup.done.length ? cached.setup : fresh.setup,
            };
            cache(merged);
            setAccount(merged);
          } else if (status === 403 && (json?.error === "NOT_ACTIVE_SUB" || json?.account_safe)) {
            // Membership lapsed — DON'T wipe anything. Keep the account cached so resubscribing
            // restores everything (agents, fuel, setup) instantly. Just show the locked screen.
            setLapsed(true);
          } else if (status === 403) {
            // Server doesn't know this account (reset/moved) — sign out cleanly.
            try {
              localStorage.removeItem(LS_KEY);
            } catch {}
            setAccount(null);
          }
        })
        .catch(() => {});
    }
  }, []);

  if (!hydrated) return <div className="min-h-[100dvh]" />;

  if (!account) {
    return <Gate authError={authError} />;
  }

  if (lapsed) {
    return (
      <Lapsed
        account={account}
        onRecheck={async () => {
          const { status, json } = await api("sync", { email: account.email, fuel_key: account.fuelKey });
          if (json?.ok && json.account) {
            const fresh = fromServer(json.account);
            cache(fresh);
            setAccount(fresh);
            setLapsed(false);
            return true;
          }
          // still lapsed (or unknown) — stay on the locked screen
          if (status === 403 && !(json?.error === "NOT_ACTIVE_SUB" || json?.account_safe)) {
            try { localStorage.removeItem(LS_KEY); } catch {}
            setAccount(null);
            setLapsed(false);
          }
          return false;
        }}
      />
    );
  }

  if (!account.onboarded) {
    return (
      <Onboarding
        account={account}
        onDone={(path) => {
          // Route straight into "Set up your foundation" — new users were landing on the
          // home dashboard and missing the setup step (clicking off to Agents instead).
          persist({ ...account, path, onboarded: true });
          setTab("build");
          setBuildView({ kind: "foundation" });
        }}
      />
    );
  }

  const recordBuild = (rec: BuildRecord) =>
    persist({ ...account, builds: [...account.builds, rec].slice(-25) });

  // Mark a setup step complete (and optionally lock in the runtime choice), persisted to the account.
  const markSetup = (step: string, runtime?: Runtime) =>
    persist({
      ...account,
      setup: {
        runtime: runtime ?? account.setup.runtime,
        done: account.setup.done.includes(step) ? account.setup.done : [...account.setup.done, step],
      },
    });

  const go = (t: Tab) => {
    setTab(t);
    if (t === "build") setBuildView({ kind: "gallery" });
    if (t === "dashboards") setDashView({ kind: "gallery" });
  };
  const openSetup = () => {
    setTab("build");
    setBuildView({ kind: "foundation" });
  };

  return (
    <div className="min-h-[100dvh] w-full lg:flex">
      <Sidebar
        tab={tab}
        onTab={go}
        account={account}
        onStartOver={() => setConfirmReset(true)}
        onSignOut={() => {
          try {
            localStorage.removeItem(LS_KEY);
          } catch {}
          setAccount(null);
        }}
      />
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => !resetting && setConfirmReset(false)}>
          <div className="w-full max-w-md rounded-2xl border border-white/12 bg-[#0c0d13] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-bold text-white">Start over?</div>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              This clears your setup progress and everything you&apos;ve built — agents and dashboards — so you begin from a blank slate. Your account, membership, and fuel stay exactly as they are.
            </p>
            <p className="mt-2 text-[13px] text-white/40">This can&apos;t be undone from here.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                className="rounded-lg border border-white/12 px-4 py-2 text-sm text-white/60 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={doStartOver}
                disabled={resetting}
                className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-500/25 disabled:opacity-50"
              >
                {resetting ? "Starting over…" : "Yes, start over"}
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="min-w-0 flex-1 px-5 pb-24 pt-6 sm:px-8 lg:px-12 lg:pt-10">
        <div className="mx-auto max-w-6xl">
          {fuelNotice && (
            <div
              className={`mb-6 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                fuelNotice === "success"
                  ? "border-emerald-300/40 bg-emerald-500/[0.10] text-emerald-100"
                  : "border-white/12 bg-white/[0.04] text-white/70"
              }`}
            >
              <span>
                {fuelNotice === "success"
                  ? "✅ Fuel added — your balance is updated below. Your agents can use it right away."
                  : "No charge was made. Fuel has been retired — agents now run on your own API key or subscription."}
              </span>
              <button onClick={() => setFuelNotice(null)} className="shrink-0 text-white/40 hover:text-white" aria-label="Dismiss">✕</button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab + buildView.kind + dashView.kind}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "home" && <HomeTab account={account} go={go} openSetup={openSetup} />}
              {tab === "build" && (
                <BuildTab account={account} view={buildView} setView={setBuildView} onBuilt={recordBuild} markSetup={markSetup} go={go} />
              )}
              {tab === "dashboards" && (
                <DashboardsTab account={account} view={dashView} setView={setDashView} onBuilt={recordBuild} />
              )}
              {tab === "armory" && <ArmoryTab account={account} />}
              {tab === "fuel" && <FuelTab account={account} />}
              {tab === "copilot" && <CopilotTab account={account} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Persistent copilot access — always one tap away, from any tab. */}
      {tab !== "copilot" && (
        <button
          onClick={() => go("copilot")}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/25 px-4 py-3 text-sm font-semibold text-violet-50 shadow-[0_8px_30px_rgba(0,0,0,0.55)] backdrop-blur-md transition-transform hover:scale-[1.04] active:scale-[0.97]"
          title="Stuck or have a question? Ask the copilot"
        >
          <span>💬</span>
          <span className="hidden sm:inline">Stuck? Ask copilot</span>
        </button>
      )}
    </div>
  );
}

// The hub is still being built (2026-10-14): only these accounts see the link. The hub service refuses everyone else too.
const HUB_PREVIEW_EMAILS = new Set(["trevor77077@gmail.com"]);
// ─── sidebar (desktop) / top nav (mobile) — the app chrome ───────────────────
const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "build", label: "Agents", icon: "🤖" },
  { id: "dashboards", label: "Dashboards", icon: "🖥️" },
  { id: "armory", label: "Armory", icon: "🧰" },
  { id: "copilot", label: "Copilot", icon: "💬" },
  { id: "fuel", label: "Fuel (archived)", icon: "⚡" },
];

function Sidebar({
  tab,
  onTab,
  account,
  onSignOut,
  onStartOver,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  account: Account;
  onSignOut: () => void;
  onStartOver: () => void;
}) {
  return (
    <>
      {/* Desktop: fixed left rail */}
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-white/8 bg-white/[0.015] px-4 py-6 lg:flex">
        <a href="/" className="mb-8 flex items-baseline gap-2 px-2">
          <span className="text-sm font-bold tracking-[0.18em] text-white">
            TREVS<span className="text-violet-300">AGENTS</span>
          </span>
        </a>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => onTab(n.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === n.id
                  ? "border border-violet-300/30 bg-violet-400/10 text-white"
                  : "border border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/90"
              }`}
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </button>
          ))}
          {HUB_PREVIEW_EMAILS.has(account.email.toLowerCase()) && (
          <a
            href="/hub"
            className="mt-2 flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/[0.04] hover:text-white/90"
            title="Where your agents report in"
          >
            <span className="text-base">🛰️</span>
            Hub
            <span className="ml-auto rounded-md border border-violet-300/30 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-violet-200">PREVIEW</span>
          </a>
          )}
        </nav>
        <div className="mt-4 rounded-xl border border-white/8 bg-black/30 p-3">
          <div className="truncate text-xs font-medium text-white/70" title={account.email}>
            {account.name}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={onSignOut}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-white/55 transition-colors hover:border-white/25 hover:text-white"
            >
              Sign out
            </button>
            <button
              onClick={onStartOver}
              title="Clear everything and start from a blank slate"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-white/45 transition-colors hover:border-rose-400/30 hover:text-rose-200"
            >
              Start over
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile: sticky top bar + scrollable pill nav */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07080d]/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between">
          <a href="/" className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tracking-[0.16em] text-white">
              TREVS<span className="text-violet-300">AGENTS</span>
            </span>
          </a>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onStartOver}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/50"
            >
              Start over
            </button>
            <button
              onClick={onSignOut}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/60"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => onTab(n.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                tab === n.id
                  ? "border border-violet-300/40 bg-violet-400/15 text-white"
                  : "border border-white/10 text-white/50"
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
          {HUB_PREVIEW_EMAILS.has(account.email.toLowerCase()) && (
          <a href="/hub" className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet-300/30 bg-violet-400/[0.08] px-3.5 py-1.5 text-xs font-medium text-violet-100">
            <span>🛰️</span>
            Hub
          </a>
          )}
        </nav>
      </header>
    </>
  );
}

// ─── HOME (app landing / overview) ───────────────────────────────────────────
function HomeTab({
  account,
  go,
  openSetup,
}: {
  account: Account;
  go: (t: Tab) => void;
  openSetup: () => void;
}) {
  const isNew = account.path === "fresh";
  const setupComplete = !isNew || account.setup.done.includes("backbone");
  const setupProgress = account.setup.done.filter((s) => ["claude", "orient", "backbone"].includes(s)).length;
  const agentCount = account.builds.filter((b) => b.kind === "agent").length;
  const dashCount = account.builds.filter((b) => b.kind === "dashboard").length;

  // The tailored next step reflects their onboarding choice + how far they've gotten in setup.
  const primary = !setupComplete
    ? {
        title: setupProgress === 0 ? "Set up your foundation" : "Continue your setup",
        desc:
          setupProgress === 0
            ? "You're brand new — first we get your machine ready so agents can actually run. A short guided setup; your Claude Code does the work while we walk it through each step."
            : `You're ${setupProgress} of ${SETUP_STEPS.length} steps in. Pick up where you left off and finish the foundation — then agents unlock.`,
        cta: setupProgress === 0 ? "Start setup →" : "Continue →",
        action: openSetup,
        glow: true,
      }
    : { title: "Add an agent", desc: "Browse the crew and drop a proven agent into your ecosystem in one paste.", cta: "Browse agents →", action: () => go("build"), glow: false };

  return (
    <div>
      <div className="mb-8">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
          {isNew ? "New builder" : "Your ecosystem"}
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Welcome back, <GradientTitle>{account.name.split(" ")[0]}.</GradientTitle>
        </h1>
      </div>

      {/* What the membership keeps switched on, and what pauses when it ends. Stated up front so nobody is surprised. */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="text-sm font-bold text-white">Your membership keeps these on</div>
          <div className="text-[11px] text-white/40">Inner Circle · active</div>
        </div>
        <ul className="mt-3 grid gap-2 text-[13px] text-white/65 sm:grid-cols-2">
          <li className="flex gap-2"><span className="text-emerald-300">●</span><span><b className="text-white/90">The builder and the copilot.</b> New agents, dashboards, setup help.</span></li>
          <li className="flex gap-2"><span className="text-emerald-300">●</span><span><b className="text-white/90">The Discord.</b> Your Inner Circle role and the channels.</span></li>
          {HUB_PREVIEW_EMAILS.has(account.email.toLowerCase()) && (
            <li className="flex gap-2 sm:col-span-2"><span className="text-emerald-300">●</span><span><b className="text-white/90">The Trevs tools inside your Claude Code.</b> Video research, problem finds, vetted ideas, the agent library, ask-before-acting approvals and run reporting. One command connects them:</span></li>
          )}
        </ul>
        {HUB_PREVIEW_EMAILS.has(account.email.toLowerCase()) && (
          <pre className="mt-3 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[11.5px] leading-relaxed text-white/75">{`claude mcp add --transport http trevs https://mcp.trevsagents.com --header "Authorization: Bearer ${account.fuelKey}"`}</pre>
        )}
        <p className="mt-3 text-[12px] leading-relaxed text-white/45">
          When the membership ends, all of this pauses: the builder locks, the copilot stops answering, the tools stop answering inside Claude Code, and the Discord role is removed. Nothing is deleted. Resubscribe and it all comes back exactly as you left it. The agents you already built keep running on your own machine either way.
        </p>
      </div>

      {/* "Ok, what now?" — setup just finished and there are no agents yet: lay out the 2 moves. */}
      {setupComplete && agentCount === 0 ? (
        <div className="mb-6 rounded-2xl border border-emerald-300/35 bg-gradient-to-r from-emerald-500/[0.10] to-cyan-500/[0.06] p-6 shadow-[0_0_60px_-18px_rgba(52,211,153,0.5)]">
          <div className="text-lg font-bold text-white">🎉 Your foundation is ready.</div>
          <p className="mt-1 text-sm leading-relaxed text-white/60">
            The runtime, task queue, and fuel are all wired up. Two moves and you&apos;ll have a real agent
            running — with a dashboard to watch it. Do them in order:
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => go("build")}
              className="rounded-xl border border-violet-300/40 bg-violet-400/[0.08] p-4 text-left transition-all hover:border-violet-300/70 active:scale-[0.99]"
            >
              <div className="text-sm font-bold text-white">1 · Add your first agent →</div>
              <p className="mt-1 text-[12px] leading-relaxed text-white/55">
                Pick a proven agent, paste it into Claude Code, and it starts running on your fuel.
              </p>
            </button>
            <button
              onClick={() => go("dashboards")}
              className="rounded-xl border border-emerald-300/40 bg-emerald-400/[0.08] p-4 text-left transition-all hover:border-emerald-300/70 active:scale-[0.99]"
            >
              <div className="text-sm font-bold text-white">2 · Get your dashboard →</div>
              <p className="mt-1 text-[12px] leading-relaxed text-white/55">
                The Command Deck — clean charts + agent status, built in one shot. No art, no game.
              </p>
            </button>
          </div>
          <p className="mt-3 text-[11px] text-white/40">
            After this, day-to-day changes just happen in your Claude Code — you only come back here to add
            more agents or dashboards.
          </p>
        </div>
      ) : (
        <button
          onClick={primary.action}
          className={`group mb-6 flex w-full items-center gap-4 rounded-2xl border p-6 text-left transition-all active:scale-[0.995] ${
            primary.glow
              ? "border-violet-300/50 bg-gradient-to-r from-violet-500/[0.12] to-cyan-500/[0.08] shadow-[0_0_60px_-16px_rgba(196,181,253,0.6)] hover:border-violet-300/80"
              : "border-white/10 bg-white/[0.03] hover:border-white/25"
          }`}
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-violet-300/30 bg-violet-400/10 text-3xl">
            {!setupComplete ? "🏗️" : "🤖"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-white">{primary.title}</div>
            <p className="mt-1 text-sm leading-relaxed text-white/55">{primary.desc}</p>
          </div>
          <span className="hidden shrink-0 text-sm font-semibold text-violet-200 sm:block">{primary.cta}</span>
        </button>
      )}

      {/* Stat row */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Setup", value: setupComplete ? "Done" : `${setupProgress}/${SETUP_STEPS.length}`, icon: "🏗️" },
          { label: "Agents built", value: `${agentCount}`, icon: "🤖" },
          { label: "Dashboards", value: `${dashCount}`, icon: "🖥️" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-2xl">{s.icon}</div>
            <div className="mt-2 text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-white/45">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: "🤖", t: "Shop for agents", d: "Add to your crew", go: () => go("build") },
          { icon: "💬", t: "Ask the copilot", d: "Stuck? Get answers", go: () => go("copilot") },
          { icon: "🖥️", t: "Get a dashboard", d: "Watch your agents", go: () => go("dashboards") },
        ].map((q) => (
          <button
            key={q.t}
            onClick={q.go}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all hover:border-white/25 hover:bg-white/[0.05] active:scale-[0.99]"
          >
            <div className="text-2xl">{q.icon}</div>
            <div className="mt-2 text-sm font-bold text-white">{q.t}</div>
            <div className="text-xs text-white/45">{q.d}</div>
          </button>
        ))}
      </div>

      {account.builds.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/40">Recent activity</h2>
          <div className="flex flex-wrap gap-2">
            {[...account.builds].reverse().slice(0, 8).map((b, i) => (
              <span
                key={`${b.ts}-${i}`}
                className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs text-white/65"
              >
                {b.kind === "dashboard" ? "🖥️" : b.id === "foundation" ? "🏗️" : "🤖"} {b.name}
                <span className="ml-1.5 text-white/30">{new Date(b.ts).toLocaleDateString()}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── gate (create account / sign in — same form, server decides) ─────────────
function Gate({ authError }: { authError: string | null }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Magic-link sign-in: we email a one-click login link. Clicking it proves the person
  // controls that inbox (that's what replaces the old shared access code) — then the app
  // exchanges the verified session for their account.
  const sendLink = async () => {
    if (busy) return;
    setErr(null);
    if (!name.trim()) return setErr("What should we call you?");
    if (!/.+@.+\..+/.test(email.trim())) return setErr("That email doesn't look right.");
    setBusy(true);
    try {
      try { localStorage.setItem("builder-pending-name", name.trim()); } catch {}
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/builder` },
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setErr("Couldn't send your login link. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/[0.08] px-3.5 py-1.5 text-xs font-medium text-violet-100">
            🛠️ Inner Circle · Agent Builder
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Build your <GradientTitle>agent ecosystem.</GradientTitle>
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/55">
            Pick a proven agent, answer a few questions, and your Claude Code sets it up on your
            machine, fueled and ready.
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 text-center backdrop-blur-md">
            <div className="mb-3 text-4xl">📬</div>
            <h2 className="text-lg font-bold text-white">Check your email</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/55">
              We sent a login link to{" "}
              <span className="font-semibold text-white/85">{email.trim().toLowerCase()}</span>. Click it
              and you&apos;re in — no password, no code to type.
            </p>
            <p className="mt-4 text-[11px] leading-relaxed text-white/35">
              Didn&apos;t get it? Check spam, or{" "}
              <button
                onClick={() => { setSent(false); setErr(null); }}
                className="text-violet-300 underline-offset-2 hover:underline"
              >
                try a different email
              </button>
              .
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); sendLink(); }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md"
          >
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
              Your name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Trevor"
              className="mb-4 w-full rounded-lg border border-white/12 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-violet-300/60"
            />
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              type="email"
              className="mb-1.5 w-full rounded-lg border border-white/12 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-violet-300/60"
            />
            <p className="mb-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-200/80">
              <span>⚠️</span>
              <span>
                Use the <span className="font-semibold text-amber-100">exact email you bought Inner Circle
                with on Gumroad</span>. That&apos;s how we confirm your membership.
              </span>
            </p>
            {(err || authError) && (
              <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200">
                {err || authError}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg py-3 text-sm font-bold text-[#07080d] transition-transform hover:scale-[1.015] active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
              style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#67e8f9)" }}
            >
              {busy ? "Sending your link…" : "Email me a login link →"}
            </button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-white/40">
              We&apos;ll email you a one-tap login link. New here or returning, it&apos;s the same — your
              account follows your email on any device.{" "}
              <a href="/" className="text-violet-300 underline-offset-2 hover:underline">
                Not a member yet?
              </a>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── lapsed-membership lock ──────────────────────────────────────────────────
// Shown when a member's Inner Circle sub has ended. The account is NOT deleted — this
// screen exists to reassure them nothing is lost and get them to resubscribe. On resub,
// "I've resubscribed" re-runs sync and drops them right back where they were.
function Lapsed({ account, onRecheck }: { account: Account; onRecheck: () => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const [stillOut, setStillOut] = useState(false);
  const recheck = async () => {
    if (busy) return;
    setBusy(true);
    setStillOut(false);
    const ok = await onRecheck();
    if (!ok) setStillOut(true);
    setBusy(false);
  };
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/[0.05] p-7 text-center backdrop-blur-md">
          <div className="mb-3 text-4xl">⏸️</div>
          <h1 className="text-2xl font-bold text-white">Your membership is paused</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/60">
            The builder is locked while your Inner Circle subscription isn&apos;t active,{" "}
            <span className="font-semibold text-white/85">{account.email}</span>.
          </p>

          <div className="mt-5 rounded-xl border border-emerald-300/25 bg-emerald-400/[0.06] p-4 text-left">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200/90">
              Nothing is lost
            </div>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-white/70">
              <li>✅ Your agents and setup are saved.</li>
              <li>✅ Your fuel balance is untouched — and your running agents keep using it.</li>
              <li>✅ Resubscribe and you&apos;re instantly back where you left off.</li>
            </ul>
          </div>

          <a
            href="https://trevsagents.gumroad.com/l/innercircle"
            target="_blank"
            rel="noreferrer"
            className="mt-5 block w-full rounded-lg py-3 text-sm font-bold text-[#07080d] transition-transform hover:scale-[1.015] active:scale-[0.99]"
            style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#67e8f9)" }}
          >
            Resubscribe to Inner Circle →
          </a>
          <button
            onClick={recheck}
            disabled={busy}
            className="mt-2.5 w-full rounded-lg border border-white/12 py-2.5 text-xs font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Checking…" : "I've resubscribed — let me back in"}
          </button>
          {stillOut && (
            <p className="mt-2.5 text-[11px] leading-relaxed text-amber-200/80">
              Still not seeing an active subscription. It can take a minute after you resubscribe — give
              it a moment and try again, or ask in Discord{" "}
              <span className="font-semibold text-amber-100">#⚒️ inner-circle-tools</span>.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── onboarding ──────────────────────────────────────────────────────────────
function Onboarding({ account, onDone }: { account: Account; onDone: (path: BuildMode) => void }) {
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<BuildMode | null>(null);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl py-10"
      >
        <div className="mb-6 flex items-center justify-center gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-violet-300" : i < step ? "w-4 bg-violet-300/50" : "w-4 bg-white/15"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Welcome, {account.name.split(" ")[0]}. <GradientTitle>Quick question.</GradientTitle>
            </h2>
            <p className="mt-2 text-sm text-white/50">
              Are you new to this, or do you already have an agent ecosystem running? Pick one, we&apos;ll
              tailor everything to you.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setPath("fresh")}
                className={`rounded-2xl border p-6 text-left transition-all ${
                  path === "fresh"
                    ? "border-cyan-300/70 bg-cyan-400/[0.08] shadow-[0_0_40px_-12px_rgba(103,232,249,0.4)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <div className="mb-2 text-3xl">🌱</div>
                <div className="text-base font-bold text-white">I&apos;m brand new</div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                  No agents yet. We&apos;ll start with a full foundation setup, everything from zero,
                  explained step by step.
                </p>
              </button>
              <button
                onClick={() => setPath("existing")}
                className={`rounded-2xl border p-6 text-left transition-all ${
                  path === "existing"
                    ? "border-pink-300/70 bg-pink-400/[0.08] shadow-[0_0_40px_-12px_rgba(249,168,212,0.4)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <div className="mb-2 text-3xl">🏗️</div>
                <div className="text-base font-bold text-white">I have an ecosystem</div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                  Agents already running. We&apos;ll skip setup and just add new agents into your existing
                  structure, respecting how you built it.
                </p>
              </button>
            </div>
            <button
              onClick={() => path && setStep(1)}
              disabled={!path}
              className="mt-8 rounded-lg px-8 py-3 text-sm font-bold text-[#07080d] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
              style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#67e8f9)" }}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              {path === "fresh" ? (
                <>Here&apos;s the <GradientTitle>plan for you.</GradientTitle></>
              ) : (
                <>Here&apos;s <GradientTitle>how it works.</GradientTitle></>
              )}
            </h2>
            <div className="mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-3">
              {(path === "fresh"
                ? [
                    { n: "1", icon: "🧑‍💻", t: "Get Claude Code", d: "You'll build everything by talking to Claude Code (or Codex) on your computer. If you don't have it yet, the setup walks you through installing it." },
                    { n: "2", icon: "🏗️", t: "Run the setup", d: "One paste builds your foundation — the runtime everything else plugs into. We guide your Claude Code through it, step by step." },
                    { n: "3", icon: "🤖", t: "Add agents", d: "Then pick proven agents. Each drops in with one more paste and runs on your own machine. You own it all." },
                  ]
                : [
                    { n: "1", icon: "🤖", t: "Pick an agent", d: "Proven agents from the real Trevs operation: traders, builders, analysts." },
                    { n: "2", icon: "📋", t: "Copy the instruction", d: "We generate one block, tailored to add it into YOUR existing setup without touching your other agents." },
                    { n: "3", icon: "✨", t: "Paste into Claude Code", d: "It inspects your structure, mirrors it, and sets up the new agent." },
                  ]
              ).map((s) => (
                <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
                  <div className="mb-2 text-2xl">{s.icon}</div>
                  <div className="text-sm font-bold text-white">
                    <span className="mr-1.5 text-violet-300">{s.n}.</span>
                    {s.t}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/50">{s.d}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-white/45">
              Your agents live on <span className="text-white/80">your</span> computer or server. You own
              everything. This site is just where you build and manage them.
            </p>
            {path === "existing" && (
              <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-white/40">
                Already running your agents on a Codex sub or your own API keys?{" "}
                <span className="text-white/70">Keep it.</span> New agents you add will just use the same
                engine your others do.
              </p>
            )}
            <button
              onClick={() => onDone(path ?? "fresh")}
              className="mt-8 rounded-lg px-8 py-3 text-sm font-bold text-[#07080d] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#67e8f9)" }}
            >
              {path === "fresh" ? "Let's set up →" : "Enter the builder →"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── BUILD tab ───────────────────────────────────────────────────────────────
function BuildTab({
  account,
  view,
  setView,
  onBuilt,
  markSetup,
  go,
}: {
  account: Account;
  view: BuildView;
  setView: (v: BuildView) => void;
  onBuilt: (rec: BuildRecord) => void;
  markSetup: (step: string, runtime?: Runtime) => void;
  go: (t: Tab) => void;
}) {
  if (view.kind === "configure") {
    return (
      <ConfigureAgent
        template={view.template}
        account={account}
        onBack={() => setView({ kind: "gallery" })}
        onGenerated={(instruction, displayName) => {
          const nm = displayName || view.template.name;
          onBuilt({
            ts: new Date().toISOString(),
            kind: "agent",
            id: view.template.id,
            name: nm,
            instruction,
          });
          setView({
            kind: "output",
            title: `${nm} is ready to set up`,
            sub: `${view.template.emoji} ${nm} · ${view.template.role}`,
            instruction,
          });
        }}
      />
    );
  }
  if (view.kind === "foundation") {
    return (
      <SetupWizard
        account={account}
        markSetup={markSetup}
        onBack={() => setView({ kind: "gallery" })}
        onDone={() => go("build")}
      />
    );
  }
  if (view.kind === "custom") {
    return (
      <CustomAgentForm
        account={account}
        onBack={() => setView({ kind: "gallery" })}
        onGenerated={(instruction, displayName) => {
          const nm = displayName || "Custom agent";
          onBuilt({ ts: new Date().toISOString(), kind: "agent", id: "custom", name: nm, instruction });
          setView({ kind: "output", title: `${nm} is ready to set up`, sub: `🛠️ ${nm} · your custom agent`, instruction });
        }}
      />
    );
  }
  if (view.kind === "output") {
    return (
      <OutputView
        title={view.title}
        sub={view.sub}
        instruction={view.instruction}
        onBack={() => setView({ kind: "gallery" })}
        backLabel="← All agents"
        onBuildDashboard={
          account.builds.some((b) => b.kind === "dashboard") ? undefined : () => go("dashboards")
        }
      />
    );
  }

  const recent = [...account.builds].reverse().slice(0, 6);
  const setupComplete = account.path !== "fresh" || account.setup.done.includes("backbone");

  // Agents are locked until a brand-new user finishes setting up the ecosystem — you can't
  // drop an agent into a foundation that doesn't exist yet.
  if (!setupComplete) {
    return (
      <div className="mx-auto max-w-lg py-8 text-center">
        <div className="mb-4 text-5xl">🔒</div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Agents unlock after <GradientTitle>setup.</GradientTitle>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
          Agents drop into an ecosystem that has to exist first — the runtime, engine, and task queue.
          It&apos;s a short guided setup and your Claude Code does the heavy lifting. Finish it and the
          whole crew opens up.
        </p>
        <button
          onClick={() => setView({ kind: "foundation" })}
          className="mt-6 rounded-lg px-7 py-3 text-sm font-bold text-[#07080d] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#67e8f9)" }}
        >
          {account.setup.done.length ? "Continue setup →" : "Start setup →"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            The <GradientTitle>agent store.</GradientTitle>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
            Every agent here runs in the real Trevs operation, the same crew from the videos. Pick one,
            tune it, and it drops into your ecosystem.
          </p>
        </div>
        {account.path !== "existing" && (
          <button
            onClick={() => setView({ kind: "foundation" })}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-xs font-medium text-white/70 transition-colors hover:border-violet-300/50 hover:text-white active:scale-[0.98]"
          >
            🏗️ Re-run setup
          </button>
        )}
      </div>

      <button
        onClick={() => setView({ kind: "custom" })}
        className="mb-4 flex w-full items-center gap-4 rounded-2xl border border-cyan-300/40 bg-gradient-to-r from-cyan-500/[0.10] to-violet-500/[0.06] p-5 text-left transition-all hover:border-cyan-300/70 active:scale-[0.995]"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-300/40 bg-cyan-400/10 text-2xl">
          🛠️
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-white">Build a custom agent</div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">
            Don&apos;t see what you need? Describe any agent in your own words and we&apos;ll generate a
            real, tailored template — honest about what it can actually do.
          </p>
        </div>
        <span className="hidden shrink-0 text-sm font-semibold text-cyan-200 sm:block">Describe it →</span>
      </button>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AGENT_TEMPLATES.map((t, i) => {
          const a = ACCENTS[t.accent];
          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              onClick={() => setView({ kind: "configure", template: t })}
              className={`group rounded-2xl border ${a.border} ${a.hoverBorder} ${a.hoverGlow} bg-white/[0.03] p-5 text-left transition-[border-color,background-color] duration-150 hover:bg-white/[0.05] active:scale-[0.99]`}
            >
              <div className="flex items-start gap-4">
                <SpriteTile t={t} />
                <div className="min-w-0">
                  <span className="text-lg font-bold capitalize text-white">{t.role}</span>
                  <div className="mt-0.5 text-[11px] text-white/40">
                    suggested name <span className={`font-semibold ${a.text}`}>{t.name}</span> · you&apos;ll name it yourself
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/55">{t.tagline}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3.5">
                <span className="text-[11px] text-white/35">✓ {t.proven}</span>
                <span className={`text-xs font-semibold ${a.text} opacity-0 transition-opacity group-hover:opacity-100`}>
                  Recruit →
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {recent.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-white/40">
            Your recent builds
          </h2>
          <div className="flex flex-wrap gap-2">
            {recent.map((b, i) => (
              <button
                key={`${b.ts}-${i}`}
                onClick={() =>
                  setView({
                    kind: "output",
                    title: `${b.name}, from your builds`,
                    sub: `${b.kind === "dashboard" ? "🖥️ Dashboard" : "🤖 Agent"} · generated ${new Date(b.ts).toLocaleDateString()}`,
                    instruction: b.instruction,
                  })
                }
                className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs text-white/65 transition-colors hover:border-violet-300/50 hover:text-white active:scale-[0.98]"
              >
                {b.kind === "dashboard" ? "🖥️" : "🤖"} {b.name}
                <span className="ml-1.5 text-white/30">{new Date(b.ts).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-white/30">
            Saved to your account. Sign in anywhere and they&apos;re here.
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-white/35">
        New agents from the operation get added here as they&apos;re proven. Something you want next?{" "}
        <span className="text-white/60">Tell us in Discord.</span>
      </p>
    </div>
  );
}

function ConfigureAgent({
  template,
  account,
  onBack,
  onGenerated,
}: {
  template: AgentTemplate;
  account: Account;
  onBack: () => void;
  onGenerated: (instruction: string, displayName: string) => void;
}) {
  const a = ACCENTS[template.accent];
  const [params, setParams] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.params.map((p) => [p.key, p.default]))
  );
  // Users name their own agent — it's THEIR crew. Defaults to the persona name as a suggestion.
  const [agentName, setAgentName] = useState(template.name);
  // Existing users may already run their own engine (Codex sub / own keys). Default them to
  // that — never shove the fuel key into their agents unless they explicitly pick fuel.
  const isExisting = account.path === "existing";
  const usingFuel = false; // fuel retired 2026-08-12 — all agents run on the user's own engine
  // Brain-power (model tier) applies to any engine now, so always show it.
  const shownParams = template.params;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 text-sm text-white/45 transition-colors hover:text-white"
      >
        ← All agents
      </button>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className={`h-fit rounded-2xl border ${a.border} bg-white/[0.03] p-6 lg:sticky lg:top-28`}>
          <div className="flex items-center gap-4">
            <SpriteTile t={template} size={84} />
            <div>
              <div className="text-2xl font-bold text-white">{template.name}</div>
              <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${a.chip}`}>
                {template.role}
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60">{template.tagline}</p>
          <div className="mt-4 rounded-lg border border-white/8 bg-black/30 px-4 py-3 text-[11px] leading-relaxed text-white/45">
            ✓ {template.proven}
          </div>
          {["sage", "bolt", "ace"].includes(template.id) && (
            <div className="mt-3 rounded-lg border border-emerald-300/25 bg-emerald-400/[0.06] px-4 py-3 text-[11px] leading-relaxed text-emerald-200/80">
              🛡️ Starts on <span className="font-semibold">paper money</span>: a simulated $10,000. Zero
              real risk while it proves itself. You can switch later, on your terms.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-6 rounded-lg border border-white/8 bg-black/20 px-4 py-3 text-[11px] leading-relaxed text-white/45">
            🔗 Your new {template.role.toLowerCase()} joins your ecosystem. Your Claude Code slots it in
            next to your other agents — nothing else is touched.
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
              Name your {template.role.toLowerCase()}
            </label>
            <input
              value={agentName}
              onChange={(e) => setAgentName(e.target.value.slice(0, 40))}
              placeholder={template.name}
              className="w-full rounded-lg border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-violet-300/60"
            />
            <p className="mt-1.5 text-[11px] text-white/35">
              It&apos;s your crew — call it anything. We suggested <span className="text-white/60">{template.name}</span>,
              but &quot;{agentName.trim() || template.name}&quot; is what it&apos;ll be named everywhere (files, dashboard, commands).
            </p>
          </div>

          {isExisting && (
            <div className="mb-6">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
                AI engine
              </label>
              <div className="rounded-lg border border-violet-300/50 bg-violet-400/[0.06] px-4 py-2.5">
                <div className="text-sm font-semibold text-white">Your own engine</div>
                <div className="mt-0.5 text-[11px] text-white/45">Runs on the same AI engine your other agents use — your OpenRouter key, your Claude/Codex sub, or your own key. No key embedded here. (Fuel was retired; if you still have a fuel balance, existing agents keep using it until it runs out.)</div>
              </div>
              <p className="mt-1.5 text-[11px] text-white/35">
                You already have agents running, so this defaults to your own engine — we won&apos;t add any
                key or touch your setup unless you pick fuel.
              </p>
            </div>
          )}

          {shownParams.map((p) => {
            const isFreq = p.key === "cadence";
            return (
            <div
              key={p.key}
              className={isFreq ? "mb-5 rounded-xl border border-cyan-300/25 bg-cyan-400/[0.04] p-4" : "mb-5"}
            >
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
                {isFreq ? "⏱️ How often should it run?" : p.label}
              </label>
              {isFreq && (
                <p className="mb-2.5 -mt-0.5 text-[11px] leading-relaxed text-cyan-100/70">
                  <span className="font-semibold text-cyan-100">More runs = fresher results, but more{" "}
                  {usingFuel ? "fuel" : "AI usage"}.</span>{" "}
                  Pick what the job actually needs. You can change this anytime later — just tell your
                  Claude Code &ldquo;run {template.name} more/less often.&rdquo;
                </p>
              )}
              {p.type === "select" ? (
                <div className="space-y-2">
                  {p.options!.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setParams((prev) => ({ ...prev, [p.key]: o.value }))}
                      className={`block w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-all ${
                        params[p.key] === o.value
                          ? "border-violet-300/70 bg-violet-400/[0.08] text-white"
                          : "border-white/10 bg-black/20 text-white/55 hover:border-white/25"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  value={params[p.key]}
                  onChange={(e) => setParams((prev) => ({ ...prev, [p.key]: e.target.value }))}
                  placeholder={p.placeholder}
                  className="w-full rounded-lg border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-violet-300/60"
                />
              )}
              <p className="mt-1.5 text-[11px] text-white/35">{p.help}</p>
            </div>
            );
          })}

          {params.model === "capable" && (
            <div className="mb-4 rounded-lg border border-amber-400/50 bg-amber-400/[0.10] px-4 py-3 text-[12px] leading-relaxed text-amber-100">
              ⚠️ <span className="font-semibold">Heads up — a premium model costs several times more per run.</span> It&apos;s
              only worth it for an agent doing your hardest, highest-stakes work. For almost everything else,{" "}
              <button
                onClick={() => setParams((prev) => ({ ...prev, model: "cheap" }))}
                className="font-semibold underline underline-offset-2 hover:text-white"
              >
                use the cheap/fast model instead
              </button>{" "}
              and it costs a fraction as much.
            </div>
          )}

          <div className="mb-6 rounded-lg border border-cyan-300/20 bg-cyan-400/[0.05] px-4 py-3 text-[11px] leading-relaxed text-cyan-100/70">
            💡 <span className="font-semibold text-cyan-100">Keep it lean:</span> agents only cost money
            when they actually think. This one is built to idle for free and wake only when it needs to —
            keep it that way. Running agents 24/7 or more often than they need just burns{" "}
            {usingFuel ? "fuel" : "AI usage on your own engine"} for no extra results. You can always adjust
            how often it runs by asking your Claude Code.
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/8 pt-5">
            <div className="text-[11px] leading-relaxed text-white/40">
              Free to generate. {template.name} only uses resources once it&apos;s actually running on
              your machine — nothing to set up or pay for now.
            </div>
            <button
              onClick={() =>
                onGenerated(
                  buildAgentInstruction({
                    template,
                    params,
                    fuelKey: account.fuelKey,
                    existing: account.path === "existing",
                    useFuel: usingFuel,
                    customName: agentName.trim() || template.name,
                  }),
                  agentName.trim() || template.name
                )
              }
              className="shrink-0 rounded-lg px-6 py-3 text-sm font-bold text-[#07080d] transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#67e8f9)" }}
            >
              Generate →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── foundation (Start Here) setup ───────────────────────────────────────────
// The guided, multi-step first-run setup. This is the ONLY from-scratch path.
function SetupWizard({
  account,
  markSetup,
  onBack,
  onDone,
}: {
  account: Account;
  markSetup: (step: string, runtime?: Runtime) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const done = account.setup.done;
  const [runtime, setRuntime] = useState<Runtime>(account.setup.runtime ?? "vps");
  const firstUndone = SETUP_STEPS.findIndex((s) => !done.includes(s.id));
  const [stepIdx, setStepIdx] = useState(firstUndone === -1 ? 0 : firstUndone);
  const [copied, setCopied] = useState(false);
  const step = SETUP_STEPS[stepIdx];

  const stage: SetupStage | null = step.id === "orient" ? "orient" : step.id === "backbone" ? "backbone" : null;
  const instruction = stage ? buildSetupInstruction({ runtime, fuelKey: account.fuelKey, stage }) : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(instruction);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };
  const complete = () => {
    markSetup(step.id, step.id === "claude" ? runtime : undefined);
    if (stepIdx < SETUP_STEPS.length - 1) setStepIdx(stepIdx + 1);
    else onDone();
  };

  return (
    <div>
      <button onClick={onBack} className="mb-6 text-sm text-white/45 transition-colors hover:text-white">
        ← Home
      </button>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">🏗️</div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Set up your <GradientTitle>ecosystem.</GradientTitle>
          </h1>
          <p className="mt-1.5 text-sm text-white/50">A short guided setup, one step at a time. Agents unlock at the end.</p>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {SETUP_STEPS.map((s, i) => {
            const isDone = done.includes(s.id);
            const isCurrent = i === stepIdx;
            return (
              <button
                key={s.id}
                onClick={() => setStepIdx(i)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isCurrent
                    ? "border-violet-300/60 bg-violet-400/15 text-white"
                    : isDone
                      ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
                      : "border-white/10 text-white/45"
                }`}
              >
                <span>{isDone ? "✓" : i + 1}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-1 text-xs font-medium uppercase tracking-[0.15em] text-violet-300">
            Step {stepIdx + 1} of {SETUP_STEPS.length}
          </div>
          <h2 className="text-xl font-bold text-white">{step.label}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-white/55">{step.blurb}</p>

          {/* STEP 1: choose runtime, get Claude Code (+ the server, if VPS) */}
          {step.id === "claude" && (
            <div className="mt-5">
              <div className="rounded-xl border border-white/8 bg-black/30 p-4 text-sm leading-relaxed text-white/65">
                <span className="font-semibold text-white">Claude Code</span>{" "}
                is the assistant that runs on your computer and actually builds your agents for you.
                Everything you generate here gets pasted into it.{" "}
                <a
                  href="https://claude.com/claude-code"
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-300 underline-offset-2 hover:underline"
                >
                  Get Claude Code →
                </a>{" "}
                (Codex works too.)
              </div>

              <div className="mt-3 rounded-xl border border-amber-300/25 bg-amber-400/[0.06] p-4 text-[12px] leading-relaxed text-amber-100/85">
                💡 <span className="font-semibold text-amber-100">Optional tip that saves clicking:</span>{" "}
                setup runs a bunch of terminal commands, and Claude Code asks permission for each by default.
                If you&apos;d rather not confirm every one, you can turn on <span className="font-semibold">auto-accept</span> —
                in Claude Code press <kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-amber-200">Shift</kbd>+<kbd className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-amber-200">Tab</kbd>{" "}
                to cycle to auto-accept mode. Totally optional, and you stay in control — it still pauses before
                anything risky. Prefer to approve each step yourself? That works perfectly fine too.
              </div>

              <label className="mb-1 mt-5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">
                Where will your agents run?
              </label>
              <p className="mb-2 text-[11px] leading-relaxed text-white/45">
                This only changes where the agents live. We recommend a cheap always-on server — it&apos;s
                more reliable and avoids a few headaches (sleeping computers, cloud-sync issues, stray
                terminal windows). Running on your own computer is free and fine to start, with trade-offs.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => setRuntime("vps")}
                  className={`relative rounded-xl border p-4 text-left transition-all ${
                    runtime === "vps"
                      ? "border-cyan-300/70 bg-cyan-400/[0.08] shadow-[0_0_40px_-14px_rgba(103,232,249,0.5)]"
                      : "border-white/10 bg-black/20 hover:border-white/25"
                  }`}
                >
                  <span className="absolute right-3 top-3 rounded-full bg-cyan-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-200">Recommended</span>
                  <div className="mb-1 text-2xl">☁️</div>
                  <div className="text-sm font-bold text-white">On a server <span className="text-[11px] font-normal text-cyan-200/80">(recommended)</span></div>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                    A cheap VPS (~$5/mo) runs your agents 24/7 even when your computer&apos;s off — and sidesteps
                    the local gotchas entirely. A few extra setup steps, and we walk you through every one below.
                  </p>
                </button>
                <button
                  onClick={() => setRuntime("local")}
                  className={`relative rounded-xl border p-4 text-left transition-all ${
                    runtime === "local"
                      ? "border-pink-300/70 bg-pink-400/[0.08] shadow-[0_0_40px_-14px_rgba(249,168,212,0.5)]"
                      : "border-white/10 bg-black/20 hover:border-white/25"
                  }`}
                >
                  <span className="absolute right-3 top-3 rounded-full bg-pink-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-pink-200">Free</span>
                  <div className="mb-1 text-2xl">💻</div>
                  <div className="text-sm font-bold text-white">On my own computer</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                    Free, nothing to rent — fine for trying it out. Trade-offs: agents only run while your
                    computer&apos;s awake, and you&apos;ll want to keep it out of a cloud-synced folder. Move to a server anytime.
                  </p>
                </button>
              </div>

              {/* VPS: get the server set up BEFORE moving on (this part is manual — Claude Code isn't
                  on the server yet, so the user does it, and we hand them the exact steps). */}
              {runtime === "vps" && (
                <div className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-400/[0.05] p-4">
                  <div className="mb-2 text-sm font-bold text-cyan-100">☁️ Get your server ready (~10 min, you do this part)</div>
                  <ol className="space-y-2 text-[12px] leading-relaxed text-white/65">
                    <li>
                      <span className="font-semibold text-white/85">1. Rent a VPS.</span> Any of these work —
                      pick whichever you like: <span className="text-white/80">Contabo</span> (cheapest),{" "}
                      <span className="text-white/80">Hetzner</span>, or{" "}
                      <span className="text-white/80">DigitalOcean</span> (often a free credit for new
                      accounts). Choose <span className="text-white/80">Ubuntu 24</span>, at least 4GB RAM,
                      a region near you.
                    </li>
                    <li>
                      <span className="font-semibold text-white/85">2. Connect to it.</span> In your
                      computer&apos;s terminal:{" "}
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">ssh root@YOUR.SERVER.IP</code>{" "}
                      (type &quot;yes&quot; the first time, paste the password — nothing shows as you type,
                      that&apos;s normal).
                    </li>
                    <li>
                      <span className="font-semibold text-white/85">3. Keep your session alive with tmux.</span>{" "}
                      On the server run{" "}
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">apt update &amp;&amp; apt install -y tmux</code>{" "}
                      then{" "}
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">tmux new -s tonka</code>.
                      To leave it running: press <span className="text-white/80">Ctrl+B</span> then{" "}
                      <span className="text-white/80">D</span>. To get back in later (after you SSH back
                      in):{" "}
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">tmux attach -t tonka</code>.
                      <span className="text-white/45"> This is how you always return to your agents — remember it.</span>
                    </li>
                    <li>
                      <span className="font-semibold text-white/85">4. Install Claude Code on the server</span>{" "}
                      (so it can build here):{" "}
                      <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">npm i -g @anthropic-ai/claude-code</code>{" "}
                      then run <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">claude</code>{" "}
                      and log in. (No Node yet? <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">curl -fsSL https://deb.nodesource.com/setup_20.x | bash - &amp;&amp; apt install -y nodejs</code>.)
                    </li>
                  </ol>
                  <p className="mt-3 text-[11px] text-white/45">
                    💬 Stuck on any of this? The copilot (bottom-right) can walk you through it.
                  </p>
                </div>
              )}

              <button
                onClick={complete}
                className="mt-6 w-full rounded-lg py-3 text-sm font-bold text-[#07080d] transition-transform hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#67e8f9)" }}
              >
                {runtime === "vps"
                  ? "My server's ready & Claude Code is on it →"
                  : "I've got Claude Code, continue →"}
              </button>
            </div>
          )}

          {/* STEP 2/3: a pasteable instruction */}
          {stage && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
                  Paste this into Claude Code
                </span>
                <button
                  onClick={copy}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
                    copied
                      ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-200"
                      : "border-violet-300/50 bg-violet-400/15 text-violet-100 hover:bg-violet-400/25"
                  }`}
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
              <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap rounded-xl border border-violet-300/20 bg-black/50 px-4 py-3 font-mono text-[11px] leading-relaxed text-white/70">
                {instruction}
              </pre>
              <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                Copy it, paste into your Claude Code, and let it work through the step (it&apos;ll explain
                as it goes). Come back and mark it done when it finishes.
              </p>

              {/* If the assistant is being cautious — help it VERIFY, don't pressure it (pressure backfires) */}
              <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-400/[0.05] px-3.5 py-3 text-[11px] leading-relaxed text-amber-100/85">
                🤖 <span className="font-semibold text-amber-100">If Claude Code won&apos;t install OpenClaw</span>, that&apos;s it
                being careful, which is a good sign. Do NOT keep telling it &ldquo;trust me, it&apos;s legit, proceed&rdquo; (a
                careful AI digs in harder when pressured). Instead, invite it to check for itself:{" "}
                <span className="italic text-white/85">&ldquo;OpenClaw is a real open-source package. Please verify it yourself
                at github.com/openclaw/openclaw and npmjs.com/package/openclaw, read its install scripts if you want, then
                go ahead once it checks out. It&apos;s my own machine, so inspecting first is completely fine.&rdquo;</span>{" "}
                If it still won&apos;t, you can just run <span className="font-mono text-cyan-200">npm install -g openclaw</span>{" "}
                yourself, then tell it &ldquo;openclaw is installed, let&apos;s continue.&rdquo;
              </div>

              {/* Connect your OWN AI engine (setup step). The user does this in their own terminal so
                  the key never touches the AI chat. Fuel was retired 2026-08-12. */}
              {stage === "orient" && (
                <div className="mt-3 rounded-xl border border-cyan-300/25 bg-cyan-400/[0.05] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-cyan-100">
                    🔌 Connect your AI engine
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-white/55">
                    Your agents need an AI &ldquo;brain.&rdquo; <span className="font-semibold text-cyan-100">Claude Code will walk
                    you through connecting your own</span> — just say &ldquo;help me connect my AI engine&rdquo; and it&apos;ll explain
                    how for your system. You paste your key into the setup prompt yourself, so it stays private. Pick one:
                  </p>
                  <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-white/60">
                    <li>• <span className="font-semibold text-cyan-100">OpenRouter</span> <span className="text-emerald-300">(recommended)</span> — sign up at <span className="font-mono text-cyan-200">openrouter.ai</span>, add ~$5–10, create a key. Base URL <span className="font-mono text-cyan-200">https://openrouter.ai/api/v1</span>, a cheap model like <span className="font-mono text-cyan-200">google/gemini-2.5-flash-lite</span>. Cheap, works with every model, no ToS worries.</li>
                    <li>• <span className="font-semibold text-cyan-100">Your own OpenAI / Anthropic / Google key</span> — same idea, that provider&apos;s base URL + key.</li>
                  </ul>
                  <p className="mt-2 text-[10px] leading-relaxed text-amber-200/70">
                    ⚠️ Use an API key, not a personal Claude Pro/Max or ChatGPT Plus <span className="italic">subscription</span>. Running agents on a chat subscription is against the provider&apos;s terms, so Claude Code will refuse it and you&apos;ll get blocked. (Using Claude Code to <span className="italic">build</span> your setup on your sub is fine — it&apos;s only running the agents on a sub that&apos;s the problem.)
                  </p>
                  <p className="mt-2 text-[10px] leading-relaxed text-white/45">
                    Run <span className="font-mono text-cyan-200">openclaw onboard</span>, choose{" "}
                    <span className="font-mono text-cyan-200">custom-api-key</span> / compatibility{" "}
                    <span className="font-mono text-cyan-200">openai</span>. Stuck on any of it? Just ask your Claude Code.
                  </p>
                </div>
              )}

              <button
                onClick={complete}
                className="mt-4 w-full rounded-lg py-3 text-sm font-bold text-[#07080d] transition-transform hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#67e8f9)" }}
              >
                {step.id === "backbone" ? "Done — unlock my agents →" : "Done, next step →"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5 text-[12px] leading-relaxed text-white/50">
          💡 Stuck on any step? Tell your Claude Code what happened (it can see your machine), or ask in
          Discord #⚒️ inner-circle-tools. Your progress saves automatically — you can leave and come back.
        </div>
      </div>
    </div>
  );
}

// ─── output view (shared) ────────────────────────────────────────────────────
// Describe-your-own-agent: freeform → LLM-generated spec → same instruction shell as built-ins.
function CustomAgentForm({
  account,
  onBack,
  onGenerated,
}: {
  account: Account;
  onBack: () => void;
  onGenerated: (instruction: string, displayName: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState("");
  const isExisting = account.path === "existing";
  const [model, setModel] = useState("cheap");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const usingFuel = false; // fuel retired 2026-08-12 — custom agents run on the user's own engine
  const canSubmit = name.trim().length > 0 && description.trim().length > 15 && !busy;

  const generate = async () => {
    setErr(null);
    setBusy(true);
    try {
      const { json } = await api("custom-agent", {
        email: account.email,
        fuel_key: account.fuelKey,
        name: name.trim(),
        description: description.trim(),
        trigger: trigger.trim(),
      });
      if (!json?.ok || !json?.spec) {
        setErr(json?.error || "Couldn't generate that one — try describing what it does + what it should produce, a bit more specifically.");
        setBusy(false);
        return;
      }
      const instruction = buildCustomAgentInstruction({
        name: name.trim(),
        spec: json.spec,
        fuelKey: account.fuelKey,
        model,
        existing: isExisting,
        useFuel: usingFuel,
      });
      onGenerated(instruction, name.trim());
    } catch {
      setErr("Something went wrong reaching the builder — try again in a moment.");
      setBusy(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="mb-6 text-sm text-white/45 transition-colors hover:text-white">
        ← All agents
      </button>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Build a <GradientTitle>custom agent.</GradientTitle>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
          Describe what you want in plain words. We&apos;ll turn it into a real, structured agent — honest
          about what it can actually do — that drops into your ecosystem like any other.
        </p>
      </div>

      <div className="max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">Name it</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="e.g. Trendy"
            className="w-full rounded-lg border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/60"
          />
        </div>
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">What should it do?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 4000))}
            rows={4}
            placeholder="e.g. Look at my TikTok page and suggest how to improve my ads and brand — what's working, what to post next, how to make it more appealing to advertisers."
            className="w-full resize-y rounded-lg border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm leading-relaxed text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/60"
          />
          <p className="mt-1.5 text-[11px] text-white/35">The more specific (what it looks at + what it should produce), the better the result.</p>
        </div>
        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">How often / when? (optional)</label>
          <input
            value={trigger}
            onChange={(e) => setTrigger(e.target.value.slice(0, 400))}
            placeholder="e.g. a few times a week · or: only when I ask it"
            className="w-full rounded-lg border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/60"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
            More often = fresher, but more AI usage on your own engine. You can
            change it anytime later by telling your Claude Code.
          </p>
        </div>

        <div className="mb-5">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-white/45">Brain power</label>
          <div className="space-y-2">
            {[
              { v: "cheap", l: "Cheapest & fast (recommended) — handles almost everything" },
              { v: "balanced", l: "Balanced — a smarter model for tougher jobs" },
              { v: "capable", l: "Most capable — premium, for your hardest work (costs more)" },
            ].map((o) => (
              <button key={o.v} onClick={() => setModel(o.v)} className={`block w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-all ${model === o.v ? "border-violet-300/70 bg-violet-400/[0.08] text-white" : "border-white/10 bg-black/20 text-white/55 hover:border-white/25"}`}>{o.l}</button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-white/35">Setup picks a matching model on whatever engine you connected (OpenRouter key, Claude/Codex sub, or your own key).</p>
        </div>

        {err && <div className="mb-4 rounded-lg border border-rose-400/40 bg-rose-400/[0.08] px-4 py-3 text-[12px] text-rose-100">{err}</div>}

        <button
          onClick={generate}
          disabled={!canSubmit}
          className="w-full rounded-lg py-3 text-sm font-bold text-[#07080d] transition-transform enabled:hover:scale-[1.01] enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "linear-gradient(90deg,#67e8f9,#c4b5fd,#f9a8d4)" }}
        >
          {busy ? "Designing your agent… (~30–45s)" : "Generate my agent →"}
        </button>
        {busy && (
          <p className="mt-3 text-center text-[11px] text-white/40">
            Writing a real spec for &quot;{name.trim() || "your agent"}&quot; — role, triggers, and an honest
            plan for its data. Hang tight.
          </p>
        )}
      </div>
    </div>
  );
}

function OutputView({
  title,
  sub,
  instruction,
  onBack,
  backLabel,
  onBuildDashboard,
}: {
  title: string;
  sub: string;
  instruction: string;
  onBack: () => void;
  backLabel: string;
  onBuildDashboard?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(instruction);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <div>
      <button onClick={onBack} className="mb-6 text-sm text-white/45 transition-colors hover:text-white">
        {backLabel}
      </button>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          <GradientTitle>{title}</GradientTitle>
        </h1>
        <p className="mt-1.5 text-sm text-white/50">{sub}</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { n: "1", t: "Copy the instruction", d: "The whole block below, one click." },
          { n: "2", t: "Paste into Claude Code", d: "Open Claude Code on your computer, paste, hit enter." },
          { n: "3", t: "Review & approve", d: "It shows you everything before finalizing. You stay in control." },
        ].map((s) => (
          <div key={s.n} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
            <div className="text-sm font-bold text-white">
              <span className="mr-1.5 text-violet-300">{s.n}.</span>
              {s.t}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">{s.d}</p>
          </div>
        ))}
      </div>

      <div className="relative rounded-2xl border border-violet-300/25 bg-black/50">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40">
            Your setup instruction
          </span>
          <button
            onClick={copy}
            className={`rounded-lg border px-4 py-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
              copied
                ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-200"
                : "border-violet-300/50 bg-violet-400/15 text-violet-100 hover:bg-violet-400/25"
            }`}
          >
            {copied ? "✓ Copied!" : "Copy"}
          </button>
        </div>
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap px-5 py-4 font-mono text-[12px] leading-relaxed text-white/75">
          {instruction}
        </pre>
      </div>

      {onBuildDashboard && (
        <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-400/[0.06] px-5 py-4 sm:flex-row sm:items-center">
          <div className="text-[13px] leading-relaxed text-emerald-100/90">
            🖥️ <span className="font-semibold text-white">Now give it a home.</span> Build the{" "}
            <span className="font-semibold text-emerald-200">Command Deck</span> dashboard so you can actually
            watch this agent work — clean charts + status, no art, ships in one shot.
          </div>
          <button
            onClick={onBuildDashboard}
            className="shrink-0 rounded-lg border border-emerald-300/50 bg-emerald-400/15 px-5 py-2.5 text-sm font-bold text-emerald-100 transition-all hover:bg-emerald-400/25 active:scale-[0.98]"
          >
            Build a dashboard →
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5 text-[12px] leading-relaxed text-white/50">
          💡 <span className="font-semibold text-white/80">After it&apos;s set up:</span> day-to-day tweaks
          happen in your own Claude Code. Just tell it what you want changed. Come back here to add more
          agents, dashboards, or fuel.
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3.5 text-[12px] leading-relaxed text-white/50">
          ⌨️ <span className="font-semibold text-white/80">Doing this a lot?</span> A one-command installer
          (<span className="font-mono text-[11px]">npx trevsagents add …</span>) is coming. Paste works
          everywhere today.
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARDS tab ──────────────────────────────────────────────────────────
function DashboardsTab({
  account,
  view,
  setView,
  onBuilt,
}: {
  account: Account;
  view: DashView;
  setView: (v: DashView) => void;
  onBuilt: (rec: BuildRecord) => void;
}) {
  if (view.kind === "output") {
    return (
      <OutputView
        title={view.title}
        sub={view.sub}
        instruction={view.instruction}
        onBack={() => setView({ kind: "gallery" })}
        backLabel="← All dashboards"
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Give your crew a <GradientTitle>home.</GradientTitle>
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
          Start with the <span className="text-emerald-200">Command Deck</span> — a clean, modern data
          dashboard (charts, KPIs, agent panel, no art) your Claude Code ships in one shot. Or take on one
          of the two ambitious builds from trevsagents.com (the neon station or the pixel village) when
          you&apos;re ready — we hand over the full recipe and the art you&apos;ll need.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {DASHBOARD_THEMES.map((t, i) => {
          const a = ACCENTS[t.accent];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className={`group overflow-hidden rounded-2xl border ${a.border} ${a.hoverBorder} bg-white/[0.03] transition-all`}
            >
              <div className="relative aspect-[16/10] overflow-hidden border-b border-white/8 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.img}
                  alt={t.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07080d]/70 via-transparent to-transparent" />
                <span className={`absolute bottom-3 left-3 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm ${a.chip}`}>
                  {t.vibe}
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-white">{t.name}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                      t.tier === "simple"
                        ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
                        : "border-amber-300/40 bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {t.tier === "simple" ? "Buildable now" : "Build project"}
                  </span>
                </div>
                <p className="mt-1.5 min-h-[4.5rem] text-xs leading-relaxed text-white/55">{t.desc}</p>
                <div className="mb-2 text-[10px] uppercase tracking-[0.15em] text-white/35">⏱ {t.effort}</div>
                <button
                  onClick={() => {
                    const instruction = buildDashboardInstruction({ theme: t, fuelKey: account.fuelKey });
                    onBuilt({
                      ts: new Date().toISOString(),
                      kind: "dashboard",
                      id: t.id,
                      name: t.name,
                      instruction,
                    });
                    setView({
                      kind: "output",
                      title: `${t.name} is ready`,
                      sub: `🖥️ Dashboard · ${t.name}`,
                      instruction,
                    });
                  }}
                  className={`w-full rounded-lg border py-2.5 text-sm font-bold transition-all hover:brightness-125 active:scale-[0.99] ${a.chip}`}
                >
                  {t.tier === "simple" ? "Build it now →" : "Get the recipe →"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-xs text-white/35">
        Every theme is a starting point. Ask your Claude Code to customize colors, layout, anything.
      </p>
    </div>
  );
}

// ─── FUEL tab ────────────────────────────────────────────────────────────────
type FuelData = {
  balance: number;
  used: number;
  engine_live: boolean;
  recent: { ts: string; model: string; cost: number; in_tok: number; out_tok: number }[];
  spend?: {
    calls: number;
    last7: number;
    last30: number;
    by_tier: Record<string, number>;
    daily: { day: string; cost: number }[];
  };
  packs: { id: string; label: string; amount: number; blurb: string; bonus?: number; fuel?: number; popular?: boolean }[];
};

type Treasury = {
  engine_live: boolean;
  accounts_total: number;
  accounts_funded: number;
  liability: number;
  used_total: number;
  raw_cost_est: number;
  gross_margin_est: number;
  markup: number;
  members: { email: string; balance: number; used: number }[];
};

type Pnl = {
  ok?: boolean;
  markup: number;
  months: { month: string; revenue: number; gemini_cost: number; stripe_fees_est: number; margin_est: number }[];
  totals: { revenue: number; gemini_cost: number; stripe_fees_est: number; margin_est: number };
  disclaimer: string;
  tax_records: string[];
};

const BUILDER_ADMIN = "trevor77077@gmail.com";

// ─── ARMORY ───────────────────────────────────────────────────────────────────
// Members browse + download the skills the crew uses. Only permissively-licensed,
// system-safe skills are served (the API filters + sanitizes; nothing here exposes
// internal paths, agent names, or the operation).
type Skill = { slug: string; name: string; purpose: string; license: string; content: string };

function ArmoryTab({ account }: { account: Account }) {
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const { json } = await api("skills", { email: account.email, fuel_key: account.fuelKey });
      if (!live) return;
      if (json?.ok && Array.isArray((json as { skills?: Skill[] }).skills)) {
        setSkills((json as { skills: Skill[] }).skills);
      } else setErr(json?.message || json?.error || "Couldn't load the Armory.");
    })().catch(() => setErr("Couldn't load the Armory."));
    return () => { live = false; };
  }, [account.email, account.fuelKey]);

  const download = (s: Skill) => {
    const blob = new Blob([s.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.slug}-SKILL.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-2 text-2xl font-bold text-white">🧰 The Armory</div>
      <p className="mb-5 text-sm leading-relaxed text-white/60">
        The actual skills our crew runs on — battle-tested procedural know-how you can bolt onto your own
        agents. Grab any of them and your agent instantly gets sharper at that job (price like a pro on Etsy,
        find real edges in sports, read a chart honestly, and more).
      </p>

      <div className="mb-6 rounded-xl border border-cyan-300/20 bg-cyan-400/[0.05] px-4 py-3 text-[12px] leading-relaxed text-cyan-100/80">
        <span className="font-semibold text-cyan-100">How to use one:</span> download a skill (or copy it),
        drop the <span className="font-mono">SKILL.md</span> into that agent&apos;s folder, and add one line to the
        agent&apos;s instructions telling it to read the skill before it works. Or just paste the skill to your
        Claude Code and say &ldquo;have my [agent] use this.&rdquo; That&apos;s it — it&apos;ll follow the playbook.
      </div>

      {err && <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{err}</div>}
      {!skills && !err && <div className="text-sm text-white/40">Loading the Armory…</div>}

      <div className="space-y-2.5">
        {(skills ?? []).map((s) => (
          <div key={s.slug} className="rounded-xl border border-white/10 bg-white/[0.03]">
            <button
              onClick={() => setOpen(open === s.slug ? null : s.slug)}
              className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{s.name}</span>
                  <span className="rounded border border-white/12 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/40">{s.license}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-white/55">{s.purpose}</p>
              </div>
              <span className="shrink-0 pt-1 text-white/30">{open === s.slug ? "▲" : "▼"}</span>
            </button>
            {open === s.slug && (
              <div className="border-t border-white/8 px-4 py-3">
                <div className="mb-2 flex justify-end">
                  <button
                    onClick={() => download(s)}
                    className="rounded-lg border border-cyan-300/50 bg-cyan-400/15 px-3 py-1.5 text-[11px] font-bold text-cyan-100 transition-all hover:bg-cyan-400/25 active:scale-[0.97]"
                  >
                    ⬇ Download SKILL.md
                  </button>
                </div>
                <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap rounded-lg border border-white/8 bg-black/50 px-4 py-3 font-mono text-[11px] leading-relaxed text-white/70">
                  {s.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FuelTab({ account }: { account: Account }) {
  const isAdmin = account.email === BUILDER_ADMIN;
  const [tre, setTre] = useState<Treasury | null>(null);
  const [pnl, setPnl] = useState<Pnl | null>(null);
  // Fuel retired 2026-08-12 — no member balance/key/usage UI. Members see the retirement notice + the
  // "move to your own engine" guide. Admin (Trevor) still sees the P&L + Treasury below for records.
  // Fuel retired 2026-08-12 — top-ups removed. Balance still spends down; no purchase flow.

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fuel/treasury", email: account.email, fuel_key: account.fuelKey }),
        });
        const j = (await r.json()) as Treasury & { ok?: boolean };
        if (alive && j?.ok) setTre(j);
      } catch {
        /* non-fatal */
      }
      try {
        const r2 = await fetch("/api/builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fuel/pnl", email: account.email, fuel_key: account.fuelKey }),
        });
        const j2 = (await r2.json()) as Pnl;
        if (alive && j2?.ok) setPnl(j2);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAdmin, account.email, account.fuelKey]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          <GradientTitle>Fuel, archived.</GradientTitle>
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-white/50">
          Fuel has been retired and everyone who bought it is being refunded. Agents now run on your own AI engine.
        </p>
      </div>

      {/* What we did + why */}
      <div className="mb-6 rounded-2xl border border-amber-300/25 bg-amber-400/[0.05] p-5 text-sm leading-relaxed text-amber-100/80">
        <div className="mb-1 font-bold text-amber-100">📮 Update: we retired fuel (Aug 2026)</div>
        Fuel was a convenience, a prepaid tank so you didn&apos;t have to manage AI billing. In practice it added cost
        and complexity for very little benefit, so we&apos;re keeping things simple: <span className="font-semibold text-white">agents
        now run on your own AI engine</span>, an OpenRouter key (one key, all models, pay as you go) or a Claude or
        ChatGPT-Codex subscription you already have. <span className="font-semibold text-white">If you bought fuel, you&apos;re getting a
        full refund</span> to your original payment method (nothing to do on your end, allow a few days for it to appear).
        If your agents stopped, just point them at your own key and your Claude Code will walk you through it in about
        two minutes.
      </div>

      {isAdmin && pnl && (
        <div className="mb-6 rounded-2xl border border-emerald-300/25 bg-emerald-400/[0.05] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-white">📊 Fuel P&amp;L <span className="text-[11px] font-normal text-white/40">(admin · bookkeeping)</span></div>
            <div className="text-[10px] uppercase tracking-wide text-white/35">markup {pnl.markup}×</div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: "Cash collected", v: pnl.totals.revenue, c: "text-white", h: "fuel purchases (Stripe)" },
              { l: "Google cost (used)", v: -pnl.totals.gemini_cost, c: "text-rose-200", h: "Gemini cost of fuel actually burned" },
              { l: "Stripe fees", v: -pnl.totals.stripe_fees_est, c: "text-rose-200", h: "~2.9% + 30¢/txn" },
              { l: "Cash on hand", v: pnl.totals.margin_est, c: "text-cyan-200", h: "collected − costs so far" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-white/8 bg-black/20 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-white/40" title={s.h}>{s.l}</div>
                <div className={`mt-0.5 text-lg font-bold tabular-nums ${s.c}`}>
                  {s.v < 0 ? "−" : ""}${Math.abs(s.v).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          {(() => {
            const projected = pnl.totals.revenue * (1 - 1 / (pnl.markup || 2)) - pnl.totals.stripe_fees_est;
            return (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-300/30 bg-emerald-400/[0.07] px-4 py-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-emerald-100/70">Projected profit — if all paid fuel is used</div>
                  <div className="mt-0.5 text-[10px] text-white/40">~½ of what members paid (your 2×), minus card fees</div>
                </div>
                <div className="text-2xl font-bold tabular-nums text-emerald-200">${projected.toFixed(2)}</div>
              </div>
            );
          })()}
          <div className="mt-2.5 rounded-lg border border-cyan-300/20 bg-cyan-400/[0.04] px-3 py-2 text-[10px] leading-relaxed text-cyan-100/70">
            💡 <span className="font-semibold text-cyan-100">&ldquo;Cash on hand&rdquo; is not profit yet.</span> Fuel is prepaid —
            most of that cash is fuel members bought but haven&apos;t burned (you still owe it as usage). You <span className="italic">earn</span> your
            2× margin as they spend it (that&apos;s the <span className="font-semibold">projected profit</span> above, once it&apos;s all used).
            <span className="font-semibold"> Realized profit</span> so far is in Treasury below. Kept if they never use it (breakage).
          </div>
          {pnl.months.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[11px] tabular-nums text-white/60">
                <thead><tr className="text-white/35"><th className="pb-1 text-left font-medium">Month</th><th className="pb-1 text-right font-medium">Collected</th><th className="pb-1 text-right font-medium">Google</th><th className="pb-1 text-right font-medium">Fees</th><th className="pb-1 text-right font-medium">Cash</th></tr></thead>
                <tbody>
                  {pnl.months.map((m) => (
                    <tr key={m.month} className="border-t border-white/5">
                      <td className="py-1 text-left text-white/70">{m.month}</td>
                      <td className="py-1 text-right">${m.revenue.toFixed(2)}</td>
                      <td className="py-1 text-right text-rose-200/80">${m.gemini_cost.toFixed(2)}</td>
                      <td className="py-1 text-right text-rose-200/80">${m.stripe_fees_est.toFixed(2)}</td>
                      <td className="py-1 text-right text-emerald-200/90">${m.margin_est.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 rounded-lg border border-amber-300/25 bg-amber-400/[0.05] px-3 py-2 text-[10px] leading-relaxed text-amber-100/70">
            ⚠️ Convenience view — <span className="font-semibold">not tax proof.</span> Your real records: Stripe reports/1099-K (revenue) · Google Cloud invoices (Gemini cost) · your bank statement. Hand those 3 to an accountant.
          </div>
        </div>
      )}

      {/* What to do now: point agents at your own engine */}
      <div className="rounded-2xl border border-cyan-300/25 bg-cyan-400/[0.05] p-6">
        <div className="text-sm font-bold text-cyan-100">🔌 What to do now: move to your own AI engine</div>
        <p className="mt-2 text-[13px] leading-relaxed text-white/60">
          Point your agents at your own engine. Just tell your Claude Code
          <span className="italic text-white/80"> &ldquo;help me switch my agents to my own AI key&rdquo;</span>, and it&apos;ll walk
          you through it for your system. You&apos;ll pick one:
        </p>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-white/65">
          <li>• <span className="font-semibold text-cyan-100">OpenRouter</span> (easiest), one key that works with almost every model, pay as you go. Sign up at <span className="font-mono text-cyan-200">openrouter.ai</span>, add about $5 to $10, create a key, and use base URL <span className="font-mono text-cyan-200">https://openrouter.ai/api/v1</span> with a cheap model like <span className="font-mono text-cyan-200">google/gemini-2.5-flash-lite</span>.</li>
          <li>• <span className="font-semibold text-cyan-100">A Claude or ChatGPT-Codex subscription</span> you already pay for. Wire that into OpenClaw and your agents use it, no extra cost.</li>
          <li>• <span className="font-semibold text-cyan-100">Your own OpenAI or Anthropic key</span>, same idea, that provider&apos;s base URL and key.</li>
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-white/45">
          You paste your key into OpenClaw&apos;s own setup prompt yourself, so it stays private. Any confusion, just
          ask your Claude Code, it&apos;s there to help.
        </p>
      </div>

      {isAdmin && tre && (
        <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-400/[0.04] p-6">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-bold text-amber-200">🔐 Treasury (admin)</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                tre.engine_live
                  ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
                  : "border-white/15 bg-white/5 text-white/45"
              }`}
            >
              {tre.engine_live ? "engine live" : "engine off"}
            </span>
          </div>
          <p className="mb-4 text-[11px] text-white/40">Only you see this. What you&apos;ve actually earned vs. what&apos;s still prepaid.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: "Prepaid held", v: `$${tre.liability.toFixed(2)}`, c: "text-white", h: "members' unburned fuel — you owe this as usage (liability)" },
              { l: "Fuel used", v: `$${tre.used_total.toFixed(2)}`, c: "text-white", h: "fuel members have actually burned" },
              { l: "Realized profit", v: `$${tre.gross_margin_est.toFixed(2)}`, c: "text-emerald-200", h: `your ${tre.markup}× margin on fuel actually used — this is real, earned profit` },
              { l: "Members funded", v: `${tre.accounts_funded}/${tre.accounts_total}`, c: "text-white", h: "have fuel / total accounts" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-white/8 bg-black/30 px-3 py-2.5" title={s.h}>
                <div className="text-[9px] uppercase tracking-wide text-white/35">{s.l}</div>
                <div className={`mt-0.5 text-lg font-bold tabular-nums ${s.c}`}>{s.v}</div>
              </div>
            ))}
          </div>
          <div className="mt-2.5 rounded-lg border border-emerald-300/20 bg-emerald-400/[0.04] px-3 py-2 text-[10px] leading-relaxed text-emerald-100/70">
            <span className="font-semibold text-emerald-100">Realized profit ${tre.gross_margin_est.toFixed(2)}</span> is what you&apos;ve truly earned
            (your 2× on the ${tre.used_total.toFixed(2)} of fuel burned). The <span className="font-semibold">${tre.liability.toFixed(2)} prepaid held</span> turns
            into ~<span className="font-semibold">${(tre.liability * (1 - 1 / (tre.markup || 2))).toFixed(2)}</span> more profit as members use it (and you keep it if they don&apos;t).
          </div>
          {tre.members.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 text-[10px] uppercase tracking-wide text-white/35">By member (top usage)</div>
              <div className="space-y-1">
                {tre.members.slice(0, 8).map((m) => (
                  <div key={m.email} className="flex items-center justify-between text-xs">
                    <span className="truncate text-white/60">{m.email}</span>
                    <span className="tabular-nums text-white/40">
                      ${m.balance.toFixed(2)} left · ${m.used.toFixed(2)} used
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ─── COPILOT tab ─────────────────────────────────────────────────────────────
type ChatMsg = { from: "you" | "copilot"; text: string };

function CopilotTab({ account }: { account: Account }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      from: "copilot",
      text: "Hey — I'm your copilot. Ask me anything about building your agents: which one to pick, how to add a new agent, fuel, Claude Code, servers, setup, how it all fits together. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, thinking]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || thinking) return;
    setInput("");
    // capture the history we send BEFORE we append the new turn
    const history = msgs.slice(-6).map((m) => ({ from: m.from, text: m.text }));
    setMsgs((m) => [...m, { from: "you", text: question }]);
    setThinking(true);
    try {
      const { json } = await api("copilot", {
        email: account.email,
        fuel_key: account.fuelKey,
        question,
        history,
      });
      const answer =
        json?.ok && json.answer
          ? json.answer
          : json?.error || copilotAnswer(question).a; // graceful fallback to the local FAQ
      setMsgs((m) => [...m, { from: "copilot", text: answer }]);
    } catch {
      setMsgs((m) => [...m, { from: "copilot", text: copilotAnswer(question).a }]);
    } finally {
      setThinking(false);
    }
  };

  const chips = [
    "How do I add a new agent?",
    "Which agents should I start with?",
    "How much does it cost to run?",
    "Do I need a server?",
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ask the <GradientTitle>copilot.</GradientTitle>
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-white/60">
          Stuck, confused, or have a question about your ecosystem, fuel, an agent, or setup?{" "}
          <span className="text-white/80">Ask here — anytime.</span> It knows how the whole Trevs
          system fits together.
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-xs text-white/40">
          Included with your membership — ask as much as you want. For questions about{" "}
          <em>your specific machine</em>, your own Claude Code can actually see your setup.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
          <span className="text-xs font-semibold text-white/70">🤖 Builder Copilot</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        </div>
        <div className="max-h-[440px] min-h-[280px] space-y-4 overflow-y-auto px-5 py-5">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.from === "you"
                    ? "bg-violet-400/15 text-violet-50"
                    : "border border-white/8 bg-black/30 text-white/75"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-300/70 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-300/70 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-300/70" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="border-t border-white/8 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => ask(c)}
                className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/60 transition-colors hover:border-violet-300/50 hover:text-white active:scale-[0.98]"
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              disabled={thinking}
              placeholder={thinking ? "Copilot is thinking…" : "Ask anything about building your agents…"}
              className="flex-1 rounded-lg border border-white/12 bg-black/30 px-4 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-violet-300/60 disabled:opacity-50"
            />
            <button
              onClick={() => ask(input)}
              disabled={thinking}
              className="rounded-lg px-5 py-2.5 text-sm font-bold text-[#07080d] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: "linear-gradient(90deg,#f9a8d4,#c4b5fd,#67e8f9)" }}
            >
              {thinking ? "…" : "Ask"}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-white/35">
        Stuck on something specific? Fastest help: ask your own Claude Code (paste it the error), or post
        in Discord, <span className="text-white/60">#⚒️ inner-circle-tools</span>.
      </p>
    </div>
  );
}
