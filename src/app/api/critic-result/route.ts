// Poll proxy: client → trevsagents.com/api/critic-result?taskId=N → VPS /critic/result/N

import { NextRequest, NextResponse } from "next/server";

const VPS_API = "http://157.173.196.139:3001";

export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");
    if (!taskId || !/^\d+$/.test(taskId)) {
      return NextResponse.json({ ok: false, error: "bad taskId" }, { status: 400 });
    }
    // The result is bound to the submitter's token (results were otherwise ID-enumerable).
    const token = req.nextUrl.searchParams.get("token") || "";
    const r = await fetch(`${VPS_API}/critic/result/${taskId}?token=${encodeURIComponent(token)}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({ ok: false, error: "VPS returned non-JSON" }));
    return NextResponse.json(j, { status: r.ok ? 200 : (r.status || 500) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
