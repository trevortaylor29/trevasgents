"use client";
// Trevs Agents Hub (2026-10-14): where a member's own agents ask before they act, and report in.
// Reads the builder's signed-in account from localStorage (same session, same key) and talks to
// hub.trevsagents.com directly. Everything on screen is the member's real data; nothing is staged.
// No model runs anywhere in here: the agents think on the member's machine and keys.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.trevsagents.com";
const LS_KEY = "ta_builder_account";

type Session = { email: string; fuelKey: string; name: string };
type Agent = {
  slug: string; name: string; role: string | null; version: string | null;
  state: "running" | "quiet" | "failing"; registered_at: number; last_seen: number | null; last_run_at: number | null;
  last_level: string | null; last_summary: string | null; last_error: string | null;
  runs_today: number; runs_total: number; money_total: number; waiting: number;
};
type Run = { id: number; agent: string; ts: number; summary: string; numbers: Record<string, number> | null; level: "info" | "warn" | "error"; money: number | null };
type Action = {
  id: number; agent: string; label: string; detail: Record<string, string> | string | null; app: string | null;
  status: "pending" | "yes" | "no" | "expired" | "done"; note: string | null; created_at: number; decided_at: number | null; expires_at: number; done_at: number | null; result: string | null;
};
type Overview = {
  member: { email: string; discord: string | null; alerts: boolean; quiet_hours: number };
  agents: Agent[]; runs: Run[]; pending: Action[]; decided: Action[];
  today: { runs: number; money: number }; week: { runs: number; money: number; errors: number };
};
type View = "home" | "approvals" | "agents" | "runs" | "add" | "alerts";

const NAV: { id: View; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "approvals", label: "Approvals" },
  { id: "agents", label: "Agents" },
  { id: "runs", label: "Runs" },
  { id: "add", label: "Add an agent" },
  { id: "alerts", label: "Alerts" },
];
const SPRITES = new Set(["ant", "bunc", "craig", "dennis", "earl", "finn", "forge", "luke", "matt", "pham", "sage", "scout"]);

