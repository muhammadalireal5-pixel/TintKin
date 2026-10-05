import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/app/lib/mongoose";

// Liveness/readiness probe for uptime monitors and the hosting platform.
// Never exposes error details, only up/down per dependency.
export async function GET() {
  let dbOk = false;
  try {
    await connectDb();
    dbOk = mongoose.connection.readyState === 1;
  } catch {
    dbOk = false;
  }

  const body = {
    status: dbOk ? "ok" : "degraded",
    checks: { db: dbOk ? "up" : "down" },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: dbOk ? 200 : 503 });
}
