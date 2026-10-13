// Server-side proxy: client → trevsagents.com/api/critic → VPS /critic/run
// VPS API is HTTP-only; this Vercel route does the HTTP call server-side to
// avoid mixed-content blocking. Access code is passed through and verified on
// the VPS. See /api/claim for the original pattern.

import { NextRequest, NextResponse } from "next/server";

const VPS_API = "http://157.173.196.139:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Forward the real member IP so the VPS's per-person daily cap keys on the
    // actual person, not this proxy's (shared) IP. Vercel populates x-forwarded-for.
    const memberIp = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const r = await fetch(`${VPS_API}/critic/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(memberIp ? { "x-real-ip": memberIp } : {}) },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({ ok: false, error: "VPS returned non-JSON" }));
    return NextResponse.json(j, { status: r.ok ? 200 : (r.status || 500) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