function loadSession(): Session | null {
  try {
    const a = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (!a || typeof a.email !== "string" || typeof a.fuelKey !== "string") return null;
    return { email: a.email, fuelKey: a.fuelKey, name: a.name || a.email.split("@")[0] };
  } catch { return null; }
}
async function hub<T>(s: Session, path: string, init?: RequestInit): Promise<{ status: number; json: T & { ok?: boolean; error?: string } }> {
  const r = await fetch(HUB + path, { ...init, headers: { "Content-Type": "application/json", "x-hub-email": s.email, "x-hub-key": s.fuelKey, ...(init?.headers || {}) } });
  const json = await r.json().catch(() => ({ ok: false, error: "The hub returned nothing readable." }));
  return { status: r.status, json };
}
function ago(ts: number | null | undefined, now: number) {
  if (!ts) return "never";
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 36) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
function clock(ts: number) {
  const d = new Date(ts);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
const money = (n: number) => (n >= 1000 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(n % 1 ? 2 : 0)}`);
const fmtNum = (n: number) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString() : String(Math.round(n * 100) / 100));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

// ─── page ────────────────────────────────────────────────────────────────────
export default function HubPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [view, setView] = useState<View>("home");
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [focus, setFocus] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => { setSession(loadSession()); }, []);
  const refresh = useCallback(async (s: Session) => {
    try {
      const { status, json } = await hub<Overview>(s, "/ui/overview");
      if (status === 401) { setErr("signin"); return; }
      if (status === 403) { setErr("membership"); return; }
      if (!json.ok) { setErr(json.error || "hub error"); return; }
      setErr(null); setData(json); setNow(Date.now());
    } catch { setErr("The hub is not answering right now. Your data is safe. Try again in a minute."); }
  }, []);
  useEffect(() => {
    if (!session) return;
    refresh(session);
    timer.current = window.setInterval(() => refresh(session), 8_000);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { if (timer.current) clearInterval(timer.current); clearInterval(tick); };
  }, [session, refresh]);

  if (session === undefined) return <div className="min-h-screen" />;
  if (!session || err === "signin") return <Gate reason="signin" />;
  if (err === "membership") return <Gate reason="membership" />;

  const go = (v: View) => { setView(v); setFocus(null); window.scrollTo({ top: 0 }); };
  const focused = focus && data ? data.agents.find((a) => a.slug === focus) || null : null;
  const pendingCount = data?.pending.length || 0;

  return (
    <div className="relative z-10 min-h-screen overflow-x-hidden">
      <Glow />
      <TopBar view={view} onView={go} session={session} pending={pendingCount} data={data} />
      <main className="relative mx-auto max-w-[1360px] px-5 pb-16 pt-6 sm:px-8 lg:px-10">
        {err && err !== "signin" && err !== "membership" && (
          <div className="mb-5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{err}</div>
        )}
        {!data ? <div className="pt-20 text-center text-sm text-white/40">Loading your hub…</div> : (
          <>
            {view === "home" && <Home data={data} now={now} session={session} go={go} onOpen={(s) => { setView("agents"); setFocus(s); }} onChanged={() => refresh(session)} />}
            {view === "approvals" && <Approvals data={data} now={now} session={session} onChanged={() => refresh(session)} go={go} />}
            {view === "agents" && !focused && <AgentsView data={data} now={now} onOpen={(s) => setFocus(s)} go={go} />}
            {view === "agents" && focused && <AgentDetail agent={focused} session={session} now={now} onBack={() => setFocus(null)} onChanged={() => refresh(session)} />}
            {view === "runs" && <RunsView data={data} session={session} now={now} />}
            {view === "add" && <AddAgent session={session} hasAgents={data.agents.length > 0} />}
            {view === "alerts" && <Alerts data={data} session={session} onChanged={() => refresh(session)} />}
          </>
        )}
      </main>
    </div>
  );
}

// ─── chrome ──────────────────────────────────────────────────────────────────
function Glow() {
  return (
    <>
      <div className="pointer-events-none fixed -left-40 -top-64 h-[700px] w-[1100px] rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.28),transparent_70%)]" />
      <div className="pointer-events-none fixed -bottom-72 -right-72 h-[700px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(244,114,182,0.16),transparent_70%)]" />
    </>
  );
}
function Wordmark() {
  return (
    <a href="/" className="flex items-center gap-2.5">
      <span className="text-sm font-extrabold tracking-[0.16em] text-white">TREVS<span className="text-violet-300">AGENTS</span></span>
      <span className="rounded-md border border-violet-300/40 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-violet-200">HUB</span>
    </a>
  );
}
function TopBar({ view, onView, session, pending, data }: { view: View; onView: (v: View) => void; session: Session; pending: number; data: Overview | null }) {
  const up = data ? data.agents.filter((a) => a.state === "running").length : 0;
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050507]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-5 py-3 sm:px-8 lg:px-10">
        <Wordmark />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => onView(n.id)} className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${view === n.id ? "bg-white/[0.08] text-white" : "text-white/50 hover:text-white"}`}>
              {n.label}{n.id === "approvals" && pending > 0 && <span className="ml-1.5 rounded-md bg-amber-400/15 px-1.5 py-0.5 font-mono text-[11px] text-amber-200">{pending}</span>}
            </button>
          ))}
        </nav>
        <div className="hidden items-center gap-4 text-[12px] text-white/50 lg:flex">
          {data && (
            <>
              <span className="flex items-center gap-2"><i className={`h-1.5 w-1.5 rounded-full ${up ? "bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.9)]" : "bg-white/25"}`} /><b className="font-semibold text-white">{up}</b> running</span>
              <span><b className="font-semibold text-white">{data.today.runs}</b> runs today</span>
              {data.week.money > 0 && <span><b className="font-semibold text-lime-200">{money(data.week.money)}</b> reported</span>}
            </>
          )}
          <a href="/builder" className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-white/60 hover:text-white" title={session.email}>Builder</a>
        </div>
      </div>
      <nav className="flex gap-1.5 overflow-x-auto px-5 pb-2.5 md:hidden">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => onView(n.id)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${view === n.id ? "bg-white text-black" : "border border-white/10 text-white/55"}`}>
            {n.label}{n.id === "approvals" && pending > 0 ? ` · ${pending}` : ""}
          </button>
        ))}
        <a href="/builder" className="shrink-0 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/55">Builder</a>
      </nav>
    </header>
  );
}
function Gate({ reason }: { reason: "signin" | "membership" }) {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <Glow />
      <div className="mb-8"><Wordmark /></div>
      <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-white">{reason === "signin" ? "Sign in at the builder first" : "Your membership is paused"}</h1>
      <p className="mb-7 text-[15px] leading-relaxed text-white/60">
        {reason === "signin"
          ? "The hub uses the same sign-in as the Agent Builder. Sign in there once and come straight back."
          : "The hub is part of the Inner Circle. Nothing here is deleted: resubscribe and your agents, approvals and alerts are right where you left them."}
      </p>
      <a href={reason === "signin" ? "/builder" : "https://trevsagents.gumroad.com/l/inner-circle"} className="rounded-xl bg-white px-6 py-3 text-sm font-extrabold text-black shadow-[0_10px_40px_rgba(167,139,250,0.35)]">
        {reason === "signin" ? "Go to the builder" : "Resubscribe"}
      </a>
    </main>
  );
}

// ─── pieces ──────────────────────────────────────────────────────────────────
const Card = ({ children, className = "", tone = "" }: { children: React.ReactNode; className?: string; tone?: "" | "amber" | "violet" }) => (
  <div className={`rounded-2xl border bg-[#0e0d18]/85 shadow-[0_20px_50px_rgba(0,0,0,0.45)] backdrop-blur-md ${tone === "amber" ? "border-amber-300/50 shadow-[0_0_0_1px_rgba(255,179,71,0.2),0_24px_60px_rgba(0,0,0,0.6)]" : tone === "violet" ? "border-violet-300/50" : "border-white/[0.1]"} ${className}`}>{children}</div>
);
const Primary = ({ children, onClick, disabled, className = "" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) => (
  <button onClick={onClick} disabled={disabled} className={`rounded-xl bg-white px-5 py-2.5 text-sm font-extrabold text-black shadow-[0_10px_40px_rgba(167,139,250,0.3)] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100 ${className}`}>{children}</button>
);
const Ghost = ({ children, onClick, disabled, className = "", danger = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; danger?: boolean }) => (
  <button onClick={onClick} disabled={disabled} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 ${danger ? "border-white/10 text-white/60 hover:border-rose-400/40 hover:text-rose-200" : "border-white/[0.14] bg-white/[0.03] text-white/85 hover:bg-white/[0.07]"} ${className}`}>{children}</button>
);
function Face({ agent, size = 40, rounded = "rounded-xl" }: { agent: { slug: string; name: string }; size?: number; rounded?: string }) {
  const key = agent.slug.split("-")[0];
  if (SPRITES.has(key)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/builder/sprite-${key}.png`} alt="" width={size} height={size} className={`shrink-0 ${rounded} border border-white/10 bg-[#141225] object-contain [image-rendering:pixelated]`} style={{ width: size, height: size }} />;
  }
  return <div className={`flex shrink-0 items-center justify-center ${rounded} border border-white/10 bg-violet-400/10 font-mono text-xs font-bold text-violet-100`} style={{ width: size, height: size }}>{agent.name.slice(0, 2).toUpperCase()}</div>;
}
const STATE: Record<Agent["state"], { label: string; dot: string; text: string }> = {
  running: { label: "Running", dot: "bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.9)]", text: "text-lime-200" },
  quiet: { label: "Quiet", dot: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.8)]", text: "text-amber-200" },
  failing: { label: "Failing", dot: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]", text: "text-rose-200" },
};
const Dot = ({ state }: { state: Agent["state"] }) => <i className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${STATE[state].dot}`} />;
function Numbers({ numbers, money: m }: { numbers: Run["numbers"]; money: number | null }) {
  const items = Object.entries(numbers || {});
  if (!items.length && m == null) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {m != null && <span className="rounded-md border border-lime-300/25 bg-lime-400/10 px-2 py-0.5 font-mono text-[11px] text-lime-100">{money(m)} earned</span>}
      {items.map(([k, v]) => <span key={k} className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[11px] text-white/70"><span className="text-white/40">{k} </span>{fmtNum(v)}</span>)}
    </div>
  );
}
function RunRow({ run, agents, now, showAgent = true }: { run: Run; agents: Agent[]; now: number; showAgent?: boolean }) {
  const a = agents.find((x) => x.slug === run.agent);
  const dot = run.level === "error" ? "bg-rose-400" : run.level === "warn" ? "bg-amber-300" : "bg-violet-300/70";
  return (
    <li className="flex gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <span className={`mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {showAgent && <span className="text-[13px] font-semibold text-white">{a?.name || run.agent}</span>}
          <span className="font-mono text-[11px] text-white/35" title={new Date(run.ts).toLocaleString()}>{clock(run.ts)} · {ago(run.ts, now)}</span>
        </div>
        <p className={`mt-0.5 text-[13.5px] leading-relaxed ${run.level === "error" ? "text-rose-100" : "text-white/80"}`}>{run.summary}</p>
        <Numbers numbers={run.numbers} money={run.money} />
      </div>
    </li>
  );
}
function DetailList({ detail }: { detail: Action["detail"] }) {
  if (!detail) return null;
  if (typeof detail === "string") return <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-white/65">{detail}</p>;
  const items = Object.entries(detail);
  if (!items.length) return null;
  return (
    <dl className="mt-3 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1 text-[12.5px]">
      {items.map(([k, v]) => (<><dt key={k + "k"} className="text-white/40">{k}</dt><dd key={k + "v"} className="min-w-0 break-all text-white/80 sm:break-words">{v}</dd></>))}
    </dl>
  );
}
function ActionCard({ action, agents, session, now, onChanged, first = false }: { action: Action; agents: Agent[]; session: Session; now: number; onChanged: () => void; first?: boolean }) {
  const [busy, setBusy] = useState<"yes" | "no" | null>(null);
  const [fail, setFail] = useState<string | null>(null);
  const a = agents.find((x) => x.slug === action.agent) || { slug: action.agent, name: action.agent };
  const decide = async (yes: boolean) => {
    if (busy) return;
    setBusy(yes ? "yes" : "no"); setFail(null);
    const { json } = await hub(session, `/ui/actions/${action.id}/decide`, { method: "POST", body: JSON.stringify({ yes }) });
    setBusy(null);
    if (json.ok) onChanged(); else setFail(json.error || "Could not save that.");
  };
  return (
    <Card tone={first ? "amber" : ""} className={`min-w-0 p-5 ${first ? "" : "opacity-90"}`}>
      <div className="flex items-center gap-3">
        <Face agent={a} size={34} rounded="rounded-lg" />
        <div className="min-w-0 text-[13px]"><span className="font-semibold text-white">{a.name}</span><span className="text-white/45"> is asking · {ago(action.created_at, now)}</span></div>
        {action.app && <span className="ml-auto shrink-0 rounded-md border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[11px] text-white/60">{action.app}</span>}
      </div>
      <p className="mt-3 break-words text-[16px] font-semibold leading-snug text-white">{action.label}</p>
      <DetailList detail={action.detail} />
      <div className="mt-4 flex items-center gap-2">
        <Primary onClick={() => decide(true)} disabled={!!busy}>{busy === "yes" ? "Saving…" : "Yes, do it"}</Primary>
        <Ghost onClick={() => decide(false)} disabled={!!busy}>{busy === "no" ? "Saving…" : "Not now"}</Ghost>
        <span className="ml-auto hidden font-mono text-[11px] text-white/30 sm:block">expires in {Math.max(1, Math.round((action.expires_at - now) / 86400_000))} d</span>
      </div>
      {fail && <div className="mt-2 text-xs text-rose-200">{fail}</div>}
    </Card>
  );
}
const VERDICT: Record<Action["status"], { label: string; cls: string }> = {
  pending: { label: "Waiting", cls: "text-amber-200" }, yes: { label: "Approved, not done yet", cls: "text-lime-200" }, done: { label: "Done", cls: "text-lime-200" },
  no: { label: "Declined", cls: "text-white/50" }, expired: { label: "Expired", cls: "text-white/40" },
};
function DecidedRow({ action, agents, now }: { action: Action; agents: Agent[]; now: number }) {
  const a = agents.find((x) => x.slug === action.agent);
  const v = VERDICT[action.status];
  return (
    <li className="flex items-start gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <Face agent={a || { slug: action.agent, name: action.agent }} size={28} rounded="rounded-lg" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-[13px]"><span className="font-semibold text-white">{a?.name || action.agent}</span><span className="text-white/70">{action.label}</span></div>
        <div className="mt-0.5 font-mono text-[11px] text-white/35"><span className={v.cls}>{v.label}</span> · {ago(action.decided_at || action.created_at, now)}{action.result ? ` · ${action.result}` : ""}{action.note ? ` · "${action.note}"` : ""}</div>
      </div>
    </li>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────
function Home({ data, now, session, go, onOpen, onChanged }: { data: Overview; now: number; session: Session; go: (v: View) => void; onOpen: (slug: string) => void; onChanged: () => void }) {
  const pending = data.pending;
  const running = data.agents.filter((a) => a.state === "running").length;
  const attention = data.agents.filter((a) => a.state !== "running");
  const headline = pending.length > 0
    ? <>{pending.length === 1 ? "One thing" : `${pending.length} things`} <em className="not-italic bg-gradient-to-r from-pink-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">waiting on you.</em></>
    : data.agents.length === 0
      ? <>Nothing is <em className="not-italic bg-gradient-to-r from-pink-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">reporting in</em> yet.</>
      : attention.length > 0
        ? <>{plural(running, "agent")} running, <em className="not-italic bg-gradient-to-r from-amber-200 via-pink-300 to-violet-300 bg-clip-text text-transparent">{attention.length} need{attention.length === 1 ? "s" : ""} a look.</em></>
        : <>All quiet. <em className="not-italic bg-gradient-to-r from-pink-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">{plural(running, "agent")} running.</em></>;
  const sub = data.agents.length === 0
    ? "Point an agent at the hub and it shows up here: every run, every number, and a card whenever it wants your yes before acting."
    : `${plural(data.today.runs, "run")} today, ${data.week.runs} this week${data.week.errors ? ` with ${plural(data.week.errors, "error")}` : ""}${data.week.money > 0 ? `, ${money(data.week.money)} reported earned` : ""}.`;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        <div className="text-[12px] font-semibold tracking-[0.14em] text-violet-300">YOUR OPERATION · {new Date(now).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" }).toUpperCase()}</div>
        <h1 className="mt-3 max-w-[760px] break-words text-[34px] font-extrabold leading-[1.04] tracking-[-0.03em] text-white sm:text-[54px]">{headline}</h1>
        <p className="mt-4 max-w-[620px] text-[15px] leading-relaxed text-white/55">{sub}</p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {data.agents.length === 0 ? <Primary onClick={() => go("add")}>Add an agent</Primary> : (
            <>{pending.length > 0 ? <Primary onClick={() => go("approvals")}>Answer them</Primary> : <Primary onClick={() => go("add")}>Add an agent</Primary>}<Ghost onClick={() => go("runs")}>See every run</Ghost></>
          )}
        </div>

        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between"><h2 className="text-[15px] font-bold text-white">Needs your yes</h2>{pending.length > 0 && <button onClick={() => go("approvals")} className="text-[12px] font-semibold text-amber-200">{pending.length} waiting</button>}</div>
          {pending.length === 0 ? (
            <Card className="p-5 text-[14px] leading-relaxed text-white/55">Nothing waiting. When an agent asks before it acts, the card lands here, and you get a Discord DM so you can answer from your phone.</Card>
          ) : (
            <div className="grid gap-3">
              {pending.slice(0, 3).map((p, i) => <ActionCard key={p.id} action={p} agents={data.agents} session={session} now={now} onChanged={onChanged} first={i === 0} />)}
              {pending.length > 3 && <button onClick={() => go("approvals")} className="rounded-2xl border border-dashed border-white/15 py-3 text-sm text-white/55 hover:text-white">+ {pending.length - 3} more waiting</button>}
            </div>
          )}
        </section>

        {data.decided.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-[15px] font-bold text-white">Recently answered</h2>
            <Card className="px-5"><ul>{data.decided.slice(0, 4).map((a) => <DecidedRow key={a.id} action={a} agents={data.agents} now={now} />)}</ul></Card>
          </section>
        )}
      </div>

      <aside className="space-y-6 lg:pt-10">
        <section>
          <div className="mb-2 flex items-baseline justify-between"><h2 className="text-[15px] font-bold text-white">Agents</h2>{data.agents.length > 0 && <button onClick={() => go("agents")} className="text-[12px] font-semibold text-white/45 hover:text-white">All</button>}</div>
          {data.agents.length === 0 ? <Card className="p-4 text-[13px] text-white/50">None yet.</Card> : (
            <Card className="px-4">
              {data.agents.slice(0, 8).map((a) => (
                <button key={a.slug} onClick={() => onOpen(a.slug)} className="flex w-full items-center gap-3 border-b border-white/[0.06] py-2.5 text-left last:border-0">
                  <Face agent={a} size={28} rounded="rounded-lg" />
                  <span className="w-[72px] shrink-0 truncate text-[13px] font-semibold text-white">{a.name}</span>
                  <span className={`min-w-0 flex-1 truncate text-[12px] ${a.state === "failing" ? "text-rose-200" : "text-white/50"}`}>{a.state === "quiet" ? `quiet ${ago(a.last_seen, now)}` : a.last_summary || "no runs yet"}</span>
                  <Dot state={a.state} />
                </button>
              ))}
            </Card>
          )}
        </section>
        <section>
          <div className="mb-2 flex items-baseline justify-between"><h2 className="text-[15px] font-bold text-white">Latest runs</h2>{data.runs.length > 0 && <button onClick={() => go("runs")} className="text-[12px] font-semibold text-white/45 hover:text-white">All</button>}</div>
          {data.runs.length === 0 ? <Card className="p-4 text-[13px] text-white/50">The first run lands here the moment an agent posts it.</Card> : (
            <Card className="px-4"><ul>{data.runs.slice(0, 6).map((r) => <RunRow key={r.id} run={r} agents={data.agents} now={now} />)}</ul></Card>
          )}
        </section>
      </aside>
    </div>
  );
}

// ─── Approvals ───────────────────────────────────────────────────────────────
function Approvals({ data, now, session, onChanged, go }: { data: Overview; now: number; session: Session; onChanged: () => void; go: (v: View) => void }) {
  const [history, setHistory] = useState<Action[] | null>(null);
  const load = useCallback(async () => { const { json } = await hub<{ actions: Action[] }>(session, "/ui/actions"); if (json.ok) setHistory(json.actions.filter((a) => a.status !== "pending")); }, [session]);
  useEffect(() => { load(); }, [load, data.pending.length]);
  return (
    <>
      <h1 className="text-[34px] font-extrabold tracking-[-0.03em] text-white">Approvals</h1>
      <p className="mt-1 max-w-[640px] text-[15px] text-white/55">An agent that wants to post, send, add or change something asks here first. Yes lets it go ahead on its own machine. Not now stops it. Nothing runs through the hub itself.</p>
      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_400px]">
        <section>
          <h2 className="mb-3 text-[15px] font-bold text-white">Waiting{data.pending.length ? ` · ${data.pending.length}` : ""}</h2>
          {data.pending.length === 0 ? (
            <Card className="p-5 text-[14px] leading-relaxed text-white/55">Nothing waiting. The paste on <button onClick={() => go("add")} className="font-semibold text-violet-200">Add an agent</button> tells your agent how to ask.</Card>
          ) : <div className="grid gap-3">{data.pending.map((p, i) => <ActionCard key={p.id} action={p} agents={data.agents} session={session} now={now} onChanged={onChanged} first={i === 0} />)}</div>}
        </section>
        <section>
          <h2 className="mb-3 text-[15px] font-bold text-white">Answered</h2>
          <Card className="px-5">
            {history === null ? <div className="py-4 text-sm text-white/40">Loading…</div>
              : history.length === 0 ? <div className="py-4 text-sm text-white/40">Nothing answered yet.</div>
              : <ul>{history.map((a) => <DecidedRow key={a.id} action={a} agents={data.agents} now={now} />)}</ul>}
          </Card>
        </section>
      </div>
    </>
  );
}

