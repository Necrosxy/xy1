import { NextResponse } from "next/server";

import { isPracticeState, normalizeSyncKey } from "@/lib/cloud-sync";
import { syncPracticeStateWithCloud } from "@/lib/cloud-sync-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "未配置云数据库 DATABASE_URL" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as { syncKey?: unknown; state?: unknown };
  const syncKey = typeof payload.syncKey === "string" ? normalizeSyncKey(payload.syncKey) : null;
  if (!syncKey) {
    return NextResponse.json({ error: "Invalid sync key" }, { status: 400 });
  }

  if (!isPracticeState(payload.state)) {
    return NextResponse.json({ error: "Invalid practice state" }, { status: 400 });
  }

  try {
    const result = await syncPracticeStateWithCloud(syncKey, payload.state);
    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    console.error("Cloud sync failed", error);
    return NextResponse.json({ error: "Cloud sync failed" }, { status: 500 });
  }
}
