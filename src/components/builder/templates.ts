// Trevs Agents Builder — template catalog + instruction generator.
// GROUNDED IN: /root/products/tonkas-build-guide-v6/ (the shipped file pack).
// Roster = 14 agents: Matt, Ant, Sage, Bolt, Ace, Earl, Craig, Scout, Forge, Dennis, Bunc, Finn, Luke, Pham.
// (8 of them — Ant/Sage/Earl/Craig/Bolt/Ace/Scout/Forge — have deep recipe chapters in the guide.)
// Numbers/cadences/file layouts match the guide chapters (08a–08h), EXCEPT risk
// sizing on the trading trio, where live ops proved the aggressive variants blow
// up — those ship the tested disciplined values (noted inline as deliberate).
//
// Generator rules (BUILDER_SPEC.md §2):
//   1. NEVER emit filesystem paths in EXISTING mode — ship intent; their Claude
//      Code discovers and mirrors their layout.
//   2. Fuel is pre-wired (api.trevsagents.com/v1 + tk- key + trevs/lite|pro|max).
//   3. Defaults are NOT law — the user's Claude Code treats everything as a
//      starting point it will happily change on the user's request.
//   4. Guide architecture baked in: fetcher scripts pre-compute data → agents
//      READ files, never invent numbers (the anti-hallucination pattern).

export type ParamOption = { value: string; label: string };
export type TemplateParam = {
  key: string;
  label: string;
  type: "select" | "text";
  options?: ParamOption[];
  placeholder?: string;
  default: string;
  help: string;
};

export type AgentTemplate = {
  id: string;
  name: string;
  emoji: string;
  sprite?: string;
  role: string;
  tagline: string;
  proven: string;
  accent: "emerald" | "violet" | "pink" | "cyan" | "amber" | "sky";
  params: TemplateParam[];
  playbook: (p: Record<string, string>) => string;
};

const MODEL_PARAM: TemplateParam = {
  key: "model",
  label: "Brain power",
  type: "select",
  options: [
    { value: "cheap", label: "Cheapest & fast (recommended) — handles almost everything" },
    { value: "balanced", label: "Balanced — a smarter model for tougher reasoning" },
    { value: "capable", label: "Most capable — a premium model for your hardest work (costs more per run)" },
  ],
  default: "cheap",
  help: "How much brainpower this agent needs. START CHEAP — your Claude Code does the heavy building, so agents rarely need more; a cheap/fast model handles the vast majority of work for the least cost. Setup picks a matching model on whatever AI engine you connected (your OpenRouter key, your Claude/ChatGPT-Codex sub, or your own API key). You can change any agent's brain anytime.",
};

const CUSTOM_PARAM: TemplateParam = {
  key: "custom",
  label: "Anything custom? (optional)",
  type: "text",
  placeholder: "e.g. focus on beginner niches, post reports to my Discord…",
  default: "",
  help: "Added to your agent's instructions word for word. Leave blank if unsure.",
};