// ─── Agents ──────────────────────────────────────────────────────────────────
function AgentsView({ data, now, onOpen, go }: { data: Overview; now: number; onOpen: (slug: string) => void; go: (v: View) => void }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[34px] font-extrabold tracking-[-0.03em] text-white">Agents</h1><p className="mt-1 text-[15px] text-white/55">{data.agents.length ? `${plural(data.agents.length, "agent")} reporting in.` : "Nothing has reported in yet."}</p></div>
        <Primary onClick={() => go("add")}>Add an agent</Primary>
      </div>
      {data.agents.length === 0 ? (
        <Card className="mt-7 p-8 text-center">
          <h2 className="text-lg font-bold text-white">Point an agent at the hub</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/55">One paste into the Claude Code that runs it. The first run shows up within seconds.</p>
          <Primary className="mt-5" onClick={() => go("add")}>Show me the paste</Primary>
        </Card>
      ) : (
        <ul className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.agents.map((a) => (
            <li key={a.slug}>
              <button onClick={() => onOpen(a.slug)} className="block w-full text-left">
                <Card className="p-4 transition-colors hover:border-violet-300/40">
                  <div className="flex items-start gap-3">
                    <Face agent={a} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><div className="truncate text-[15px] font-bold text-white">{a.name}</div><span className={`flex items-center gap-1.5 text-[11px] font-semibold ${STATE[a.state].text}`}><Dot state={a.state} />{STATE[a.state].label}</span></div>
                      <div className="truncate text-xs text-white/45">{a.role || "no role given"}{a.version ? ` · v${a.version}` : ""}</div>
                    </div>
                  </div>
                  <p className={`mt-3 line-clamp-2 text-[13.5px] leading-relaxed ${a.state === "failing" ? "text-rose-100" : "text-white/70"}`}>{a.state === "failing" && a.last_error ? a.last_error : a.last_summary || "No runs yet."}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-white/40">
                    <span>seen {ago(a.last_seen, now)}</span><span>{a.runs_today} today</span>
                    {a.money_total > 0 && <span className="text-lime-200/80">{money(a.money_total)} reported</span>}
                    {a.waiting > 0 && <span className="text-violet-200">{a.waiting} message{a.waiting === 1 ? "" : "s"} for it</span>}
                  </div>
                </Card>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
function AgentDetail({ agent, session, now, onBack, onChanged }: { agent: Agent; session: Session; now: number; onBack: () => void; onChanged: () => void }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const { json } = await hub<{ runs: Run[] }>(session, `/ui/runs?agent=${encodeURIComponent(agent.slug)}&limit=60`); if (json.ok) setRuns(json.runs); }, [session, agent.slug]);
  useEffect(() => { load(); const t = window.setInterval(load, 10_000); return () => clearInterval(t); }, [load]);
  const say = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const { json } = await hub(session, "/ui/inbox", { method: "POST", body: JSON.stringify({ agent: agent.slug, text }) });
    setBusy(false);
    if (json.ok) { setText(""); setSent("Saved. It reads this on its next run."); onChanged(); setTimeout(() => setSent(null), 4000); } else setSent(json.error || "Could not save that.");
  };
  const remove = async () => {
    if (!confirm(`Remove ${agent.name} from the hub? Its runs and proposals go with it. The agent itself keeps running wherever it lives.`)) return;
    const { json } = await hub(session, `/ui/agents/${agent.slug}`, { method: "DELETE" });
    if (json.ok) { onChanged(); onBack(); }
  };
  return (
    <>
      <button onClick={onBack} className="mb-4 text-sm text-white/45 hover:text-white">← All agents</button>
      <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <Face agent={agent} size={64} rounded="rounded-2xl" />
          <div>
            <div className="flex items-center gap-3"><h1 className="text-[28px] font-extrabold tracking-[-0.02em] text-white">{agent.name}</h1><span className={`flex items-center gap-1.5 text-[12px] font-semibold ${STATE[agent.state].text}`}><Dot state={agent.state} />{STATE[agent.state].label}</span></div>
            <div className="mt-0.5 text-sm text-white/50">{agent.role || "no role given"}{agent.version ? ` · v${agent.version}` : ""} · reporting since {new Date(agent.registered_at).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 font-mono text-[11px] text-white/40"><span>seen {ago(agent.last_seen, now)}</span><span>{agent.runs_today} today</span><span>{agent.runs_total} total</span>{agent.money_total > 0 && <span className="text-lime-200/80">{money(agent.money_total)} reported</span>}</div>
          </div>
        </div>
        <Ghost danger onClick={remove}>Remove from hub</Ghost>
      </Card>
      {agent.state === "failing" && agent.last_error && <div className="mt-4 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"><span className="font-semibold">Last error: </span>{agent.last_error}</div>}
      <Card tone="violet" className="mt-5 p-5">
        <div className="text-[15px] font-bold text-white">Tell {agent.name} something</div>
        <p className="mt-1 text-[13px] text-white/50">It reads this on its next run and takes it as direction from you. "Pause until Monday", "focus on candles", "stop posting about X".</p>
        <div className="mt-3 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && say()} placeholder={`Message for ${agent.name}…`} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-300/50 focus:outline-none" />
          <Primary onClick={say} disabled={busy || !text.trim()}>Send</Primary>
        </div>
        {sent && <div className="mt-2 text-xs text-violet-100/80">{sent}</div>}
      </Card>
      <h2 className="mb-2 mt-7 text-[15px] font-bold text-white">Runs</h2>
      <Card className="px-5">
        <ul>
          {runs === null ? <li className="py-4 text-sm text-white/40">Loading…</li>
            : runs.length === 0 ? <li className="py-4 text-sm text-white/40">No runs yet. The first one lands here the moment it posts.</li>
            : runs.map((r) => <RunRow key={r.id} run={r} agents={[agent]} now={now} showAgent={false} />)}
        </ul>
      </Card>
    </>
  );
}

// ─── Runs ────────────────────────────────────────────────────────────────────
function RunsView({ data, session, now }: { data: Overview; session: Session; now: number }) {
  const [more, setMore] = useState<Run[]>([]);
  const [done, setDone] = useState(false);
  const [filter, setFilter] = useState("");
  const all = useMemo(() => {
    const seen = new Set<number>(); const out: Run[] = [];
    for (const r of [...data.runs, ...more]) if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
    return out.filter((r) => !filter || r.agent === filter).sort((a, b) => b.ts - a.ts);
  }, [data.runs, more, filter]);
  const loadMore = async () => {
    const last = all[all.length - 1];
    const { json } = await hub<{ runs: Run[] }>(session, `/ui/runs?limit=60${last ? `&before=${last.ts}` : ""}${filter ? `&agent=${encodeURIComponent(filter)}` : ""}`);
    if (json.ok) { setMore((m) => [...m, ...json.runs]); if (json.runs.length < 60) setDone(true); }
  };
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-[34px] font-extrabold tracking-[-0.03em] text-white">Runs</h1><p className="mt-1 text-[15px] text-white/55">Every run your agents post, newest first. Updates on its own.</p></div>
        {data.agents.length > 1 && (
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setMore([]); setDone(false); }} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">All agents</option>{data.agents.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </select>
        )}
      </div>
      <Card className="mt-7 px-5"><ul>{all.length === 0 ? <li className="py-6 text-center text-sm text-white/40">No runs yet.</li> : all.map((r) => <RunRow key={r.id} run={r} agents={data.agents} now={now} />)}</ul></Card>
      {all.length >= 40 && !done && <button onClick={loadMore} className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm text-white/60 hover:text-white">Older runs</button>}
    </>
  );
}

// ─── Add an agent ────────────────────────────────────────────────────────────
const PASTE = (name: string) => `I'm connecting my agent "${name}" to the Trevs Agents Hub, so I can see what it does and approve things from trevsagents.com/hub.

The hub is at https://hub.trevsagents.com and my key is in the environment variable TREVS_HUB_KEY (I'll put it in .env myself; never write the key into code or commit it). Every call sends the header "Authorization: Bearer $TREVS_HUB_KEY" and a JSON body.

Please add this to the agent:
1. At startup, POST /v1/agents/register with {"name":"${name}","role":"<one line on what it does>","version":"<its version>"}.
2. After every cycle, POST /v1/runs with {"agent":"${name}","summary":"<one plain-English line on what this run did, under 500 characters>","numbers":{"<label>":<number>, ... up to 12},"level":"info" | "warn" | "error","money":<dollars this run earned, only if it actually earned money>}.
3. If a cycle fails, still post a run with "level":"error" and the reason in the summary.
4. ASK BEFORE ACTING. Before anything that posts, sends, publishes, buys, deletes, or changes something outside its own files, POST /v1/actions with {"agent":"${name}","label":"<one line: what it wants to do>","app":"<where, e.g. YouTube, Gmail, Discord>","detail":{"<field>":"<value>", ... the exact text, recipient, amount}}. The reply carries an id. Poll GET /v1/actions/<id> every 30 seconds for up to 7 days: "status":"yes" means go ahead and do it, then POST /v1/actions/<id>/done with {"result":"<one line>"}; "status":"no" or "expired" means drop it and move on. Never do the thing while the status is "pending".
5. On every cycle, GET /v1/inbox?agent=${encodeURIComponent(name)} and treat each message in "messages" as direction from me (for example "pause until Monday" or "focus on candles").
6. If the agent idles between cycles, POST /v1/heartbeat with {"agent":"${name}"} about once an hour.

Keep every hub call non-blocking with a short timeout: if the hub is unreachable the agent carries on as normal and never crashes because of it. Reads and writes to my own files never need approval.`;

function AddAgent({ session, hasAgents }: { session: Session; hasAgents: boolean }) {
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (what: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1800); } catch {} };
  const nm = name.trim() || "My agent";
  const masked = session.fuelKey.slice(0, 6) + "•".repeat(Math.max(4, session.fuelKey.length - 10)) + session.fuelKey.slice(-4);
  return (
    <>
      <h1 className="text-[34px] font-extrabold tracking-[-0.03em] text-white">Add an agent</h1>
      <p className="mt-1 max-w-[680px] text-[15px] leading-relaxed text-white/55">{hasAgents ? "Any agent, any language." : "Any agent you built with the builder, or any agent at all, in any language."} Name it, paste the block into the Claude Code that runs it, put your key in its .env. It reports in within seconds, and asks you first before it acts.</p>
      <div className="mt-7 grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Agent name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scout, Etsy lister, Channel manager…" className="mb-5 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-300/50 focus:outline-none" />
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Paste into your Claude Code</span>
            <button onClick={() => copy("paste", PASTE(nm))} className="rounded-lg bg-white px-3 py-1 text-xs font-extrabold text-black">{copied === "paste" ? "Copied" : "Copy"}</button>
          </div>
          <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[12px] leading-relaxed text-white/75">{PASTE(nm)}</pre>
        </Card>
        <div className="flex flex-col gap-4">
          <Card tone="violet" className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Your hub key</div>
            <p className="mt-1 text-xs text-white/50">The same key the builder gave you. It goes in the agent's .env as TREVS_HUB_KEY and nowhere else.</p>
            <div className="mt-3 break-all rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[12px] text-white/80">{show ? session.fuelKey : masked}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => copy("key", `TREVS_HUB_KEY=${session.fuelKey}`)} className="rounded-lg bg-white px-3 py-1 text-xs font-extrabold text-black">{copied === "key" ? "Copied" : "Copy .env line"}</button>
              <button onClick={() => setShow((s) => !s)} className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/60">{show ? "Hide" : "Show"}</button>
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">What the hub does</div>
            <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-white/60">
              <li><b className="text-white">Approvals.</b> An agent asks before it posts, sends or changes anything. You answer here or from a Discord DM. Yes lets it proceed on its own machine.</li>
              <li><b className="text-white">Runs.</b> One line per cycle, with the numbers, so you know what each agent did without reading logs.</li>
              <li><b className="text-white">Direction.</b> Type a message to an agent; it reads it on its next run.</li>
              <li><b className="text-white">Alerts.</b> A DM when an agent goes quiet or reports an error.</li>
            </ul>
          </Card>
          <Card className="p-5 text-xs leading-relaxed text-white/50">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">What it never does</div>
            It never runs a model, never executes anything itself, never sees your other keys, and never touches your agent's files. It only keeps what your agents choose to post.
          </Card>
        </div>
      </div>
    </>
  );
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
function Alerts({ data, session, onChanged }: { data: Overview; session: Session; onChanged: () => void }) {
  const m = data.member;
  const [alerts, setAlerts] = useState(m.alerts);
  const [hours, setHours] = useState(m.quiet_hours);
  const [discord, setDiscord] = useState(m.discord || "");
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => { setAlerts(m.alerts); setHours(m.quiet_hours); setDiscord(m.discord || ""); }, [m.alerts, m.quiet_hours, m.discord]);
  const save = async () => {
    const { json } = await hub(session, "/ui/settings", { method: "PUT", body: JSON.stringify({ alerts, quiet_hours: hours, discord }) });
    setSaved(json.ok ? "Saved." : json.error || "Could not save."); onChanged(); setTimeout(() => setSaved(null), 3000);
  };
  return (
    <>
      <h1 className="text-[34px] font-extrabold tracking-[-0.03em] text-white">Alerts</h1>
      <p className="mt-1 max-w-[640px] text-[15px] text-white/55">A Discord DM from the Trevs Agents bot when an agent asks for your yes, goes quiet, or reports an error. Quiet and error DMs come at most once per agent per day.</p>
      <Card className="mt-7 max-w-xl p-5">
        <label className="flex items-center justify-between gap-4 py-1">
          <span><span className="block text-sm font-semibold text-white">DM me</span><span className="block text-xs text-white/45">Proposals, quiet agents and errors, to your Discord.</span></span>
          <button onClick={() => setAlerts((v) => !v)} className={`relative h-6 w-11 rounded-full border transition-colors ${alerts ? "border-violet-300/60 bg-violet-400/40" : "border-white/15 bg-white/10"}`} aria-pressed={alerts}>
            <span className={`absolute top-0.5 rounded-full bg-white transition-all ${alerts ? "left-[22px]" : "left-0.5"}`} style={{ height: 18, width: 18 }} />
          </button>
        </label>
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <label className="block text-sm font-semibold text-white">Call it quiet after</label>
          <div className="mt-2 flex items-center gap-2">
            <input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-violet-300/50 focus:outline-none" />
            <span className="text-sm text-white/50">hours without a run or heartbeat</span>
          </div>
        </div>
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <label className="block text-sm font-semibold text-white">Discord username</label>
          <p className="mt-0.5 text-xs text-white/45">Filled from your membership when we have it. The bot can only DM you if you are in the Trevs Agents server.</p>
          <input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="your handle" className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet-300/50 focus:outline-none" />
        </div>
        <div className="mt-5 flex items-center gap-3"><Primary onClick={save}>Save</Primary>{saved && <span className="text-xs text-white/60">{saved}</span>}</div>
      </Card>
    </>
  );
}
