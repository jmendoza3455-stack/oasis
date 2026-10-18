import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/session";
import { HISTORICAL_TEMPLATE } from "@/lib/domain";

export async function GET() {
  await requireStaff();
  return new NextResponse("﻿" + HISTORICAL_TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-eventos-historicos.csv"',
    },
  });
}
