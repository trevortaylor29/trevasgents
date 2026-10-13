// The Critic — Inner Circle business teardown. Two-column desktop dossier: sticky
// left rail (grade + bar scorecard), right column (verdict → money → one thing →
// roast w/ 'the fix' → steal this → 7-day timeline → top-10% → wins). Trevs Agents
// brand (dark #07080d, pink→violet→cyan, Geist sans — no serif) + scroll progress bar.

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useScroll, useSpring, type Variants } from "framer-motion";

/* ── types ─────────────────────────────────────────────────────────────── */

type RoastDim = { dimension: string; verdict: string; fix: string; money_impact: "high" | "medium" | "low"; effort?: string };
type Critique = {
  business_name?: string;
  model?: string;
  grade?: string;
  one_liner?: string;
  gut_reaction?: string;
  money_left_on_table?: string;
  the_one_thing?: string;
  scores?: Record<string, number>;
  score_reasons?: Record<string, string>;
  roast?: RoastDim[];
  steal_this?: { label?: string; before?: string | null; after?: string };
  seven_day_plan?: Array<{ day?: string; move?: string }>;
  benchmark?: string;
  whats_working?: string[];
  quick_wins?: string[];
  needs_a_call?: boolean;
  needs_a_call_reason?: string;
};

type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; result: Critique; taskId: number }
  | { kind: "doneMd"; markdown: string; taskId: number }
  | { kind: "error"; message: string };

/* ── palette (brand: pink→violet→cyan on near-black) ───────────────────── */

const BRAND = "linear-gradient(135deg, #f9a8d4, #c4b5fd, #67e8f9)";
const IMPACT: Record<string, { c: string; label: string }> = {
  high: { c: "#fb7185", label: "High impact" },
  medium: { c: "#c4b5fd", label: "Medium" },
  low: { c: "#7dd3fc", label: "Low" },
};
const scoreColor = (v: number) => (v >= 7 ? "#34d399" : v >= 5 ? "#c4b5fd" : "#fb7185");
const gradeColor = (g?: string) => {
  const c = (g || "").trim().charAt(0).toUpperCase();
  if (c === "A") return "#34d399";
  if (c === "B") return "#a3e635";
  if (c === "C") return "#fbbf24";
  return "#fb7185";
};

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 1280;
      let { width, height } = img;
      if (width > max || height > max) {
        const s = max / Math.max(width, height);
        width = Math.round(width * s); height = Math.round(height * s);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("bad image")); };
    img.src = url;
  });
}

/* ── running (staged) ──────────────────────────────────────────────────── */

const STAGES = ["Reading your submission", "Studying the storefront", "Scoring five dimensions", "Ranking every fix by money impact", "Writing your report"];

function RunningView() {
  const [secs, setSecs] = useState(0);
  useEffect(() => { const t = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(t); }, []);
  const marks = [4, 14, 30, 48];
  const idx = marks.findIndex(m => secs < m);
  const stage = idx === -1 ? STAGES.length - 1 : idx;
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-24">
      <div className="mb-8 text-center text-2xl font-semibold tracking-tight text-white">The Critic is reading&hellip;</div>
      <div className="w-full space-y-3.5">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {i < stage ? <span className="text-[13px] text-emerald-400">✓</span>
                : i === stage ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "#c4b5fd" }} />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: "#c4b5fd" }} />
                  </span>
                ) : <span className="h-1.5 w-1.5 rounded-full bg-white/15" />}
            </span>
            <span className={`text-[14px] transition-colors duration-500 ${i < stage ? "text-white/35 line-through decoration-white/20" : i === stage ? "text-white/90" : "text-white/30"}`}>{s}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 font-mono text-[11px] tabular-nums text-white/30">{secs}s · Claude Opus 4.8</div>
    </div>
  );
}

/* ── report (wide two-column desktop dossier, brand-themed + progress bar) ── */

const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function Tag({ children, tone = "rgba(196,181,253,0.75)" }: { children: ReactNode; tone?: string }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em]" style={{ color: tone }}>{children}</span>
      <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(196,181,253,0.2), transparent)" }} />
    </div>
  );
}