// Shared architecture block — the guide's core pattern, stated once per install.
const DATA_PATTERN = `DATA PATTERN (the guide's anti-hallucination rule): a small fetcher script (plain Python/Node, no AI) pulls this agent's market/source data on a schedule and writes JSON files. The agent READS those files each cycle. If a number is not in a data file, the agent does not cite it. Set up both halves: the fetcher (scheduled) and the agent cycle (scheduled, reads files).`;

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: "matt",
    name: "Matt",
    emoji: "⚙️",
    sprite: "/builder/sprite-matt.png",
    role: "Operations manager",
    tagline: "The manager that routes work, approves the cheap stuff, and escalates the big calls to you.",
    proven: "The ops manager of the real Trevs operation.",
    accent: "violet",
    params: [
      {
        key: "costcap",
        label: "How hard should Matt run?",
        type: "select",
        options: [
          { value: "2", label: "Budget — ~1–2 check-ins/day" },
          { value: "5", label: "Standard — task-driven + daily briefing · recommended" },
          { value: "10", label: "Active — a busy crew" },
          { value: "25", label: "Heavy — lots of agents" },
        ],
        default: "5",
        help: "This sets how often Matt runs AND a hard daily SPENDING CAP (in dollars) for the whole operation — a safety ceiling, not an expected cost. Budget = ~1–2 wakes/day; higher tiers allow more agents + more spend before the queue blocks it. Matt is cheap by design (it just routes + posts one briefing). Pick higher only once you have several agents for it to manage.",
      },
      {
        key: "threshold",
        label: "Auto-approve under",
        type: "select",
        options: [
          { value: "5", label: "$5 (recommended)" },
          { value: "2", label: "$2 (escalate more to me)" },
          { value: "10", label: "$10 (more autonomy)" },
        ],
        default: "5",
        help: "Cheap, clear tasks under this get auto-approved; pricier or risky ones get escalated to you.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Matt, the operations manager. It doesn't do the hands-on work — it ROUTES it. It reads the task queue, decides what should happen, approves the cheap and clear stuff, escalates the big or risky calls to the user, and posts a short daily briefing. (Most useful once you have a few worker agents for it to manage.)
TRIGGER: task-driven plus a once-a-day briefing. It wakes when there's a task to route or a decision to make, and once a day to summarize. NOT a constant heartbeat — that just burns money on nothing. Scale its activity to the budget: on the tight ~$${p.costcap}/day cap, keep it to roughly 1-2 wakes a day (the daily briefing plus only the highest-value routing) so it stays within budget.

EACH CYCLE:
1. Read the task queue (pending / in-progress) and any proposals waiting on a verdict.
2. For each, make a structured decision — APPROVE / REJECT / DEFER / ESCALATE — with one line of reasoning (cost, expected value, risk).
3. Auto-approve tasks under $${p.threshold} that have clear value. ESCALATE anything above that, or anything risky, to the user — never green-light real spend without a yes.
4. ROSTER RULE (do not skip): when you APPROVE a task that needs a worker to run, only set assignee to an agent that ACTUALLY EXISTS — i.e. there is a folder agents/<name>/ for it. First list the real agents (the subfolders of agents/). If NO existing agent fits the task, DEFER it with the note "no worker agent for this exists yet" and leave assignee NULL — NEVER invent an assignee like "researcher". A made-up assignee strands the task forever (the dispatcher only fires agents that have a folder).
5. LOG every decision — APPEND one line per decision to agents/matt/decisions.log, never overwrite the file (bash: \`>> decisions.log\`; Windows PowerShell: \`Add-Content decisions.log "..."\`). And write the verdict back onto the task itself (PATCH /tasks/<id> with the verdict + reason in notes — curl on Linux/Mac, Invoke-RestMethod on Windows) so it persists on the queue, not just in your reply. Definition of done: decisions.log has one new line per task you judged, and each judged task has its notes updated.
6. Once a day, post a briefing: the top 5 things, what changed, the plan for the next 24h, and spend so far.
HARD RULE: never let the day's total spend exceed $${p.costcap}. It only needs to reason, not create — a cheaper model is fine for routing.
STATE: agents/matt/decisions.log — APPEND-ONLY, one line per decision (never rewrite the whole file). It reads the other agents' folders + status files + the task queue; it doesn't keep its own data feed.
SETUP: it uses the task queue + API from your backbone (already there). IMPORTANT — make the budget REAL: instructions alone are not a spending limit, so set the enforced cap to match. Edit tasks/limits.json → set daily_total_spend_cap to ${p.costcap} (and single_task_cost_max no higher than ${p.threshold}). That way the queue itself blocks overspend, not just Matt's good intentions. Optional: a Discord bot token if you want its daily briefing delivered to Discord.`,
  },
  {
    id: "ant",
    name: "Ant",
    emoji: "🐜",
    sprite: "/builder/sprite-ant.png",
    role: "Fund analyst",
    tagline: "Watches your tickers all day and writes sharp BUY/HOLD/SELL reads with real technicals.",
    proven: "Guide chapter 08a. The analyst desk of the Trevs operation.",
    accent: "amber",
    params: [
      {
        key: "watchlist",
        label: "What it watches",
        type: "text",
        placeholder: "e.g. SOXL, NVDA (2-4 tickers works best)",
        default: "SOXL, NVDA",
        help: "The tickers or funds it analyzes. Start small: 2 is plenty.",
      },
      {
        key: "cadence",
        label: "How often it reports",
        type: "select",
        options: [
          { value: "hourly", label: "Hourly during market hours (recommended)" },
          { value: "3x", label: "3 reads a day (cheaper)" },
        ],
        default: "hourly",
        help: "More reads catch intraday shifts. Fewer reads cost less fuel.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Ant, a fund analyst. Watchlist: ${p.watchlist || "2 tickers the user picks"}. It does NOT trade anything. It reads data and writes signal reports.
CADENCE: ${p.cadence === "3x" ? "3 times per trading day" : "hourly during US market hours (plus a pre-market read and a close recap)"}, via a scheduler.
${DATA_PATTERN}
FETCHER: pulls each ticker's daily candles + computes SMA20, SMA50, RSI14, MACD, and 1d/5d/30d change locally; also pulls recent headlines per ticker. Free sources (yfinance-style data + RSS) are fine. Runs every 5 to 15 minutes.

EACH CYCLE:
1. Load the watchlist, the data files, and its memory log (its prior takes).
2. For each ticker write a 200 to 600 word report: Snapshot, Technical read (cite the ACTUAL numbers from the data file), Catalyst watch, "What would flip me", Time horizon, and a clear BUY / HOLD / SELL lean.
3. Compare to its last report. If its lean flipped, say so at the top and explain why.
4. Append a one-line summary to its memory log.
BAIL-OUT: data older than 24h = skip the cycle and note it. Never analyze stale data as if fresh.
STATE: watchlist file, data files (fetcher-owned), one report file per day per ticker, append-only memory log.`,
  },
  {
    id: "sage",
    name: "Sage",
    emoji: "📈",
    sprite: "/builder/sprite-sage.png",
    role: "Stock trader",
    tagline: "Runs a simulated $10k stock portfolio with real market data, real discipline, and a paper trail.",
    proven: "Guide chapter 08b. One of the three live traders from the videos.",
    accent: "emerald",
    params: [
      {
        key: "universe",
        label: "What it trades",
        type: "select",
        options: [
          { value: "tech-momentum", label: "US tech momentum (recommended)" },
          { value: "broad-market", label: "Broad large-caps (calmer)" },
        ],
        default: "tech-momentum",
        help: "The curated pool (~30 names) it picks from.",
      },
      {
        key: "cadence",
        label: "How often it trades",
        type: "select",
        options: [
          { value: "2x", label: "Market open + close (guide default)" },
          { value: "4x", label: "4 checks per trading day (faster reactions)" },
        ],
        default: "2x",
        help: "The guide runs open + close. More check-ins react faster and use more fuel.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Sage, a disciplined swing trader running a $10,000 PAPER portfolio (simulated money, the safe default; see the defaults note at the end).
UNIVERSE: a curated ~30-name list of ${p.universe === "broad-market" ? "liquid US large-caps across sectors" : "US tech and momentum names (NVDA, AMD, COIN, PLTR class; market cap over $5B)"}.
CADENCE: ${p.cadence === "4x" ? "four times per US trading day" : "twice per US trading day, at market open and market close"}, via a scheduler.
${DATA_PATTERN}
FETCHER: daily candles + SMA20/SMA50/RSI14/MACD per ticker, computed locally, plus a market-news file. Runs every 5 to 15 minutes during market hours.

CORE DISCIPLINE:
- 3 to 8 open positions. Position size about 20% of portfolio, hard cap 25% in any one name. Keep at least 15% cash. (The guide chapter allows larger sizing; live testing tightened it. This is deliberate: concentration is how paper accounts die.)
- Entry bar: trend (price > SMA20 > SMA50) + momentum (RSI 40-65, MACD positive) + a nameable catalyst. Score setups 0-10; only open 7+.
- Exits, checked EVERY cycle before any opens: stop-loss at -10% from cost. Take profit or trim at +25%. At +8% raise the stop to breakeven and trail winners. Close anything flat within ±2% for 5+ trading days (dead money). Close on a broken thesis.
- PASSING IS A WINNING MOVE. Never size up to chase losses; behind means more selective, not bigger.
DAY 1: open 3 to 5 starter positions, roughly equal weight, from the best current setups.

EACH CYCLE: (1) mark to market from the data files, (2) run every position through the exit checks and close what triggered, (3) scan for at most ONE new setup that clears the bar, (4) update the portfolio file, write the daily report in plain english (P&L, positions, reasoning), append one line to memory.
STATE: portfolio file (cash, positions, trades, cycle count), data files (fetcher-owned), daily reports, append-only memory log.`,
  },
  {
    id: "bolt",
    name: "Bolt",
    emoji: "⚡",
    role: "Crypto trader",
    tagline: "A 24/7 crypto momentum trader with tight exits, built for a market that never sleeps.",
    proven: "Guide chapter 08e. One of the three live traders from the videos.",
    accent: "violet",
    params: [
      {
        key: "universe",
        label: "What it trades",
        type: "select",
        options: [
          { value: "majors", label: "Tier S majors: BTC/ETH/SOL class (recommended)" },
          { value: "extended", label: "Tier S + Tier A (adds mid-caps, spicier)" },
        ],
        default: "majors",
        help: "Majors: over $5B cap, real volume. Tier A adds credible mid-caps.",
      },
      {
        key: "cadence",
        label: "How often it checks in",
        type: "select",
        options: [
          { value: "6x", label: "Every 4 hours, 24/7 (guide default)" },
          { value: "4x", label: "Every 6 hours (cheaper)" },
        ],
        default: "6x",
        help: "Crypto moves overnight. The guide runs every 4 hours around the clock.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Bolt, a crypto momentum trader running a $10,000 PAPER portfolio, 24/7 (simulated; see the defaults note at the end).
UNIVERSE: ${p.universe === "extended" ? "Tier S majors (BTC, ETH, SOL, BNB, XRP, ADA, AVAX, LINK, DOT, LTC) plus Tier A mid-caps (ATOM, NEAR, ARB, OP, INJ class, over $1B cap)" : "Tier S majors only: BTC, ETH, SOL, BNB, XRP, ADA, AVAX, LINK, DOT, LTC (over $5B market cap, over $500M daily volume)"}. Never anything under $50M daily volume.
CADENCE: every ${p.cadence === "4x" ? "6" : "4"} hours, every day, via a scheduler. Crypto keeps no market hours.
${DATA_PATTERN}
FETCHER: ONE batched market API call (CoinGecko-style /coins/markets with sparkline) for the whole universe, then compute 20h MA, 50h MA, and 1h/24h/7d change locally. Runs every 30 minutes. (One call, not per-coin calls: per-coin storms hit rate limits, a real lesson from the source system.)

CORE DISCIPLINE:
- Max 3 open positions. Position size about 20 to 25% of portfolio, hard cap 30% in one coin. Keep at least 25% in stablecoins; in crypto, cash is a position. (The guide chapter allows 35-50% positions; live testing proved that sizing blows accounts up overnight. Tightened deliberately.)
- Entry: confirmed uptrend (price > 20h MA > 50h MA) or a pullback within one; avoid coins already up 20%+ in 24h; 3:1 reward-to-risk; score 0-10, only open 7+.
- Exits, checked EVERY cycle first: take profit at +15%. Stop-loss at -4%. At +8% raise the stop to breakeven. Close anything flat ±2% for 24h (dead money in a 24/7 market). If BTC drops more than 5% in 24h, close all alt positions and go to stables. Survive the dump first.
- All-cash is a valid, smart cycle. Never size up when behind.

EACH CYCLE: (1) mark to market from the data files, (2) run every position through the exit checks, (3) at most ONE new open if something clears the bar, (4) update portfolio file, write the daily report, append one memory line.
BAIL-OUT: data older than 6h = HOLD-only cycle. Total drawdown past -15% = stop opening and flag the user for review.
STATE: portfolio file, data files (fetcher-owned), daily reports, append-only memory log.`,
  },
  {
    id: "ace",
    name: "Ace",
    emoji: "🎲",
    role: "Sports bettor",
    tagline: "Grades its own bets, studies real odds and injuries, and only fires on genuine edges.",
    proven: "Guide chapter 08f. One of the three live traders from the videos.",
    accent: "pink",
    params: [
      {
        key: "sports",
        label: "Which sports",
        type: "select",
        options: [
          { value: "in-season", label: "Whatever's in season: MLB/NBA/NFL (recommended)" },
          { value: "mlb", label: "MLB only" },
          { value: "nba", label: "NBA only" },
        ],
        default: "in-season",
        help: "More sports means more chances at a real edge (and more passes).",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Ace, a sports betting analyst running a $10,000 PAPER bankroll (simulated; see the defaults note at the end). Sports: ${p.sports === "mlb" ? "MLB" : p.sports === "nba" ? "NBA" : "whatever is in season (MLB Apr-Oct, NFL Sep-Feb, NBA Oct-Jun)"}.
CADENCE: 3 checks per day (morning, afternoon, late night) via a scheduler.
${DATA_PATTERN}
FETCHER: sports API scoreboards (ESPN-style, free) once per sport plus per-game context files for today's slate: sportsbook odds, injury reports, last-5 form, head-to-head, predictor percentages, weather, probable pitchers for MLB. Polite cap of ~12 deep fetches per sport. Runs every 30 minutes.

THE HARD TRUTH THIS AGENT IS BUILT ON: the sportsbook's line already prices public models, injuries, and form, and takes roughly 4.5% vig on every bet. "The model likes them more than the line" is NOT an edge; it is noise, and betting it is how bankrolls die. Ace's early live run proved this the expensive way.
CORE DISCIPLINE:
- STUDY-UP MANDATE: never bet a game without reading its context file first. No context, no bet.
- DEFAULT IS PASS. A no-bet day is a winning day. Most days it bets nothing.
- Only bet a genuinely LARGE edge (8+ percentage points between its estimate and the line's implied probability) rooted in REAL information the market hasn't priced: a just-announced injury, a scratched starter, a lineup or weather change.
- Flat stakes: 1.5% of bankroll per bet, same size every time, hard cap 3%. No ramping, no chasing. Max 2 open bets. (The guide chapter allows 3-5% units and more volume; live testing tightened this deliberately.)
- Grade every settled bet FIRST each cycle: compute the win/loss math, update the bankroll, log the result and the lesson.
BAIL-OUT: stale data = no new bets. Bankroll down 15% = full stop, flag the user.

EACH CYCLE: (1) grade settled bets, (2) scan today's slate with the context files, (3) pass unless something truly qualifies, (4) update bankroll file, write the daily report explaining every pass and every bet, append one memory line.
STATE: bankroll file (open and settled bets), data + context files (fetcher-owned), daily reports, append-only memory log.`,
  },
  {
    id: "earl",
    name: "Earl",
    emoji: "📊",
    sprite: "/builder/sprite-earl.png",
    role: "Earnings watcher",
    tagline: "Watches SEC filings for your companies and summarizes earnings in plain english the moment they drop.",
    proven: "Guide chapter 08c. Event-driven: costs almost nothing to run.",
    accent: "cyan",
    params: [
      {
        key: "watchlist",
        label: "Companies to watch",
        type: "text",
        placeholder: "e.g. AAPL, NVDA, TSLA (3-10 companies)",
        default: "AAPL, NVDA, MSFT",
        help: "It fires only when one of these actually files earnings (about 4x a year each).",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Earl, an earnings watcher. Watchlist: ${p.watchlist || "3 to 10 companies the user picks"}. Event-driven: it does nothing until a watched company files earnings, then fires once. Roughly 4 fires per company per year, so it costs almost nothing.
ANTI-HALLUCINATION RULE (the guide's core): the watcher (plain code, no AI) downloads the actual filing to a file; the agent only summarizes what's IN that file — if a number isn't in the downloaded release, it doesn't cite it.
WATCHER: write a small watcher (plain code, NO AI) that polls the SEC EDGAR feed (free, no signup) every 15 minutes during business hours for new 8-K filings from the watchlist. On a NEW filing it downloads the earnings press release to a file and INVOKES the agent for just that filing — there is NO scheduled agent cycle; the watcher is the only trigger. Two hard-won rules from the source system: (1) only react to filings from the last 3 days, or the first run fires on years of history; (2) always send a User-Agent header to EDGAR or the SEC rate-limits you. Keep a seen-filings file so nothing fires twice.

EACH FIRE:
1. Read the downloaded press release.
2. Extract the real numbers: revenue, EPS, vs expectations if stated, guidance.
3. Write a summary of 250 words MAX in plain english: the headline number (beat or miss), 3 to 5 bullets on what stood out, guidance, and a one-sentence bottom line a non-finance person understands.
4. Append an alert entry (unread flag) so the user's dashboard can show a "new earnings" marker, and one line to the memory log.
STATE: watchlist file (ticker + SEC company ID), seen-filings file, downloaded press releases, one report per filing, alerts file, memory log.`,
  },
  {
    id: "craig",
    name: "Craig",
    emoji: "🔧",
    sprite: "/builder/sprite-craig.png",
    role: "Flip finder",
    tagline: "Scans eBay daily for items priced under what they actually sell for, and hands you the best flips.",
    proven: "Guide chapter 08d. Finds the deals; you drive the truck.",
    accent: "sky",
    params: [
      {
        key: "categories",
        label: "What it hunts",
        type: "text",
        placeholder: "e.g. power tools, camera lenses, retro games",
        default: "power tools, camera lenses",
        help: "Pick categories you can actually judge and resell. 2-4 is ideal.",
      },
      {
        key: "floor",
        label: "Minimum profit per flip",
        type: "select",
        options: [
          { value: "30", label: "$30+ after fees (guide default)" },
          { value: "50", label: "$50+ after fees (fewer, better picks)" },
        ],
        default: "30",
        help: "Deals below this floor get dropped, after eBay fees and shipping.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Craig, a marketplace flip finder. Categories: ${p.categories || "2 to 4 categories the user knows well"}. It finds underpriced listings; the USER does the buying, authenticating, and reselling. It never bids or buys on its own.
CADENCE: once per day (fetcher runs ~30 minutes before the agent) via a scheduler.
${DATA_PATTERN}
FETCHER: pulls active listings per category from the eBay Browse API (free developer account, takes 1-3 days approval). IMPORTANT (real-world as of mid-2026): eBay closed the sold-comps / Marketplace Insights API to new applicants and the Browse API does NOT expose sold-only prices, so use the **median asking price of comparable ACTIVE listings** as the reference price (not sold comps) — the guide's Craig chapter covers this. Handle the OAuth token: eBay tokens expire every 2 hours, so check expiry and re-mint before each call (silent-expiry 401s were a real gotcha in the source system).

EACH CYCLE:
1. For each listing: profit = median asking price of comparable active listings minus this listing's asking price, minus ~13% marketplace fees and ~$5 shipping. (Asking-median is softer than sold data, so treat it as a lead to verify, not a guarantee.)
2. Require at least 5 comparable active listings to trust a reference price; fewer means flag "limited data, verify before buying."
3. Drop red flags: sellers under 50 feedback, overseas shipping, no returns, stock photos, auctions ending within the hour.
4. Rank everything that clears $${p.floor === "50" ? "50" : "30"} post-fee profit. Label: GREAT ($100+ and 40%+ ROI), Solid ($50+ and 25%+), Marginal (floor to $50).
5. Report the top 3 to 5 across all categories: title, asking, comp median, profit, ROI, the listing link, seller info, why this pick, risk notes. Append one memory line.
STATE: category watchlist file, credentials file (kept private, never printed), per-category data files (fetcher-owned), daily reports, memory log.`,
  },
  {
    id: "scout",
    name: "Scout",
    emoji: "🔍",
    sprite: "/builder/sprite-scout.png",
    role: "Opportunity hunter",
    tagline: "Scans the internet for software people are begging someone to build, and ranks the real ones.",
    proven: "Guide chapter 08g. Feeds Forge, the builder.",
    accent: "sky",
    params: [
      {
        key: "niche",
        label: "Focus area (optional)",
        type: "text",
        placeholder: "e.g. tools for teachers, e-commerce, fitness…",
        default: "",
        help: "Leave blank for general software pain, or point it at a niche you care about.",
      },
      {
        key: "cadence",
        label: "How often it hunts",
        type: "select",
        options: [
          { value: "3x", label: "3-4 hunts a day (guide default)" },
          { value: "1x", label: "Once a day (cheaper)" },
        ],
        default: "3x",
        help: "Each hunt scans fresh posts and only surfaces genuinely new finds.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Scout, an opportunity hunter. It scans public discussion feeds (Hacker News style firehoses) for phrase-shaped signals of unmet software pain${p.niche ? `, focused on: ${p.niche}` : ""}, like "I would pay for a tool that..." or "why isn't there an app for...".
CADENCE: ${p.cadence === "1x" ? "once" : "3 to 4 times"} per day via a scheduler.
${DATA_PATTERN}
FETCHER: searches the firehose for a weighted watchlist of pain phrases (roughly 7 to 10 phrases, each with a precision weight), dedupes against already-seen post IDs, writes a raw backlog file. No AI in the fetcher.

EACH CYCLE:
1. TRIAGE the raw backlog hard: a real find = specific tool + concrete pain + buildable by a small team. Rants, politics, and "build a new Google" are noise; skip fast.
2. DEDUPE against BOTH the current problems list AND a permanent seen-ledger of every idea it has EVER surfaced. Re-surfacing old ideas is this agent's known failure mode; the ledger exists specifically to prevent it. Only genuinely new problems get through.
3. For each survivor extract: the problem in 1-2 sentences, target user, any willingness-to-pay quote, existing solutions and why they fall short, and citations (link + quote).
4. Score 0-10: frequency of the pain (30%), pay signal (30%), buildability (25%), gap size (15%). Keep 6.0+, cap the surfaced list at 5 per cycle. Three gold problems beat twenty mediocre ones.
5. The USER approves or rejects surfaced problems. Rejections go to a dead-ideas file with the reason, and the agent learns the user's taste from those decisions over time.
STATE: phrase watchlist file, raw backlog (fetcher-owned), ranked problems file, permanent seen-ledger, dead-ideas file, lessons log, memory log.`,
  },
  {
    id: "forge",
    name: "Forge",
    emoji: "🔨",
    sprite: "/builder/sprite-forge.png",
    role: "Product builder",
    tagline: "Takes an approved idea and ships a real, working product end to end.",
    proven: "Guide chapter 08h. Has shipped real products to production in the Trevs operation.",
    accent: "amber",
    params: [
      {
        key: "buildtype",
        label: "What it builds",
        type: "select",
        options: [
          { value: "web-tools", label: "Small web tools & sites (recommended)" },
          { value: "digital-products", label: "Digital products (templates, kits, packs)" },
        ],
        default: "web-tools",
        help: "Web tools deploy to a real URL. Digital products become sellable files.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Forge, a builder agent. It takes ONE approved idea at a time (from Scout, or given directly by the user) and ships it end to end${p.buildtype === "digital-products" ? " as a finished digital product: files a customer can actually download and use" : " as a small deployed web tool: a real URL a customer can visit"}.
TRIGGER: task-driven, not scheduled. It fires when the user approves an idea and hands it a brief. It works when there is work.

EACH BUILD:
1. Read the brief fully. Restate the plan in one paragraph and define what "done" looks like BEFORE building anything.
2. Build the complete thing. No skeletons, no placeholders, no "TODO" stubs. A build with missing pieces is a failed build (this rule exists because early builds shipped empty shells; a hard completeness gate fixed it).
3. VERIFY before declaring done: ${p.buildtype === "digital-products" ? "open every file produced and confirm a paying customer would find it complete and polished" : "actually load the deployed URL and test the core flow end to end"}.
4. APPROVAL LOOP: anything public-facing (publishing, launching, spending) is drafted first and shown to the user for approval. The agent proposes; the user approves.
5. Write a build report: what shipped, decisions made, what to review, next steps. Keep a lessons log; every piece of user feedback becomes a rule for the next build.
QUALITY BAR: it ships things a stranger would pay for, not demos. When unsure between fast and good, pick good.`,
  },
  {
    id: "paul",
    name: "Paul",
    emoji: "🌐",
    role: "Website builder + local outreach",
    tagline: "Finds local businesses with weak or no websites, builds them one first, then pitches it.",
    proven: "The web-studio agent of the Trevs operation — real sites for real local businesses.",
    accent: "emerald",
    params: [
      {
        key: "area",
        label: "Your local area to target",
        type: "text",
        placeholder: "e.g. Austin, TX (your city + state)",
        default: "",
        help: "The city or region Paul searches for local businesses in. Be specific — a city + state works best. Paul only ever touches real, verifiable businesses there; it never invents one.",
      },
      {
        key: "sendmode",
        label: "How should outreach go out?",
        type: "select",
        options: [
          { value: "manual", label: "I send it myself — Paul drafts, I approve & send · recommended" },
          { value: "auto", label: "Paul sends it automatically after building" },
        ],
        default: "manual",
        help: "Manual = Paul writes the message and hands it to you to send from your own inbox — best for deliverability and control, and lets you attach screenshots. Auto = Paul emails the business itself right after building, with strict guardrails. Auto needs a real sending mailbox on your OWN domain plus a physical mailing address for the email footer (CAN-SPAM law requires it) — don't pick it until those are set up.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Paul, a website-builder + local-outreach agent. Its lane: find real local businesses in ${p.area || "the user's local area"} that have NO website or a weak/outdated/broken one, build each a genuinely good website FIRST, then ${p.sendmode === "auto" ? "reach out to them automatically" : "hand the user a ready-to-send pitch"}. Building it BEFORE pitching is the whole edge — you show them the real thing, you don't describe it.
TARGET AREA: ${p.area || "ask the user for their city/region before the first run"}. Only ever touch REAL, verifiable businesses there — never invent a business, address, phone, review, or email. If you can't verify it from a public source, drop it.
TRIGGER: scheduled — one focused cycle at a time (1-2 businesses a day max; quality over volume).

REFERENCE SITES — these are REAL sites from the Trevs operation. Open them live before you build (you have web tools); they are the quality bar AND the range to match. Study the level, don't copy them:
- https://austin-furniture-upholstery.vercel.app — full-bleed photo hero: the product fills the screen, warm craft vibe.
- https://rourke-plumbing.vercel.app — a trade built on trust: upfront pricing, licensing, one clear call button.
- https://repair-champion-auto.vercel.app — auto shop using its OWN real photos, with a trust row.
- https://ferngrove-coffee.vercel.app — warm editorial for food: menu, roast story, unhurried.
- https://vellum-hair-umber.vercel.app — calm, editorial, premium restraint for a salon.
Notice NO two share a layout — that variety IS the standard. Open the one(s) closest to your target's category before each build and match that bar.

EACH CYCLE (one business):
1. FIND ONE TARGET: search public sources (maps, directories, search) for a real ${p.area || "local"} business with no site or a clearly bad/outdated/broken one. Favor ones with a public email (easier to reach). Capture name, category, area, phone, current site (or "none"), and the best public contact channel. Verify everything; note where you found it.
2. BUILD THEM A REAL SITE — this is most of the work; do it so well a stranger would think they paid for it:
   - VARY the layout to the business type — do NOT ship the same template every time. Trades/services (roofer, plumber, auto, HVAC, landscaping) → a full-bleed hero: a big REAL photo filling the top, headline + a clear call/quote CTA overlaid, a trust row (years in business, star rating + review count, license/cert). Cafés/food → warm editorial with real food photos + a menu. Salons/spas/wellness → calm, airy, a service menu + booking. Match the vibe to their world, not a SaaS look.
   - REAL PHOTOS: use their OWN public photos (Google Business Profile / Yelp / Facebook / their existing site) or tasteful licensed stock. NEVER AI-fake their product or space. If their current site has photos, yours must too — never ship a downgrade.
   - HONEST COPY: specific and human. Use their REAL full street address and hours. NO meta/defensive copy ("real photo", "not a stock photo", "our new site") — just show it. No invented reviews or claims. Keep it tight; read it out loud and cut anything that sounds like a brochure.
   - Fast, mobile-first, one clear call-to-action (call / book / directions). Tasteful motion is fine; never gimmicky.
   - DEPLOY to a real live URL (however your other agents deploy — e.g. Vercel) and VERIFY it actually loads, is mobile-clean, links work, and images render BEFORE doing anything else. A broken preview is worse than none.
3. OUTREACH — ${p.sendmode === "auto"
      ? `SEND it automatically. Write ONE short, honest, personalized EMAIL (only if the business has a real, publicly-listed email; if it doesn't, you CANNOT cold-DM at scale — instead write a DM or quick call script and hand THAT to the user to send by hand). Send the email from your OWN dedicated sending address on your OWN domain — NEVER the user's main or transactional email domain (that torches their real sender reputation). GUARDRAILS, no exceptions: personalized + low volume + genuinely valuable (never a mass blast); a truthful subject and from-name; a working opt-out line; and a real physical mailing address in the footer — CAN-SPAM law requires it, so if the user hasn't given you a mailing address, DO NOT SEND: draft the email and flag that it's blocked on a mailing address. One follow-up maximum, several days later, then leave them alone.`
      : `DRAFT it — do NOT send. Write ONE short, honest, personalized message (an email if they have a real public email; otherwise a DM or a quick phone script, labeled as such). Sound like a person: no enumerate-everything lists, don't recite their own address back to them, let the LINK do the selling. Save the draft plus the live preview URL and the best channel for the user, and tell them it's ready. The USER sends the actual message themselves (they may want to attach screenshots or tweak the wording). You never contact the business directly.`}
4. LOG one line to memory: business, site URL, channel, status.

HARD RULES (every cycle):
- Every business and every fact is real and verifiable, or you don't touch it — no invented businesses, addresses, phones, reviews, or emails.
- ${p.sendmode === "auto" ? "Even in auto-send mode the mailing-address, opt-out, and low-volume rules are absolute. When in doubt, draft and ask instead of sending." : "You never contact a real business — you draft, the user sends."}
- Quality bar: ship sites a business would actually pay for, and messages a real person would actually send. Building good sites benefits from a more capable model — if the sites come out thin, bump this agent's brain up a tier.`,
  },
  {
    id: "dennis",
    name: "Dennis",
    emoji: "🔬",
    sprite: "/builder/sprite-dennis.png",
    role: "Idea researcher",
    tagline: "Researches money-making niches and hands you tight, numbers-first idea reports. No fluff.",
    proven: "The idea engine of the real Trevs operation.",
    accent: "cyan",
    params: [
      {
        key: "focus",
        label: "What to research",
        type: "text",
        placeholder: "e.g. Etsy digital products, print-on-demand niches…",
        default: "Etsy digital products",
        help: "The kind of opportunities it hunts for.",
      },
      {
        key: "depth",
        label: "Research depth",
        type: "select",
        options: [
          { value: "deep", label: "Deep dive (recommended)" },
          { value: "quick", label: "Quick scan (cheaper)" },
        ],
        default: "deep",
        help: "Deeper research means sharper reports and a bit more fuel.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Dennis, a research & strategy agent. It hunts realistic money-making niches (focus: ${p.focus || "digital products"}) and writes tight, numbers-first idea reports — the kind you can actually act on.
TRIGGER: task-driven. Fires when you (or the manager) assign a research task, or when a builder agent's queue runs low. Not a constant heartbeat.

EACH CYCLE:
1. Research the target area (web search, competitor and category scan) at a ${p.depth === "quick" ? "quick-scan" : "deep-dive"} depth.
2. Produce at most 0-2 idea reports — one file PER niche, never a bundle. Each MUST include six numbers: estimated monthly revenue, startup cost, time-to-first-dollar, who/what executes it, confidence (1-10), and effort (S/M/L). No "TBD", no invented data — if something's unknown, say so plainly.
3. Add a verdict (fast-track / slow-bucket / kill) with the WHY and the KILL CRITERIA. Primary filter: can it reach a first dollar FAST (days, not months)?
4. Keep a dead-ideas log so it never re-researches a killed idea, and a seed-ideas backlog for later.
QUALITY BAR: kill more than you propose. Play devil's advocate against your own idea before writing it up.
STATE: an ideas folder (one file per idea), a dead-ideas log, a seed-ideas backlog, and a lessons log of the user's feedback.
SETUP: web search access for trend research; the task queue + API from your backbone (already there).`,
  },
  {
    id: "bunc",
    name: "Bunc",
    emoji: "🎨",
    sprite: "/builder/sprite-bunc.png",
    role: "Product creator",
    tagline: "Turns an approved idea into a real Etsy draft — cover, mockups, the file — for you to review and publish.",
    proven: "The Etsy product builder of the real Trevs operation.",
    accent: "pink",
    params: [
      {
        key: "producttype",
        label: "What it makes",
        type: "select",
        options: [
          { value: "digital", label: "Digital downloads (PDFs, planners, templates)" },
          { value: "pod", label: "Print-on-demand (shirts, mugs via Printify)" },
        ],
        default: "digital",
        help: "Digital = files buyers download. Print-on-demand = physical products printed to order.",
      },
      {
        key: "niche",
        label: "Niche (optional)",
        type: "text",
        placeholder: "e.g. teacher planners, funny pet mugs…",
        default: "",
        help: "A niche to focus on, or leave blank to take ideas from your research agent.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Bunc, a product creator for Etsy. It takes an approved idea and builds the whole listing — ${p.producttype === "pod" ? "a print-on-demand product (the design + a Printify product, left UNPUBLISHED)" : "a digital-download product (the real deliverable file + a cover + mockups)"}${p.niche ? `, focused on: ${p.niche}` : ""} — as a DRAFT for you to review and publish.
TRIGGER: task-driven. Fires when you approve an idea and assign it. Not a heartbeat.

EACH BUILD:
1. Read the approved idea / brief.
2. Generate the real assets: a cover image, 2-3 mockups, plus ${p.producttype === "pod" ? "the print-ready design" : "the actual deliverable — a real multi-page PDF / template / spreadsheet, never a blank placeholder"}. Then a title, description, and tags.
3. Create the Etsy DRAFT${p.producttype === "pod" ? " (and the Printify product, left unpublished)" : ""} — but do NOT publish. You review the design and the economics, and publish it yourself.
4. Save the build and mark it ready for your approval.
CARDINAL RULES: never publish without your approval. Never use trademarked IP (no Disney / Marvel / Hogwarts etc. — use evocative substitutes). Deliverables must be real and complete — a blank PDF is a failed build. Cap ~3 drafts/day without an explicit go-ahead (cost control).
STATE: one build folder per product (cover, mockups, deliverable, listing spec), and a lessons log of your approve/reject feedback.
SETUP — this agent needs external accounts; walk the user through them:
  • An Etsy shop + an Etsy API v3 personal-access token (to create drafts).${p.producttype === "pod" ? "\n  • A Printify account + API token (for the physical products)." : ""}
  • Image generation for the covers and mockups.
Get these connected before its first real run; until then it can build the files locally.`,
  },
  {
    id: "finn",
    name: "Finn",
    emoji: "📦",
    sprite: "/builder/sprite-finn.png",
    role: "Fiverr fulfiller",
    tagline: "Drafts Fiverr deliverables — thumbnails, scripts, packages — for you to approve and send.",
    proven: "The Fiverr fulfillment agent of the real Trevs operation.",
    accent: "emerald",
    params: [
      {
        key: "gigs",
        label: "What it fulfills",
        type: "select",
        options: [
          { value: "thumbnails", label: "YouTube thumbnails" },
          { value: "scripts", label: "Video scripts" },
          { value: "packages", label: "Full video packages (script + thumbnail)" },
        ],
        default: "thumbnails",
        help: "The gig type it produces drafts for.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Finn, a Fiverr fulfillment agent. When an order comes in, it drafts the deliverable (${p.gigs}) for YOU to approve and send — it never auto-delivers to the buyer.
TRIGGER: task-driven. Fires when a new order (or a redo / question) lands. Idle between orders.

EACH ORDER:
1. Read the order details + the buyer's brief.
2. Check its lessons log for similar past work so it doesn't repeat a rejected style.
3. Draft the deliverable: ${p.gigs === "thumbnails" ? "a 1280×720 thumbnail via image generation" : p.gigs === "scripts" ? "a written video script" : "a full package — script + thumbnail + metadata"}.
4. Mark it ready for your approval. You review it and send it to the buyer yourself.
CARDINAL RULE: never auto-deliver. Fiverr's terms + quality mean YOU approve every delivery.
STATE: an orders folder (order details + artifacts + status + feedback history), and a lessons log of your feedback.
SETUP: orders have to reach the agent — the real operation uses a small bridge that ingests Fiverr order emails (via Gmail) into an orders folder. Help the user wire that up (or, to start testing, they can drop an order file in by hand). Plus image generation for thumbnails.`,
  },
  {
    id: "luke",
    name: "Luke",
    emoji: "📱",
    sprite: "/builder/sprite-luke.png",
    role: "Content strategist",
    tagline: "Writes TikTok briefs and threads you can film on your phone — hooks, beats, captions, hashtags.",
    proven: "The content idea man of the real Trevs operation.",
    accent: "sky",
    params: [
      {
        key: "format",
        label: "What it writes",
        type: "select",
        options: [
          { value: "tiktok", label: "TikTok video briefs" },
          { value: "twitter", label: "Twitter / X threads" },
        ],
        default: "tiktok",
        help: "The kind of content briefs it produces.",
      },
      {
        key: "length",
        label: "Video length target",
        type: "select",
        options: [
          { value: "mixed", label: "Mixed (recommended)" },
          { value: "short", label: "Short (15-30s)" },
          { value: "long", label: "Longer (60-180s)" },
        ],
        default: "mixed",
        help: "For TikTok briefs — the length to aim for.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Luke, a content strategist. It writes ${p.format === "twitter" ? "Twitter / X threads" : "TikTok video briefs you film on your phone"} — the idea, the hook, the beat-by-beat, on-screen text, caption, and hashtags. It's the idea man, not the filmmaker.
TRIGGER: task-driven. Fires when you ask for content ideas. Idle between.

EACH CYCLE:
1. ${p.format === "twitter" ? "Write a 5-12 tweet thread with a grounding source and real receipts." : `Write a video brief: a hook (≤10 words, grabs in the first 1.5 seconds), a beat-by-beat outline${p.length === "mixed" ? "" : ` for a ${p.length === "short" ? "15-30s" : "60-180s"} video`}, on-screen text, a caption (≤140 chars), and hashtags.`}
2. Ground every claim in real data (your revenue, results) — never invent numbers. If it's an opinion, flag it as one.
3. Save the brief for you to pick up and ${p.format === "twitter" ? "post" : "film"}.
STYLE: pick a clear lane and stay in it; no hot takes trashing other creators.
STATE: an ideas queue (one file per brief).
SETUP: the task queue + API from your backbone (already there) so it can pull your real numbers to ground its claims. Point it at your dashboard's data if you want it grounded in live revenue.`,
  },
  {
    id: "pham",
    name: "Pham",
    emoji: "🎵",
    sprite: "/builder/sprite-pham.png",
    role: "YouTube music maker",
    tagline: "Generates AI music, renders it to video, and uploads to YouTube on a schedule — a compounding catalog.",
    proven: "The YouTube music agent of the real Trevs operation.",
    accent: "amber",
    params: [
      {
        key: "genres",
        label: "Genre mix",
        type: "text",
        placeholder: "e.g. lo-fi, ambient, focus, sleep",
        default: "lo-fi, ambient, focus, sleep",
        help: "Rotate a few genres so the algorithm doesn't starve on one.",
      },
      {
        key: "cadence",
        label: "How often it uploads",
        type: "select",
        options: [
          { value: "6h", label: "A few tracks a day (recommended)" },
          { value: "daily", label: "Once a day (cheaper)" },
        ],
        default: "6h",
        help: "More uploads build the catalog faster; each track costs ~$0.50 of music generation.",
      },
      MODEL_PARAM,
      CUSTOM_PARAM,
    ],
    playbook: (p) => `ROLE: Pham, a YouTube AI-music agent. On a schedule it generates AI music, renders each track into a simple video, and uploads it to YouTube — building a catalog that earns from ads + memberships over time.
CADENCE: scheduled — ${p.cadence === "daily" ? "once a day" : "every ~6 hours (a few tracks a day)"}. Rotate genres (${p.genres || "lo-fi, ambient, focus, sleep"}) so no single one starves.

EACH CYCLE:
1. Check the channel stats + that its tools and keys are working.
2. Generate 1-3 tracks (fewer for a brand-new channel — quality first).
3. For each: generate the music, make a genre-appropriate image, and mux audio + image into an MP4.
4. Upload to YouTube — WITH the required "AI-generated" disclosure in the description (YouTube policy).
5. Log the uploads + metrics.
RULES: music generation is ~$0.50/track — mind the budget (a ~$75/mo cap is typical). Don't use music models with non-commercial licenses.
STATE: audio / visual / video files, an upload log, a channel-stats file, a memory log.
SETUP — this agent needs external accounts (a one-time setup):
  • A Suno subscription + API key (for the music; a commercial-use tier).
  • A YouTube channel + YouTube Data API OAuth (for uploads — you authorize it once).
  • ffmpeg installed (to combine audio + image), plus image generation for the visuals.
Get these connected before its first run; it stays idle until they're ready.`,
  },
];

export type DashboardTheme = {
  id: string;
  name: string;
  img: string;
  desc: string;
  vibe: string;
  accent: "cyan" | "pink" | "emerald";
  tier: "simple" | "advanced"; // simple = Claude Code builds it now, no art; advanced = a build project w/ assets
  effort: string;
};

export const DASHBOARD_THEMES: DashboardTheme[] = [
  {
    id: "clean",
    name: "Command Deck",
    img: "/builder/theme-clean.svg",
    desc: "A sharp, modern data dashboard — KPI tiles, live charts, and an agent panel, in a clean dark UI. No art, no game, no sprites. Your Claude Code ships the whole thing in one shot, and it looks complete on the very first run. The best place to start.",
    vibe: "Start here",
    accent: "emerald",
    tier: "simple",
    effort: "minutes · no art needed",
  },
  {
    id: "station",
    name: "Sci-Fi Station",
    img: "/builder/theme-station.jpg",
    desc: "The neon space-station look from trevsagents.com — each agent gets its own room, joined by glowing bridges. Built in pure code (starry space + floating station, no art needed), or level up with a painted hull. Full recipe included.",
    vibe: "No art needed",
    accent: "pink",
    tier: "advanced",
    effort: "~30–60 min · no art required",
  },
  {
    id: "village",
    name: "Pixel Village",
    img: "/builder/theme-village.jpg",
    desc: "The walkable pixel town from the TikToks — agents are characters you walk up to. The most ambitious: a real game build with pixel-art assets. Full recipe included.",
    vibe: "The showstopper",
    accent: "cyan",
    tier: "advanced",
    effort: "several hours + assets",
  },
];

// ───────────────────────────────────────────────────────────────────────────────
// THE GENERATOR
// ───────────────────────────────────────────────────────────────────────────────

export type BuildMode = "fresh" | "existing"; // the account's journey; NOT a per-template mode
export type Runtime = "vps" | "local";
export type SetupStage = "orient" | "backbone";

// Plain-language fuel explainer — reused in the app + instructions. Fuel is literally
// the AI usage cost (what you'd otherwise pay OpenAI/Anthropic/OpenRouter), just simplified.
export const FUEL_EXPLAINER =
  "Fuel has been retired, and everyone who bought it is being refunded to their original payment method. Agents now run on your own AI engine instead: an OpenRouter key (one key, all models, pay as you go) or a Claude / ChatGPT-Codex subscription you already have. When you add a new agent, the builder walks your Claude Code through connecting it, no fuel needed.";

// Shared fuel-wiring block — points an agent's AI at the Trevs engine. Describes intent +
// values, not one exact OpenClaw command (syntax varies by version). Never names the upstream.
function fuelBlock(fuelKey: string, model: string, opts?: { optional?: boolean; connect?: boolean }): string {
  if (opts?.connect) {
    // FIRST-RUN fuel connection. The USER connects it themselves in their terminal — the assistant never
    // touches the key (careful assistants refuse to type secrets, and a key in chat/logs is a real risk).
    // Detailed, do-it-yourself steps so a beginner can't get lost.
    return `━━━ CONNECT MY FUEL — please walk me through it (I do the typing, including my key) ━━━
"Fuel" is the prepaid AI credit my agents run on. I need to connect it to OpenClaw on my machine, and I might
be new to terminals — so GUIDE me through it patiently, step by step, and answer my questions as they come up.

How we split it:
 • YOU are the guide: explain each step for MY operating system in plain language — including HOW to open a
   terminal and WHERE, if I don't know. Tell me exactly what to type, and what each prompt means.
 • I do the actual typing in my own terminal — ESPECIALLY my fuel key. Do NOT ask me to paste my key into this
   chat, and do NOT run the setup wizard or type my key yourself. (It's an interactive wizard that needs me at
   the keyboard, and my key should only ever go into OpenClaw's own prompt — that keeps it out of our chat.)

The connection itself (guide me through each part): I open a terminal on my machine and run \`openclaw onboard\`;
when it asks for an auth method I pick "custom-api-key" (a.k.a. Custom provider); I enter Base URL
https://api.trevsagents.com/v1, OpenAI compatibility, and model ${model}; and I paste my fuel key when it asks
(I copy it from the Fuel tab at trevsagents.com/builder). Check in with me at each step, and if I get confused
— like I don't know how to open a second terminal, or an OS-specific detail — slow down and explain it for my
setup; I'll ask you questions. When it's saved, help me verify: \`openclaw daemon status\`, then a quick test.

Once it's connected, every agent I build later just uses it (model ${model}) — no key handling again. (The next
step, the backbone, needs no fuel, so an empty tank won't block us — but let's get fuel connected here.)`;
  }
  if (opts?.optional) {
    // EXISTING users: they very likely already run an engine (a Codex/ChatGPT sub, their own
    // API keys). Do NOT force fuel and do NOT frame it as a swap — keep what works. Fuel is just
    // an available option for anyone who'd rather not manage AI billing themselves. We do NOT inline
    // the key — the user pastes their own when/if they choose fuel (a raw key in a pasted doc reads
    // like a leaked secret to a careful assistant; having the human enter it is clearer + safer).
    return `━━━ THE AI ENGINE — what this agent thinks with ━━━
Point this agent at the same AI engine my other agents already use (mirror their model config) — keep what's
working. OR, if I'd rather run this one on my Trevs fuel and I've already connected it to OpenClaw, just set
the agent's model to ${model} (my fuel provider) — no key needed, it's already wired. If fuel isn't connected
yet and I want it, I'll connect it myself first (\`openclaw onboard\` → custom-api-key); don't ask me to paste a
key into this chat.`;
  }
  return `━━━ THE AI ENGINE (fuel) — already connected ━━━
My fuel is already wired into OpenClaw (I connected it during first-run setup), so there's NO key to handle
here. Just point this agent at it: set the agent's model to ${model} (my fuel provider). That's it.
(${model} = cheapest · trevs/pro = smarter · trevs/max = premium.) If for some reason fuel isn't connected yet,
I'll connect it myself first — run \`openclaw onboard\`, choose custom-api-key, Base URL
https://api.trevsagents.com/v1, paste my key when OpenClaw asks, model ${model} — you don't need my key.`;
}

// ── SETUP (the guided first-run wizard) ─────────────────────────────────────────
// The ONLY "from scratch" path. Delivered in stages so a beginner isn't handed one giant
// paste. Agents/dashboards are NEVER built from scratch — they only add into the ecosystem
// this creates. Grounded in guide ch. 03/04/04a/05/06.
export const SETUP_STEPS: { id: "claude" | "orient" | "backbone"; label: string; blurb: string }[] = [
  { id: "claude", label: "Get Claude Code", blurb: "Install the tool that builds everything, and pick where your agents live." },
  { id: "orient", label: "Prime it + install OpenClaw", blurb: "Tell your Claude Code the plan, set up the machine, install the agent runtime, connect your AI engine (your own key or subscription)." },
  { id: "backbone", label: "Build the backbone", blurb: "The task queue + dispatcher that lets agents run. After this, agents unlock." },
];

// ONE universal platform-adaptation directive, reused in every generated instruction (setup,
// backbone, every agent, dashboard). Examples are written Linux/VPS-style; this tells the
// assistant to translate to whatever OS the user is actually on.
const PLATFORM_NOTE = `⚠️ MATCH THE PLATFORM: the commands and paths here are written Linux/VPS-style (forward-slash paths, bash,
\`curl\`, systemd, /root or ~). Never paste them verbatim on another OS — translate to the machine you're on.
On WINDOWS: PowerShell, \`Invoke-RestMethod\` for API calls (NOT \`curl\` — it's a different alias there),
\`Add-Content\` to append to a file (NOT \`echo >>\`), a real base folder like C:\\Ecosystem (NOT /root or ~),
and Task Scheduler instead of systemd. On MAC: bash works, but use pm2/launchd instead of systemd. The
reliable move: mirror how the existing setup on THIS machine is already wired — it already knows its OS.`;

const ECOSYSTEM_PRIMER = `━━━ THE PLAN (the big picture) ━━━
We're building ONE thing together over a few steps: my own AI-AGENT ECOSYSTEM — a little always-running
operation on my own machine. It's not a pile of unrelated scripts; it's one system that grows. Today we set
up its backbone; later I'll bring you agents to drop into it and a dashboard to watch it. Whenever I paste a
new "Trevs Agents" instruction, it's another piece of THIS same system — so build on what's already here
rather than starting over.

Why it's built this way: most AI agents fail because they run 24/7 and burn money thinking about nothing.
Mine are EVENT-DRIVEN WORKERS — they idle for free and only spend when handed a task. Four layers, bottom
up: (1) infrastructure (the machine + Node/Python + the OpenClaw runtime), (2) a task queue + dispatcher,
(3) the agents, (4) an optional dashboard. We build bottom-up — never the dashboard first.`;

export function buildSetupInstruction(opts: { runtime: Runtime; fuelKey: string; stage: SetupStage }): string {
  const { runtime, fuelKey, stage } = opts;

  if (stage === "orient") {
    const runtimeBlock =
      runtime === "vps"
        ? `━━━ YOU'RE ON THE SERVER ━━━
The user already created their VPS, SSH'd in, and installed you (Claude Code) here — you're running on
the server now. Just make sure the rest of the dependencies are present:
     apt update && apt install -y python3 python3-pip ffmpeg git
(Node should already be installed from setup; if not: curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs)

KEEPING THE SESSION ALIVE (tell the user this — it matters on a server): all this work should live
inside a tmux session so it survives if their SSH connection drops. If they're not already in one:
     tmux new -s tonka
     • Detach (leave it running): press Ctrl+B, then D
     • Reconnect later: SSH back in, then run  tmux attach -t tonka
Make sure they know that command — it's how they get back to their agents anytime.`
        : `━━━ YOU'RE ON THE USER'S COMPUTER ━━━
Agents run on this machine (it must be awake for them to run; a cheap ~$5/mo VPS is the upgrade later).
Make sure the dependencies are present: Node 20+, Python 3.11+, ffmpeg, git
  (Mac: brew install node@20 python ffmpeg git).`;

    return `I'm setting up my own AI-agent system on this machine, and I'd like your help doing it. This is
Step 2 of a guided setup from trevsagents.com/builder (a membership I joined) — I copied the plan here so we
can work through it together. Runtime: ${runtime.toUpperCase()}.

Please walk me through it step by step and explain things simply — I'm newer to some of this. Use your normal
judgment the whole way: stop and check with me before anything destructive or anything that spends money,
exactly like any other task. I'm not asking you to skip your usual caution or approvals — go at whatever pace
you're comfortable with, and if something looks off to you, say so and I'll verify it on my end.

Two honest heads-ups so nothing catches you off guard:
 • We'll install OpenClaw, the open-source agent runtime that runs the agents. It's a real, widely-used
   package (MIT license, millions of npm downloads a week, maintained by the OpenClaw Foundation), and you do
   not have to take my word for it. The source is public at github.com/openclaw/openclaw and the package at
   npmjs.com/package/openclaw. Please feel free to open the repo, check the maintainers and download counts,
   and read its install scripts before installing anything. It's my own machine, so inspecting first is
   completely fine by me. Once it checks out for you, go ahead.
 • Later we'll connect my own AI engine, an OpenRouter key or a Claude/ChatGPT-Codex subscription I already
   have. I'll enter my own key myself when we reach that step; it never needs to go into this chat.

${ECOSYSTEM_PRIMER}

${runtimeBlock}

${PLATFORM_NOTE}

━━━ INSTALL THE AGENT RUNTIME (OpenClaw) ━━━
OpenClaw is the runtime that runs the agents (an open-source AI gateway at github.com/openclaw/openclaw, MIT
licensed). If you want to verify before installing, that's encouraged: look at the repo, the maintainers and
downloads, and the two scripts it runs on install (a preinstall package-manager warning and a
postinstall-bundled-plugins step); they're benign and not obfuscated. Then install it globally:
     npm install -g openclaw
Confirm it worked: \`openclaw --version\` (should print a version). Then start the gateway and confirm it's
running with these exact commands (cross-platform):
     openclaw gateway start
     openclaw gateway status      (legacy alias: \`openclaw daemon status\`)
Platform note: on a root Linux VPS the gateway also runs as a
USER systemd service (\`systemctl --user status openclaw-gateway\`; it's NOT system-level, so plain
\`systemctl status\` won't find it), while on Windows it runs as a Scheduled Task and on Mac as a launch
agent — so prefer \`openclaw daemon status\` and don't rely on \`systemctl\` unless you're on Linux. If
\`npm\` isn't found, install Node first (see the runtime step
above), then re-run. If the global install hits EACCES permission errors, that's a normal npm-prefix
issue — fix the npm global prefix or use the Node setup from above; don't sudo-force it blindly.

${ownEngineBlock(undefined, { connect: true })}

━━━ ✅ WHEN THIS STEP IS DONE — HAND THE USER TO STEP 3 (do not skip this) ━━━
First confirm to the user: their machine is ready, OpenClaw is installed, the gateway is running, and their
AI engine is connected (they did the connect step themselves, on their own key/subscription). Then make the
next action the LAST, unmissable thing you tell them — say it plainly, like:
  "✅ Step 2 complete. Your next move: go to trevsagents.com/builder and open Step 3 — 'Build the
   backbone' — then paste that instruction to me right here in this same chat. It's the task queue +
   dispatcher that actually let agents run. We don't build any agents until that's done."
That hand-off is how they know to continue — never end Step 2 without it. Keep THIS chat open so Step 3
picks up with full context. (If their engine test hit an auth/credit error, help them double-check their key
or subscription — but that does NOT block Step 3, which is just infrastructure.)
━━━ END ━━━`;
  }

  // stage === "backbone"
  return `This is Step 3 of my Trevs Agents setup (from trevsagents.com/builder) — help me build the backbone.

We're continuing the same AI-agent system I started in Step 2. Ideally this is the same chat so you already
have the context. If it's a fresh chat, that's fine — Step 2 (Node/Python, OpenClaw, the gateway) was already
done on this machine; just run \`openclaw --version\` to confirm the runtime is here, and if it's genuinely
missing, let me know so I can finish Step 2 first. Otherwise let's go. This step needs no fuel — it's pure
infrastructure (a task queue + dispatcher). Use your normal judgment and check in with me as you see fit.

${PLATFORM_NOTE}

━━━ ⚠️ WHERE TO PUT THIS (matters for reliability) ━━━
The dispatcher writes to a SQLite file (tasks/queue.db) every couple seconds, 24/7. **Do NOT put the
ecosystem folder inside a cloud-synced location** — OneDrive, Dropbox, iCloud Drive, or Google Drive. Cloud
sync grabs the .db / .db-wal / .db-shm files mid-write and causes "database is locked" errors and eventual
corruption. This bites Windows users especially, because OneDrive syncs Desktop/Documents by DEFAULT.
Pick a plain local path OUTSIDE any synced folder:
  • Windows: \`C:\\Ecosystem\` (NOT anything under C:\\Users\\<you>\\OneDrive\\... or Desktop/Documents if those sync)
  • Mac/Linux: \`~/ecosystem\` (NOT ~/Desktop or ~/Documents if iCloud/Drive syncs them)
If it's already in a synced folder, tell me plainly and offer to move it — nothing hardcodes the path. On a
VPS this is a non-issue (use /root); VPS disks aren't cloud-synced.

━━━ THE STANDARD STRUCTURE ━━━
Create this layout — the home base every agent will plug into. On a VPS root is /root; locally use a
dedicated non-synced folder (see the location note above) and keep the same shape:
  agents/                      ← one folder per agent (IDENTITY.md, PLAYBOOK.md, MEMORY.md, data/, reports/)
  tasks/queue.db               ← the SQLite task queue (schema below)
  tasks/limits.json            ← spend caps
  scripts/task-dispatcher.py   ← the daemon that fires agents
  mission-control-api/         ← a small Express server (port 3001) that reads/writes the queue

━━━ THE TASK QUEUE ━━━
Create the SQLite queue (a Node driver like better-sqlite3 creates the .db file on first run — the DB is
not a separate step). Use this EXACT schema with these types — don't invent your own:
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT, assignee TEXT, type TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','assigned','in_progress','done','failed','rejected','cancelled','blocked')),
    payload TEXT, result TEXT,
    cost_estimate REAL DEFAULT 0, cost_actual REAL DEFAULT 0,
    priority INTEGER DEFAULT 0, parent_id INTEGER,
    dedupe_key TEXT, notes TEXT, kill_criteria TEXT,
    assigned_at TEXT, started_at TEXT, completed_at TEXT
  );
  -- Dedupe only prevents duplicate OPEN tasks. It must NOT include status: an index on
  -- (dedupe_key, status) is a trap — a finished (key,'done') row and a new (key,'pending') row
  -- coexist, then completing the second row flips it to (key,'done') and COLLIDES with the first,
  -- crashing the update. Index the key alone, scoped to open statuses, so finishing a task always
  -- drops it out of the index and can never collide (NULLs are distinct, so normal tasks aren't blocked):
  CREATE UNIQUE INDEX IF NOT EXISTS ux_tasks_dedupe ON tasks(dedupe_key)
    WHERE dedupe_key IS NOT NULL AND status IN ('pending','assigned','in_progress');
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL DEFAULT (datetime('now')),
    task_id INTEGER, event TEXT, msg TEXT, meta TEXT
  );
Create tasks/limits.json:  { "single_task_cost_max": 5.00, "daily_total_spend_cap": 10.00, "daily_new_tasks_cap": 50 }

━━━ THE TASK API + DISPATCHER ━━━
1. Build mission-control-api/server.js (Express, port 3001) exposing the queue:
   • GET /tasks (list, optional ?status= / ?assignee=) · POST /tasks (create; see limits below)
   • GET /tasks/:id · PATCH /tasks/:id (partial update)
   • POST /tasks/:id/assign   → status 'assigned',  stamp assigned_at
   • POST /tasks/:id/start    → status 'in_progress', stamp started_at
   • POST /tasks/:id/complete → status 'done',      stamp completed_at, save {result, cost_actual} from body
   • POST /tasks/:id/reject   → status 'rejected',  save {reason} from body
   • GET /tasks/stats · GET/PATCH /tasks/limits
   ROUTE ORDER MATTERS: register the LITERAL routes (/tasks/stats, /tasks/limits) BEFORE the param route
   (/tasks/:id), or Express lets :id swallow "stats"/"limits" and they 404. GET /tasks/stats returns
   {total, byStatus:{...counts...}}.
   POST /tasks enforces tasks/limits.json — reject with HTTP 429 and {error} if the new task's cost_estimate
   exceeds single_task_cost_max, or today's summed cost/count would exceed the daily caps.
2. Build scripts/task-dispatcher.py — a loop that every ~2 seconds walks the KNOWN AGENTS
   (known agents = every subfolder under agents/ — auto-discover them, don't hardcode names) and, for
   each agent with no task already running (concurrency = 1), claims its next pending task (flip it to
   in_progress FIRST, then fire) with:
     openclaw agent --agent <name> --message "task #<id> assigned, see /tasks/<id>" \\
       --session-id "task-<id>-<timestamp>" --timeout 600 --json
   (A fresh --session-id per task is REQUIRED — reused sessions caused runaway loops in the source system.)
   ⚠️ WINDOWS — HIDE THE SUBPROCESS WINDOW: on Windows, spawning \`openclaw agent\` pops a visible console
   window EVERY time an agent runs — which quickly becomes a flashing-window nuisance for the user. Spawn it
   hidden. In Python: subprocess.Popen(..., creationflags=0x08000000) (CREATE_NO_WINDOW) — and set
   startupinfo dwFlags=STARTF_USESHOWWINDOW, wShowWindow=0 for good measure. On Mac/Linux there's no window
   to hide, so this flag is Windows-only (guard with \`if os.name == "nt"\`). The user should NEVER see agent
   windows popping up during normal operation.
   ROBUSTNESS (do both, they prevent real cold-boot failures):
   • The dispatcher must ensure the schema ITSELF on startup (run the same CREATE TABLE IF NOT EXISTS) — do
     NOT assume the API created the tables first. If the dispatcher boots before the API, an unguarded
     dispatcher crashes with "no such table: tasks" and can crash-loop. Both services owning the schema
     makes boot order irrelevant.
   • On startup, reset any task stuck in 'in_progress' back to 'pending' (crash recovery) so an agent
     killed mid-task doesn't leave work permanently claimed.
3. Run the API + dispatcher as services so they stay up. Write the ACTUAL config for the user's platform —
   don't leave it as an exercise:
   • Linux/VPS: systemd unit files.
   • Mac/Windows local: pm2 (an ecosystem.config.js). Two gotchas: (a) \`better-sqlite3\` is a native module
     whose install script npm 11 blocks by default — declare it under "allowScripts" in package.json (or
     \`npm install --foreground-scripts\`) so its prebuilt binary fetches. (b) \`pm2 startup\` does NOT work on
     Windows — instead create a Scheduled Task that runs \`pm2 resurrect\` at logon so services survive reboot.

━━━ VERIFY, THEN YOU'RE DONE ━━━
  • Confirm the two tables exist. The sqlite3 CLI may not be installed (\`command not found\` is common) —
    if so either \`apt-get install -y sqlite3\` OR just check via Node:
      node -e "const db=require('better-sqlite3')('tasks/queue.db');console.log(db.prepare('select name from sqlite_master where type=?').all('table'))"
    → you should see tasks + events.
  • curl http://localhost:3001/tasks/stats  → returns JSON counts (NOT a 404 — if you get 404, you hit the
    route-order trap above; move /tasks/stats before /tasks/:id).
  • the dispatcher process is running (and the OpenClaw gateway from the last step is up)
(The engine + agents get exercised when they add their FIRST agent and run its test cycle — that's when
fuel actually gets used, so no need to fire a test agent here; there aren't any yet.)
Then CELEBRATE and hand them their next TWO moves clearly — this is the "ok, what now?" moment, so make it
obvious and do NOT just say "done." Say something like:
  "🎉 Your foundation is live — runtime, gateway, fuel, and the task queue are all running, idle and
   costing nothing until an agent works. Two quick moves to bring it to life, both back at
   trevsagents.com/builder — paste each one here and I'll set it up:
     1) Open the AGENTS tab and add your first agent. It drops right into this structure and starts
        running on your fuel. (Pick a simple one for your first.)
     2) Open the DASHBOARDS tab and grab the 'Command Deck' — a clean charts + status dashboard (no art,
        one shot). I'll build it against THIS backbone so you can actually watch your agents work.
   Do the agent first, then the dashboard. After that, day-to-day changes — just ask me directly; you only
   come back to the site to add new agents or dashboards."
━━━ END ━━━`;
}

// ── ADD AN AGENT (always an addition to the existing ecosystem — never from scratch) ──
// Each agent's real shape drives HOW it slots in — data-fed agents get a fetcher + a
// scheduled cycle; scheduled agents get a cycle but no fetcher; task-driven agents get
// neither (the dispatcher fires them when a task lands). Getting this wrong told a
// manager's Claude Code to "write a fetcher that computes indicators" — nonsense.
const AGENT_SHAPE: Record<string, "data" | "scheduled" | "task" | "event"> = {
  ant: "data", sage: "data", bolt: "data", ace: "data", craig: "data", scout: "data",
  earl: "event",       // fires when a NEW filing lands, not on a clock
  pham: "scheduled", paul: "scheduled",
  matt: "task", forge: "task", dennis: "task", bunc: "task", finn: "task", luke: "task",
};
// Only true traders/bettors get the paper-money caveat in the footer.
const TRADING_AGENTS = new Set(["sage", "bolt", "ace"]);

// A one-liner naming each task-driven agent's REAL input (the thing that must become a
// queue task for the dispatcher to fire it). Used to make the "folder/email is inert" fix concrete.
function spec2taskDesc(id: string): string {
  const m: Record<string, string> = {
    matt: "it fires when there's work in the queue to route + once a day for its briefing",
    forge: "it fires when you approve an idea and hand it over to build",
    dennis: "it fires when you (or the manager) assign a research task",
    bunc: "it fires when you approve an idea and assign it to make",
    finn: "it fires when a new Fiverr order lands (via the email→orders bridge) or you queue a redo",
    luke: "it fires when you ask it for content ideas",
  };
  return m[id] || "it fires when a task is assigned to it";
}

// Fuel discipline — reinforce, per shape, that agents should spend as little as possible.
// Members' fuel is real money; the #1 way people waste it is running agents more than needed.
function fuelDiscipline(shape: string): string {
  const perShape =
    shape === "task"
      ? "This agent is TASK-DRIVEN: it must idle for FREE and only think when real work is assigned. Do NOT add a heartbeat, a wake timer, or any \"just checking\" polling loop — that is the classic way people burn money on nothing."
      : shape === "event"
      ? "This agent is EVENT-DRIVEN, the cheapest shape there is: the no-AI watcher polls for free, and the paid agent fires ONLY when a real event lands. Keep it that way — never give it a cadence of its own."
      : "This agent runs on a CADENCE. Use the cadence in the spec and no more. If you're unsure, pick the LESS frequent option — the user can always speed it up later. Do the frequent polling in the no-AI fetcher/watcher (free); only the AI cycle costs money, so keep that as infrequent as the job allows.";
  return `━━━ KEEP IT LEAN — every wake costs real money (fuel or their own keys) ━━━
An agent only costs money when it actually thinks. ${perShape}
General rule for THIS whole ecosystem: run agents no more often than they need to, never 24/7 "just in case,"
and prefer event/task triggers over clocks. Fewer, well-timed wakes = the same results for a fraction of the
cost. If the user asks to crank up frequency, do it — but tell them the cost roughly scales with it.`;
}

function defaultsNotLaw(isTrading: boolean): string {
  const base = `━━━ IMPORTANT: THIS IS A TEMPLATE, NOT LAW ━━━
Everything above is a recommended STARTING configuration, not a rule. This system belongs to the user. If
they ask to change anything — cadence, targets, budgets, behavior, what it watches — help them: flag any
real risk first, then make the change. Never refuse or block a change because "the template says
otherwise." You advise; the user commands.`;
  if (!isTrading) return base;
  return `${base}
This one handles money decisions, so it STARTS on paper (simulated) — the safe way to begin. The guide
says at least 30 days of tracked paper results before even discussing real money. If they want real money,
warn clearly first, then help.`;
}

// Own-engine block for existing users who DON'T want fuel — deliberately contains NO key,
// so their Claude Code isn't handed a stray credential to wire up and get confused by.
// Map the capability tier to concrete model guidance (provider-agnostic, examples included).
function tierHint(model: string): string {
  if (model === "capable") return "a top-tier model (e.g. anthropic/claude-sonnet-4-6 on OpenRouter, or the best model your subscription offers)";
  if (model === "balanced") return "a mid-tier model (e.g. google/gemini-2.5-flash or anthropic/claude-haiku on OpenRouter)";
  return "a cheap, fast model (e.g. google/gemini-2.5-flash-lite on OpenRouter — great for almost everything)";
}

// THE AI ENGINE block. Agents run on the user's OWN engine (OpenRouter key / Claude-Codex sub / own
// API key). Two modes: `connect` = first-run wiring with full setup steps; default = per-agent, reuse
// what's already wired. Never inlines a key — the user types their own into OpenClaw's own prompt.
function ownEngineBlock(model?: string, opts?: { connect?: boolean }): string {
  const tier = tierHint(model || "cheap");
  if (opts?.connect) {
    return `━━━ CONNECT MY AI ENGINE — please walk me through it (I do the typing, including my key) ━━━
My agents need an AI "brain" to run, and I'll use my OWN. I might be new to terminals, so GUIDE me patiently,
step by step, for MY operating system — including how to open a terminal if I don't know. I do the actual
typing, ESPECIALLY my API key: never ask me to paste my key into this chat, and don't run the wizard or type
my key yourself. My key should only ever go into OpenClaw's own prompt.

The right engine for running agents is an API KEY, not a personal chat subscription — API keys are built
for automated/programmatic use, so nothing flags them and nothing rate-limits or blocks you. Recommend
Option A to me unless I say otherwise:
 • OPTION A — OpenRouter (RECOMMENDED, best for almost everyone): one key works with almost every model,
   pay-as-you-go, cheap ($5–10 gets me going), and zero terms-of-service worries.
     1. Go to openrouter.ai, sign up, add a little credit ($5–10 is plenty to start).
     2. Keys → Create Key → copy it (it starts with sk-or-...).
     3. In my terminal run \`openclaw onboard\`, choose custom-api-key / OpenAI-compatible, Base URL
        https://openrouter.ai/api/v1, paste my key when asked, and set a cheap default model like
        google/gemini-2.5-flash-lite.
 • OPTION B — my own OpenAI / Anthropic / Google API key: same as Option A, that provider's Base URL + my
   key. Also totally fine (it's a real API key).
 • ⚠️ NOT RECOMMENDED — piping a personal Claude Pro/Max or ChatGPT Plus SUBSCRIPTION into OpenClaw to run
   agents. Those subscriptions are for the official apps, and using them to power automated agents is a
   terms-of-service gray area that your own Claude Code will (correctly) flag and refuse, and providers
   rate-limit or block it. Don't fight that. If I ask for it, steer me to Option A instead. (Using Claude
   Code itself to BUILD my setup on my subscription is fine — it's only running the AGENTS on a sub that's
   the problem.)

When it's saved, help me verify: \`openclaw daemon status\`, then a quick test call. Once it's connected,
every agent I build later just uses it — no key handling again.`;
  }
  return `━━━ THE AI ENGINE — use what I already connected ━━━
Point this agent at the SAME AI engine my other agents already use — my OpenRouter key, my Claude/Codex
subscription, or my own API key, whatever's already wired into OpenClaw. Do NOT add a new provider or key;
mirror what already works. For this agent's brainpower, use ${tier}. There is intentionally no key in this
instruction. (If nothing's wired yet, I'll connect my engine first via \`openclaw onboard\` — don't ask me to
paste a key into this chat.)`;
}

// Turn a user's chosen display name into a filesystem/agent-id slug.
function slugifyName(name: string): string {
  return (name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}
function _escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// Rename an assembled agent instruction from the template's persona (e.g. "Sage"/"sage")
// to the user's chosen name (e.g. "Zara"/"zara") — word-boundary, so it swaps the display
// name in prose/headers AND the id in folder paths / --agent / assignee, all consistently.
function renameAgentText(text: string, fromName: string, fromId: string, toName: string): string {
  const toId = slugifyName(toName) || fromId;
  return text
    .replace(new RegExp(`\\b${_escapeRe(fromName)}\\b`, "g"), toName)
    .replace(new RegExp(`\\b${_escapeRe(fromId)}\\b`, "g"), toId);
}

export function buildAgentInstruction(opts: {
  template: AgentTemplate;
  params: Record<string, string>;
  fuelKey: string;
  existing?: boolean;
  useFuel?: boolean;
  customName?: string;
  shapeOverride?: "data" | "scheduled" | "task" | "event";
}): string {
  const { template, params, fuelKey, existing } = opts;
  // FUEL RETIRED 2026-08-12 — every agent runs on the user's OWN engine now (OpenRouter key / Codex
  // sub / own key), wired during Setup. `useFuel` stays as an explicit opt-in escape hatch only.
  const useFuel = opts.useFuel === true;
  const model = params.model || "cheap";
  const custom = (params.custom || "").trim();
  const id = template.id;
  const shape = opts.shapeOverride || AGENT_SHAPE[id] || "task";
  const engine = existing
    ? "the AI engine your other agents already use"
    : "the Trevs fuel engine you set up earlier";
  const ws = `create agents/${id}/ (mirroring your existing agents). ⚠️ CRITICAL — put the operating instructions where OpenClaw ACTUALLY reads them: at the start of every run OpenClaw injects the agent's **AGENTS.md** (plus SOUL.md / USER.md / MEMORY.md) — it does NOT inject IDENTITY.md or PLAYBOOK.md. So the role + the per-cycle steps above MUST live in agents/${id}/AGENTS.md, or the agent wakes up blind and improvises (this is a real, expensive failure). Since \`openclaw agents add\` (the register step below) SEEDS AGENTS.md, do it in this order: register FIRST, then MERGE the agent's identity + the per-cycle playbook into the TOP of the seeded AGENTS.md, keeping OpenClaw's seeded content below. Also create MEMORY.md as an append-only log of ONE short line per cycle — keep it tiny, and rotate/trim it if it grows past ~2KB. KEEP LEAN: AGENTS.md + MEMORY.md are re-sent on EVERY call, so bloat there quietly runs up fuel — be concise. (A human-readable PLAYBOOK.md copy is fine, but the agent only ever reads AGENTS.md.)`;

  let slot: string;
  if (shape === "data") {
    slot = `1. WORKSPACE: ${ws}, plus data/ (the fetcher writes here, the agent only reads) and reports/.
2. FETCHER: write scripts/${id}-fetch.py — plain code, NO AI — that pulls the source data the spec describes and writes it to data/ as JSON (do any number-crunching in plain code, not the LLM). This is the anti-hallucination half: the agent only cites what's in those files.
3. SCHEDULE (mirror how your other agents are scheduled — systemd timers on a VPS; on Windows, Task Scheduler tasks set to run HIDDEN / "whether the user is logged on or not" so no console window pops): the fetcher on its own frequent timer, and the agent's cycle at the spec's cadence:
     openclaw agent --agent ${id} --message "scheduled cycle" --session-id "wake-${id}-<ts>" --timeout 600 --json
4. REGISTER it: add to the OpenClaw agents.list (heartbeat "0m", model = the engine below), then restart the gateway. What FIRES this agent is the TIMER from step 3 — NOT the task queue (the dispatcher only fires task-driven agents). agents.list registration just makes OpenClaw aware of the agent + its model. Do NOT touch or reformat your other agents.`;
  } else if (shape === "scheduled") {
    slot = `1. WORKSPACE: ${ws}, plus reports/ and any state file the spec names. No data/ fetcher — this agent produces/acts, it doesn't read a market feed.
2. SCHEDULE (mirror how your other agents are scheduled — systemd timers on a VPS; on Windows, Task Scheduler tasks set to run HIDDEN / "whether the user is logged on or not" so no console window pops): fire the agent at the spec's cadence:
     openclaw agent --agent ${id} --message "scheduled cycle" --session-id "wake-${id}-<ts>" --timeout 600 --json
3. REGISTER it: add to the OpenClaw agents.list (heartbeat "0m", model = the engine below), then restart the gateway. What FIRES this agent is the TIMER from step 2 — NOT the task queue (the dispatcher only fires task-driven agents). agents.list registration just makes OpenClaw aware of the agent + its model. Do NOT touch or reformat your other agents.`;
  } else if (shape === "event") {
    slot = `1. WORKSPACE: ${ws}, plus data/ (holds a small "seen" ledger so it never re-fires on the same event) and reports/. This agent is EVENT-DRIVEN — it does nothing until a real event lands, then fires once for it. NO wake timer.
2. WATCHER: write scripts/${id}-watch.py — plain code, NO AI — that polls the source on a frequent timer; when a NEW (unseen) event appears, it records it in the seen-ledger and INVOKES the agent for just that event:
     openclaw agent --agent ${id} --message "new event: <what happened>" --session-id "${id}-<ts>" --timeout 600 --json
   (The watcher is the ONLY thing that fires the agent — the agent has no cadence of its own.)
3. SCHEDULE just the watcher on its frequent timer (mirror how your other agents are scheduled). REGISTER the agent: add to the OpenClaw agents.list (heartbeat "0m", model = the engine below), restart the gateway. What FIRES this agent is the WATCHER — NOT the task queue (the dispatcher only fires task-driven agents). Do NOT touch or reformat your other agents.`;
  } else {
    slot = `1. WORKSPACE: ${ws}, plus reports/ and any state file the spec names. This agent is TASK-DRIVEN — NO data fetcher and no polling/heartbeat wake.${id === "matt" ? " (One exception: Matt posts a daily briefing, so add exactly ONE lightweight daily timer whose ONLY job is that briefing — see step 3.)" : ""}
2. WIRE IT TO THE QUEUE: register ${id} in the OpenClaw agents.list (heartbeat "0m", model = the engine below), then restart the gateway + dispatcher. The dispatcher fires ${id} whenever a task is ASSIGNED to it in the queue (a row in tasks/queue.db with assignee="${id}") — that's its trigger.
3. HOW WORK REACHES IT: ${id}'s real input isn't a manual test task — ${spec2taskDesc(id)}. Whatever ingests that input (an email/order bridge, a "user approves an idea" action, the manager routing, etc.) MUST create a queue task assigned to ${id} (POST /tasks {assignee:"${id}", ...}). The folder/email/event alone is inert — the dispatcher only sees the QUEUE, so if nothing turns the input into a task row, ${id} never fires.${id === "matt" ? " Also add the single daily briefing timer from step 1." : ""}
4. Do NOT touch or reformat your other agents.`;
  }

  let finish: string;
  if (shape === "task") {
    finish = `1. Show every file you created/changed. Leave your other agents untouched.
2. Hand ${template.name} one test task (create a task assigned to it, or trigger its normal input) and show the result it produced.
3. In one short paragraph: how to check on it, how to pause it (remove it from the OpenClaw agents.list, or move its agents/${id}/ folder aside${id === "matt" ? ", and disable its daily briefing timer" : ""}), and that they can change anything by just asking you.`;
  } else if (shape === "scheduled") {
    finish = `1. Show every file you created/changed. Leave your other agents untouched.
2. Do ONE dry cycle of ${template.name} and show its output + where the report was written.
3. In one short paragraph: how to check on it, how to pause it (disable its timer), and that they can change anything by just asking you.`;
  } else if (shape === "event") {
    finish = `1. Show every file you created/changed. Leave your other agents untouched.
2. Run the watcher once and confirm it read the source cleanly (finding "no new events yet" is a PASS — it means the watcher works and there's just nothing to react to right now).
3. In one short paragraph: how to check on it, how to pause it (disable the watcher's timer), and that they can change anything by just asking you.`;
  } else {
    finish = `1. Show every file you created/changed. Leave your other agents untouched.
2. Run the new fetcher once and confirm real data landed in agents/${id}/data/.
3. Do ONE dry cycle of ${template.name} and show its output + where the report was written.
4. In one short paragraph: how to check on it, how to pause it (disable its timer), and that they can change anything by just asking you.`;
  }

  const _built = `I want to add a new agent to my AI-agent system. This plan is from my trevsagents.com/builder
account (a membership I'm on) — help me set up ${template.name} (${template.role}).

${template.name} is a new worker agent that slots into the agent ecosystem already running on this machine —
my agents/ workspace, SQLite task queue, dispatcher, and ${engine}. It's not a standalone app; it plugs into
what's already there.

━━━ FIRST: FIND THE ECOSYSTEM ━━━
Locate my existing setup — the OpenClaw config, the agents/ folder, tasks/queue.db, and the dispatcher. Don't
assume paths; mirror whatever conventions my other agents already use (folder layout, file naming, how agents
are registered and scheduled). If you find NO existing ecosystem, my first-time setup isn't done — stop and
let me know so I can finish Setup at trevsagents.com/builder first. Don't scaffold the backbone from here;
that's Setup's job. Only proceed once the ecosystem exists.

${PLATFORM_NOTE}

━━━ THE AGENT SPEC (build ${template.name} to exactly this) ━━━
${template.playbook(params)}
${custom ? `\n━━━ CUSTOM INSTRUCTIONS (fold these into the PLAYBOOK) ━━━\n${custom}\n` : ""}
━━━ HOW TO SLOT IT INTO THE ECOSYSTEM ━━━
${slot}

${useFuel ? fuelBlock(fuelKey, model, { optional: existing }) : ownEngineBlock(model)}

${fuelDiscipline(shape)}

${defaultsNotLaw(TRADING_AGENTS.has(id))}

━━━ BEFORE YOU FINISH ━━━
${finish}
━━━ END ━━━`;
  // If the user renamed this agent at setup, swap the persona name/id throughout.
  const nm = (opts.customName || "").trim();
  return nm && nm !== template.name ? renameAgentText(_built, template.name, template.id, nm) : _built;
}

// A custom agent the member described in their own words. The backend LLM turns the
// description into this spec; we wrap it in the EXACT same shell as a built-in agent so
// it's indistinguishable in quality (find-ecosystem, slot-in by shape, fuel block, keep-it-lean).
export type CustomAgentSpec = {
  role: string;
  tagline: string;
  emoji: string;
  shape: "data" | "scheduled" | "task" | "event";
  playbook: string;
};
export function buildCustomAgentInstruction(opts: {
  name: string;
  spec: CustomAgentSpec;
  fuelKey: string;
  model: string;
  existing?: boolean;
  useFuel?: boolean;
}): string {
  const shape = (["data", "scheduled", "task", "event"] as const).includes(opts.spec.shape) ? opts.spec.shape : "task";
  const synthetic: AgentTemplate = {
    id: slugifyName(opts.name) || "custom-agent",
    name: opts.name,
    emoji: opts.spec.emoji || "🛠️",
    role: opts.spec.role || "Custom agent",
    tagline: opts.spec.tagline || "",
    proven: "Custom-built from your description.",
    accent: "cyan",
    params: [],
    playbook: () => opts.spec.playbook,
  };
  return buildAgentInstruction({
    template: synthetic,
    params: { model: opts.model || "cheap" },
    fuelKey: opts.fuelKey,
    existing: opts.existing,
    useFuel: opts.useFuel,
    shapeOverride: shape,
  });
}

// ── ADD A DASHBOARD (the ecosystem's front-end — reads existing agents, not a separate app) ──
// Two tiers: "simple" is a code-only build the user's Claude Code can ship immediately. "advanced"
// (Sci-Fi Station, Pixel Village) is an honest build PROJECT — we hand over exactly how WE built ours,
// including the art/assets the user has to source, and their Claude Code builds it WITH them.
export function buildDashboardInstruction(opts: { theme: DashboardTheme; fuelKey: string }): string {
  const { theme } = opts;

  const findEcosystem = `━━━ FIRST: FIND THE ECOSYSTEM ━━━
Locate your existing setup and where each agent writes state: portfolio/bankroll files, status files,
memory logs, reports (and the mission-control-api on port 3001 if present). Don't assume paths. The
dashboard only READS these; it never touches agent files. Auto-discover agents by scanning the agents/
folder so any agent added LATER shows up with no code change — one dashboard that grows with the
ecosystem. If you find no ecosystem, let me know so I can finish Setup first (a dashboard with nothing to
show is pointless). It's fine to build this with 0 agents — it'll just show an empty, healthy system
until one is added.

${PLATFORM_NOTE}`;

  const header = `I want to add a dashboard to my AI-agent system. This plan is from my trevsagents.com/builder
account (a membership I'm on) — help me build the ${theme.name} dashboard.

It's a visual front-end for the agent system already running on this machine. It reads my agents' live data
and is PART OF that one ecosystem (it pairs with my mission-control-api / agents workspace), not a separate app.`;

  if (theme.tier === "simple") {
    return `${header}

${findEcosystem}

━━━ BUILD IT (pure code — no art, no sprites, no game engine) ━━━
Build a small local web app — a clean, modern, dark analytics dashboard (think a sharp SaaS ops console,
NOT a game or a pixel scene). Use the same stack as their mission-control-api if there is one (so it's one
project), otherwise a single Next.js/Vite app or even one static HTML file + a tiny JSON endpoint. It reads
the agents' real data files and auto-refreshes every few seconds.

MAKE IT GENUINELY NICE (this is the first thing the user SEES, so it has to look finished):
- Layout: a slim top bar (product name + a green "live" dot + agent count + system health), a row of
  KPI tiles, then a two-column body — charts on the left, an agent panel on the right.
- KPI tiles: total P&L / balances, open positions or active tasks, fuel spent today, system health.
  Big tabular-numeral figures, a small caption, a colored delta (green up / rose down).
- Charts: a portfolio/value line chart with a soft gradient area fill, and a small daily bars chart.
  Use a lightweight lib (Recharts, Chart.js) or hand-rolled SVG — no heavy deps. Smooth, rounded, subtle.
- Agent panel: one row per agent (auto-discovered by scanning the agents/ folder) — status dot, name,
  state (running / idle / last-run), and its latest one-line report. A "view full report" affordance.
- FUEL / SPEND panel (users want to see what's costing them): read the task queue's completed tasks
  (tasks with a cost_actual) and group by assignee to show spend PER AGENT — a small bar or list, e.g.
  "Sage $0.42 · Bolt $0.31 · Matt $0.08 today", plus a total. Also count each agent's runs. This is the
  one view only the local dashboard can give — the website only sees account-level totals, not which agent
  spent what. Pull the number from cost_actual on the queue (or sum the agent's own logged costs); if an
  agent never reports cost, show its run COUNT instead so it's not blank. A little "spend by agent, last 7
  days" bar chart is ideal.
- Style: near-black background (#0a0c13-ish), cards #12151f with a 1px white/6% border and rounded-xl,
  ONE cohesive accent (cyan→violet→pink gradient is on-brand), generous spacing, a system/ui sans font,
  tabular numerals for figures, subtle hover/transition motion. Clean and calm beats flashy.
- CRITICAL — must look complete on the FIRST run, before any agent has produced data: render every
  panel with graceful empty/placeholder states ("no positions yet", "waiting for first cycle", zeroed
  KPIs) so it never looks broken or blank. The user should open it and immediately see a real dashboard.
- Responsive enough to look right on a laptop; auto-refresh via a few-second poll of the data.

━━━ FINISH ━━━
Run it, open it, and give the user the local URL — the moment they see it should feel like "oh, this is
real." Summarize what you built and tell them they can ask you to restyle anything (colors, layout, add a
panel) — it's a starting point, not a rule. Later they can upgrade to the fancier station/village looks.
━━━ END ━━━`;
  }

  // advanced recipes — how WE built ours + what the user needs
  const recipe =
    theme.id === "station"
      ? `━━━ THE SCI-FI STATION — TWO WAYS TO BUILD IT (OFFER BOTH, let the user pick) ━━━
The station is the neon space-station look where each agent gets its own room. There are TWO paths.
ASK THE USER which they want before you build, and describe both honestly. Do NOT just build a plain
KPI/stats dashboard and call it a station — that's the "Command Deck" theme, not this one. This look has
a starry space background and a floating station with rooms.

▸ OPTION A — SVG STATION  (RECOMMENDED · pure code · ~30–60 min · NO art, NO downloads, NO cost)
You build the ENTIRE station look in code with SVG + CSS. Nothing to source — no image models, no
Midjourney, no sprite packs. It genuinely reads as a sci-fi station and it's done in one session. Pick
this for almost everyone. HOW TO BUILD IT:
  1. BACKGROUND: a full-viewport deep-space gradient (near-black navy → black). Scatter 60–120 stars as
     small SVG <circle>s at pseudo-random positions, 2–3 sizes, low opacity, with a gentle CSS twinkle
     (opacity keyframes, staggered delays). Add 1–2 big blurred radial-gradient "nebula" glows in
     cyan/violet at low opacity for depth.
  2. THE STATION: put a central "hub" node in the middle (a glowing rounded hexagon or core, labeled with
     the ship name / "COMMAND"). Place ONE ROOM PER AGENT around it — rounded-square "rooms" laid out
     evenly on a ring (or a tidy grid) around the hub. Compute positions from the agent COUNT so any
     number of agents lays out cleanly.
  3. BRIDGES: connect each room to the hub (or room-to-room around the ring) with a "bridge" — a thin
     rounded rect / line with a neon stroke and a soft glow (SVG <filter> gaussian-blur drop-shadow, or
     CSS filter: drop-shadow). Optional nice touch: a faint light traveling along each bridge
     (stroke-dashoffset animation) so the station feels alive.
  4. ROOMS = LIVE DATA: each room is an SVG <g> — dark fill, 1px neon border (cyan→violet), the agent's
     NAME, a status dot (green running / amber idle / gray offline), and 1–2 live figures (tasks done,
     spend today, or its one-line status). AUTO-DISCOVER agents by scanning the agents/ folder so a new
     agent gets a room with no code change. A room subtly PULSES (border glow) when its agent is active.
  5. INTERACTION: click a room → open that agent's full panel (side drawer or modal) with its latest
     report + per-agent spend. Auto-refresh the data every few seconds.
  6. STACK: same project as their mission-control-api if present (one ecosystem), else a single
     Next.js/Vite app or even one HTML file. Pure SVG + CSS — NO game engine, NO external art.
  Make it look FINISHED on the first run even with 0 agents (show the empty station + hub with
  "waiting for first agent" rooms) so it never looks broken or blank.

▸ OPTION B — PAINTED STATION  (the premium look from trevsagents.com · needs ONE AI-generated image · a couple hours)
This is how OUR station was made — a hand-painted hull. Only pick this if the user actively WANTS to
source art. It looks richer, but it's more work and needs an image model.
  1. THE ART: one top-down "station hull" background image (rooms like a floor plan), generated with an AI
     image model (Imagen / Midjourney-class), high-res transparent PNG. Prompt idea: "top-down 3/4 view
     sci-fi space station floor plan, neon-lit rooms connected by corridors, dark background, painted game
     art, high detail." One small sprite per agent (colored-circle placeholders are fine for V1).
  2. LAYOUT: the hull image is the background; each agent's room = an {x,y,w,h} region (in %) composited
     over the hull with a feathered CSS mask (transparent→opaque→transparent).
  3. DATA + STACK: same as Option A (read state files, click room → panel, auto-discover), layered:
     space bg → hull image → room overlays → sprites → data panels.
  BUILD ORDER: ship plain-rectangle rooms first, THEN swap in the hull art + sprites. Guide the user
  through the image-gen prompts when they get stuck on art.

DEFAULT: if the user is unsure or doesn't want to mess with art, build OPTION A (the SVG station). It
gives the full station feel — starry space, floating station, a room per agent joined by glowing bridges
— with zero art and zero cost, and they can always upgrade to the painted hull later.`
      : `━━━ HOW WE BUILT THE PIXEL VILLAGE (recreate it with the user) ━━━
BE HONEST FIRST: this is the most ambitious dashboard — a real little game (several hours) that needs
pixel-art ASSETS (some may cost ~$5). If the user isn't up for that yet, offer to build a plain,
code-only stats dashboard now (no assets needed) and come back to this later.

Here's exactly how the trevsagents.com village was made:
1. THE ENGINE: a 2D game engine in the browser — we used PHASER (phaser.js), embedded in a web app.
   Phaser handles the tile map, the player walking around, and the agent characters.
2. THE ART (what the user needs to grab):
   • A TILESET for ground + buildings — a pixel-art pack. We used one like "Cute Fantasy" on itch.io
     (~$3-5); there are also free CC0 packs (point them to itch.io "CC0 top-down pixel" to start free).
   • A CHARACTER SPRITE with a walk cycle per agent. We generated ours with a pixel-art sprite tool /
     AI; pack characters work too. Placeholder single-frame sprites are fine for V1.
3. THE MAP: build a small town tilemap — paths, grass, and one building per agent. Walking up to a
   building and pressing E opens that agent's live panel.
4. THE DATA: read the agents' state files and show each agent's live status on interaction. Auto-discover
   agents so new ones get a building automatically.
5. THE STACK: scaffold a web app, load Phaser, load the tileset + sprites, build the scene, wire the
   E-to-interact → data panel.
BUILD ORDER: get a WALKABLE V1 with placeholder tiles first (proves the engine + data), THEN help the
user pick/download a tileset + sprites and swap them in. Help them find CC0 packs so they can start free.`;

  return `${header}

${findEcosystem}

${recipe}

━━━ FINISH ━━━
Ship a working version, give the user the local URL, and summarize what you built. If they chose a
code-only build (the SVG station, or a plain dashboard) there is NO art step — it's finished as-is, don't
leave them thinking something's missing. If they chose a painted/asset build, note what art they still
want to swap in. Either way, tell them they can ask you to change anything — this is their dashboard, a
starting point, not a rule.
━━━ END ━━━`;
}

// ───────────────────────────────────────────────────────────────────────────────
// COPILOT (v1 = curated answers grounded in the v6 guide; live copilot comes with
// the backend). Facts below are from the actual guide pack chapters.
// ───────────────────────────────────────────────────────────────────────────────

export type FaqEntry = { q: string; keywords: string[]; a: string };

export const COPILOT_FAQ: FaqEntry[] = [
  {
    q: "What happened to fuel? What do my agents run on?",
    keywords: ["fuel", "credits", "token", "billing", "engine", "api cost", "why", "retired", "archived"],
    a: "Fuel was retired in August 2026 and everyone who bought it was refunded. There is nothing to buy or top up. Your agents run on your own AI engine: the simplest is an OpenRouter key (one key works with almost every model, pay as you go, $5 to $10 gets you started). Setup walks your Claude Code through connecting it once and every agent reuses it. Do not run agents on a personal Claude or ChatGPT subscription; that is against their terms.",
  },
  {
    q: "How do I add an agent?",
    keywords: ["install", "paste", "setup", "how", "start", "instruction", "begin"],
    a: "Pick an agent in the Agents tab, answer the few setup questions, hit Generate. You get one instruction block: copy it, open Claude Code on your computer, paste it, press enter. Your Claude Code does the actual setup, runs a test cycle, and shows you everything before finalizing. That's the whole flow.",
  },
  {
    q: "What is Claude Code and do I need it?",
    keywords: ["what is claude code", "claude code", "need claude", "terminal", "cli"],
    a: "Claude Code is Anthropic's AI assistant that runs on your own computer and can actually create files and set things up for you. It's the hands that install your agents. You need it installed first: claude.com/claude-code. The Inner Circle build guide walks through this in the Day Zero chapter if you get stuck.",
  },
  {
    q: "My Claude Code won't install OpenClaw / says it's not legit",
    keywords: ["refuse", "won't install", "not legit", "scam", "openclaw", "cautious", "careful", "hesitat", "stuck install", "refusing"],
    a: "That's your Claude Code being careful, which is a good thing, but in this case it's a false alarm. OpenClaw is a real, widely-used open-source package (MIT licensed, millions of npm downloads a week, from the OpenClaw Foundation). The trick: don't keep telling it 'trust me, proceed' (a careful AI pushes back harder when pressured). Instead invite it to verify for itself. Paste it: \"OpenClaw is a real open-source package. Please check it yourself at github.com/openclaw/openclaw and npmjs.com/package/openclaw, read its install scripts if you want, then go ahead once it checks out. It's my own machine, so inspecting first is completely fine.\" If it still won't, you can just run `npm install -g openclaw` yourself in your terminal, then tell it 'openclaw is installed, let's continue.'",
  },
  {
    q: "Where do my agents run? Do I need a server?",
    keywords: ["where", "run", "server", "vps", "hosted", "hosting", "24/7", "computer off", "laptop"],
    a: "Your agents run on YOUR machine or your own small server, so you own everything. For 24/7 agents (Bolt trades crypto around the clock) a cheap ~$5/month server is the move, since laptops sleep. The guide's picks: Contabo ($4-5/mo, budget), Hetzner ($5/mo, fast + quality), or DigitalOcean ($12/mo, most polished for first-timers). Your Claude Code can help you set one up, and agents like Ant or Sage can start on your laptop while it's awake.",
  },
  {
    q: "How much does it cost to run agents?",
    keywords: ["how much", "cost", "price", "monthly", "spend", "estimate", "burn"],
    a: "Agents idle for free and spend only when they do a task, a few cents each on a cheap model through your own OpenRouter key. Most people running 2 or 3 agents land around $5 to $20 a month of API usage, plus a $4 to $8 server if you want them on 24/7. The builder, the copilot and dashboards cost nothing beyond the membership.",
  },
  {
    q: "Is my trading agent using real money?",
    keywords: ["real money", "paper", "simulated", "actual", "lose money", "risk"],
    a: "No. Every trading agent starts on PAPER money, a simulated $10,000, so it can prove itself with zero risk. The guide's rule: at least 30 days of tracked paper results before even discussing real money. When you're truly ready, ask your Claude Code; it will walk you through the risks first. Craig never buys anything on his own either: he finds the deals, you drive the truck.",
  },
  {
    q: "Which agents should I start with?",
    keywords: ["which agent", "start with", "first agent", "recommend", "best agent", "order"],
    a: "A solid starter pair is an analyst + a stock trader (Ant + Sage in our store). They share the same kind of market data, they're cheap to run, and together they teach you the whole pattern: fetcher, cycles, reports, memory. Add one more each month as you get comfortable — Earl is a great third (nearly free), then branch by interest: Bolt for crypto, Ace for sports, Craig for flips, Scout + Forge for building products. (Tip: give your agents your own names when you build them — they're your crew.)",
  },
  {
    q: "What does the Brain power setting mean?",
    keywords: ["lite", "pro", "max", "smart", "fast", "model", "brain", "difference", "which engine", "tier"],
    a: "Those were the old fuel tiers and fuel is gone. Each agent now has a Brain power setting: Cheapest and fast (the default, handles almost everything), Balanced, or Most capable. Setup maps it to a matching model on whatever engine you connected, usually OpenRouter. Start cheap; your Claude Code does the heavy building, so agents rarely need a premium brain.",
  },
  {
    q: "How do I keep my AI costs low?",
    keywords: ["fuel", "cost", "cheap", "save", "budget", "expensive", "run out", "burn", "24/7", "usage", "last", "openrouter"],
    a: "Three things. (1) Keep agents on a cheap/fast model — it's the default and handles almost everything; only use a premium model for a genuinely hard, high-stakes agent since it costs several times more per run. (2) Don't run agents more often than they need to. They only cost money when they actually think, so a trader checking a few times a day, or a worker that fires only when you hand it a task, costs pennies. Running things 24/7 'just in case' is the #1 way people waste money. (3) Let the free no-AI fetchers do the frequent polling — only the AI cycle costs anything. On a cheap model, $5 of OpenRouter credit is hundreds of agent actions. If you want an agent to run less (or more) often, just ask your Claude Code.",
  },
  {
    q: "Can I change an agent after installing?",
    keywords: ["change", "customize", "tweak", "edit", "modify", "adjust", "different"],
    a: "Yes. Everything we install is a starting point, not a rule; that's written into the install itself. Tell YOUR Claude Code what you want ('make Sage check in more often', 'add a category to Craig', 'switch Bolt to Tier A coins') and it makes the change, warning you first if there's real risk. Day-to-day tweaks happen in your Claude Code; come back here to add new agents.",
  },
  {
    q: "How do agents avoid making numbers up?",
    keywords: ["hallucinate", "hallucination", "wrong numbers", "made up", "accurate", "trust", "invent"],
    a: "The guide's core anti-hallucination rule: agents never compute or look up market numbers themselves. A small fetcher script (plain code, no AI) pulls real data on a schedule and writes it to files; the agent only READS those files. If a number isn't in a data file, the agent can't cite it. Every install we generate sets up both halves: the fetcher and the agent.",
  },
  {
    q: "My agent stopped working / the fetcher broke",
    keywords: ["stopped", "broke", "stale", "not working", "error", "stuck", "failed", "help"],
    a: "First: ask your own Claude Code; paste the error and say 'fix this'. It can see your actual setup. Common causes from the guide's gotchas chapter: stale data (agents deliberately HOLD when data is over 6-24h old; check the fetcher's last-run time), expired API tokens (eBay tokens die every 2 hours and need re-minting), or rate limits (add backoff). If it's still stuck, post a screenshot in Discord #⚒️ inner-circle-tools.",
  },
  {
    q: "What is the showdown / competition between traders?",
    keywords: ["showdown", "competition", "race", "versus", "compete", "standings"],
    a: "When you run 2-3 trading agents (Sage stocks, Bolt crypto, Ace sports), you can make them aware of each other's P&L through a shared standings check each cycle: a 3-way race from the same $10k. One important lesson from the live operation: falling behind should make an agent MORE selective, never bigger with its bets. Sizing up to chase a leader is how accounts blow up. It also makes great content: the race is a story people follow.",
  },
  {
    q: "Do I need the Inner Circle guide too?",
    keywords: ["guide", "inner circle", "membership", "book", "pack", "file pack"],
    a: "The builder generates working installs on its own, but the guide pack is the deep companion: the full architecture, the Day Zero VPS walkthrough, every agent's complete chapter, cost management, and the gotchas-and-lessons chapter from running the real operation. Builder for speed, guide for understanding. Members get both.",
  },
  {
    q: "Can agents talk to each other?",
    keywords: ["talk", "communicate", "together", "coordinate", "team", "manager"],
    a: "Yes, through shared files and a task queue rather than direct chatter. The guide's pattern: each agent keeps its own state files, a lightweight task queue moves work between them (Scout approves a problem, Forge picks it up as a task), and an optional manager agent routes and escalates. Start with independent agents; add coordination once two of them genuinely need it.",
  },
  {
    q: "Is the copilot live?",
    keywords: ["when", "launch", "live", "coming", "soon", "available", "waitlist", "copilot"],
    a: "It is live. This chat is the copilot, grounded in the Trevs facts, included with your membership and unlimited. Ask it anything about setup, agents, dashboards or your membership. For an error on your own machine, paste it to your Claude Code first; it can see your setup and the copilot cannot.",
  },
];

export function copilotAnswer(input: string): { matched: boolean; q?: string; a: string } {
  const text = input.toLowerCase();
  let best: { score: number; entry: FaqEntry } | null = null;
  for (const entry of COPILOT_FAQ) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (text.includes(kw)) score += kw.length > 6 ? 2 : 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { score, entry };
  }
  if (best) return { matched: true, q: best.entry.q, a: best.entry.a };
  return {
    matched: false,
    a: "Good question! If it's about YOUR specific machine or setup, your own Claude Code is the expert — it can see your files and fix things live. For anything else, ask me again or drop it in Discord #⚒️ inner-circle-tools and you'll get a real answer fast.",
  };
}

// Client-side key generation is ONLY the offline fallback — real keys come from
// the server (POST /api/builder register) so every device sees the same key.
export function generateFuelKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 20; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `tk-${s}`;
}
