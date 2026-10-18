import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { JOBS, type JobName } from "@/server/automations";

// Vercel Cron llama con GET y `Authorization: Bearer $CRON_SECRET` (ver vercel.json).
export const maxDuration = 60;

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function GET(request: Request, ctx: RouteContext<"/api/cron/[job]">) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { job } = await ctx.params;
  if (!(job in JOBS)) return NextResponse.json({ error: "unknown_job" }, { status: 404 });
  const report = await JOBS[job as JobName]();
  return NextResponse.json(report);
}
