// Server-side proxy: client → trevsagents.com/api/claim → VPS /inner-circle/claim
//
// The VPS API is HTTP-only. Browsers block direct HTTPS→HTTP fetch as
// "mixed content," so the client can't call the VPS directly from this site.
// This route lives on Vercel (HTTPS) and does the HTTP call server-side, then
// returns the result to the client. Standard cross-origin proxy pattern.

import { NextRequest, NextResponse } from "next/server";

const VPS_API = "http://157.173.196.139:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const r = await fetch(`${VPS_API}/inner-circle/claim`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
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
