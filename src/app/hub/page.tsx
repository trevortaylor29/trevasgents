"use client";
// Trevs Agents Hub (phase 1, 2026-10-14): the place a member's own agents report to.
// Reads the builder's signed-in account from localStorage (same session, same key), talks to
// hub.trevsagents.com directly (CORS allows this origin). No model runs anywhere in here.
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
type Overview = {
  member: { email: string; discord: string | null; alerts: boolean; quiet_hours: number };
  agents: Agent[]; runs: Run[]; today: { runs: number; money: number }; week: { runs: number; money: number; errors: number };
};
type View = "agents" | "runs" | "studio" | "add" | "settings";

const NAV: { id: View; label: string; icon: string }[] = [
  { id: "agents", label: "Agents", icon: "🛰️" },
  { id: "runs", label: "Runs", icon: "📡" },
  { id: "studio", label: "Studio", icon: "🎬" },
  { id: "add", label: "Add an agent", icon: "➕" },
  { id: "settings", label: "Alerts", icon: "🔔" },
];
// Library agents have a face. Anything else gets a monogram.
const SPRITES = new Set(["ant", "bunc", "craig", "dennis", "earl", "finn", "forge", "luke", "matt", "pham", "sage", "scout"]);

function loadSession(): Session | null {
  try {
    const a = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (!a || typeof a.email !== "string" || typeof a.fuelKey !== "string") return null;
    return { email: a.email, fuelKey: a.fuelKey, name: a.name || a.email.split("@")[0] };
  } catch { return null; }
}
async function hub<T>(s: Session, path: string, init?: RequestInit): Promise<{ status: number; json: T & { ok?: boolean; error?: string } }> {
  const r = await fetch(HUB + path, {
    ...init,
    headers: { "Content-Type": "application/json", "x-hub-email": s.email, "x-hub-key": s.fuelKey, ...(init?.headers || {}) },
  });
  const json = await r.json().catch(() => ({ ok: false, error: "hub returned nothing readable" }));
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

// ─── page ────────────────────────────────────────────────────────────────────
export default function HubPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [view, setView] = useState<View>("agents");
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
    } catch { setErr("The hub is not answering right now. It keeps your data; try again in a minute."); }
  }, []);
  useEffect(() => {
    if (!session) return;
    refresh(session);
    timer.current = window.setInterval(() => refresh(session), 10_000);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { if (timer.current) clearInterval(timer.current); clearInterval(tick); };
  }, [session, refresh]);

  if (session === undefined) return <div className="min-h-screen" />;
  if (!session || err === "signin") return <Gate reason="signin" />;
  if (err === "membership") return <Gate reason="membership" />;

  const agentsByView = data?.agents || [];
  const focused = focus ? agentsByView.find((a) => a.slug === focus) || null : null;

  return (
    <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
      <Sidebar view={view} onView={(v) => { setView(v); setFocus(null); }} session={session} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">
          {err && err !== "signin" && err !== "membership" && (
            <div className="mb-5 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{err}</div>
          )}
          {view === "agents" && !focused && <AgentsView data={data} now={now} onOpen={(s) => setFocus(s)} onAdd={() => setView("add")} />}
          {view === "agents" && focused && <AgentDetail agent={focused} session={session} now={now} onBack={() => setFocus(null)} onChanged={() => refresh(session)} />}
          {view === "runs" && <RunsView data={data} session={session} now={now} />}
          {view === "studio" && <StudioPreview />}
          {view === "add" && <AddAgent session={session} />}
          {view === "settings" && data && <Settings data={data} session={session} onChanged={() => refresh(session)} />}
        </div>
      </main>
    </div>
  );
}