function Report({ r, taskId, onReset }: { r: Critique; taskId: number; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const scoreEntries = Object.entries(r.scores || {});
  const avg = scoreEntries.length ? scoreEntries.reduce((s, [, v]) => s + v, 0) / scoreEntries.length : null;

  const copyAfter = async () => {
    if (!r.steal_this?.after) return;
    try { await navigator.clipboard.writeText(r.steal_this.after); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };

  return (
    <>
      {/* scroll progress bar */}
      <motion.div className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left" style={{ scaleX, background: BRAND }} />

      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }} className="w-full">

        {/* masthead row */}
        <motion.div variants={rise} className="mb-8 border-b border-white/10 pb-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.26em] text-white/35">
            <span>Trevs Agents · Inner Circle · Confidential member report</span>
            <span>Teardown Nº {String(taskId).padStart(3, "0")} · {dateStr}</span>
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[330px_1fr]">

          {/* ── left rail: grade + scorecard (sticky) ── */}
          <motion.aside variants={rise} className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
              <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/35">Overall grade</div>
              <div className="my-1 text-[100px] font-black leading-[0.9]" style={{ color: gradeColor(r.grade), textShadow: `0 0 55px ${gradeColor(r.grade)}44` }}>
                {r.grade || (avg != null ? (avg >= 7 ? "B" : avg >= 5 ? "C" : "D") : "—")}
              </div>
              {r.business_name && <div className="mt-2 text-[15px] font-semibold leading-tight text-white">{r.business_name}</div>}
              {r.model && <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-white/35">{r.model}</div>}
            </div>

            {scoreEntries.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <Tag>Scorecard</Tag>
                <div className="space-y-4">
                  {scoreEntries.map(([k, v]) => (
                    <div key={k}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-white/85">{k}</span>
                        <span className="font-mono text-[14px] font-bold tabular-nums" style={{ color: scoreColor(v) }}>{v}<span className="text-[9px] text-white/25">/10</span></span>
                      </div>
                      <div className="mt-1.5 h-[4px] w-full overflow-hidden rounded-full bg-white/8">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${v * 10}%` }} transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }} className="h-full rounded-full" style={{ background: scoreColor(v) }} />
                      </div>
                      {r.score_reasons?.[k] && <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">{r.score_reasons[k]}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.aside>

          {/* ── right column ── */}
          <div className="min-w-0 space-y-7">

            {/* verdict */}
            <motion.div variants={rise}>
              {r.one_liner && <p className="text-[22px] font-semibold leading-snug text-white">&ldquo;{r.one_liner}&rdquo;</p>}
              {r.gut_reaction && <p className={`${r.one_liner ? "mt-3" : ""} text-[15px] leading-relaxed text-white/70`}>{r.gut_reaction}</p>}
            </motion.div>

            {/* money left on the table */}
            {r.money_left_on_table && (
              <motion.div variants={rise} className="rounded-2xl p-6" style={{ background: "linear-gradient(120deg, rgba(52,211,153,0.10), rgba(52,211,153,0.03) 60%)", border: "1px solid rgba(52,211,153,0.3)" }}>
                <Tag tone="rgba(110,231,183,0.8)">Money left on the table</Tag>
                <p className="text-[16px] leading-relaxed text-emerald-50/95">{r.money_left_on_table}</p>
              </motion.div>
            )}

            {/* if you do one thing */}
            {r.the_one_thing && (
              <motion.div variants={rise} className="rounded-2xl p-6" style={{ background: "linear-gradient(120deg, rgba(167,139,250,0.15), rgba(103,232,249,0.05) 70%)", border: "1px solid rgba(167,139,250,0.42)" }}>
                <Tag tone="rgba(196,181,253,0.9)">If you do one thing this week</Tag>
                <p className="text-[19px] font-semibold leading-snug text-white">{r.the_one_thing}</p>
              </motion.div>
            )}

            {/* the roast — problem + the fix */}
            {r.roast && r.roast.length > 0 && (
              <motion.div variants={rise}>
                <Tag>The roast · ranked by money impact</Tag>
                <div className="space-y-4">
                  {r.roast.map((d, i) => {
                    const im = IMPACT[d.money_impact] || IMPACT.low;
                    return (
                      <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5" style={{ borderLeft: `2px solid ${im.c}` }}>
                        <div className="mb-2.5 flex flex-wrap items-center gap-2.5">
                          <span className="text-[15px] font-bold text-white">{d.dimension.charAt(0) + d.dimension.slice(1).toLowerCase()}</span>
                          <span className="rounded-full px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-wider" style={{ color: im.c, background: `${im.c}18`, border: `1px solid ${im.c}40` }}>{im.label}</span>
                          {d.effort && <span className="rounded-full border border-white/12 px-2 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-white/45">⏱ {d.effort}</span>}
                        </div>
                        <p className="text-[14px] leading-relaxed text-white/75">{d.verdict}</p>
                        {d.fix && (
                          <div className="mt-3 border-l-2 border-emerald-400/45 pl-3.5">
                            <p className="text-[13.5px] leading-relaxed text-emerald-100/85"><span className="font-semibold text-emerald-300">The fix — </span>{d.fix}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* steal this */}
            {r.steal_this?.after && (
              <motion.div variants={rise} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <Tag tone="rgba(196,181,253,0.85)">Steal this — {r.steal_this.label || "your rewrite"}</Tag>
                {r.steal_this.before && (
                  <div className="mb-3 rounded-lg bg-black/40 px-4 py-3">
                    <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-rose-300/50">before</div>
                    <p className="text-[14px] leading-relaxed text-white/40 line-through decoration-rose-400/30">{r.steal_this.before}</p>
                  </div>
                )}
                <div className="rounded-lg px-4 py-3" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.3)" }}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-violet-300/70">after — paste-ready</span>
                    <button onClick={copyAfter} className="rounded border border-white/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50 transition-colors hover:text-white">{copied ? "✓ copied" : "copy"}</button>
                  </div>
                  <p className="text-[15px] leading-relaxed text-violet-50">{r.steal_this.after}</p>
                </div>
              </motion.div>
            )}

            {/* your next 7 days — vertical timeline */}
            {r.seven_day_plan && r.seven_day_plan.length > 0 && (
              <motion.div variants={rise}>
                <Tag>Your next 7 days</Tag>
                <div className="relative">
                  {r.seven_day_plan.map((p, i) => (
                    <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                      {i < (r.seven_day_plan!.length - 1) && <span className="absolute left-[9px] top-6 h-full w-px bg-white/10" />}
                      <span className="relative z-10 mt-0.5 h-[19px] w-[19px] shrink-0 rounded-full border-2" style={{ borderColor: "rgba(196,181,253,0.7)", background: "#07080d" }} />
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-300/70">{p.day || `Day ${i + 1}`}</div>
                        <p className="mt-1 text-[14.5px] leading-relaxed text-white/80">{p.move}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* what the top 10% looks like */}
            {r.benchmark && (
              <motion.div variants={rise} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <Tag>What the top 10% version looks like</Tag>
                <p className="text-[15px] leading-relaxed text-white/75">{r.benchmark}</p>
              </motion.div>
            )}

            {/* quick wins + keep doing this */}
            {((r.whats_working?.length || 0) > 0 || (r.quick_wins?.length || 0) > 0) && (
              <motion.div variants={rise} className="grid gap-8 sm:grid-cols-2">
                {r.quick_wins && r.quick_wins.length > 0 && (
                  <div>
                    <Tag tone="rgba(110,231,183,0.7)">Quick wins</Tag>
                    <ol className="space-y-3">
                      {r.quick_wins.map((w, i) => (
                        <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-white/78"><span className="font-mono text-[12px] font-bold text-emerald-400">{String(i + 1).padStart(2, "0")}</span><span>{w}</span></li>
                      ))}
                    </ol>
                  </div>
                )}
                {r.whats_working && r.whats_working.length > 0 && (
                  <div>
                    <Tag>Keep doing this</Tag>
                    <ul className="space-y-3">
                      {r.whats_working.map((w, i) => (
                        <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-white/65"><span className="mt-0.5 text-emerald-400">✓</span><span>{w}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}

            {/* deeper-issue callout (no paid call — points to the community) */}
            {r.needs_a_call && (
              <motion.div variants={rise} className="rounded-2xl p-6 text-center" style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.12), rgba(103,232,249,0.05))", border: "1px solid rgba(167,139,250,0.4)" }}>
                <div className="text-[19px] font-semibold text-white">This one needs more than a roast.</div>
                <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed text-white/65">{r.needs_a_call_reason || "There's real strategic depth here — worth working through with people who get it."}</p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300/60">Bring it to the Inner Circle Discord — we&apos;ll dig in together</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* footer */}
        <motion.div variants={rise} className="mt-9 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.24em] text-white/25">
            <span>Generated by The Critic · Claude Opus 4.8</span>
            <span>trevsagents.com</span>
          </div>
          <button onClick={onReset} className="mt-6 w-full rounded-lg border border-white/12 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white">Run another teardown</button>
        </motion.div>
      </motion.div>
    </>
  );
}

/* ── page ──────────────────────────────────────────────────────────────── */

export default function CriticPage() {
  const [code, setCode] = useState("");
  const [biz, setBiz] = useState("");
  const [link, setLink] = useState("");
  const [shots, setShots] = useState<string[]>([]);
  const [docs, setDocs] = useState<{ name: string; text: string }[]>([]);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const submitting = useRef(false); // hard guard against double-submit (rapid clicks / re-fire)

  useEffect(() => { try { const c = localStorage.getItem("critic-code"); if (c) setCode(c); } catch {} }, []);
  useEffect(() => { try { if (code) localStorage.setItem("critic-code", code); } catch {} }, [code]);

  const addFiles = async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 3 - shots.length);
    for (const f of imgs) { try { const d = await compressImage(f); setShots(s => (s.length >= 3 ? s : [...s, d])); } catch {} }
  };

  // Text/markdown docs — offer copy, business plans, specs. Read as text, cap 150KB.
  const addDocs = async (files: FileList | File[]) => {
    const list = Array.from(files).filter(f => {
      const n = f.name.toLowerCase();
      return f.type.startsWith("text/") || /\.(md|markdown|txt|csv|json|rtf)$/.test(n);
    }).slice(0, 3 - docs.length);
    for (const f of list) {
      try { const text = (await f.text()).slice(0, 150_000); if (text.trim()) setDocs(d => (d.length >= 3 ? d : [...d, { name: f.name.slice(0, 80), text }])); } catch {}
    }
  };

  const hasInput = biz.trim() || link.trim() || shots.length > 0 || docs.length > 0;
  const ready = code.trim() && hasInput;

  const submit = async () => {
    if (!ready || submitting.current) return;   // guard: one submit at a time
    submitting.current = true;
    setState({ kind: "running" });
    try {
      const r = await fetch("/api/critic", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_code: code.trim(), business_input: biz.trim(), link: link.trim() || null, images: shots, documents: docs, member: "member" }),
      });
      const j = await r.json();
      if (!j.ok) { submitting.current = false; setState({ kind: "error", message: j.error || "Something went wrong." }); return; }
      const taskId = j.task_id as number;
      const token = (j.result_token as string) || "";
      const started = Date.now();
      const poll = async (): Promise<void> => {
        if (Date.now() - started > 480_000) { submitting.current = false; setState({ kind: "error", message: "Timed out — try again." }); return; }
        const pr = await fetch(`/api/critic-result?taskId=${taskId}&token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const pj = await pr.json();
        // Resolve the moment the task is done — NEVER poll into a timeout when a result exists.
        // Structured JSON → premium dossier. Markdown/prose drift → render it as-is (still a full
        // teardown). Empty result → clean retry error, not an infinite spinner.
        if (pj.status === "done") {
          submitting.current = false;
          if (pj.result) { setState({ kind: "done", result: pj.result, taskId }); return; }
          const raw = (pj.raw || "").toString().trim();
          if (raw.length > 40) { setState({ kind: "doneMd", markdown: raw, taskId }); return; }
          setState({ kind: "error", message: "The Critic finished but the write-up didn't come through — hit run again." }); return;
        }
        if (["blocked", "failed", "rejected"].includes(pj.status)) { submitting.current = false; setState({ kind: "error", message: "The Critic couldn't finish this one — try rephrasing." }); return; }
        setTimeout(poll, 4000);
      };
      setTimeout(poll, 4000);
    } catch (e) { submitting.current = false; setState({ kind: "error", message: e instanceof Error ? e.message : String(e) }); }
  };

  const reset = () => { submitting.current = false; setState({ kind: "idle" }); setBiz(""); setLink(""); setShots([]); setDocs([]); };
  const wide = state.kind === "done" || state.kind === "doneMd";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#07080d] text-[#f4f1ec] antialiased" style={{ fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui" }}>
      {/* ambient brand glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px]" style={{ background: "radial-gradient(ellipse 70% 100% at 50% -12%, rgba(167,139,250,0.16) 0%, rgba(103,232,249,0.05) 42%, transparent 72%)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

      <div className={`relative z-10 mx-auto flex min-h-screen w-full flex-col px-5 py-14 sm:px-8 ${wide ? "max-w-6xl" : "max-w-xl"}`}>

        {/* masthead */}
        <div className={`text-center ${wide ? "mb-7" : "mb-9"}`}>
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-10" style={{ background: "linear-gradient(90deg, transparent, rgba(196,181,253,0.5))" }} />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-violet-300/80">Inner Circle Exclusive</span>
            <span className="h-px w-10" style={{ background: "linear-gradient(90deg, rgba(196,181,253,0.5), transparent)" }} />
          </div>
          <h1 className={`font-black leading-[0.95] tracking-tight ${wide ? "text-[38px] sm:text-[44px]" : "text-[52px] sm:text-[64px]"}`}>
            <span className="animate-gradient-text">The Critic</span>
          </h1>
          {!wide && <p className="mt-4 text-[16px] leading-relaxed text-white/55">A brutal, graded teardown of your business — and the exact fixes worth money.</p>}
        </div>

        {(state.kind === "idle" || state.kind === "error") && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.035] to-transparent shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">

              {/* ACCESS CODE — prominent, unmissable */}
              <div className="p-5 sm:p-6">
                <div className="rounded-xl border border-violet-400/45 bg-violet-500/[0.08] p-4 shadow-[0_0_30px_-8px_rgba(167,139,250,0.4)]">
                  <label className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-violet-200">
                    <span>🔒</span> Inner Circle Access Code
                  </label>
                  <input
                    value={code} onChange={e => setCode(e.target.value)}
                    placeholder="paste your code here"
                    className="w-full rounded-lg border border-violet-400/40 bg-black/50 px-4 py-3 text-center font-mono text-[16px] tracking-[0.3em] text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-white/30 focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                  />
                  <p className="mt-2 text-center text-[11.5px] text-white/45">Find it in the <span className="text-violet-200">#⚒️ inner-circle-tools</span> channel of the Inner Circle Discord.</p>
                </div>
              </div>

              <div className="px-5 pb-6 sm:px-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/8" />
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-white/35">now show him your business</span>
                  <span className="h-px flex-1 bg-white/8" />
                </div>

                {/* 01 describe */}
                <div className="mb-4">
                  <div className="mb-2 flex items-baseline gap-2.5"><span className="font-mono text-[13px] font-bold text-violet-300/70">01</span><span className="text-[13px] font-semibold text-white/80">Tell him about it</span></div>
                  <textarea value={biz} onChange={e => setBiz(e.target.value)} rows={4}
                    placeholder="What you sell, your price, where (Etsy / Shopify / a service / TikTok), and how it's going. Detail sharpens the teardown."
                    className="w-full resize-none rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/25 transition-colors focus:border-violet-400/45 focus:outline-none" />
                </div>

                {/* 02 link */}
                <div className="mb-4">
                  <div className="mb-2 flex items-baseline gap-2.5"><span className="font-mono text-[13px] font-bold text-violet-300/70">02</span><span className="text-[13px] font-semibold text-white/80">Drop the link <span className="font-normal text-white/30">— he&apos;ll read the live page</span></span></div>
                  <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://yourstore.etsy.com/…"
                    className="w-full rounded-lg border border-white/10 bg-black/45 px-4 py-3 text-[14px] text-white placeholder:text-white/25 transition-colors focus:border-violet-400/45 focus:outline-none" />
                </div>

                {/* 03 screenshots */}
                <div className="mb-6">
                  <div className="mb-2 flex items-baseline gap-2.5"><span className="font-mono text-[13px] font-bold text-violet-300/70">03</span><span className="text-[13px] font-semibold text-white/80">Show him screenshots <span className="font-normal text-white/30">— up to 3</span></span></div>
                  <div
                    onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
                    onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
                    onClick={() => shots.length < 3 && fileRef.current?.click()}
                    className={`cursor-pointer rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${drag ? "border-violet-400/70 bg-violet-500/[0.07]" : "border-white/14 bg-black/30 hover:border-white/28"}`}
                  >
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
                    {shots.length === 0 ? (
                      <div className="text-[13px] text-white/38"><span className="text-white/60">Click or drag</span> — your listing, storefront, ad, or analytics</div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {shots.map((s, i) => (
                          <div key={i} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={s} alt={`shot ${i + 1}`} className="h-16 w-16 rounded-md border border-white/15 object-cover" />
                            <button onClick={e => { e.stopPropagation(); setShots(shots.filter((_, j) => j !== i)); }} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black text-[11px] text-white/70 hover:text-white">×</button>
                          </div>
                        ))}
                        {shots.length < 3 && <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-white/20 text-xl text-white/30">+</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* 04 attach a doc */}
                <div className="mb-6">
                  <div className="mb-2 flex items-baseline gap-2.5"><span className="font-mono text-[13px] font-bold text-violet-300/70">04</span><span className="text-[13px] font-semibold text-white/80">Or attach a doc <span className="font-normal text-white/30">— .md, .txt, offer copy, a plan</span></span></div>
                  <input ref={docRef} type="file" accept=".md,.markdown,.txt,.csv,.json,.rtf,text/*" multiple className="hidden" onChange={e => { if (e.target.files) addDocs(e.target.files); e.target.value = ""; }} />
                  <div
                    onDragOver={e => { e.preventDefault(); }}
                    onDrop={e => { e.preventDefault(); addDocs(e.dataTransfer.files); }}
                    onClick={() => docs.length < 3 && docRef.current?.click()}
                    className="cursor-pointer rounded-lg border border-dashed border-white/14 bg-black/30 px-4 py-4 text-center transition-colors hover:border-white/28"
                  >
                    {docs.length === 0 ? (
                      <div className="text-[13px] text-white/38"><span className="text-white/60">Click or drag</span> — a markdown/text file (business plan, sales copy, product spec)</div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {docs.map((d, i) => (
                          <span key={i} className="flex items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white/80">
                            <span className="text-violet-300/80">📄</span>{d.name}
                            <button onClick={e => { e.stopPropagation(); setDocs(docs.filter((_, j) => j !== i)); }} className="text-white/45 hover:text-white">×</button>
                          </span>
                        ))}
                        {docs.length < 3 && <span className="rounded-md border border-dashed border-white/20 px-2.5 py-1.5 text-[12px] text-white/35">+ add</span>}
                      </div>
                    )}
                  </div>
                </div>

                {state.kind === "error" && <div className="mb-5 rounded-lg border border-rose-400/30 bg-rose-500/[0.07] px-4 py-3 text-[13px] text-rose-200">{state.message}</div>}

                <button onClick={submit} disabled={!ready}
                  className="w-full rounded-lg py-4 font-mono text-[12px] font-bold uppercase tracking-[0.24em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ background: BRAND, boxShadow: "0 12px 36px -8px rgba(167,139,250,0.5)" }}>
                  {code.trim() ? "Begin the teardown" : "Enter your access code first"}
                </button>
                <p className="mt-3.5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-white/25">≈ a couple minutes · graded report · Claude Opus 4.8</p>
              </div>
            </div>

            {/* what you get */}
            <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/8 bg-white/8">
              {[{ t: "A grade", d: "A+ to F, no sugar" }, { t: "The money", d: "what you're leaving behind" }, { t: "A 7-day plan", d: "exact moves, sized to evenings" }].map((x, i) => (
                <div key={i} className="bg-[#0b0c14] px-4 py-4 text-center">
                  <div className="text-[15px] font-bold text-white/85">{x.t}</div>
                  <div className="mt-0.5 text-[10.5px] leading-snug text-white/35">{x.d}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {state.kind === "running" && <RunningView />}

        <AnimatePresence>
          {state.kind === "done" && <Report r={state.result} taskId={state.taskId} onReset={reset} />}
          {state.kind === "doneMd" && <MarkdownReport markdown={state.markdown} onReset={reset} />}
        </AnimatePresence>
      </div>
    </main>
  );
}

/* ── markdown fallback ─────────────────────────────────────────────────────
   When the Critic returns a prose/markdown teardown instead of the structured
   JSON (the model sometimes prefers writing it long-form), we render it as-is
   rather than timing the member out. Lightweight renderer — no extra deps. */

function inline(text: string, keyBase: string): ReactNode[] {
  // handle **bold**, *italic*, `code` — order matters (bold before italic)
  const nodes: ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] != null) nodes.push(<strong key={`${keyBase}-${i}`} className="font-semibold text-white">{m[2]}</strong>);
    else if (m[3] != null) nodes.push(<em key={`${keyBase}-${i}`} className="text-white/90">{m[3]}</em>);
    else if (m[4] != null) nodes.push(<code key={`${keyBase}-${i}`} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-200">{m[4]}</code>);
    last = m.index + m[0].length; i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function MarkdownView({ md }: { md: string }) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: string[] | null = null, k = 0;
  const flushList = () => {
    if (list && list.length) {
      blocks.push(
        <ul key={`ul-${k++}`} className="my-3 space-y-1.5 pl-1">
          {list.map((li, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-white/75">
              <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full" style={{ background: "#c4b5fd" }} />
              <span>{inline(li, `li-${k}-${i}`)}</span>
            </li>
          ))}
        </ul>
      );
    }
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*[-*]\s+/.test(line)) { (list ||= []).push(line.replace(/^\s*[-*]\s+/, "")); continue; }
    flushList();
    if (!line.trim()) continue;
    if (/^###\s+/.test(line)) { blocks.push(<h3 key={k++} className="mt-6 mb-2 text-[15px] font-semibold uppercase tracking-wide text-white/70">{inline(line.replace(/^###\s+/, ""), `h3-${k}`)}</h3>); continue; }
    if (/^##\s+/.test(line)) { blocks.push(<h2 key={k++} className="mt-8 mb-2.5 text-[22px] font-bold text-white">{inline(line.replace(/^##\s+/, ""), `h2-${k}`)}</h2>); continue; }
    if (/^#\s+/.test(line)) { blocks.push(<h1 key={k++} className="mb-3 text-[30px] font-black leading-tight text-white">{inline(line.replace(/^#\s+/, ""), `h1-${k}`)}</h1>); continue; }
    if (/^---+$/.test(line.trim())) { blocks.push(<hr key={k++} className="my-6 border-white/10" />); continue; }
    if (/^>\s?/.test(line)) { blocks.push(<blockquote key={k++} className="my-3 border-l-2 border-violet-400/50 pl-4 text-[15px] italic text-white/70">{inline(line.replace(/^>\s?/, ""), `bq-${k}`)}</blockquote>); continue; }
    blocks.push(<p key={k++} className="my-3 text-[15px] leading-relaxed text-white/80">{inline(line, `p-${k}`)}</p>);
  }
  flushList();
  return <div>{blocks}</div>;
}

function MarkdownReport({ markdown, onReset }: { markdown: string; onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#67e8f9" }} />The Critic · Teardown
      </div>
      <article className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 sm:p-9">
        <MarkdownView md={markdown} />
      </article>
      <button onClick={onReset} className="mt-6 w-full rounded-lg border border-white/12 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white">Run another teardown</button>
    </motion.div>
  );
}
