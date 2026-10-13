// Server-side proxy: client → trevsagents.com/api/builder → VPS /builder/*
// Same pattern as /api/critic: the VPS API is HTTP-only, so this Vercel route
// makes the HTTP call server-side to avoid mixed-content blocking. Forwards the
// member's real IP so per-person rate limits key on the person, not the proxy.
// Actions: { action: "register" | "sync", ...body }

import { NextRequest, NextResponse } from "next/server";

// The copilot + custom-agent actions run a live LLM on the VPS (~15–40s). Vercel's
// default function timeout is 10s — which was silently killing every copilot call
// (members saw "I hit a snag"). Allow up to 60s (the Hobby-plan ceiling; Pro allows more).
export const maxDuration = 60;

// Public IP by default; overridable for local audits (point at 127.0.0.1:3001,
// which the VPS API treats as trusted/localhost — bypasses the member gate for testing).
const VPS_API = process.env.VPS_API_URL || "http://157.173.196.139:3001";
const ACTIONS = new Set(["register", "sync", "reset", "copilot", "fuel", "fuel/treasury", "fuel/pnl", "fuel/checkout", "custom-agent", "skills"]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = (body?.action || "").toString();
    if (!ACTIONS.has(action)) {
      return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
    }
    const memberIp = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const r = await fetch(`${VPS_API}/builder/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(memberIp ? { "x-real-ip": memberIp } : {}) },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({ ok: false, error: "VPS returned non-JSON" }));
    return NextResponse.json(j, { status: r.ok ? 200 : r.status || 500 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