// ─── chrome ──────────────────────────────────────────────────────────────────
function Wordmark() {
  return (
    <a href="/" className="flex items-baseline gap-2">
      <span className="text-sm font-bold tracking-[0.18em] text-white">TREVS<span className="text-violet-300">AGENTS</span></span>
      <span className="rounded-md border border-violet-300/30 bg-violet-400/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.14em] text-violet-200">HUB</span>
    </a>
  );
}
function Sidebar({ view, onView, session }: { view: View; onView: (v: View) => void; session: Session }) {
  return (
    <>
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-white/8 bg-white/[0.015] px-4 py-6 lg:flex">
        <div className="mb-8 px-2"><Wordmark /></div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => onView(n.id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${view === n.id ? "border border-violet-300/30 bg-violet-400/10 text-white" : "border border-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/90"}`}>
              <span className="text-base">{n.icon}</span>{n.label}
            </button>
          ))}
          <a href="/builder" className="mt-2 flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/80">
            <span className="text-base">🧱</span>Builder
          </a>
        </nav>
        <div className="mt-4 rounded-xl border border-white/8 bg-black/30 p-3">
          <div className="truncate text-xs font-medium text-white/70" title={session.email}>{session.name}</div>
          <div className="mt-1 truncate text-[11px] text-white/35">{session.email}</div>
        </div>
      </aside>
      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07080d]/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between"><Wordmark /><a href="/builder" className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/60">Builder</a></div>
        <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => onView(n.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${view === n.id ? "border border-violet-300/40 bg-violet-400/15 text-white" : "border border-white/10 text-white/50"}`}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
      </header>
    </>
  );
}
function Gate({ reason }: { reason: "signin" | "membership" }) {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-6"><Wordmark /></div>
      <h1 className="mb-3 text-2xl font-semibold text-white">{reason === "signin" ? "Sign in at the builder first" : "Your membership is paused"}</h1>
      <p className="mb-6 text-sm text-white/65">
        {reason === "signin"
          ? "The hub uses the same sign-in as the Agent Builder. Sign in there once and come straight back."
          : "The hub is part of the Inner Circle. Nothing here is deleted: resubscribe and your agents, runs and alerts are right where you left them."}
      </p>
      <a href={reason === "signin" ? "/builder" : "https://trevsagents.gumroad.com/l/inner-circle"} className="rounded-lg border border-violet-300/60 bg-violet-400/20 px-6 py-3 font-semibold text-violet-100 hover:bg-violet-400/40">
        {reason === "signin" ? "Go to the builder" : "Resubscribe"}
      </a>
    </main>
  );
}

