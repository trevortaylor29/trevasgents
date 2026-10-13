// Server-side proxy for the lifetime offer's live numbers (the VPS API is HTTP-only; see api/claim).
// Cache-busted on each call so "seats left" is never stale on the page.
import { NextResponse } from "next/server";
const VPS_API = "http://157.173.196.139:3001";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const r = await fetch(`${VPS_API}/inner-circle/lifetime`, { cache: "no-store" });
    const j = await r.json().catch(() => ({ available: false }));
    return NextResponse.json(j, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ available: false }, { status: 200, headers: { "cache-control": "no-store" } });
  }
}