// ─── pieces ──────────────────────────────────────────────────────────────────
function Face({ agent, size = 44 }: { agent: Pick<Agent, "slug" | "name">; size?: number }) {
  const key = agent.slug.split("-")[0];
  if (SPRITES.has(key)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`/builder/sprite-${key}.png`} alt="" width={size} height={size} className="shrink-0 rounded-xl border border-white/10 bg-black/40 object-contain [image-rendering:pixelated]" style={{ width: size, height: size }} />;
  }
  return (
    <div className="flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-violet-400/10 font-mono text-sm font-bold text-violet-100" style={{ width: size, height: size }}>
      {agent.name.slice(0, 2).toUpperCase()}
    </div>
  );
}
const STATE: Record<Agent["state"], { label: string; cls: string; dot: string }> = {
  running: { label: "Running", cls: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100", dot: "bg-emerald-300" },
  quiet: { label: "Quiet", cls: "border-amber-300/30 bg-amber-400/10 text-amber-100", dot: "bg-amber-300" },
  failing: { label: "Failing", cls: "border-rose-300/30 bg-rose-400/10 text-rose-100", dot: "bg-rose-300" },
};
function StatePill({ state }: { state: Agent["state"] }) {
  const s = STATE[state];
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${state === "running" ? "animate-pulse" : ""}`} />{s.label}</span>;
}
function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-white tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-white/40">{sub}</div>}
    </div>
  );
}
function Level({ level }: { level: Run["level"] }) {
  const c = level === "error" ? "bg-rose-400" : level === "warn" ? "bg-amber-300" : "bg-violet-300/70";
  return <span className={`mt-1.5 block h-2 w-2 shrink-0 rounded-full ${c}`} />;
}
function Numbers({ numbers, money: m }: { numbers: Run["numbers"]; money: number | null }) {
  const items = Object.entries(numbers || {});
  if (!items.length && m == null) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {m != null && <span className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 font-mono text-[11px] text-emerald-100">{money(m)} earned</span>}
      {items.map(([k, v]) => (
        <span key={k} className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[11px] text-white/70"><span className="text-white/40">{k} </span>{fmtNum(v)}</span>
      ))}
    </div>
  );
}
function RunRow({ run, agents, now, showAgent = true }: { run: Run; agents: Agent[]; now: number; showAgent?: boolean }) {
  const a = agents.find((x) => x.slug === run.agent);
  return (
    <li className="flex gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <Level level={run.level} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {showAgent && <span className="text-sm font-semibold text-white">{a?.name || run.agent}</span>}
          <span className="font-mono text-[11px] text-white/35" title={new Date(run.ts).toLocaleString()}>{clock(run.ts)} · {ago(run.ts, now)}</span>
        </div>
        <p className={`mt-0.5 text-sm leading-relaxed ${run.level === "error" ? "text-rose-100" : "text-white/80"}`}>{run.summary}</p>
        <Numbers numbers={run.numbers} money={run.money} />
      </div>
    </li>
  );
}

// ─── Agents ──────────────────────────────────────────────────────────────────
function AgentsView({ data, now, onOpen, onAdd }: { data: Overview | null; now: number; onOpen: (slug: string) => void; onAdd: () => void }) {
  if (!data) return <div className="text-sm text-white/40">Loading your hub…</div>;
  const quiet = data.agents.filter((a) => a.state !== "running").length;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Your agents</h1>
          <p className="mt-1 text-sm text-white/50">{data.agents.length ? `${data.agents.length} reporting in. ${quiet ? `${quiet} need${quiet === 1 ? "s" : ""} a look.` : "All running."}` : "Nothing has reported in yet."}</p>
        </div>
        <button onClick={onAdd} className="rounded-lg border border-violet-300/50 bg-violet-400/[0.12] px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-400/25">Add an agent</button>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Runs today" value={String(data.today.runs)} />
        <Stat label="This week" value={String(data.week.runs)} sub={data.week.errors ? `${data.week.errors} error${data.week.errors === 1 ? "" : "s"}` : "no errors"} />
        <Stat label="Reported earned" value={money(data.week.money)} sub="this week, as your agents reported it" />
        <Stat label="Agents" value={String(data.agents.length)} sub={quiet ? `${quiet} quiet or failing` : "all running"} />
      </div>
      {data.agents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-xl">🛰️</div>
          <h2 className="text-lg font-semibold text-white">Point an agent at the hub</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/55">Twelve lines in any agent and it shows up here with every run, every number and every error. One paste into your Claude Code does it.</p>
          <button onClick={onAdd} className="mt-5 rounded-lg border border-violet-300/60 bg-violet-400/20 px-5 py-2.5 text-sm font-semibold text-violet-100 hover:bg-violet-400/40">Show me the paste</button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.agents.map((a) => (
            <li key={a.slug}>
              <button onClick={() => onOpen(a.slug)} className="block w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-violet-300/40 hover:bg-violet-400/[0.05]">
                <div className="flex items-start gap-3">
                  <Face agent={a} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-base font-semibold text-white">{a.name}</div>
                      <StatePill state={a.state} />
                    </div>
                    <div className="truncate text-xs text-white/45">{a.role || "no role given"}{a.version ? ` · v${a.version}` : ""}</div>
                  </div>
                </div>
                <p className={`mt-3 line-clamp-2 text-sm leading-relaxed ${a.state === "failing" ? "text-rose-100" : "text-white/70"}`}>{a.last_summary || "No runs yet."}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-white/40">
                  <span>seen {ago(a.last_seen, now)}</span>
                  <span>{a.runs_today} today</span>
                  {a.money_total > 0 && <span className="text-emerald-200/80">{money(a.money_total)} reported</span>}
                  {a.waiting > 0 && <span className="text-violet-200">{a.waiting} waiting for it</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {data.runs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-white/40">Latest</h2>
          <ul className="rounded-2xl border border-white/10 bg-white/[0.03] px-5">{data.runs.slice(0, 8).map((r) => <RunRow key={r.id} run={r} agents={data.agents} now={now} />)}</ul>
        </section>
      )}
    </>
  );
}

function AgentDetail({ agent, session, now, onBack, onChanged }: { agent: Agent; session: Session; now: number; onBack: () => void; onChanged: () => void }) {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { json } = await hub<{ runs: Run[] }>(session, `/ui/runs?agent=${encodeURIComponent(agent.slug)}&limit=60`);
    if (json.ok) setRuns(json.runs);
  }, [session, agent.slug]);
  useEffect(() => { load(); const t = window.setInterval(load, 10_000); return () => clearInterval(t); }, [load]);
  const say = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const { json } = await hub(session, "/ui/inbox", { method: "POST", body: JSON.stringify({ agent: agent.slug, text }) });
    setBusy(false);
    if (json.ok) { setText(""); setSent("Saved. It picks this up on its next run."); onChanged(); setTimeout(() => setSent(null), 4000); }
    else setSent(json.error || "Could not save that.");
  };
  const remove = async () => {
    if (!confirm(`Remove ${agent.name} from the hub? Its runs go with it. The agent itself keeps running wherever it lives.`)) return;
    const { json } = await hub(session, `/ui/agents/${agent.slug}`, { method: "DELETE" });
    if (json.ok) { onChanged(); onBack(); }
  };
  return (
    <>
      <button onClick={onBack} className="mb-4 text-sm text-white/45 hover:text-white">← All agents</button>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-4">
          <Face agent={agent} size={64} />
          <div>
            <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold text-white">{agent.name}</h1><StatePill state={agent.state} /></div>
            <div className="mt-1 text-sm text-white/50">{agent.role || "no role given"}{agent.version ? ` · v${agent.version}` : ""} · reporting since {new Date(agent.registered_at).toLocaleDateString([], { month: "short", day: "numeric" })}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 font-mono text-[11px] text-white/40">
              <span>seen {ago(agent.last_seen, now)}</span><span>{agent.runs_today} today</span><span>{agent.runs_total} total</span>
              {agent.money_total > 0 && <span className="text-emerald-200/80">{money(agent.money_total)} reported</span>}
            </div>
          </div>
        </div>
        <button onClick={remove} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/45 hover:border-rose-400/30 hover:text-rose-200">Remove from hub</button>
      </div>
      {agent.state === "failing" && agent.last_error && (
        <div className="mb-5 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"><span className="font-semibold">Last error: </span>{agent.last_error}</div>
      )}
      <div className="mb-6 rounded-2xl border border-violet-300/25 bg-violet-400/[0.06] p-4">
        <label className="mb-2 block text-sm font-semibold text-white">Tell {agent.name} something</label>
        <p className="mb-3 text-xs text-white/50">It reads this on its next run and takes it as direction from you. "Pause for the weekend", "focus on candles", "stop posting about X".</p>
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && say()} placeholder={`Message for ${agent.name}…`}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-300/50 focus:outline-none" />
          <button onClick={say} disabled={busy || !text.trim()} className="rounded-lg border border-violet-300/60 bg-violet-400/20 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-400/40 disabled:opacity-40">Send</button>
        </div>
        {sent && <div className="mt-2 text-xs text-violet-100/80">{sent}</div>}
      </div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-white/40">Runs</h2>
      <ul className="rounded-2xl border border-white/10 bg-white/[0.03] px-5">
        {runs === null ? <li className="py-4 text-sm text-white/40">Loading…</li>
          : runs.length === 0 ? <li className="py-4 text-sm text-white/40">No runs yet. The first one lands here the moment it posts.</li>
          : runs.map((r) => <RunRow key={r.id} run={r} agents={[agent]} now={now} showAgent={false} />)}
      </ul>
    </>
  );
}

// ─── Runs feed ───────────────────────────────────────────────────────────────
function RunsView({ data, session, now }: { data: Overview | null; session: Session; now: number }) {
  const [more, setMore] = useState<Run[]>([]);
  const [done, setDone] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const base = data?.runs || [];
  const all = useMemo(() => {
    const seen = new Set<number>(); const out: Run[] = [];
    for (const r of [...base, ...more]) if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
    return out.filter((r) => !filter || r.agent === filter).sort((a, b) => b.ts - a.ts);
  }, [base, more, filter]);
  const loadMore = async () => {
    const last = all[all.length - 1];
    const { json } = await hub<{ runs: Run[] }>(session, `/ui/runs?limit=60${last ? `&before=${last.ts}` : ""}${filter ? `&agent=${encodeURIComponent(filter)}` : ""}`);
    if (json.ok) { setMore((m) => [...m, ...json.runs]); if (json.runs.length < 60) setDone(true); }
  };
  if (!data) return <div className="text-sm text-white/40">Loading…</div>;
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold text-white">Runs</h1><p className="mt-1 text-sm text-white/50">Every run your agents post, newest first. Updates on its own.</p></div>
        {data.agents.length > 1 && (
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setMore([]); setDone(false); }} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none">
            <option value="">All agents</option>
            {data.agents.map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </select>
        )}
      </div>
      <ul className="rounded-2xl border border-white/10 bg-white/[0.03] px-5">
        {all.length === 0 ? <li className="py-6 text-center text-sm text-white/40">No runs yet.</li> : all.map((r) => <RunRow key={r.id} run={r} agents={data.agents} now={now} />)}
      </ul>
      {all.length >= 40 && !done && <button onClick={loadMore} className="mt-4 w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 text-sm text-white/60 hover:text-white">Older runs</button>}
    </>
  );
}

// ─── Studio (preview of what ships next) ─────────────────────────────────────
function StudioPreview() {
  return (
    <>
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/[0.08] px-3.5 py-1.5 text-xs font-medium text-violet-100">Preview · the Studio is being built now</div>
        <h1 className="text-2xl font-semibold text-white">Studio</h1>
        <p className="mt-1 max-w-2xl text-sm text-white/55">Short videos for TikTok and Shorts, made by your own agent on your own keys. Two ways in: give it an idea, or let it find what is working right now and say "make ten on that". Finished videos land here as cards. You download, you post.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/40">What a finished video looks like here</h2>
          <div className="flex gap-4">
            <div className="relative flex h-56 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-violet-500/20 via-black/60 to-pink-500/10">
              <span className="text-3xl opacity-80">▶</span>
              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white/70">0:23 · 9:16</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-white">3 free tools that run my Etsy shop while I sleep</div>
              <div className="mt-1 text-xs text-white/45">Slideshow · from your idea "automation for small shops"</div>
              <p className="mt-3 text-sm leading-relaxed text-white/75">Caption: I stopped doing this by hand in March. Here is the exact stack. Save this one.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">{["#etsyseller", "#smallbusiness", "#automation", "#aitools"].map((t) => <span key={t} className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5 font-mono text-[11px] text-white/60">{t}</span>)}</div>
              <div className="mt-3 flex items-center gap-2 text-xs"><span className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-2 py-0.5 font-mono text-emerald-100">hook 8.1</span><span className="text-white/40">strong first 2 seconds, retention risk at 14 s</span></div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled className="rounded-lg border border-violet-300/60 bg-violet-400/20 px-4 py-2 text-sm font-semibold text-violet-100 opacity-60">Download</button>
            <button disabled className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60 opacity-60">Redo</button>
            <button disabled className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60 opacity-60">Kill</button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {[
            ["Your idea", "Type it, paste a script, or drop screenshots and links to videos you like. The agent pulls the format from them: hook style, pacing, where the captions sit."],
            ["Find what is working", "It scans Shorts and TikTok for what is winning right now in the genres you pick, shows you three examples each and why, and you say how many to make."],
            ["Slideshows and AI video", "Slideshows cost almost nothing. AI video runs through your own Higgsfield account, so the price shows before you press make."],
            ["You post", "No auto-posting in this version. Every card has the file, the caption and the hashtags ready. You decide what goes out."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="text-sm font-semibold text-white">{t}</div><p className="mt-1 text-sm leading-relaxed text-white/55">{d}</p></div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Add an agent ────────────────────────────────────────────────────────────
const PASTE = (name: string) => `I'm connecting my agent "${name}" to the Trevs Agents Hub so I can see its runs at trevsagents.com/hub.

The hub is at https://hub.trevsagents.com and my key is in the environment variable TREVS_HUB_KEY (I'll put it in .env myself; never write the key into code or commit it). Every call sends the header "Authorization: Bearer $TREVS_HUB_KEY" and a JSON body.

Please add this to the agent:
1. At startup, POST /v1/agents/register with {"name":"${name}","role":"<one line on what it does>","version":"<its version>"}.
2. After every cycle, POST /v1/runs with {"agent":"${name}","summary":"<one plain-English line on what this run did, under 500 characters>","numbers":{"<label>":<number>, ... up to 12},"level":"info" | "warn" | "error","money":<dollars this run earned, only if it actually earned money>}.
3. If a cycle fails, still post a run with "level":"error" and the reason in the summary.
4. On every cycle, GET /v1/inbox?agent=${encodeURIComponent(name)} and treat each message in "messages" as direction from me (for example "pause until Monday" or "focus on candles").
5. If the agent idles between cycles, POST /v1/heartbeat with {"agent":"${name}"} about once an hour.

Keep every hub call non-blocking with a short timeout: if the hub is unreachable the agent carries on as normal and never crashes because of it.`;

function AddAgent({ session }: { session: Session }) {
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (what: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(null), 1800); } catch {} };
  const nm = name.trim() || "My agent";
  const masked = session.fuelKey.slice(0, 6) + "•".repeat(Math.max(4, session.fuelKey.length - 10)) + session.fuelKey.slice(-4);
  return (
    <>
      <h1 className="text-2xl font-semibold text-white">Add an agent</h1>
      <p className="mt-1 max-w-2xl text-sm text-white/55">Any agent in any language. Name it, paste the block into the Claude Code that runs it, and put your key in its .env. The first run shows up here within seconds.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-white/40">Agent name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scout, Etsy lister, Channel manager…" className="mb-4 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-300/50 focus:outline-none" />
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-white/40">Paste into your Claude Code</span>
            <button onClick={() => copy("paste", PASTE(nm))} className="rounded-md border border-violet-300/50 bg-violet-400/[0.12] px-3 py-1 text-xs font-semibold text-violet-100 hover:bg-violet-400/25">{copied === "paste" ? "Copied" : "Copy"}</button>
          </div>
          <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-[12px] leading-relaxed text-white/75">{PASTE(nm)}</pre>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-violet-300/25 bg-violet-400/[0.06] p-5">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-white/40">Your hub key</div>
            <p className="mt-1 text-xs text-white/50">The same key the builder gave you. It goes in the agent's .env as TREVS_HUB_KEY and nowhere else.</p>
            <div className="mt-3 break-all rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[12px] text-white/80">{show ? session.fuelKey : masked}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => copy("key", `TREVS_HUB_KEY=${session.fuelKey}`)} className="rounded-md border border-violet-300/50 bg-violet-400/[0.12] px-3 py-1 text-xs font-semibold text-violet-100 hover:bg-violet-400/25">{copied === "key" ? "Copied" : "Copy .env line"}</button>
              <button onClick={() => setShow((s) => !s)} className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60">{show ? "Hide" : "Show"}</button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60">
            <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-white/40">Try it from a terminal</div>
            <pre className="overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/50 p-3 font-mono text-[11px] leading-relaxed text-white/70">{`curl -s https://hub.trevsagents.com/v1/agents/register \\
  -H "Authorization: Bearer $TREVS_HUB_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"${nm}","role":"test"}'

curl -s https://hub.trevsagents.com/v1/runs \\
  -H "Authorization: Bearer $TREVS_HUB_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"agent":"${nm}","summary":"first run from the terminal","numbers":{"things":3}}'`}</pre>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-xs leading-relaxed text-white/50">
            <div className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-white/40">What the hub never does</div>
            It never runs a model, never sees your other keys, and never touches your agent's files. It only keeps what your agents choose to post.
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Alerts / settings ───────────────────────────────────────────────────────
function Settings({ data, session, onChanged }: { data: Overview; session: Session; onChanged: () => void }) {
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
      <h1 className="text-2xl font-semibold text-white">Alerts</h1>
      <p className="mt-1 max-w-2xl text-sm text-white/55">A Discord DM from the Trevs Agents bot when an agent goes quiet or reports an error. One message per agent per day, never more.</p>
      <div className="mt-6 max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label className="flex items-center justify-between gap-4 py-2">
          <span><span className="block text-sm font-medium text-white">DM me</span><span className="block text-xs text-white/45">Quiet agents and errors, to your Discord.</span></span>
          <button onClick={() => setAlerts((v) => !v)} className={`relative h-6 w-11 rounded-full border transition-colors ${alerts ? "border-violet-300/60 bg-violet-400/40" : "border-white/15 bg-white/10"}`} aria-pressed={alerts}>
            <span className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-all ${alerts ? "left-[22px]" : "left-0.5"}`} style={{ height: 18, width: 18 }} />
          </button>
        </label>
        <div className="mt-3 border-t border-white/[0.06] pt-4">
          <label className="block text-sm font-medium text-white">Call it quiet after</label>
          <div className="mt-2 flex items-center gap-2">
            <input type="number" min={1} max={168} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-24 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white focus:border-violet-300/50 focus:outline-none" />
            <span className="text-sm text-white/50">hours without a run or heartbeat</span>
          </div>
        </div>
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <label className="block text-sm font-medium text-white">Discord username</label>
          <p className="mt-0.5 text-xs text-white/45">Filled from your membership when we have it. The bot can only DM you if you are in the Trevs Agents server.</p>
          <input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="your handle" className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-300/50 focus:outline-none" />
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} className="rounded-lg border border-violet-300/60 bg-violet-400/20 px-5 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-400/40">Save</button>
          {saved && <span className="text-xs text-white/60">{saved}</span>}
        </div>
      </div>
    </>
  );
}
